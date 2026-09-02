# MOCHI STUDY — TODO & BUG TRACKER

> Cập nhật: 25/08/2026  
> Nguồn: audit toàn bộ source code sau khi hoàn thành P0.

---

## 🔴 P1 — BUG CRITICAL (crash / data sai)

### BUG-01 · `attempt_number` không được insert
**File:** `src/services/assignment/assignmentService.js` → `submitAttempt()`  
**Vấn đề:** Payload insert vào `assignment_attempts` không có `attempt_number` → nếu DB không có default thì crash; nếu có default NULL thì UI hiển thị "Lần null".  
**Fix:** Trước khi insert, đếm số attempts hiện có của student cho assignment đó rồi +1.
```js
const { count } = await supabase
  .from('assignment_attempts')
  .select('id', { count: 'exact', head: true })
  .eq('assignment_id', assignmentId)
  .eq('student_id', studentId);
// rồi thêm attempt_number: (count || 0) + 1 vào payload
```

---

### BUG-02 · `class_id` không được select trong `getById`
**File:** `src/services/assignment/assignmentService.js` → `getById()`  
**Vấn đề:** `select('*, assignment_questions(*)')` — wildcard `*` chỉ lấy scalar columns của bảng gốc, `class_id` có thể bị thiếu trong một số Supabase client versions. `ResultPanel` nhận `assignment.class_id` để load leaderboard — nếu undefined thì leaderboard không bao giờ load.  
**Fix:** Explicit select:
```js
.select('id, title, assignment_type, class_id, deadline, vocab_topic_id, grammar_topic_id, listening_material_id, assignment_questions(*)')
```

---

### BUG-03 · Teacher TuitionPage gọi method không tồn tại
**File:** `src/pages/teacher/TuitionPage.jsx` → `handleToggle()`  
**Vấn đề:** Gọi `tuitionService.updateTuitionStatus(id, next)` nhưng service chỉ có `togglePaid(tuitionId, paid: boolean)`.  
**Fix:**
```js
await tuitionService.togglePaid(id, next === 'paid');
```

---

### BUG-04 · Timer đứng yên trong Vocabulary Part 4
**File:** `src/pages/student/VocabularyPage.jsx` → `TimedTestPart`  
**Vấn đề:** Code có dòng `const { useEffect } = require !== undefined ? require('react') : ...` — `require` không tồn tại trong ESM/Vite → runtime error hoặc silent fail. Timer `elapsed` không bao giờ tăng, đồng hồ mãi `00:00`.  
**Fix:** Xóa dòng require lạ đó. Dùng `useEffect` đã import từ đầu file:
```js
useEffect(() => {
  if (!started || submitted) return;
  const interval = setInterval(() => setElapsed(e => e + 1), 1000);
  return () => clearInterval(interval);
}, [started, submitted]);
```

---

### BUG-05 · `GrammarPage` dùng `useState` để fetch data thay vì `useEffect`
**File:** `src/pages/student/GrammarPage.jsx` → `GrammarQuizButton` và `GrammarQuiz`  
**Vấn đề:** Cả hai component dùng `useState(() => { supabase...then(...) })` để fetch — `useState` initializer là synchronous, async callback không trigger re-render. Data không bao giờ load được.  
**Fix:** Đổi thành `useEffect`:
```js
useEffect(() => {
  supabase.from('grammar_questions')...then(({ data }) => { setQuestions(data); setLoading(false); });
}, [topic.id]);
```

---

## 🟡 P2 — LOGIC BUG (sai nhưng không crash)

### BUG-06 · Teacher TuitionPage — field name không khớp với service
**File:** `src/pages/teacher/TuitionPage.jsx` và `src/services/tuitionService.js`  
**Vấn đề:** Service map ra `paid: item.paid` và `monthLabel: formatMonth(...)`, nhưng UI render `item.status` (undefined) và `item.month` (raw string chưa format).  
**Fix:** Trong `tuitionService.getTuitionList`, thêm:
```js
status: item.paid ? 'paid' : 'unpaid',
month:  formatMonth(item.month),  // overwrite raw với formatted
```
Hoặc đổi UI dùng `item.paid ? 'Đã đóng' : 'Chưa đóng'` và `item.monthLabel`.

