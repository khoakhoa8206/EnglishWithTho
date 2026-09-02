# AI_CODING_SPEC.md — Mochi Study Platform

> **Single Source of Truth** cho toàn bộ quá trình phát triển hệ thống Mochi Study.

---

## VAI TRÒ AI

Senior Full-Stack Architect + Senior React Developer + Supabase Architect + AI Integration Engineer + UI/UX Engineer.

---

## TỔNG QUAN DỰ ÁN

**Tên nền tảng:** Mochi Study

**Đối tượng:**
- Giáo viên quản lý lớp học, học sinh, bài tập, học phí, tài liệu.
- Học sinh học từ vựng, ngữ pháp, Listening, làm bài tập, theo dõi tiến độ.

**Nguồn tham khảo UI:**
- `goc-hoc-tap.html` → giao diện học sinh (design reference only)
- `teach-dashboard.html` → giao diện giáo viên (design reference only)

> Dữ liệu demo trong HTML **không phải** dữ liệu thật. Chỉ dùng để tham khảo bố cục, màu sắc, phong cách UI.

---

## 1. MỤC ĐÍCH FILE

File này để AI đọc và hiểu:

1. Hệ thống đang xây dựng là gì
2. Kiến trúc tổng thể
3. Quy tắc code
4. Cấu trúc thư mục
5. Database
6. Authentication
7. Role Teacher / Student
8. Quy tắc UI/UX
9. Quy tắc API
10. Quy tắc Supabase
11. Quy tắc AI
12. Quy tắc bài tập
13. Quy tắc chấm điểm
14. Quy tắc streak
15. Quy tắc lịch sử làm bài
16. Quy tắc không conflict khi code từng module

AI **KHÔNG được yêu cầu gửi toàn bộ project** nếu thông tin đã có trong file này.

Nếu thiếu thông tin, AI phải:
- Nêu rõ phần còn thiếu
- Đề xuất phương án
- Không tự ý phá vỡ kiến trúc hiện tại
- Không tự ý đổi tên database/table/component đã định nghĩa

---

## 2. NGUYÊN TẮC QUAN TRỌNG NHẤT

### 2.1. Code từng module độc lập

Code AI tạo ra sẽ được copy vào project thủ công. Vì vậy **KHÔNG được tạo code có khả năng conflict với module khác.**

Mỗi module phải:
- Có trách nhiệm rõ ràng
- Không chứa logic của module khác nếu không cần thiết
- Không sửa file ngoài phạm vi chức năng
- Không duplicate component dùng chung
- Không duplicate API client
- Không duplicate Supabase client
- Không tạo nhiều cách xử lý authentication
- Không tạo nhiều schema database cho cùng một dữ liệu

---

## 3. QUY TẮC TRƯỚC KHI CODE

Mỗi khi nhận yêu cầu `Code chức năng X`, AI thực hiện theo thứ tự:

**Bước 1 — Xác định module**
```
Module: Teacher / Student / Shared / AI / Database
```

**Bước 2 — Xác định file được phép sửa**
```
Được sửa:
src/pages/teacher/TuitionPage.jsx
src/components/tuition/TuitionTable.jsx
src/services/tuitionService.js
```

**Bước 3 — Xác định file cần tạo**
```
src/pages/teacher/TuitionPage.jsx
src/components/tuition/TuitionMonthCard.jsx
src/services/tuitionService.js
```

**Bước 4 — Kiểm tra dependency**

AI phải xác định chức năng đang phụ thuộc vào:
- Authentication / User / Student / Class
- Assignment / Assignment Result / Tuition
- Vocabulary / Grammar / Listening / AI generation

**Bước 5 — Code**

Chỉ sau khi xác định kiến trúc mới được viết code.

---

## 4. STACK CÔNG NGHỆ

### Frontend
- React + Vite
- JavaScript hoặc TypeScript theo project hiện tại
- React Router
- CSS / Tailwind nếu project đã sử dụng
- Responsive Design

