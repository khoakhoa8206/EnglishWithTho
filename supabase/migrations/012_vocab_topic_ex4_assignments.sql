-- Bảng gán Bài 4 (bài tập vận dụng) cho từng topic từ vựng
CREATE TABLE IF NOT EXISTS public.vocab_topic_ex4_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id    uuid NOT NULL,
  upload_id   uuid NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (teacher_id, topic_id)
);

ALTER TABLE public.vocab_topic_ex4_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_own_ex4_assignments" ON public.vocab_topic_ex4_assignments;
CREATE POLICY "teacher_own_ex4_assignments"
  ON public.vocab_topic_ex4_assignments
  FOR ALL
  USING   (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Học sinh đọc được để biết topic được gán Bài 4 nào
DROP POLICY IF EXISTS "student_read_ex4_assignments" ON public.vocab_topic_ex4_assignments;
CREATE POLICY "student_read_ex4_assignments"
  ON public.vocab_topic_ex4_assignments
  FOR SELECT USING (true);

-- Fix RLS: bảng vocab_topic_assignments phải cho phép INSERT/UPSERT của teacher
DROP POLICY IF EXISTS "teacher_own_topic_assignments" ON public.vocab_topic_assignments;
DROP POLICY IF EXISTS "teacher_own_assignments" ON public.vocab_topic_assignments;
CREATE POLICY "teacher_own_assignments"
  ON public.vocab_topic_assignments
  FOR ALL
  USING   (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);
