-- Tương thích database đã tạo trước khi grammar_questions có question_type.
alter table public.grammar_questions
  add column if not exists question_type text not null default 'multiple_choice';

alter table public.grammar_questions
  drop constraint if exists grammar_questions_question_type_check;

alter table public.grammar_questions
  add constraint grammar_questions_question_type_check
  check (question_type in ('multiple_choice', 'fill_in_blank', 'dictation'));