**Không tự ý chuyển sang:** Next.js, Vue, Angular, C#, ASP.NET — trừ khi được yêu cầu.

### Backend / Database
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions (khi cần bảo mật API hoặc xử lý server-side)

---

## 5. DEPLOYMENT

| Layer | Platform |
|---|---|
| Frontend | Netlify |
| Backend / Database | Supabase |
| Server-side AI/API processing | Render hoặc Supabase Edge Functions |

> Không để API key của OpenAI hoặc key nhạy cảm trực tiếp trong React frontend.

---

## 6. KIẾN TRÚC THƯ MỤC

```
src/
│
├── assets/
│
├── components/
│   ├── common/
│   ├── teacher/
│   ├── student/
│   ├── vocabulary/
│   ├── grammar/
│   ├── listening/
│   ├── assignment/
│   └── tuition/
│
├── pages/
│   ├── teacher/
│   └── student/
│
├── layouts/
│   ├── TeacherLayout.jsx
│   └── StudentLayout.jsx
│
├── services/
│   ├── supabase/
│   ├── ai/
│   ├── assignment/
│   ├── vocabulary/
│   ├── grammar/
│   ├── listening/
│   ├── tuition/
│   └── student/
│
├── hooks/
├── utils/
├── constants/
├── types/
│
└── lib/
    └── supabase.js
```

> Nếu project thực tế có cấu trúc khác, **không tự ý chuyển toàn bộ project**. Giữ cấu trúc hiện tại, chỉ bổ sung module theo nguyên tắc tương thích.

---

## 7. QUY TẮC COMPONENT

Component dùng chung đặt trong `src/components/common/`:

```
Button, Modal, ConfirmDialog, Loading, EmptyState,
AudioPlayer, FileUploader, Pagination, Badge, Card
```

**Không tạo:** `TeacherButton`, `StudentButton`, `TeacherLoading`, `StudentLoading` — nếu chúng có cùng logic.

---

## 8. QUY TẮC SERVICE

Không gọi Supabase trực tiếp trong component. Pattern bắt buộc:

```
Component → Service → Supabase
```

Các service cần thiết:
```
tuitionService.js
studentService.js
assignmentService.js
vocabularyService.js
grammarService.js
listeningService.js
```

---

## 9. AUTHENTICATION & AUTHORIZATION

**2 role:**
```
teacher
student
```

Role lưu trong database/user profile. Frontend phải kiểm tra quyền truy cập.

**Student KHÔNG được truy cập:**
- Teacher Dashboard
- Teacher Student Management
- Teacher Tuition Management
- Teacher Assignment Creation

---

## 10. ROUTING

```
/teacher
/teacher/dashboard
/teacher/students
/teacher/tuition
/teacher/assignments
/teacher/vocabulary
/teacher/grammar
/teacher/listening
/teacher/vocabulary-review

/student
/student/home
/student/homework
/student/vocabulary
/student/grammar
/student/summary
/student/tuition
/student/documents
```

---

## 11. UI/UX — HỌC SINH

Reference: `goc-hoc-tap.html`

**Phong cách:**
- Nhẹ nhàng, pastel, thân thiện, bo góc
- Typography dễ đọc, animation vừa phải

**Palette:**
```
--cream: #FDF6EC      --fern: #768E78       --fern-dark: #566B58
--pistachio: #C6C09C  --fennel: #EBDEC0     --peony: #E79897
--peach: #FCAC85      --honey: #FCC88A
```

Phải giữ tinh thần visual này khi phát triển UI mới cho Student.

---

## 12. UI/UX — GIÁO VIÊN

Reference: `teach-dashboard.html`

**Phong cách:** Dashboard hiện đại, pastel pink, trắng, lavender, mint, amber.

**Sidebar hiện tại:**
```
Dashboard
Quản lý học sinh
Quản lý bài tập
Bài tập từ vựng
Bài tập khác
```

