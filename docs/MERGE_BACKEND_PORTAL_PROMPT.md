# HƯỚNG DẪN HOÀN THIỆN LIÊN KẾT BACKEND THẬT & PHÂN CHIA LUỒNG LANDING / PORTAL
> Dành cho Claude Code / AI Coding Assistant. Sao chép toàn bộ nội dung dưới đây và chạy để AI tự động thực hiện.

---

## 📌 Bối cảnh & Mục tiêu
Repo hiện tại có backend Express (cổng 4000) đã xử lý xong 3,365 tin tuyển dụng thật từ TopCV (crawl 17/07/2026) và Next.js frontend (cổng 3000) mới được merge từ nhánh `andy's_code`. 

Cần tái cấu trúc frontend Next.js để tách biệt rõ ràng thành **2 luồng trải nghiệm chính** sử dụng dữ liệu thực tế từ backend (không dùng mock):
1.  **Luồng 1: Landing Page Công khai (`/`)**: 
    - Trang chủ giới thiệu, hiển thị biểu đồ thị trường chung `MarketCharts` fetch từ backend thật.
    - Hộp chat AI phỏng vấn khảo sát nhanh 10 câu quickstart thật.
    - Khi phỏng vấn xong, hệ thống tạo profile mới trên backend, nộp câu trả lời và **chuyển hướng (Redirect)** học sinh tới Portal cá nhân qua URL `/profile/[id]`.
2.  **Luồng 2: Student Portal Cá nhân hóa (`/profile/[id]`)**:
    - Trang dashboard riêng tư của học sinh.
    - Hiển thị thông tin cá nhân, sơ đồ RIASEC / Holland Code (tính toán động điểm cộng/trừ 10 câu hỏi theo đặc tả Canvas).
    - Hiển thị cờ cảnh báo mâu thuẫn (cờ phản chứng) giữa câu 1-8 với câu 10 (ví dụ thích Kế toán nhưng ngại ngồi yên một chỗ) và hạ độ tin cậy.
    - Hiển thị Lộ trình kép song song gợi ý (Đại học vs Học nghề) khớp từ API `/api/profile/:id/pathways` thật, highlight các từ khóa trùng khớp giữa sở thích và tin tuyển dụng.
    - Cho phép tự khai báo/tải lên chứng chỉ, học bạ, trải nghiệm ngoại khóa (`POST /api/profile/:id/assessment`) để cập nhật trực tiếp vào Evidence Ledger.

---

## ⚠️ LƯU Ý QUAN TRỌNG VỀ UI/UX & HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM)
**Yêu cầu bắt buộc**: Phải tuân thủ nghiêm ngặt phong cách thiết kế UI/UX, bảng màu, phông chữ, các lớp CSS Tailwind, các hiệu ứng chuyển động vi mô (micro-animations), và bố cục HTML gốc của Andy kết hợp với Hệ thống thiết kế sau:

### 1. Quy chuẩn Thị giác & Bảng màu (Visual & Palette)
*   **Typography (Phông chữ):**
    *   *Nội dung & Số liệu bảng:* Sử dụng font `Inter` làm mặc định để đảm bảo dễ đọc nhất.
    *   *Tiêu đề (Headings H1-H6):* Sử dụng font `Outfit` (Sans-serif hình học hiện đại) để làm nổi bật cấu trúc.
    *   *Hero & Stats đặc biệt:* Sử dụng font `Unbounded` (geometric font cách điệu) cho các số liệu thống kê hoặc chỉ số quan trọng để tạo cảm giác cao cấp.
*   **Bảng màu (Indigo Palette):**
    *   *Primary (Chủ đạo):* `#3525CD` (Indigo tinh tế) cho các nút hành động chính, tiêu điểm, và link nổi bật.
    *   *Primary Hover:* `#1E00A9` (Indigo sậm khi hover).
    *   *Base Background:* `#F8FAFC` (Xám trắng dịu mắt cho nền của trang Portal cá nhân).
    *   *Primary Text:* `#131B2E` (Navy đen sâu cho tiêu đề và nội dung chính).
    *   *Secondary Text:* `#464555` (Xám mô tả cho chú thích và nhãn phụ).
    *   *Border Color:* `#C7C4D8` (Xám tím nhạt cho các đường viền Card mảnh).
*   **Đường nét & Chiều sâu:** Bo góc `rounded-xl` (12px) cho các Card lớn, `rounded-lg` (8px) cho Inputs và Buttons. Sử dụng đổ bóng cực nhẹ (`shadow-[0_1px_2px_rgba(15,23,42,0.05)]`) hoặc đường viền mảnh thay vì hiệu ứng đổ bóng dày đặc.
*   **Biểu đồ SVG/CSS thô**: Giữ nguyên các biểu đồ vẽ bằng SVG và HTML/CSS thô của andy trong `MarketCharts.tsx` và `PersonalPanel.tsx`. Không sử dụng Recharts hoặc các thư viện biểu đồ khác để đảm bảo tính gọn nhẹ và kiểm soát visual tốt nhất theo ràng buộc của đề bài. Chỉ ánh xạ dữ liệu thật và vẽ cột theo tỷ lệ tương đối.

