// src/services/ai/aiService.js

import { supabase } from '../../lib/supabase';

async function callAI(prompt, maxTokens = 2000, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { prompt, max_tokens: maxTokens },
    });

    if (!error && !data?.error) {
      return data?.content || '';
    }

    // supabase-js chỉ báo "non-2xx status code" — đọc body để lấy lỗi thật từ Edge Function
    let errMsg = data?.error || error?.message || '';
    if (error?.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json();
        if (body?.error) errMsg = `${body.error} (HTTP ${error.context.status})`;
      } catch (_) {
        errMsg = `${errMsg} (HTTP ${error.context.status})`;
      }
    }
    // Hết quota (Gemini free tier: 20 request/ngày) — retry vô ích
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.toLowerCase().includes('exceeded your current quota')) {
      throw new Error('Đã hết lượt dùng AI miễn phí của Gemini (giới hạn số lần gọi mỗi ngày). Vui lòng thử lại sau hoặc nâng cấp gói Gemini API.');
    }

    const is503 =
      /\b503\b/.test(errMsg) ||
      errMsg.toLowerCase().includes('high demand') ||
      errMsg.toLowerCase().includes('overloaded');

    if (is503 && attempt < retries) {
      console.warn(`Gemini 503 — Retry ${attempt}/${retries} sau ${attempt * 2}s...`);
      await new Promise((res) => setTimeout(res, attempt * 2000));
      continue;
    }

    throw new Error(
      is503
        ? 'AI đang quá tải, vui lòng thử lại sau vài giây.'
        : errMsg || 'AI proxy lỗi'
    );
  }
}

/**
 * Parse JSON — xử lý trường hợp response bị truncate giữa chừng
 */
function parseJSON(text) {
  // Bước 1: Strip markdown
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Bước 2: Tìm [ để bắt đầu array
  const startIdx = clean.indexOf('[');
  if (startIdx === -1) {
    console.error('parseJSON: Không tìm thấy JSON array. Raw:', text);
    throw new Error('AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại.');
  }

  let jsonStr = clean.slice(startIdx);

  // Bước 3: Thử parse trực tiếp (trường hợp đầy đủ)
  const fixedFull = jsonStr.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(fixedFull);
  } catch (_) {}

  // Bước 4: Response bị truncate — tự đóng array lại
  // Chiến lược: cắt tại object cuối cùng còn hợp lệ, thêm ]}
  jsonStr = repairTruncatedArray(jsonStr);
  try {
    const result = JSON.parse(jsonStr);
    console.warn('parseJSON: Response bị truncate, đã tự repair. Số từ parse được:', result.length);
    return result;
  } catch (e) {
    console.error('parseJSON: Repair thất bại:', e.message, '\nCleaned:', jsonStr.slice(0, 300));
    throw new Error('AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại.');
  }
}

/**
 * Tự sửa JSON array bị cắt giữa chừng.
 * Tìm object cuối cùng hoàn chỉnh (có `}`) rồi đóng array.
 */
function repairTruncatedArray(str) {
  // Fix trailing comma
  let s = str.replace(/,\s*([}\]])/g, '$1');

  // Tìm vị trí `}` cuối cùng — đó là object hoàn chỉnh cuối cùng
  const lastClose = s.lastIndexOf('}');
  if (lastClose === -1) return '[]';

  // Cắt tại đó, thêm ]
  return s.slice(0, lastClose + 1) + ']';
}

/**
 * Chia text thành ít đoạn nhất có thể (~maxChars mỗi đoạn), độ dài đều nhau,
 * cắt theo dòng để không làm đứt 1 từ vựng.
 */
function splitIntoChunks(text, maxChars) {
  const count = Math.max(1, Math.ceil(text.length / maxChars));
  const chunks = Array.from({ length: count }, () => []);
  let offset = 0;
  for (const line of text.split('\n')) {
    // Xếp dòng vào đoạn theo vị trí của nó trong tài liệu
    chunks[Math.min(count - 1, Math.floor((offset * count) / text.length))].push(line);
    offset += line.length + 1;
  }
  return chunks.map(lines => lines.join('\n')).filter(chunk => chunk.trim());
}

// Edge Function bị Supabase kill sau 150s (HTTP 546), Gemini mất ~2s/từ → mỗi request
// ≤ ~30 từ. Nhưng Gemini free tier chỉ cho 20 request/ngày → không chia nhỏ hơn mức cần.
const VOCAB_CHUNK_CHARS = 1500;