**Sẽ bổ sung:**
```
Học phí
Ôn tập từ vựng
Ngữ pháp
```

---

## 13. RESPONSIVE

Tất cả chức năng chạy tốt trên Desktop / Tablet / Mobile.

**Không được để:**
- Chữ tràn card
- Button tràn màn hình
- Table phá layout
- Flashcard vượt viewport
- Audio player quá rộng
- Modal vượt màn hình

---

## 14. TEACHER — DASHBOARD

**Giữ:** Tổng học sinh, bài tập đang giao, thông tin tổng quan.

**XÓA:** Điểm trung bình — không hiển thị trên dashboard.

**Trạng thái bài tập:** Chỉ dùng `Chưa làm` / `Hoàn thành`. Không dùng `Đang làm`.

---

## 15. TEACHER — QUẢN LÝ HỌC SINH

Chức năng: Xem, tìm kiếm, lọc theo lớp, thêm, chỉnh sửa, xóa, chuyển lớp.

Khi thêm học sinh có thể chọn: Tên, thông tin tài khoản, lớp, ngày bắt đầu học.

> Không đặt quản lý học phí trong module này.

---

## 16. TEACHER — HỌC PHÍ

Module riêng biệt. Không để học phí trong Quản lý học sinh.

**Chức năng:**
- Xem học phí từng học sinh
- Xem tháng đã đóng / chưa đóng
- Thay đổi trạng thái đóng/chưa đóng
- Thêm tháng mới
- Xem lịch sử học phí

**Quy tắc:** Mỗi học sinh có `start_date` và `monthly_fee`. Các tháng sinh từ `start_date → hiện tại`.

---

## 17. STUDENT — HỌC PHÍ (NAVBAR)

Navbar chỉ hiển thị: Tên học sinh + Avatar.

Khi click tên học sinh → dropdown:
```
Học phí
Đăng xuất
```

---

## 18. STUDENT — TRANG CHỦ

```
Chuỗi học tập
Bài tập về nhà
Từ vựng theo chủ đề
Ngữ pháp
Tổng kết
Khác
```

Không hiển thị card `Học phí` hay `Đăng xuất` như card chức năng.

---

## 19. STUDENT — XEM HỌC PHÍ

Hiển thị ngày bắt đầu học, sau đó các ô theo tháng:

```
Tháng 01/2026  Tháng 02/2026  Tháng 03/2026 ...
```

- Chưa đóng → màu trắng
- Đã đóng → màu xanh lá

Student chỉ được **xem**. Teacher mới được chỉnh sửa.

---

## 20. ASSIGNMENT — KIẾN TRÚC CHUNG

Mọi bài tập phải có:
```
assignment, assignment_type, class, teacher,
questions, answers, attempts, results
```

Một assignment có thể thuộc: `Vocabulary` / `Grammar` / `Listening` / `Review`

---

## 21. QUY TẮC HOÀN THÀNH BÀI ⚠️

Một lần làm bài **CHỈ được tính là một attempt** khi học sinh nhấn nút:

```
Hoàn thành bài tập
```

Nếu thoát trang / refresh / đóng browser / chưa nhấn hoàn thành → **KHÔNG tính là một lần làm bài**.

Có thể lưu progress tạm thời nếu cần.

---

## 22. TEACHER — QUẢN LÝ BÀI TẬP

Phải có: Lọc theo lớp / lọc theo loại bài / lọc theo trạng thái.

Teacher chọn lớp để xem các bài tập đã giao cho lớp đó.

---

## 23. VOCABULARY — TEACHER

**XÓA hoàn toàn Tag.** Không tạo database field Tag nếu không cần thiết.

---

## 24. VOCABULARY — UPLOAD WORD

```
Word → Upload → Backend → AI → Phân tích nội dung
→ Trích xuất vocabulary → Xác định từ loại
→ Tạo dữ liệu vocabulary → Teacher review
→ Teacher chỉnh sửa → Teacher xác nhận
```

---