### 2. Các UX Patterns nâng cao
*   **Đồng bộ hóa Tab-State với URL (URL Params):** Đối với trang Portal cá nhân `/profile/[id]` có chia nhiều Tab (ví dụ: Lộ trình kép, Xu hướng thị trường, Thêm học bạ), **bắt buộc** phải sử dụng React Router `useSearchParams` để đồng bộ trạng thái Tab kích hoạt lên URL Query Params (ví dụ: `?tab=roadmap`). Tránh việc khi F5 hoặc quay lại trang, học sinh bị đẩy về tab mặc định thứ nhất.
*   **Khắc phục lỗi React State Batching (Stale State):** Khi học sinh tự nộp thêm chứng chỉ hoặc auto-fill thông tin học bạ để cập nhật Evidence Ledger, hãy tính toán trước danh sách trường được điền vào một biến cục bộ, sau đó cập nhật song song cả Form Data lẫn State thông báo một cách độc lập để tránh bị stale state do cơ chế batching của React.
*   **Tương thích thiết bị di động:** Đảm bảo toàn bộ form tự khai báo (Evidence Ledger) co giãn `w-full` và cuộn dọc độc lập (`overflow-y-auto`) trên Mobile.

---

## 🛠️ Danh sách việc cần làm (Todo List) cho AI

### 1. Phân tách Luồng 1: Landing Page & Chatbox tại `frontend/src/app/page.tsx`
Hãy sửa file `frontend/src/app/page.tsx` để:
- Chỉ chứa trang Landing Page công khai, Navbar, Hero, các khối FAQ, Problem, HowItWorks và biểu đồ thị trường chung `MarketCharts` lọc theo Toàn quốc.
- Chatbox AI `ChatPanel` sẽ khảo sát 10 câu hỏi quickstart thật (lấy từ backend `QUICKSTART_QUESTIONS` hoặc khai báo sẵn).
- Khi kết thúc phỏng vấn chat:
  1. Gọi `POST http://localhost:4000/api/profile` để lấy `profile_id`.
  2. Nộp 10 câu trả lời lên `POST http://localhost:4000/api/profile/:id/quickstart`.
  3. Sau khi nộp thành công, thay vì mở dashboard tại chỗ (SPA), hãy dùng `router.push('/profile/' + profile_id)` để chuyển hướng học sinh sang Portal cá nhân!
  4. Lưu `profile_id` và tên học sinh vào `localStorage` để Navbar tự động hiện nút **"Hồ sơ của tôi"**.

### 2. Xây dựng Luồng 2: Student Portal tại `frontend/src/app/profile/[id]/page.tsx`
Tạo mới hoặc viết lại file `/profile/[id]/page.tsx` làm trang Portal chính thức:
- **Tải dữ liệu Snapshot & Evidence gốc**: Gọi `GET http://localhost:4000/api/profile/:id` để lấy `{ snapshot, evidence }`.
- **Tính toán điểm số RIASEC & Nhóm ngành thế mạnh**:
  - Viết thuật toán cộng/trừ điểm từ 10 câu quickstart theo đặc tả Canvas:
    - Nhóm 1: Công nghệ & Dữ liệu (IT / Data)
    - Nhóm 2: Kinh doanh & Tiếp thị (Business / Marketing)
    - Nhóm 3: Tài chính & Tổ chức (Finance / Accounting)
    - Nhóm 4: Kỹ thuật & Công nghệ vật lý (Engineering / Mechanics)
    - Nhóm 5: Y khoa & Khoa học sự sống (Healthcare / Biology)
    - Nhóm 6: Giáo dục & Dịch vụ xã hội (Education / Services)
    - Nhóm 7: Sản xuất & Nông nghiệp vận tải (Manufacturing / Logistics)
    - Nhóm 9: Mỹ thuật & Thiết kế sáng tạo (Design / Arts)
  - Quy tắc cộng điểm: Q1 chọn *Con số, dữ liệu* -> `+4`, `+7`; Q4 chọn *Toán, Lý, Tin* -> `+1`, `+4`, `+3`...
  - Quy tắc trừ điểm phản chứng (Câu 10): 
    - Chọn *Ngồi yên một chỗ* -> `-3`, `-7`, `+2`, `+4`, `+6`.
    - Chọn *Giao tiếp liên tục* -> `-2`, `-6`, `+1`, `+3`, `+4`.
    - Chọn *Làm việc mơ hồ* -> `-9`, `-2`, `+3`, `+4`.
    - Chọn *Áp lực deadline* -> `-2`, `-5`, `+3`, `+6`.
  - Sắp xếp và hiển thị Top 3 nhóm ngành thế mạnh bằng thanh tiến độ màu sắc gradient.
