-- Đảm bảo question_bank_items có đủ cột explanation và hint
ALTER TABLE public.question_bank_items
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS hint text;