## 25. AI VOCABULARY EXTRACTION PROMPT

```
Bạn là một chuyên gia biên soạn giáo trình tiếng Anh.

Nhiệm vụ: đọc nội dung tài liệu và xác định toàn bộ các từ/cụm từ vựng tiếng Anh có giá trị học tập.

Yêu cầu:
1. Trích xuất các từ/cụm từ quan trọng
2. Loại bỏ từ trùng lặp
3. Xác định từ loại: noun/verb/adjective/adverb/pronoun/preposition/conjunction/phrase/phrasal verb/expression/other
4. Tạo nghĩa tiếng Việt chính xác theo ngữ cảnh
5. Tạo phiên âm IPA
6. Tạo ví dụ sử dụng
7. Không tạo từ không có trong tài liệu
8. Ưu tiên nghĩa phù hợp ngữ cảnh nếu từ có nhiều nghĩa
9. Không bỏ sót từ vựng quan trọng

Kết quả trả về JSON hợp lệ:
{
  "topic": "...",
  "vocabulary": [
    {
      "word": "...",
      "part_of_speech": "...",
      "ipa": "...",
      "meaning_vi": "...",
      "example": "...",
      "source_context": "..."
    }
  ]
}

Không thêm markdown. Không thêm giải thích bên ngoài JSON.
```

---

## 26. OXFORD DICTIONARY EXAMPLE

Nếu hệ thống không có quyền truy cập Oxford API:
- **Không giả mạo nguồn Oxford**
- Dùng AI-generated example và đánh dấu rõ: `AI-generated example`

---

## 27. VOCABULARY — 4 PART LIÊN TIẾP

```
Part 1 → Part 2 → Part 3 → Part 4
```

Học sinh **bắt buộc làm tuần tự**. Không được nhảy Part.

---

## 28. PART 1 — FLASHCARD

**Mặt trước:** Từ vựng + IPA

**Mặt sau:** Nghĩa + Ví dụ

**Animation:** Click → Flip

**Thao tác:**
- `← Chưa thuộc` → đưa vào danh sách học lại
- `→ Đã thuộc` → chuyển sang từ tiếp theo

Cuối Part 1 phải có vòng ôn lại từ **Chưa thuộc** trước khi sang Part 2.

---

## 29. VOCABULARY AUDIO

Icon 🔊 ở cuối màn hình Part 1: lớn, dễ nhìn, dễ click trên mobile.

Click → phát âm từ hiện tại.

---

## 30. FLASHCARD RESPONSIVE

Card phải: lớn, dễ đọc, fit viewport, không overflow, tự wrap, responsive.

Mobile ưu tiên layout: Card → Action buttons → Audio

---

## 31. PART 2 — MATCHING

**2 cột:** Vocabulary (trái) / Meaning (phải)

**Flow:** Click từ → Click nghĩa

- Đúng → xanh, cố định
- Sai → đỏ, vocabulary quay lại, meaning báo đỏ

Không cho phép ghép sai thành kết quả đúng.

---

## 32. PART 3 — INPUT

Cho: Nghĩa tiếng Việt → Học sinh nhập: Từ tiếng Anh

**Quy tắc:**
- Không phân biệt uppercase/lowercase, có thể trim khoảng trắng
- Không chấp nhận sai spelling
- Đúng → xanh, khóa câu
- Sai → đỏ, cho nhập lại

---

## 33. PART 4 — QUIZ

Part 4 là bài duy nhất có **Timer** (góc trên bên phải).

Trong lúc làm: **KHÔNG hiển thị đúng/sai.**

Chỉ sau khi nhấn `Hoàn thành` mới chấm.

---

## 34. ĐIỀU KIỆN ĐẠT

```
>= 80% → Đạt
< 80% → Chưa đạt → Làm lại bài 4 hoặc Học lại từ đầu
```

---

## 35. ATTEMPT ENGINE

Mỗi lần nhấn `Hoàn thành bài tập` → `attempt_count += 1`

