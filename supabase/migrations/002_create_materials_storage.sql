-- Storage dùng chung cho audio Listening, tài liệu Word và tài nguyên giáo viên.
-- Migration idempotent: chạy an toàn nếu bucket đã được tạo thủ công.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/pdf'
  ]
)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

-- Ứng dụng hiện dùng name-only login (không có Supabase Auth), nên dùng anon policy
-- giống mô hình không-RLS của dữ liệu ứng dụng hiện tại.
drop policy if exists "materials public read" on storage.objects;
drop policy if exists "materials anon upload" on storage.objects;
drop policy if exists "materials anon update" on storage.objects;
drop policy if exists "materials anon delete" on storage.objects;

create policy "materials public read" on storage.objects
  for select to public using (bucket_id = 'materials');
create policy "materials anon upload" on storage.objects
  for insert to anon with check (bucket_id = 'materials');
create policy "materials anon update" on storage.objects
  for update to anon using (bucket_id = 'materials') with check (bucket_id = 'materials');
create policy "materials anon delete" on storage.objects
  for delete to anon using (bucket_id = 'materials');