- **Kích hoạt Cờ mâu thuẫn (Conflict Warning)**:
  - Nếu trước đó (Q1-8) đẩy mạnh nhóm ngành $X \ge 2$ điểm nhưng câu 10 lại chọn phương án trừ nhóm $X$, hiển thị banner cảnh báo màu vàng nổi bật: *"Bạn quan tâm đến nhóm ngành X nhưng lại e ngại tính chất công việc Y..."*, hạ mức độ tin cậy xuống **Trung bình (Có mâu thuẫn)**.
  - Ngược lại, hiển thị mức độ tin cậy **Cao (Nhất quán)** màu xanh lá.
- **Hiển thị Lộ trình kép song song gợi ý (Pathway Portfolio)**:
  - Gọi `GET http://localhost:4000/api/profile/:id/pathways` để lấy các candidates thật.
  - Vẽ dải lương trung vị, tỉ lệ tuyển dụng cho người mới, top kỹ năng chuyên môn yêu cầu.
  - **Khối bằng chứng khớp nối (Why this path?)**: Hiện rõ học sinh đã trả lời câu hỏi nào khớp với tên ngành/kỹ năng của ngành đó, highlight các từ khóa trùng khớp (`matched_tokens`).
- **Khai báo Chứng chỉ & Học bạ (Evidence Ledger)**:
  - Vẽ form cho phép học sinh tự khai báo kết quả học tập (điểm GPA, SAT, IELTS, hay các chứng chỉ/hoạt động ngoại khóa khác).
  - Nộp qua API `POST http://localhost:4000/api/profile/:id/assessment` để backend tự động lưu vào ledger và tính toán lại lộ trình ngay tại chỗ.

---

## ✏️ Code mẫu gợi ý tích hợp