```
attempt_number
student_id
assignment_id
score
correct_count
wrong_count
total_questions
started_at
completed_at
duration_seconds
passed
```

---

## 36. KHI ĐẠT

Hiển thị: Kết quả + Điểm + Thời gian + Xem lại bài

Màu: Câu đúng → xanh | Câu sai → đỏ | Đáp án đúng → xanh lá

---

## 37. STUDENT — BÀI TẬP VỀ NHÀ

Chỉ hiển thị assignment thuộc `class_id` của student.

Mỗi assignment hiển thị: Tên / Loại / Ngày giao / Deadline / Trạng thái

---

## 38. HISTORY

Nếu assignment đã hoàn thành, hiển thị lịch sử:

```
Attempt 1: Score | Time | Date
Attempt 2: Score | Time | Date
...
```

---

## 39. LÀM LẠI BÀI

Nếu Vocabulary đã làm ít nhất một lần → hiển thị:
- `Làm lại bài 4`
- `Học lại từ đầu`

---

## 40. LISTENING — PIPELINE

Teacher upload MP3 + Script.

AI tạo câu hỏi dựa trên **Script** (không phân tích audio):

```
MP3 + Script → AI → Questions → Assignment
```

---

## 41. LISTENING — QUESTION TYPES

- Dictation
- Multiple Choice

Teacher chọn số lượng câu.

---

## 42. DICTATION

Đề bài bắt buộc: **Điền không quá 2 từ vào chỗ trống.**

Đáp án không được vượt quá 2 từ.

---

## 43. LISTENING — AUDIO PLAYER

Tốc độ: `0.75x` / `1x` / `1.25x`

Controls: Play / Pause / Seek / Progress bar / Drag

Audio player phải responsive.

---

## 44. LISTENING SCORING

Giống Part 4: không hiển thị đúng/sai trong lúc làm. Chấm sau khi `Hoàn thành`.

Điều kiện đạt: `>= 80%`

---

## 45. GRAMMAR — TEACHER

Teacher upload Word chứa: Cấu trúc / Chuyên đề / Ví dụ / Giải thích

```
Word → AI → Phân tích → Chuẩn hóa grammar → Lưu DB
```

Teacher phải review trước khi publish.

---

## 46. GRAMMAR ASSIGNMENT

Teacher nhập chuyên đề (ví dụ: `Present Perfect`).

AI lấy vocabulary từ **Vocabulary Review Database** để tạo câu hỏi.

---

## 47. GRAMMAR DIFFICULTY

Teacher chọn số lượng câu theo độ khó:

```
Nhận biết: N câu
Vận dụng: N câu
Vận dụng cao: N câu
```

AI tạo đúng số lượng.

---

## 48. GRAMMAR SCORING

Giống Part 4: Timer, không báo đúng/sai ngay, submit → chấm, điều kiện đạt `>= 80%`.

---

## 49. TEACHER — ÔN TẬP TỪ VỰNG

Module riêng. Tổng hợp toàn bộ vocabulary từ tất cả lớp.

Hiển thị theo topic. Dữ liệu phải có: `topic / word / meaning / ipa / part_of_speech`

Không duplicate từ giống nhau trong cùng topic.

---

## 50. STUDENT — TỪ VỰNG

Hiển thị: Topic → Vocabulary (Word, IPA, Meaning, Part of speech, Audio)

---

## 51. STUDENT — ÔN TẬP VOCABULARY

Mỗi topic có `Làm bài ôn tập` → hệ thống tự lấy 20 câu dạng Part 4.

Chỉ ghi nhận hoạt động khi nhấn `Hoàn thành`.

---

## 52. STUDENT — GRAMMAR

Hiển thị: Chủ đề / Cấu trúc / Giải thích / Ví dụ

Grammar dùng chung cho tất cả lớp. Mỗi topic có `Làm bài ôn tập` → 10 câu.

---

## 53. STREAK — QUY TẮC

