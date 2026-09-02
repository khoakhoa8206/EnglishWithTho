// src/services/docxParserService.js

// ============================================================
// CORE: Convert .docx → HTML bằng Mammoth
// ============================================================
export async function convertDocxToHtml(file) {
  const mammoth = (await import('mammoth')).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: [
      "b => b",
      "i => i",
      "p[style-name='List Paragraph'] => p:fresh",
      "p[style-name='List Number'] => p:fresh",
      "p[style-name='List Bullet'] => p:fresh",
    ]
  });
  console.log('[MAMMOTH WARNINGS]', result.messages);
  return result.value;
}

// ============================================================
// GRAMMAR PARSER
// ============================================================
export function parseGrammarHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const questions = [];

  const elements = Array.from(doc.querySelectorAll('p, td, li'));
  let currentQuestion = null;

  for (const el of elements) {
    const text = el.textContent.trim();
    if (!text) continue;

    if (/^(task|exercise|part)\s*\d+/i.test(text)) continue;

    const questionMatch = text.match(/^(\d+)[.)]\s+(.+)/);
    if (questionMatch) {
      if (currentQuestion && Object.keys(currentQuestion._opts).length >= 2) {
        questions.push(_buildGrammarQ(currentQuestion));
      }
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        text:   normalizeBlank(questionMatch[2]),
        _opts:  {},
      };
      const inlineOpts = extractOptionsFromText(questionMatch[2]);
      if (inlineOpts) currentQuestion._opts = inlineOpts;
      continue;
    }

    if (currentQuestion) {
      const opts = extractOptionsFromText(text);
      if (opts) {
        currentQuestion._opts = { ...currentQuestion._opts, ...opts };
      }
    }
  }

  if (currentQuestion && Object.keys(currentQuestion._opts).length >= 2) {
    questions.push(_buildGrammarQ(currentQuestion));
  }

  return questions.filter(q => q.options.length >= 2);
}

function _buildGrammarQ(raw) {
  const options = Object.entries(raw._opts).map(([letter, text]) => `${letter}. ${text}`);
  return {
    number:        raw.number,
    question:      raw.text,
    options,
    correct:       null,
    difficulty:    'nhan_biet',
    question_type: 'multiple_choice',
  };
}

// ============================================================
// LISTENING PARSER
// ============================================================
export function parseListeningHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const exercises = [];
  let currentExercise = null;
  let scriptLines = [];

  const elements = Array.from(doc.querySelectorAll('p, li, td, h1, h2, h3, h4'));

  // Phát hiện dòng đầu phần đáp án để dừng ghi script
  function isAnswerHeader(text) {
    // "Đáp án", "Answer Key", "Đáp án:" đứng một mình
    if (/^\s*(?:answer\s*key|đáp\s*án)\s*[：:]?\s*$/i.test(text)) return true;
    // "Đáp án1.", "Answers: 1.", "Answer key1." có số theo sau
    if (/^\s*(?:answer\s*key|answers?|đáp\s*án|key)\s*[：:]?\s*\d/i.test(text)) return true;
    return false;
  }
  let inAnswerSection = false;

  for (const el of elements) {
    const text = el.textContent.trim();
    if (!text) continue;

    // Khi gặp header đáp án → dừng ghi script
    if (isAnswerHeader(text)) {
      inAnswerSection = true;
    }
    if (inAnswerSection) continue;

    const exMatch = text.match(/exercise\s*(\d+)/i);
    if (exMatch) {
      if (currentExercise) {
        currentExercise.script = scriptLines.join('\n');
        exercises.push(currentExercise);
      }
      currentExercise = {
        number:      parseInt(exMatch[1]),
        instruction: text,
        questions:   [],
        script:      '',
        type:        detectExerciseType(text),
      };
      scriptLines = [];
      continue;
    }

    if (currentExercise) {
      scriptLines.push(el.innerHTML);
      const gapFills = extractGapFillQuestions(text, el.innerHTML);
      currentExercise.questions.push(...gapFills);
    }
  }

  if (currentExercise) {
    currentExercise.script = scriptLines.join('\n');
    if (currentExercise.questions.length === 0 && scriptLines.some(l => extractOptionsFromText(l))) {
      currentExercise.type = 'multiple_choice';
      currentExercise.questions = _parseMCQBlock(scriptLines);
    }
    exercises.push(currentExercise);
  }

  if (exercises.length === 0) {
    const allText = doc.body.textContent.trim();
    const allLines = allText.split('\n').map(s => s.trim()).filter(Boolean);

    if (allLines.some(l => extractOptionsFromText(l))) {
      const mcqs = _parseMCQBlock(allLines);
      if (mcqs.length > 0) {
        exercises.push({
          number: 1,
          instruction: 'Exercise 1',
          questions: mcqs,
          script: allText,
          type: 'multiple_choice',
        });
      }
    } else {
      const questions = allLines.flatMap(extractGapFillQuestions);
      if (questions.length > 0) {
        exercises.push({
          number:      1,
          instruction: 'Exercise 1',
          questions,
          script:      allText,
          type:        'gap_fill',
        });
      }
    }
  }

  // Auto-fill correct_answer từ phần đáp án trong file
  const answerKey = extractAnswerKey(html);
  for (const ex of exercises) {
    for (const q of ex.questions) {
      const ans = answerKey[String(q.number)];
      if (ans && !q.correct_answer) q.correct_answer = ans;
    }
  }

  return exercises;
}

