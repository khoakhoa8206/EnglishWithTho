-- MỤC 2A: Thêm cột question_count vào bảng assignments
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS question_count INT;

UPDATE public.assignments a
SET question_count = (
  SELECT COUNT(*) FROM public.assignment_questions aq
  WHERE aq.assignment_id = a.id
)
WHERE question_count IS NULL;


-- MỤC 4A: Bảng lưu từng lần upload ngân hàng câu hỏi
CREATE TABLE IF NOT EXISTS question_bank_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('vocab', 'grammar')),
  topic_ref_id UUID,
  upload_label TEXT NOT NULL,
  question_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Bảng câu hỏi ngân hàng (liên kết đến lần upload)
CREATE TABLE IF NOT EXISTS question_bank_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   UUID NOT NULL REFERENCES question_bank_uploads(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  question    TEXT NOT NULL,
  options     JSONB,
  correct     TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  difficulty  TEXT,
  hint        TEXT,
  explanation TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- RLS
ALTER TABLE question_bank_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_items   ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "teacher_own_uploads" ON question_bank_uploads;
CREATE POLICY "teacher_own_uploads" ON question_bank_uploads
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_own_items" ON question_bank_items;
CREATE POLICY "teacher_own_items" ON question_bank_items
  USING (teacher_id = auth.uid());


-- MỤC 5A: Bảng kho lưu trữ file
CREATE TABLE IF NOT EXISTS file_archive (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section      TEXT NOT NULL CHECK (section IN ('listening', 'grammar', 'vocab', 'document')),
  display_name TEXT NOT NULL,
  title        TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    BIGINT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


ALTER TABLE file_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_own_archive" ON file_archive;
CREATE POLICY "teacher_own_archive" ON file_archive
  USING (teacher_id = auth.uid());