Một ngày được tính là **có hoạt động** khi student nhấn `Hoàn thành` ở bất kỳ bài tập nào.

**Không tính:** mở bài, xem từ vựng, đọc grammar, nghe audio, làm thử chưa submit.

---

## 54. STREAK — RESET

```
Ngày 1 → hoạt động
Ngày 2 → hoạt động
Ngày 3 → KHÔNG hoạt động → streak reset về 0
```

---

## 55. STREAK — HÌNH ẢNH

```
streak >= 2 → hiển thị Rắn đáng yêu (asset do teacher upload)
streak = 0  → hiển thị Rắn giận dữ (asset do teacher upload)
```

Không hard-code hình ảnh vào component.

---

## 56. LEADERBOARD

Trong assignment có Bảng xếp hạng, chỉ cho học sinh **Đã Đạt**.

**Xếp theo:** Số câu đúng DESC → Thời gian làm ASC

**Hiển thị:** Xếp hạng / Tên / Số câu đúng / Thời gian làm bài

Student chỉ xem leaderboard của lớp mình.

---

## 57. STUDENT — TỔNG KẾT

```
Chuỗi hiện tại
Số bài đã làm trong tháng
Số lần làm
Số câu đúng
```

Phân loại theo: Vocabulary / Grammar / Listening / Review

---

## 58. OTHER — TÀI LIỆU

Teacher upload PDF / Word. Student có thể xem/đọc/mở tài liệu.

Không tạo bài tập tự động cho module này trừ khi được yêu cầu.

---

## 59. FILE UPLOAD

Phải: kiểm tra extension, kiểm tra MIME type, giới hạn dung lượng, hiển thị progress, xử lý lỗi, lưu metadata, lưu Storage path.

Không lưu file binary trực tiếp vào database.

**Supabase Storage dùng cho:** Word / PDF / MP3 / Images

---

## 60. AI API SECURITY ⚠️

**TUYỆT ĐỐI KHÔNG** để OpenAI API key trong React frontend.

Frontend gọi → Supabase Edge Function hoặc Render backend → backend gọi AI API.

---

## 61. AI OUTPUT SCHEMA

```json
{
  "data": [],
  "metadata": {},
  "errors": []
}
```

Không parse output bằng substring/regex tùy tiện. Ưu tiên structured output / JSON schema.

---

## 62. DATABASE

### Entity chính

```
profiles
classes
class_students
vocab_topics
vocabularies
grammar_topics
grammar_questions
listening_materials
assignments
assignment_questions
assignment_attempts
assignment_answers
student_progress
streaks
tuition_records
documents
```

### Relationships

```
Teacher → Classes → Students
Teacher → Assignment → Class → Students → Attempts → Answers
Topic → Vocabulary → Assignment
Grammar Topic → Question Bank → Assignment
Audio + Script → AI Questions → Assignment
```

---

## 63. SUPABASE RLS

Student chỉ được đọc: dữ liệu bản thân, dữ liệu class mình, assignment được giao, leaderboard class mình.

Teacher chỉ được thao tác: các class/student/assignment thuộc quyền quản lý.

Không dựa hoàn toàn vào frontend để bảo mật.

---

## 64. DATA VALIDATION

Validate ở: Frontend + Backend + Database

`score`, `attempt`, `class_id`, `student_id`, `assignment_id` phải được kiểm tra server-side.

---

## 65. ERROR HANDLING

Mọi API phải xử lý: `loading` / `success` / `empty` / `error` / `retry`

Không để Unhandled Promise Rejection. Không hiển thị lỗi kỹ thuật cho user.

---

## 66. LOADING & EMPTY STATE

- Không để màn hình trắng khi loading → dùng Skeleton / Spinner
- Empty state phải có message rõ ràng:
  - Không có assignment → `Chưa có bài tập được giao.`
  - Không có vocabulary → `Chưa có từ vựng trong chủ đề này.`
  - Không có history → `Chưa có lịch sử làm bài.`

---

