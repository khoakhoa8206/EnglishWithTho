import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// OpenRouter tự chuyển sang model sau khi model trước lỗi / quá tải
const MODELS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callOpenRouter(prompt: string, max_tokens: number, attempt = 1): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      models: MODELS,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: Math.min(max_tokens, 32768),
      temperature: 0.1, // Thấp hơn → bám format hơn
    }),
  });

  if ((res.status === 502 || res.status === 503) && attempt <= 3) {
    console.warn(`OpenRouter ${res.status} — Retry ${attempt}/3...`);
    await new Promise((r) => setTimeout(r, attempt * 2000));
    return callOpenRouter(prompt, max_tokens, attempt + 1);
  }

  const data = await res.json().catch(() => null);
  // OpenRouter có thể trả lỗi trong body kể cả khi HTTP 200
  if (!res.ok || data?.error) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    console.error('OpenRouter API error:', JSON.stringify(data));
    if (res.status === 429 || data?.error?.code === 429) {
      throw new Error(`Đã hết lượt dùng AI miễn phí của OpenRouter (giới hạn 20 lần/phút, 50 lần/ngày). Vui lòng thử lại sau. (${errMsg})`);
    }
    throw new Error(`OpenRouter API error: ${errMsg}`);
  }

  return data?.choices?.[0]?.message?.content ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY chưa được cấu hình' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, max_tokens = 2000 } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Thiếu prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = await callOpenRouter(prompt, max_tokens);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('ai-proxy error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