function _parseMCQBlock(lines) {
  const mcqs = [];
  let currentQ = null;
  let qNum = 1;
  for (const line of lines) {
    const qMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (qMatch) {
      if (currentQ) mcqs.push(currentQ);
      currentQ = { id: `mcq_${qNum++}`, number: parseInt(qMatch[1]), question: qMatch[2], options: [], question_type: 'multiple_choice' };
      const opts = extractOptionsFromText(qMatch[2]);
      if (opts) currentQ.options = Object.entries(opts).map(([k,v]) => `${k}. ${v}`);
    } else if (currentQ) {
      const opts = extractOptionsFromText(line);
      if (opts) {
        currentQ.options.push(...Object.entries(opts).map(([k,v]) => `${k}. ${v}`));
      } else {
        currentQ.question += ' ' + line;
      }
    }
  }
  if (currentQ) mcqs.push(currentQ);
  return mcqs;
}

// ============================================================
// HELPERS
// ============================================================

function normalizeBlank(text) {
  return text.replace(/_{2,}/g, '_____');
}

function extractOptionsFromText(text) {
  const options = {};
  const multiPattern = /([A-D])[.)]\s*([^A-D.()]+?)(?=[A-D][.)]|$)/g;
  let match;
  while ((match = multiPattern.exec(text)) !== null) {
    const letter = match[1];
    const value  = match[2].trim().replace(/\s+/g, ' ');
    if (value) options[letter] = value;
  }
  if (Object.keys(options).length === 0) {
    const single = text.match(/^([A-D])[.)]\s+(.+)$/);
    if (single) options[single[1]] = single[2].trim();
  }
  return Object.keys(options).length > 0 ? options : null;
}

function detectExerciseType(instruction) {
  const lower = instruction.toLowerCase();
  if (lower.includes('one word only'))  return 'one_word';
  if (lower.includes('no more than')) {
    const m = instruction.match(/no more than (\w+) words?/i);
    const n = m ? wordToNumber(m[1]) : 3;
    return `max_${n}_words`;
  }
  if (lower.includes('true') || lower.includes('false')) return 'true_false_not_given';
  return 'gap_fill';
}

function extractGapFillQuestions(text, innerHTML) {
  const questions = [];
  const pattern = /\((\d+)\)\s*[_*]{2,}/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const SNIP = 80;
    const s    = Math.max(0, match.index - SNIP);
    const e    = Math.min(text.length, match.index + match[0].length + SNIP);
    const snippet = (s > 0 ? '...' : '') + text.slice(s, e).trim() + (e < text.length ? '...' : '');
    questions.push({
      number:         parseInt(match[1]),
      context:        snippet,
      correct_answer: '',
      student_answer: null,
    });
  }
  return questions;
}