## 67. ASSIGNMENT ENGINE ARCHITECTURE

```
Assignment Engine
├── Vocabulary Adapter
├── Grammar Adapter
└── Listening Adapter
```

Không tạo engine riêng biệt nếu có thể dùng chung core.

---

## 68. TIMER

Timer phải tính dựa trên `started_at` timestamp, không chỉ `setInterval(() => time++, 1000)`.

---

## 69. ANTI-CHEAT CƠ BẢN

Không tin `score` hay `duration` từ frontend. Server phải xác thực dữ liệu.

Student không được sửa `score`, `passed`, `correct_count` bằng DevTools.

---

## 70. MOBILE ASSIGNMENT

- Timer luôn nhìn thấy
- Nút submit dễ bấm
- Answer button không quá nhỏ
- Flashcard không overflow
- Matching chuyển thành layout phù hợp
- Audio player dễ thao tác bằng ngón tay
- Không dùng hover làm interaction bắt buộc

---

## 71. ACCESSIBILITY

- Button có thể click bằng keyboard
- Input phải có `label`
- Icon button phải có `aria-label`

---

## 72. PERFORMANCE

- Không gọi AI lại nếu dữ liệu đã được tạo
- Không gọi API mỗi lần render
- Dùng memoization / pagination / debounce / lazy loading khi phù hợp

---

## 73. AI COST CONTROL

Chỉ gửi context cần thiết. Không gửi toàn bộ database nếu chỉ cần một phần nhỏ.

AI retry nếu JSON lỗi, nhưng giới hạn số lần retry.

---

## 74. TEACHER REVIEW FLOW

```
AI Generated → Preview → Teacher Review → Edit
→ Delete question nếu cần → Confirm → Assign
```

Không tự động giao bài ngay sau khi AI tạo.

---

## 75. QUESTION EDITOR

Teacher có thể: Edit / Delete / Add / Change answer / Change question / Change difficulty

Trắc nghiệm hiển thị đầy đủ A/B/C/D và Correct Answer trong màn hình review.

---

## 76. QUESTION VALIDATION

Trước khi Teacher nhấn `Giao bài`, phải kiểm tra:
```
Có question? Có answer? Có class? Có assignment title? Có đủ dữ liệu?
```
Nếu thiếu → không cho giao.

---

## 77. CODE STYLE

```
Clean Code / DRY / Single Responsibility
Reusable Components / Service Layer / Custom Hooks / Constants
```

Không viết component khổng lồ vài nghìn dòng. Tách component nếu quá lớn.

---

## 78. SCORE CONSTANT

```js
// constants/scoring.js
export const PASSING_SCORE = 80;
```

Không hard-code `80` ở nhiều nơi.

---

## 79. STREAK SERVICE

```
streakService.js
```

UI chỉ gọi `getStreak()` và render. Không tính streak trong component UI.

---

## 80. KHÔNG ĐƯỢC LÀM ❌

AI KHÔNG được:
- Đổi framework / database / authentication
- Tạo API key frontend
- Tạo fake API nếu yêu cầu production
- Tạo mock data rồi quên thay thế
- Hard-code: user, class, assignment, score, tuition, streak
- Tạo duplicate service / Supabase client
- Sửa module không liên quan
- Xóa code cũ nếu chưa xác định dependency
- Thêm feature chưa được yêu cầu (Chat, Notification, Payment Gateway, AI Chatbot, Badge, Achievement, ...)

---

## 81. MOCK DATA

Chỉ sử dụng khi được yêu cầu demo UI.

Nếu yêu cầu **code chức năng thật** → phải chuẩn bị: Supabase / Service / Database / API / State / Error handling.

---

## 82. DATABASE MIGRATION

Không tự ý `DROP TABLE` / `DROP COLUMN` trừ khi được yêu cầu.

Tạo migration mới khi cần thay đổi schema. Migration phải có khả năng rollback.

---

## 83. KHÔNG TRỘN LOGIC

