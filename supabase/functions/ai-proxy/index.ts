import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGemini(prompt: string, max_tokens: number, attempt = 1): Promise<string> {
  const url = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        // Cho phép tối đa 8192 — Gemini 1.5 flash hỗ trợ
        maxOutputTokens: Math.min(max_tokens, 8192),
        temperature: 0.1, // Thấp hơn → bám format hơn
      },
    }),
  });

  if (res.status === 503 && attempt <= 3) {
    console.warn(`Gemini 503 — Retry ${attempt}/3...`);
    await new Promise((r) => setTimeout(r, attempt * 2000));
    return callGemini(prompt, max_tokens, attempt + 1);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini API error:', errText);
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY chưa được cấu hình' }),
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

    const content = await callGemini(prompt, max_tokens);

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