-- Thêm column lưu HTML tài liệu ngữ pháp (từ Mammoth, không qua AI)
alter table public.grammar_topics
  add column if not exists html_content text;

comment on column public.grammar_topics.html_content is
  'Nội dung tài liệu HTML do Mammoth convert từ .docx, không qua AI.';
