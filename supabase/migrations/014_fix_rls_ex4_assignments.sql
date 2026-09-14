-- Fix RLS: vocab_topic_ex4_assignments
ALTER TABLE public.vocab_topic_ex4_assignments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_own_ex4_assignments"         ON public.vocab_topic_ex4_assignments;
DROP POLICY IF EXISTS "student_read_ex4_assignments"        ON public.vocab_topic_ex4_assignments;
DROP POLICY IF EXISTS "Teachers can insert ex4 assignments" ON public.vocab_topic_ex4_assignments;
DROP POLICY IF EXISTS "Teachers can update their ex4 assignments" ON public.vocab_topic_ex4_assignments;
DROP POLICY IF EXISTS "Teachers can select their ex4 assignments" ON public.vocab_topic_ex4_assignments;
DROP POLICY IF EXISTS "Students can select ex4 assignments for their topics" ON public.vocab_topic_ex4_assignments;

-- Recreate table nếu FK vẫn trỏ auth.users (app dùng name-only login, không có auth.uid())
DO $$
DECLARE
  v_fk text;
BEGIN
  SELECT ccu.table_name INTO v_fk
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'vocab_topic_ex4_assignments'
    AND kcu.column_name = 'teacher_id'
  LIMIT 1;

  IF v_fk = 'users' THEN
    DROP TABLE IF EXISTS public.vocab_topic_ex4_assignments CASCADE;

    CREATE TABLE public.vocab_topic_ex4_assignments (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      topic_id    uuid NOT NULL REFERENCES public.vocab_topics(id) ON DELETE CASCADE,
      upload_id   uuid NOT NULL REFERENCES public.question_bank_uploads(id) ON DELETE CASCADE,
      created_at  timestamptz DEFAULT now(),
      UNIQUE (teacher_id, topic_id)
    );

    ALTER TABLE public.vocab_topic_ex4_assignments DISABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Đã recreate bảng vocab_topic_ex4_assignments với FK đúng (public.profiles).';
  ELSE
    RAISE NOTICE 'FK đã đúng (%). Chỉ disable RLS.', v_fk;
  END IF;
END;
$$;