```
Tuition logic     → không đặt trong student page
Assignment gen    → không đặt trong dashboard component
Business logic    → services / hooks / backend
UI                → chỉ hiển thị
```

---

## 84. QUY TẮC SỬA CODE

Khi nhận yêu cầu `Sửa chức năng X`, AI phải:
1. Xác định file liên quan
2. Không viết lại toàn bộ project
3. Không thay đổi API/database/UI không liên quan
4. Chỉ trả về phần cần thay đổi hoặc file hoàn chỉnh nếu cần

---

## 85. PRIORITY (khi có xung đột)

```
HTML demo < AI_CODING_SPEC.md < Yêu cầu mới nhất của người dùng
```

Khi yêu cầu mới thay đổi spec, AI phải chỉ ra phần specification nào bị thay đổi.

---

## 86. LỆNH ĐIỀU KHIỂN

| Lệnh | Hành động |
|---|---|
| `Code: [Chức năng]` | Code chức năng đó |
| `Analyze: [Chức năng]` | Chỉ phân tích architecture, không code |
| `Fix: [Lỗi]` | Chỉ sửa lỗi |
| `Refactor: [Module]` | Chỉ refactor module đó |
| `Database: [Chức năng]` | Chỉ tạo migration/schema/policy |
| `API: [Chức năng]` | Chỉ xử lý service/API/backend |
| `UI: [Chức năng]` | Chỉ xử lý giao diện |

---

## 87. FORMAT TRẢ LỜI BẮT BUỘC

Khi code, câu trả lời phải có:

```
## Module
## Scope
## Files
## Database changes
## Implementation
## Integration
## Environment Variables
## Testing Checklist
## Notes
```

Mỗi code block phải có filename ở đầu:
```js
// src/services/tuitionService.js
```

---

## 88. FEATURE STATUS

```
PLANNED → IN PROGRESS → IMPLEMENTED → TESTING → DONE
```

Một feature DONE phải có: UI + Database + Service/API + Validation + Authorization + Error handling + Responsive + Testing.

---

## 89. TESTING CHECKLIST (mẫu)

```
[ ] Teacher tạo assignment
[ ] Student nhận assignment
[ ] Student làm bài
[ ] Submit
[ ] Score được lưu
[ ] Attempt được tạo
[ ] Streak cập nhật
[ ] Leaderboard cập nhật
[ ] Mobile responsive
[ ] Không lỗi khi không có dữ liệu
```

---

## 90. DEPLOYMENT CHECKLIST

```
[ ] Không có API key frontend
[ ] Environment variables đúng
[ ] Supabase RLS bật
[ ] Storage policy đúng
[ ] Edge Function hoạt động
[ ] CORS đúng
[ ] Netlify build thành công
[ ] Không còn mock data
[ ] Không còn console.error
```

---

## 91. MỤC TIÊU CUỐI CÙNG

### TEACHER
```
Dashboard / Quản lý học sinh / Học phí / Quản lý bài tập
Bài tập từ vựng / Ôn tập từ vựng / Ngữ pháp / Listening / Tài liệu
```

### STUDENT
```
Trang chủ / Bài tập về nhà / Học phí / Từ vựng
Ngữ pháp / Tổng kết / Tài liệu / Profile / Đăng xuất
```

### CORE ENGINE
```
Authentication / Authorization / Assignment Engine / Question Engine
Attempt Engine / Score Engine / Streak Engine / Leaderboard Engine
AI Generation Engine / File Upload Engine / Tuition Engine
```

---

## 92. NGUYÊN TẮC CỐT LÕI

> **Không cần code nhiều nhất. Cần code đúng nhất và không phá phần đã làm.**

Mọi implementation mới phải là một module độc lập có thể tích hợp vào hệ thống hiện tại.

**Không được hy sinh kiến trúc dài hạn để giải quyết nhanh một chức năng ngắn hạn.**

---

*Mochi Study · AI_CODING_SPEC.md · Single Source of Truth*
