-- Thêm cột topic_tag vào bảng question_bank_uploads
ALTER TABLE public.question_bank_uploads
  ADD COLUMN IF NOT EXISTS topic_tag TEXT DEFAULT NULL;

-- Index để query nhanh theo topic_tag
CREATE INDEX IF NOT EXISTS idx_qbu_topic_tag
  ON public.question_bank_uploads(topic_tag)
  WHERE topic_tag IS NOT NULL;