---

### BUG-07 · Student TuitionPage — `formatMonthLabel` không handle date dạng `YYYY-MM-DD`
**File:** `src/pages/student/TuitionPage.jsx` → `formatMonthLabel()`  
**Vấn đề:** Regex chỉ match `YYYY-MM` — nếu DB lưu `2026-01-01` (full date) thì trả về raw string thay vì "Tháng 1/2026".  
**Fix:** Thêm case:
```js
const matchFull = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
if (matchFull) return `Tháng ${parseInt(matchFull[2])}/${matchFull[1]}`;
```

---

### BUG-08 · `vocabularyService.createVocabularySet` bỏ qua `description`
**File:** `src/services/vocabularyService.js`  
**Vấn đề:** Form tạo bộ từ có field `description` nhưng service chỉ insert `name`, bỏ qua `description`.  
**Fix:** Thêm vào insert payload (nếu schema `vocab_topics` có column `description`; nếu không thì bỏ field khỏi form).

---

### BUG-09 · `studentSummaryService` — `wordsMastered` hardcode 10 từ/topic
**File:** `src/services/studentSummaryService.js`  
**Vấn đề:** `passedVocabTopics.size * 10` — estimate sai, không phản ánh số từ thực tế.  
**Fix:** Map từ `vocabTopics` array để tính tổng số từ của các topic đã pass:
```js
const topicWordMap = new Map((vocabTopics || []).map(t => [t.id, t.vocabularies?.[0]?.count || 0]));
const wordsMastered = [...passedVocabTopics].reduce((s, id) => s + (topicWordMap.get(id) || 0), 0);
```

---

### BUG-10 · Listening AI preview không bao giờ được lưu
**File:** `src/pages/teacher/ListeningPage.jsx` → `ListeningDetail`  
**Vấn đề:** Khi teacher nhấn "Tạo câu hỏi bằng AI", câu hỏi chỉ hiện trong local state với flag `_new: true`, không persist vào DB. Khi tạo Assignment gắn material này, `createWithQuestions` sẽ generate lại từ script — không reuse preview. Preview gây nhầm lẫn.  
**Fix (option A):** Xóa preview, thêm note "Câu hỏi sẽ tự tạo khi giao bài".  
**Fix (option B):** Thêm nút "Lưu câu hỏi vào assignment" → tạo assignment rồi insert questions.

---

## 🟠 P3 — MISSING FEATURES (spec yêu cầu, chưa có)

### FEAT-01 · Teacher Documents Page — hoàn toàn vắng mặt
**Spec mục 9:** Teacher upload PDF/Word/MP3/Images vào Storage, lưu metadata vào bảng `documents`.  
**Việc cần làm:**
- [ ] Tạo `src/services/teacherDocumentService.js` — upload Storage + insert `documents`
- [ ] Tạo `src/pages/teacher/DocumentsPage.jsx` — list, upload, xóa
- [ ] Thêm route `/teacher/documents` vào `App.jsx` và `TeacherLayout`

---

### FEAT-02 · Teacher — Thêm tháng học phí cho học sinh
**Spec mục 8:** "Teacher được thêm tháng".  
**Vấn đề:** `tuitionService.generateMonths()` đã có (gọi RPC `generate_tuition_months`) nhưng không có UI nào gọi nó.  
**Việc cần làm:**
- [ ] Thêm nút "Thêm tháng học phí" vào `TuitionPage` (teacher)
- [ ] Modal chọn student + tháng → gọi `generateMonths(studentId)`

---

### FEAT-03 · Student Profile Page
**Spec mục 14:** Student menu có "Profile".  
**Việc cần làm:**
- [ ] Tạo `src/pages/student/ProfilePage.jsx` — hiển thị tên, lớp, ngày bắt đầu, streak
- [ ] Thêm route `/student/profile` vào `App.jsx`
- [ ] Thêm link Profile vào dropdown avatar trong `StudentLayout`

---

## 🟢 P4 — QUALITY / CLEANUP

