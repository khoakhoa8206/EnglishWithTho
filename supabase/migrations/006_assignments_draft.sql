-- Thêm status cho assignments
alter table public.assignments
  add column if not exists status text not null default 'published'
  check (status in ('draft', 'published'));

comment on column public.assignments.status is
  'draft: chỉ teacher thấy, chưa giao cho học sinh. published: học sinh thấy.';

create index if not exists assignments_status_idx on public.assignments (status);

-- Cập nhật RLS: học sinh chỉ thấy assignment có status = 'published'
drop policy if exists "students_read_own_assignments" on public.assignments;

create policy "students_read_own_assignments" on public.assignments
  for select
  using (
    status = 'published'
    and class_id in (
      select class_id from public.class_students
      where student_id = auth.uid()
    )
  );

-- Teacher vẫn thấy tất cả (kể cả draft)
drop policy if exists "teachers_manage_own_assignments" on public.assignments;
create policy "teachers_manage_own_assignments" on public.assignments
  for all
  using (teacher_id = auth.uid());
