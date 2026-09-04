-- Bảng gán bài tập từ ngân hàng câu hỏi cho từng topic từ vựng
CREATE TABLE IF NOT EXISTS public.vocab_topic_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id     UUID NOT NULL REFERENCES public.vocab_topics(id) ON DELETE CASCADE,
  upload_id    UUID NOT NULL REFERENCES public.question_bank_uploads(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, topic_id)
);

ALTER TABLE public.vocab_topic_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_own_topic_assignments" ON public.vocab_topic_assignments;
CREATE POLICY "teacher_own_topic_assignments" ON public.vocab_topic_assignments
  USING (teacher_id = auth.uid());

-- Học sinh có thể đọc (để biết topic được gán file nào)
DROP POLICY IF EXISTS "student_read_topic_assignments" ON public.vocab_topic_assignments;
CREATE POLICY "student_read_topic_assignments" ON public.vocab_topic_assignments
  FOR SELECT USING (true);