### CLEAN-01 · Xóa file service cũ (stub không dùng)
Các file này là remnant từ cấu trúc cũ, không được import ở đâu:
- [x] `src/services/assignmentService.js` (2.7KB, cũ) — đã xóa
- [x] `src/services/grammar/grammarService.js` — đã xóa
- [x] `src/services/listening/listeningService.js` — đã xóa
- [x] `src/services/tuition/tuitionService.js` — đã xóa
- [x] `src/services/vocabulary/vocabularyService.js` — đã xóa
- [x] `src/services/DocumentsPage.jsx` (đặt nhầm vào /services) — đã xóa
- [x] `src/services/ai/streakService.js` — **GIỮ LẠI** (`useStreak.js` vẫn import); không xóa

> ✅ Đã search import toàn project trước khi xóa — không có import nào vỡ.

---

### CLEAN-02 · Move Supabase calls ra khỏi component
Vi phạm pattern `Component → Service → Supabase`:
- [x] `src/pages/student/GrammarPage.jsx` — thêm `getGrammarQuestionCount()` + `getGrammarQuestions()` vào `studentGrammarService`, xóa import `supabase`
- [x] `src/pages/teacher/ListeningPage.jsx` — thêm `getFullById()`, `getAssignmentQuestions()`, `uploadAudio()` vào `listeningService`, xóa import `supabase`
- [x] `src/pages/teacher/VocabularyPage.jsx` — thêm `uploadVocabFile()`, `bulkInsertWords()` vào `vocabularyService`, xóa import `supabase`

---

### CLEAN-03 · Mobile bottom nav thiếu Tài liệu và Học phí
**File:** `src/layouts/StudentLayout.jsx`  
- [x] Thay "Tổng kết" trong NAV_ITEMS bằng nút "☰ Thêm"
- [x] Thêm `DRAWER_ITEMS` = [Tổng kết, Tài liệu, Học phí]
- [x] Implement slide-up drawer panel khi nhấn "Thêm" — accessible qua mobile bottom nav

---

### CLEAN-04 · Validation form chưa đầy đủ
- [x] `StudentsPage` — validate `startDate` format `YYYY-MM-DD`
- [x] `AssignmentsPage` — validate deadline không được ở quá khứ
- [x] `ListeningPage` — giới hạn file audio tối đa 50MB, hiển thị size hiện tại nếu quá

---

### CLEAN-05 · Console errors tiềm ẩn cần kiểm tra
- [x] Search `console.log` / `console.error` — chỉ còn **1 lần** duy nhất: `assignmentService.js:353` cho streak fail (intentional error handling, giữ lại)
- [x] `VocabularyPage (student)` — `require` statement lạ đã được fix ở BUG-04
- [x] `GrammarPage (student)` — missing deps đã tự resolve sau khi fix CLEAN-02 (deps array đúng)

---

## 📋 DEFINITION OF DONE (theo spec)

Một chức năng coi là **hoàn thành** khi đủ tất cả:

```
✅ UI render đúng
✅ Database đúng schema (không dùng tên cũ)
✅ Service layer đúng pattern
✅ Validation input
✅ Authorization (teacher/student không xâm phạm nhau)
✅ Error handling + Error state UI
✅ Loading state UI
✅ Empty state UI
✅ Responsive desktop / tablet / mobile
✅ Không còn console error
✅ Production build thành công
```

---

## ✅ ĐÃ HOÀN THÀNH (P0)

- [x] `assignmentService` — đổi `type` → `assignment_type`, `due_date` → `deadline`
- [x] `studentHomeworkService` — đổi `type` → `assignment_type`, `due_date` → `deadline`  
- [x] `AssignmentPage` — dùng `assignment_type` đúng
- [x] `studentTuitionService` — đổi `month_label` → `month`, `is_paid` → `paid`
- [x] `studentDocumentService` — bỏ `category` khỏi query
- [x] `dashboardService` — bỏ `assignments.status`, `assignment_attempts.status`
- [x] `QuizEngine` — không phụ thuộc `question_text` / `correct_answer` cũ
- [x] `ResultPanel` — không phụ thuộc column cũ
- [x] Schema mismatch search: không còn `vocabulary_sets`, `assignment_submissions`, `class_members`, `due_date`, `month_label`, `is_paid`, `auth.users`

---

*File này là nguồn theo dõi duy nhất. Khi fix xong một item thì đổi `[ ]` → `[x]`.*