function wordToNumber(word) {
  const map = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  return map[word.toLowerCase()] || 3;
}

// ============================================================
// ANSWER KEY EXTRACTOR
// ============================================================
export function extractAnswerKey(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // FIX 1: join từng element bằng \n thay vì dùng textContent toàn doc
  // (textContent nối liền các <p> không có dấu xuống dòng → regex fail)
  const lines = Array.from(doc.querySelectorAll('p, li, td'))
    .map(el => el.textContent.trim())
    .filter(Boolean);
  const fullText = lines.join('\n');

  // FIX 2: nhận diện thêm dấu kẻ ngang ──── làm ranh giới đáp án
  let answerSectionStart = -1;

  const headerPattern = /(?:answer\s*key|answers?|đáp\s*án|key)[\s:：]*/gi;
  let m;
  while ((m = headerPattern.exec(fullText)) !== null) {
    answerSectionStart = m.index + m[0].length;
  }

  // Nếu không có header → tìm dấu kẻ ngang (────, ━━━, ---)
  if (answerSectionStart < 0) {
    const sepMatch = fullText.match(/[─━—\-]{10,}/);
    if (sepMatch) {
      answerSectionStart = sepMatch.index + sepMatch[0].length;
    }
  }

  const searchText = answerSectionStart >= 0
    ? fullText.slice(answerSectionStart)
    : fullText.slice(Math.floor(fullText.length * 0.5));

  return _parseAnswerBlock(searchText);
}
function _parseAnswerBlock(text) {
  const answers = {};
  let m;

  // Pattern 1: MC — chỉ chữ HOA A/B/C/D, không match chữ thường
  const letterPattern = /(?:\(?\s*(\d{1,3})\s*[.):\-]?\s*\)?\s*)([A-D])(?![a-zA-Z])/g;
  while ((m = letterPattern.exec(text)) !== null) {
    if (!answers[m[1]]) answers[m[1]] = m[2];
  }

  // Pattern 2: double-space separator (bỏ \s*$ để tránh nuốt hết text single-space)
  const textPatternDouble = /(\d{1,3})[.)]\s+([\w][\w\s\-./]*?)(?=\s{2,}\d{1,3}[.)]\s|\n)/gm;
  while ((m = textPatternDouble.exec(text)) !== null) {
    const num = m[1]; const val = m[2].trim().replace(/\s+/g, ' ');
    if (!answers[num] && val.length >= 1 && !/^[A-D]$/i.test(val)) answers[num] = val;
  }
  // Xử lý phần tử cuối trong format double-space
  if (text.includes('  ')) {
    const lastItem = /(\d{1,3})[.)]\s+([\w][\w\s\-./]*?)\s*$/gm;
    while ((m = lastItem.exec(text)) !== null) {
      const num = m[1]; const val = m[2].trim().replace(/\s+/g, ' ');
      if (!answers[num] && val.length >= 1 && !/^[A-D]$/i.test(val) && val.length < 80) answers[num] = val;
    }
  }

  // Pattern 3: fallback single-space — luôn chạy, chỉ điền câu còn thiếu
  const fallback = /(\d{1,3})[.)]\s+(.+?)(?=\s\d{1,3}[.)]|$)/g;
  while ((m = fallback.exec(text)) !== null) {
    const num = m[1]; const val = m[2].trim().replace(/\s+/g, ' ');
    if (!answers[num] && val && val.length < 100) answers[num] = val;
  }

  return answers;
}

export function parseVocabExerciseHtml(html) {
  const questions = parseGrammarHtml(html);
  const answerKey = extractAnswerKey(html);

  return questions.map(q => {
    const ans = answerKey[String(q.number)];
    if (ans && q.options.length > 0) {
      const matched = q.options.find(opt =>
        opt.startsWith(ans + '.') || opt.startsWith(ans + ')')
      );
      if (matched) return { ...q, correct: matched };
    }
    return q;
  });
}