### A. API Endpoint Base URL cấu hình
Tạo hằng số API ở đầu các file frontend:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
```

### B. Logic tính điểm RIASEC & Cờ mâu thuẫn Canvas trong `/profile/[id]/page.tsx`
```typescript
const calculateStrengths = (evidenceList: any[]) => {
  const quickstartAnswers: Record<string, string> = {};
  evidenceList.forEach((ev) => {
    if (ev.source_type === "self_report") {
      ev.claims?.forEach((claim: any) => {
        quickstartAnswers[claim.dimension] = claim.value;
      });
    }
  });

  const scores: Record<string, { score: number; name: string; desc: string; color: string }> = {
    "1": { score: 0, name: "Công nghệ & Dữ liệu", desc: "Phân tích, viết code, quản trị hệ thống, xử lý con số", color: "bg-teal-500" },
    "2": { score: 0, name: "Kinh doanh & Tiếp thị", desc: "Thuyết phục, thương lượng, lập kế hoạch kinh doanh, bán hàng", color: "bg-amber-500" },
    "3": { score: 0, name: "Tài chính & Tổ chức", desc: "Kiểm toán, lưu trữ, tuân thủ quy trình, tối ưu ngân sách", color: "bg-blue-500" },
    "4": { score: 0, name: "Kỹ thuật & Công nghệ vật lý", desc: "Chế tạo, sửa chữa máy móc, thiết kế phần cứng, vận hành thiết bị", color: "bg-indigo-500" },
    "5": { score: 0, name: "Y khoa & Khoa học sự sống", desc: "Nghiên cứu sinh học, hóa dược, chăm sóc bệnh nhân, điều trị", color: "bg-emerald-500" },
    "6": { score: 0, name: "Giáo dục & Dịch vụ xã hội", desc: "Giảng dạy, tư vấn tâm lý, hòa giải, tổ chức hoạt động cộng đồng", color: "bg-pink-500" },
    "7": { score: 0, name: "Sản xuất & Nông nghiệp vận tải", desc: "Giao nhận, chuỗi cung ứng, trồng trọt, giám sát công trình", color: "bg-orange-500" },
    "9": { score: 0, name: "Mỹ thuật & Thiết kế sáng tạo", desc: "Vẽ minh họa, thiết kế đồ họa, sáng tác nhạc, trang trí không gian", color: "bg-purple-500" }
  };

  const checkAnswer = (dim: string, keyword: string) => {
    const val = quickstartAnswers[dim];
    return val && val.toLowerCase().includes(keyword.toLowerCase());
  };

  // Q1
  if (checkAnswer("đối tượng làm việc cuốn hút", "máy móc")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "con số")) { scores["3"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "con người")) { scores["5"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "ý tưởng")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Q2
  if (checkAnswer("vai trò trong dự án nhóm", "dẫn dắt")) { scores["2"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "kế hoạch")) { scores["3"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "kết nối")) { scores["6"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "khó nhất")) { scores["1"].score += 1; scores["4"].score += 1; }

  // Q3
  if (checkAnswer("nguồn gốc sự thỏa mãn", "sửa được")) { scores["4"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "tìm ra quy luật")) { scores["3"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "tiến bộ")) { scores["5"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "chưa ai làm")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Q4
  if (checkAnswer("môn học hoạt động dễ chịu", "toán")) { scores["1"].score += 1; scores["4"].score += 1; scores["3"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "văn")) { scores["6"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "sinh")) { scores["5"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "mỹ thuật")) { scores["9"].score += 1; }

  // Q5
  if (checkAnswer("đối tượng muốn xây dựng", "vô hình")) { scores["1"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "sờ được")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "thuộc về con người")) { scores["6"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "thuộc về cái đẹp")) { scores["9"].score += 1; }

  // Q6 (chọn nhiều)
  if (checkAnswer("năng lực nổi trội tự nhận", "logic")) { scores["1"].score += 1; scores["3"].score += 1; scores["4"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "viết")) { scores["2"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "nhớ chi tiết")) { scores["3"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "vẽ")) { scores["9"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "tay chân")) { scores["4"].score += 1; scores["7"].score += 1; }

  // Q7
  if (checkAnswer("phương thức xử lý dữ liệu", "kiểm tra")) { scores["3"].score += 1; }
  if (checkAnswer("phương thức xử lý dữ liệu", "tìm insight")) { scores["1"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("phương thức xử lý dữ liệu", "trình bày")) { scores["2"].score += 1; scores["6"].score += 1; }

  // Q8
  if (checkAnswer("môi trường làm việc mong muốn", "hiện trường")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "văn phòng")) { scores["3"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "tiếp xúc")) { scores["6"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "tự do")) { scores["9"].score += 1; scores["1"].score += 1; }

  // Q9
  if (checkAnswer("độ mở định hướng nghề", "ổn định")) { scores["3"].score += 1; scores["6"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("độ mở định hướng nghề", "nghề mới")) { scores["1"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("độ mở định hướng nghề", "tự làm chủ")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Tính mâu thuẫn (câu 10 phản chứng)
  let hasConflict = false;
  let conflictText = "";
  const baseScores = JSON.parse(JSON.stringify(scores));

  if (checkAnswer("yếu tố né tránh trong công việc", "lặp đi lặp lại")) {
    scores["3"].score -= 1; scores["7"].score -= 1;
    scores["2"].score += 1; scores["4"].score += 1; scores["6"].score += 1;
    if (baseScores["3"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn quan tâm đến các quy tắc và tính tổ chức (Tài chính / Kế toán), nhưng lại e ngại công việc lặp đi lặp lại. Đây là điểm đáng khám phá khi chọn công việc cụ thể.";
    }
  }
  else if (checkAnswer("yếu tố né tránh trong công việc", "giao tiếp")) {
    scores["2"].score -= 1; scores["6"].score -= 1;
    scores["1"].score += 1; scores["3"].score += 1; scores["4"].score += 1;
    if (baseScores["2"].score >= 2 || baseScores["6"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn e ngại việc thuyết phục hoặc tiếp xúc người lạ liên tục, dù mong muốn làm việc trong nhóm hoặc có tiềm năng dẫn dắt.";
    }
  }
  else if (checkAnswer("yếu tố né tránh trong công việc", "mơ hồ")) {
    scores["9"].score -= 1; scores["2"].score -= 1;
    scores["3"].score += 1; scores["4"].score += 1;
    if (baseScores["9"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn hướng tới nghệ thuật và sự sáng tạo độc lập, nhưng lại e ngại môi trường làm việc mơ hồ, không có đáp án đúng.";
    }
  }
  else if (checkAnswer("yếu tố né tránh trong công việc", "áp lực")) {
    scores["2"].score -= 1; scores["5"].score -= 1;
    scores["3"].score += 1; scores["6"].score += 1;
  }

  const sorted = Object.entries(scores)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.score - a.score);

  return { sorted, hasConflict, conflictText };
};
```

---

## 🚀 Hướng dẫn thực hiện chạy
Hãy quét toàn bộ mã nguồn Next.js frontend hiện tại và hoàn thành các nhiệm vụ trên để tạo ra cấu trúc 2 luồng hoàn hảo, kết nối hoàn toàn với Express API của backend thật. Hãy chạy `npm run build` để kiểm tra biên dịch trước khi báo cáo kết quả hoàn thành!