// ─── Vocabulary extraction ────────────────────────────────────────────────────
export const aiVocabularyService = {
  /** Trả về { words, warning } — warning khác rỗng khi có đoạn bị lỗi (kết quả thiếu). */
  async extractVocabulary(text) {
    const chunks = splitIntoChunks(text.slice(0, 4000), VOCAB_CHUNK_CHARS);
    const results = await Promise.allSettled(chunks.map(chunk => this.extractVocabularyChunk(chunk)));

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length === results.length) throw failed[0].reason;
    const warning = failed.length
      ? `Chỉ trích xuất được ${results.length - failed.length}/${results.length} phần tài liệu, danh sách bị thiếu từ. Lỗi: ${failed[0].reason?.message}`
      : '';

    const words = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    return { words, warning };
  },

  async extractVocabularyChunk(text) {
    const prompt = `Extract English vocabulary WORDS from the document below.

STRICT RULES:
- Only extract actual vocabulary words or short phrases (1-4 words maximum).
- NEVER include full sentences, exercise questions, or any text containing blanks (___).
- NEVER include lines that look like fill-in-blank exercises.
- The "word" field must be a single word or short phrase only (e.g. "leisure", "go cycling").
- Provide the phonetic transcription in the "ipa" field.
- Provide a short, simple English example sentence in the "example" field.

IMPORTANT: Return ONLY a valid JSON array. No markdown. No bullet points. No explanation. No text before or after the JSON.

Format EXACTLY like this example:
[{"word":"leisure","part_of_speech":"noun","ipa":"/ˈleʒ.ər/","meaning_vi":"thời gian rảnh","example":"In my leisure time, I enjoy reading books."},{"word":"go cycling","part_of_speech":"phrase","ipa":"/ɡəʊ ˈsaɪ.klɪŋ/","meaning_vi":"đi đạp xe","example":"We go cycling every weekend."}]

Document:
${text.slice(0, 4000)}

JSON array output:`;

    // Tăng max_tokens lên 8000 để tránh bị truncate
    const content = await callAI(prompt, 8000);
    const all = parseJSON(content);
    // Filter thêm ở client: loại bỏ entry có "word" là câu dài hoặc chứa ___
    return all.filter(item => {
      const w = String(item.word || '').trim();
      return w.length > 0 && !w.includes('___') && w.split(/\s+/).length <= 5;
    });
  },

  async previewDocument(text) {
    const prompt = `Tóm tắt ngắn gọn tài liệu từ vựng tiếng Anh này bằng tiếng Việt:
- Chủ đề chính là gì?
- Ước tính có bao nhiêu từ vựng?
- Cấu trúc tài liệu như thế nào?

Nội dung:
${text.slice(0, 2000)}

Trả lời ngắn gọn trong 3-5 câu.`;

    return await callAI(prompt, 500);
  },
};

// ─── Grammar extraction ───────────────────────────────────────────────────────
export const aiGrammarService = {
  async extractGrammarLessons(text) {
    const prompt = `Analyze the English grammar document below and extract grammar lessons.

IMPORTANT: Return ONLY a valid JSON array. No markdown. No bullet points. No explanation.

Format EXACTLY like this example:
[{"title":"Present Simple","structure":"S + V(s/es) + O","explanation":"Dùng để diễn tả hành động thường xuyên.","examples":"She plays tennis every day.\nHe works at 8am."}]

Document:
${text.slice(0, 4000)}

JSON array output:`;

    const content = await callAI(prompt, 8000);
    return parseJSON(content);
  },

  async previewGrammarDocument(text) {
    const prompt = `Tóm tắt ngắn tài liệu ngữ pháp tiếng Anh này bằng tiếng Việt:
- Có những chủ đề ngữ pháp gì?
- Trình độ phù hợp (cơ bản / trung cấp / nâng cao)?

Nội dung:
${text.slice(0, 2000)}

Trả lời trong 3-4 câu.`;

    return await callAI(prompt, 400);
  },
};

/** Chuyển bài tập mẫu đã soạn sẵn thành dữ liệu câu hỏi, không tự thêm nội dung mới. */
export const aiExerciseService = {
  async extractQuestionsFromDocument(text, subject = 'grammar') {
    const prompt = `Đọc bài tập ${subject} dưới đây và CHỈ chuyển các câu hỏi đã có thành JSON để đưa lên web. Không tự tạo thêm câu hỏi, không đổi nội dung hay độ khó.\n\nMỗi câu trắc nghiệm phải có đúng 4 options và correct là đáp án đúng; câu điền từ có options: [] .\nChỉ trả về JSON array hợp lệ, không markdown:\n[{"question":"...","options":["A","B","C","D"],"correct":"...","question_type":"multiple_choice","difficulty":"A1"}]\n\nTài liệu:\n${text.slice(0, 12000)}`;
    const content = await callAI(prompt, 8000);
    const questions = parseJSON(content);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('AI không tìm thấy câu hỏi trong tài liệu.');
    return questions.map(question => ({
      question: String(question.question || '').trim(),
      options: Array.isArray(question.options) ? question.options.map(String).filter(Boolean) : [],
      correct: String(question.correct || '').trim(),
      question_type: question.question_type === 'fill_in_blank' ? 'fill_in_blank' : 'multiple_choice',
      difficulty: ['C1', 'C2'].includes(question.difficulty) ? 'van_dung_cao' : ['B1', 'B2'].includes(question.difficulty) ? 'van_dung' : 'nhan_biet',
    })).filter(question => question.question && question.correct && (question.question_type !== 'multiple_choice' || question.options.includes(question.correct)));
  },
};