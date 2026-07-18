# Prompt cho Antigravity — Giao diện La Bàn Nghề

> Copy toàn bộ nội dung dưới đây vào Antigravity. Đây là spec cho phần UI/visual — data pipeline,
> backend API đã có sẵn và ĐANG CHẠY THẬT, không cần dựng lại.

---

## Bối cảnh sản phẩm

"La Bàn Nghề" — công cụ hỗ trợ học sinh Việt Nam (lớp 10-12) khám phá lộ trình học tập/nghề nghiệp
dựa trên tín hiệu thị trường lao động thật, không phải máy phán nghề. Đây là **decision-support
system**: luôn trình bày nhiều lựa chọn có giải thích, không phải 1 kết quả duy nhất mang tính
quyết định thay học sinh. Thi VAIC 2026 (hackathon 48h), track Giáo dục.

Repo hiện có backend Express (port 4000) đã xử lý xong 3,365 tin tuyển dụng thật từ TopCV (crawl
17/07/2026) và expose qua API. Frontend Next.js đã có 2 route stub với dữ liệu thô (chưa có style).
Việc của Antigravity: **thiết kế lại giao diện 2 route này cho đẹp/đúng brand**, KHÔNG đổi logic
fetch data hay tạo API mới.

## Ràng buộc kỹ thuật — đọc kỹ trước khi code

- Next.js **16.2** (App Router), TypeScript, Tailwind CSS **v4**.
- Tailwind v4 dùng CSS-based theme tokens qua `@theme` trong `frontend/src/app/globals.css` —
  **KHÔNG có `tailwind.config.js`**. Thêm màu bằng cách khai báo CSS variable trong `@theme`, ví dụ:
  ```css
  @theme inline {
    --color-brand-teal: #00707E;
    --color-brand-green: #5FAE82;
  }
  ```
  rồi dùng class `bg-brand-teal`, `text-brand-green`, v.v.
- Next.js 16 có breaking changes so với các bản cũ hơn — nếu không chắc API nào đó còn đúng, đọc
  `frontend/node_modules/next/dist/docs/` trước khi dùng, đừng suy đoán từ kiến thức cũ.
- File cần sửa/tạo: `frontend/src/app/page.tsx` (trang chủ), `frontend/src/app/dashboard/page.tsx`
  (dashboard thị trường), `frontend/src/app/profile/quickstart/page.tsx` (luồng quickstart),
  `frontend/src/app/profile/[id]/page.tsx` (xem hồ sơ), `frontend/src/app/profile/[id]/pathways/page.tsx`
  (Pathway Portfolio — TẠO MỚI), `frontend/src/app/globals.css` (theme tokens). Có thể tạo thêm
  component trong `frontend/src/components/`.
- Các route profile cần interactivity (stepper, form) → dùng Client Component (`"use client"`) và
  fetch từ browser tới `http://localhost:4000` (đọc từ `NEXT_PUBLIC_API_URL`). Backend đã bật CORS.
- Route `/dashboard` hiện là **Server Component async** fetch trực tiếp từ
  `${NEXT_PUBLIC_API_URL}/api/market/snapshot` (mặc định `http://localhost:4000`) — giữ nguyên
  cách fetch này (không chuyển sang client-side fetch trừ khi cần interactivity, ví dụ filter).
- Nếu cần chart: dùng **Recharts** (đã thống nhất trong CONTEXT_PROMPT.md).
- Đừng tạo trang mới ngoài 2 route trên trừ khi thực sự cần cho luồng UX mô tả bên dưới.

## Hệ thống màu (Color system)

Từ brand guide "VEX Technology Solutions" (thiết kế bởi GNT DESIGN) — dùng làm nền tảng màu cho sản
phẩm:

| Vai trò | Tên | Hex | RGB | CMYK |
|---|---|---|---|---|
| Màu chính (primary) | Dark Cyan | `#00707E` | R:0 G:112 B:126 | C:89 M:42 Y:43 K:12 |
| Màu phụ (secondary) | *(xem ghi chú)* | ~`#5FAE82` (ước lượng) | — | — |

**⚠️ Lưu ý quan trọng**: trong file gốc, cả 2 swatch màu đều bị ghi nhãn "Dark cyan / 00707E" giống
hệt nhau dù 1 màu là xanh dương-lục đậm (teal) và 1 màu là xanh lá (green) — rõ ràng là lỗi copy-paste
trong tài liệu gốc. Antigravity nên dùng `#00707E` cho màu chính (khớp cả nhãn lẫn hình), và dùng một
tông xanh lá sea-green làm màu phụ ở mức ước lượng `#5FAE82` — **xác nhận lại mã hex chính xác với
team trước khi chốt màu cho bản build cuối**, đừng coi số liệu ước lượng này là tuyệt đối.

Dùng màu chính (teal) cho: header/nav, nút hành động chính (CTA), highlight số liệu quan trọng. Dùng
màu phụ (green) cho: trạng thái tích cực/thành công, badge "đã xác nhận"/"có bằng chứng", accent phụ.
Không dùng 2 màu này để tạo phân cực kiểu "tốt/xấu" giữa 2 lộ trình khác nhau (đại học vs học nghề) —
tránh vô tình gây ấn tượng 1 hướng "cao cấp hơn" hướng kia (xem mục Nguyên tắc UX bên dưới).

Nền: trắng/xám rất nhạt ở light mode, giữ độ tương phản đủ cao cho học sinh đọc trên điện thoại
ngoài trời. Hỗ trợ dark mode cơ bản (đã có sẵn cấu trúc `prefers-color-scheme` trong globals.css).

## Nguyên tắc UX/đạo đức bắt buộc (từ docs/BA_DESIGN.md — không phải tuỳ chọn)

Đây là tiêu chí chấm điểm trọng số cao nhất của cuộc thi — vi phạm những điều này ảnh hưởng trực
tiếp đến điểm số, không chỉ là "nice to have":

- **Không có nút/khung nào tạo cảm giác "quyết định thay học sinh"**. Ngôn ngữ luôn ở dạng tham khảo:
  "có thể phù hợp", "đáng cân nhắc" — không dùng "bạn nên chọn X" hay "kết quả của bạn là X".
  (ETH-01)
- **Không bao giờ hiển thị 1 kết quả duy nhất (top-1)**. Bất kỳ danh sách gợi ý lộ trình nào cũng
  phải có ít nhất 3 lựa chọn khác họ ngành, và có ít nhất 1 lựa chọn thuộc tuyến học nghề/kỹ thuật
  được trình bày ngang hàng về mặt hình ảnh với tuyến đại học — không được làm nhỏ hơn/mờ hơn/xếp
  dưới. (ETH-03, ETH-05)
- **Không tạo nhãn tính cách cố định kiểu MBTI/Holland** ("Bạn là người hướng ngoại", "Type: Explorer").
  Nếu hiển thị hồ sơ học sinh, dùng ngôn ngữ "đang khám phá", có thể thay đổi, không phải nhãn dán cố định.
- **Mọi con số/claim thị trường phải có nguồn và cỡ mẫu đi kèm** — không hiển thị số liệu trần trụi.
  Ví dụ: không viết "Lương ngành X: 20 triệu" mà phải "Lương trung vị ngành X: 20 triệu (n=96 tin có
  lương công khai)". Dữ liệu API đã có sẵn field `sample_size`/`n` — LUÔN hiển thị nó cạnh con số.
- **Khi mẫu quá nhỏ hoặc thiếu dữ liệu, hiển thị rõ "chưa đủ dữ liệu"** thay vì ẩn đi hoặc suy diễn.
  API đã trả về field `coverage` với ratio rõ ràng (ví dụ chỉ 39.6% tin có mô tả chi tiết) — phải
  hiển thị banner/note minh bạch về giới hạn dữ liệu này ở đầu trang Dashboard, không giấu.
- **"Nhu cầu tuyển dụng cao" ≠ "thiếu hụt nhân lực"**. Dữ liệu hiện tại chỉ là demand signal (số tin
  đăng), KHÔNG có bằng chứng phía cung — vì vậy copy UI phải dùng từ "nhu cầu tuyển dụng cao"/"đang
  được tìm nhiều", tuyệt đối không dùng từ "thiếu hụt", "khan hiếm nhân lực" cho các con số này.
- **Không dùng giới tính/vùng miền để gợi ý hoặc loại trừ nghề**. Không có filter/toggle nào theo
  giới tính trong UI.

## Chi tiết màn hình cần thiết kế

### 1. `/dashboard` — Labor Skill Radar (tương ứng BA_DESIGN.md F-01)

Thay bảng HTML thô hiện tại bằng dashboard trực quan, layout dạng card/grid:

- **Banner minh bạch dữ liệu** ở đầu trang (bắt buộc, xem nguyên tắc ở trên): tổng số tin, % có mô
  tả chi tiết, % có lương công khai vs thoả thuận — dùng ngôn ngữ giống `coverage.note` từ API.
- **Top kỹ năng yêu cầu**: bar chart ngang (Recharts `BarChart` horizontal), top 15 từ
  `top_skills_required`.
- **Phân bổ ngành nghề**: bar chart hoặc donut chart từ `industries`.
- **Lương trung vị theo ngành**: bar chart hoặc bảng từ `salary_by_industry`, MỖI thanh/dòng phải
  hiển thị `sample_size` cạnh giá trị (ví dụ label "20 triệu (n=96)"). Sắp theo giá trị hoặc theo
  sample_size, ghi rõ trong UI đây là median của nhóm có lương công khai, không phải toàn bộ ngành.
- **Phân bố theo vùng/tỉnh**: bar chart từ `provinces`.
- Responsive: ưu tiên mobile-first vì đối tượng chính là học sinh dùng điện thoại.

### 2. `/` — Trang chủ

Trang này hiện chỉ là placeholder text. Thiết kế lại thành landing đơn giản:

- Hero ngắn giới thiệu sản phẩm bằng ngôn ngữ đúng tinh thần "công cụ tham khảo, học sinh tự quyết".
- CTA chính: "Bắt đầu khám phá" → dẫn tới `/profile/quickstart` (luồng tạo hồ sơ, xem mục 3).
- CTA phụ: "Xem thị trường việc làm" → `/dashboard`.

### 3. `/profile/quickstart` — Luồng quickstart tạo hồ sơ (BA_DESIGN.md F-02) — **BACKEND ĐÃ CHẠY THẬT**

Luồng 8 câu hỏi để học sinh dựng hồ sơ ban đầu trong ~5 phút. Backend đã có đầy đủ API (xem contract
bên dưới) — Antigravity chỉ cần dựng UI client-side gọi các API này.

**Yêu cầu UX quan trọng nhất: hiển thị TỪNG CÂU MỘT** (dạng conversational/stepper, có progress
indicator kiểu "3/8"), KHÔNG hiển thị cả 8 câu thành 1 form dài — đề bài cấm "trắc nghiệm tính cách
đơn thuần", cảm giác phải là cuộc trò chuyện đang dựng dần hồ sơ. Chi tiết:

- Câu `type: "text"` → textarea tự do, placeholder thân thiện.
- Câu `type: "single"` → radio/card chọn 1.
- Câu `type: "multi"` → checkbox/chip chọn nhiều.
- Cho phép quay lại câu trước sửa; cho phép bỏ qua câu (không ép trả lời hết — quyền tự quyết).
- Sau câu cuối: gọi POST submit toàn bộ answers, rồi chuyển sang màn hình hồ sơ (`/profile/[id]`).
- Lưu `profile_id` vào localStorage để quay lại được (chưa có auth trong 48h — chấp nhận được).
- Copy giọng điệu: thân thiện với học sinh cấp 3, không phán xét, luôn nhấn "không có đáp án
  đúng/sai", "đổi ý lúc nào cũng được". Câu hỏi trong API đã viết theo giọng này — giữ nguyên text
  câu hỏi từ API, đừng viết lại.

### 4. `/profile/[id]` — Hồ sơ sống (Living Profile / "File A") — **BACKEND ĐÃ CHẠY THẬT**

Màn hình xem hồ sơ đã dựng. Nguyên tắc trình bày (bắt buộc, từ BA_DESIGN.md):

- **Không có nhãn tính cách tổng hợp** ("Bạn là type X") — chỉ hiển thị các mảnh evidence theo 5
  nhóm: Năng lực & kỹ năng / Hoạt động yêu thích / Giá trị nghề nghiệp / Mục tiêu & trạng thái khám
  phá / Điều kiện & sở thích bối cảnh.
- Mỗi giá trị trong hồ sơ hiển thị kèm **nguồn gốc evidence** (từ câu trả lời nào, bài test nào) —
  data đã có sẵn `evidence_refs` cho từng value.
- Hiển thị **evidence coverage** như một thanh tiến độ khám phá ("Đã có dữ liệu ở 3/5 nhóm — làm
  thêm bài test hoặc kể thêm về bạn để hồ sơ đầy đủ hơn") — khuyến khích bổ sung, không phán xét
  thiếu.
- Nếu 1 dimension có `has_conflict: true` (nhiều giá trị khác nhau): hiển thị CẢ các giá trị với
  nhãn kiểu "bạn đã nói cả A lẫn B — cả hai đều được ghi nhận", không tự chọn 1.
- Khu vực **Kết quả bài test** (`assessments`): card hiển thị tên bài, nguồn, điểm/thang điểm, top %
  nếu có. Kèm form nhỏ "Thêm kết quả bài test" (gọi POST /assessment — field: tên bài, nguồn/đơn vị
  tổ chức, điểm, thang điểm, top % (không bắt buộc), ngày làm).
- 2 nút placeholder cho tính năng sắp có (backend trả 501, hiển thị trạng thái "sắp ra mắt" đẹp):
  "Tải tài liệu lên" (portfolio/tiểu sử) và "Trò chuyện với AI để hồ sơ hiểu bạn hơn".

### API contract profile (đã chạy thật ở port 4000)

```ts
// GET /api/profile/quickstart → { questions: QuickstartQuestion[] }
interface QuickstartQuestion {
  id: string; // "qs-01-goal" ... "qs-08-region"
  text: string; // giữ nguyên, đã viết đúng giọng điệu
  type: "text" | "single" | "multi";
  options?: string[]; // có khi type là single/multi
  group: string; dimension: string; // để hiển thị nhóm nếu muốn, không cần dùng
}

// POST /api/profile → 201 { profile_id: string }  (tạo hồ sơ mới, gọi khi bắt đầu quickstart)

// POST /api/profile/:id/quickstart
// body: { answers: [{ question_id: string, answer: string | string[] }] }
// → { created_evidence: string[], snapshot: DerivedProfileSnapshot }

// POST /api/profile/:id/assessment
// body: { name, provider, score, scale_max, percentile_top?, taken_at? }
// → { evidence_id, snapshot }

// GET /api/profile/:id → { snapshot: DerivedProfileSnapshot, evidence: Evidence[] }
interface DerivedProfileSnapshot {
  profile_id: string;
  generated_at: string;
  groups: {
    ability_skill: DimensionEstimate[];
    activity_interest: DimensionEstimate[];
    work_values: DimensionEstimate[];
    goals_exploration: DimensionEstimate[];
    context_preferences: DimensionEstimate[];
  };
  evidence_coverage: {
    total_evidence: number;
    confirmed_evidence: number;
    by_source_type: Record<string, number>;
    groups_with_evidence: number; // hiển thị "X/5 nhóm"
    groups_total: number;
  };
  assessments: { name: string; provider: string; score: number; scale_max: number;
    percentile_top?: number; taken_at?: string; evidence_id: string }[];
}
interface DimensionEstimate {
  dimension: string; // vd "mục tiêu sau THPT"
  values: { value: string; evidence_refs: string[] }[];
  has_conflict: boolean;
}

// POST /api/profile/:id/interview  → 501 (sắp có — hiển thị "sắp ra mắt")
// POST /api/profile/:id/document   → 501 (sắp có — hiển thị "sắp ra mắt")
```

Nhãn tiếng Việt cho 5 nhóm: `ability_skill` = "Năng lực & kỹ năng", `activity_interest` = "Hoạt động
yêu thích", `work_values` = "Giá trị nghề nghiệp", `goals_exploration` = "Mục tiêu & khám phá",
`context_preferences` = "Điều kiện & sở thích".

### 5. `/profile/[id]/pathways` — Pathway Portfolio (BA_DESIGN.md F-04/F-05) — **BACKEND ĐÃ CHẠY THẬT**

Màn hình gợi ý danh mục lộ trình/ngành nghề, KHÔNG phải top-1. Backend đã khớp hồ sơ ↔ dữ liệu thị
trường bằng đối chiếu từ khóa (rule-based, chưa dùng LLM — xem `is_personalized` và
`data_limitations` bên dưới). Yêu cầu UX:

- Hiển thị **≥ 3 candidate** dạng thẻ (card), KHÔNG chọn 1 kết quả duy nhất.
- Mỗi card = 1 ngành: tên ngành, `posting_count`/`demand_share` (số tin liên quan), lương trung vị
  nếu `salary` khác null (nếu null → hiển thị "Chưa đủ dữ liệu lương", KHÔNG bịa số), badge
  "Thân thiện người mới" nếu `entry_level_ratio` cao (>0.3), top kỹ năng của ngành, top tỉnh/thành.
- **Khu vực "Vì sao gợi ý này?"** (Evidence Card F-05): liệt kê `matched_profile_evidence` — mỗi
  mục hiển thị câu trả lời gốc của học sinh (`value`) + từ khóa khớp (`matched_tokens`, có thể
  highlight trong câu) — đây là bằng chứng có trích dẫn, không phải suy diễn.
- Nếu `is_personalized: false` (hồ sơ còn ít bằng chứng): đổi tiêu đề thành dạng gợi ý khám phá
  chung (VD: "Một số ngành đang có nhu cầu tuyển dụng cao — trả lời thêm câu hỏi để có gợi ý theo
  đúng bạn hơn"), KHÔNG trình bày như thể đã cá nhân hóa.
- Luôn hiển thị box `data_limitations` (2 ghi chú minh bạch) — đây là giới hạn thật của hệ thống,
  không được ẩn đi: (1) dữ liệu hiện chỉ từ TopCV, thiên về khối văn phòng/CNTT, chưa có nguồn học
  nghề riêng; (2) bước ghép/giải thích hiện là rule-based, chưa có LLM sinh văn bản giải thích tự
  nhiên.
- Nút "Xem hồ sơ của tôi" quay lại `/profile/[id]`.

```ts
// GET /api/profile/:id/pathways → PathwayPortfolio
interface PathwayPortfolio {
  profile_id: string;
  generated_at: string;
  is_personalized: boolean; // false = cold-start, dùng gợi ý khám phá chung
  candidates: PathwayCandidate[]; // luôn <= 6, luôn khác ngành nhau
  data_limitations: string[]; // 2 câu minh bạch — PHẢI hiển thị nguyên văn
}
interface PathwayCandidate {
  industry: string;
  relevance_score: number; // chỉ để sort, KHÔNG cần hiển thị số này cho học sinh
  matched_profile_evidence: {
    dimension: string; value: string; matched_tokens: string[]; evidence_refs: string[];
  }[]; // rỗng nếu is_personalized=false
  market_evidence: {
    industry: string; posting_count: number; demand_share: number; entry_level_ratio: number;
    salary: { median_trieu: number; sample_size: number } | null;
    top_skills: { name: string; count: number }[];
    top_provinces: { name: string; count: number }[];
  };
}
```

## API contract thật (đã chạy, không đổi)

`GET http://localhost:4000/api/market/snapshot` trả về:

```ts
interface MarketSignalSnapshot {
  generated_at: string;
  total_jobs: number; // 3365
  coverage: {
    description_present: { count: number; ratio: number }; // 1332, 0.396
    industry_extracted: { count: number; ratio: number };
    skills_extracted: { count: number; ratio: number };
    salary_disclosed: { count: number; ratio: number }; // 2540, 0.755
    salary_negotiable: { count: number; ratio: number }; // 824, 0.245
    note: string; // câu giải thích tiếng Việt, hiển thị trực tiếp hoặc diễn giải lại
  };
  top_skills_required: { name: string; count: number }[];
  top_skills_preferred: { name: string; count: number }[];
  industries: { name: string; count: number }[];
  provinces: { name: string; count: number }[];
  salary_by_industry: {
    industry: string;
    sample_size: number;
    median_trieu: number;
    min_trieu: number;
    max_trieu: number;
  }[];
}
```

Ví dụ giá trị thật hiện có: `total_jobs: 1332` (mẫu phân tích chi tiết; `total_scraped: 3365`),
top skill `"Giao tiếp"` count 128, top industry `"Kế toán"` count 143 median 16 triệu (n=113).

### Tín hiệu xu hướng (mới thêm — cùng endpoint /api/market/snapshot)

```ts
// Các field bổ sung trong MarketSignalSnapshot:
trend_note: string; // BẮT BUỘC hiển thị (hoặc diễn giải lại) ở đầu khu vực "xu hướng":
// dữ liệu là snapshot 1 thời điểm — đây là tín hiệu nhu cầu HIỆN TẠI, không phải
// biến động theo thời gian. KHÔNG được vẽ biểu đồ dạng line-chart theo thời gian.

industry_insights: {
  industry: string;
  posting_count: number;
  demand_share: number;      // 0-1, % tin trong mẫu có nhắc ngành này
  entry_level_ratio: number; // 0-1, % tin không yêu cầu KN hoặc <1 năm — RẤT đáng highlight
                             // cho học sinh ("ngành này dễ vào với người mới")
  salary: { median_trieu: number; sample_size: number } | null; // null = hiển thị "chưa đủ dữ liệu"
  top_skills: { name: string; count: number }[];    // top 8 kỹ năng của ngành
  top_provinces: { name: string; count: number }[]; // top 5 tỉnh của ngành
}[]; // top 20 ngành

skill_insights: {
  skill: string;
  posting_count: number;
  demand_share: number;
  top_industries: { name: string; count: number }[]; // kỹ năng này được ngành nào cần
  salary: { median_trieu: number; sample_size: number } | null;
}[]; // top 20 kỹ năng

experience_distribution: { level: string; count: number; ratio: number }[];
// vd: "1 năm" 30%, "Không yêu cầu" 19.1%, "Dưới 1 năm" 9.9%...
```

Gợi ý UI cho phần này (thêm vào /dashboard, section "Tín hiệu xu hướng ngành nghề"):
- Card/bảng ngành có thể expand: click 1 ngành → xem top skills + top tỉnh + entry-level ratio.
- Badge "Thân thiện người mới" cho ngành có entry_level_ratio cao (>= 0.25) — nhưng KHÔNG chê
  ngành có ratio thấp, chỉ nêu trung tính "thường cần 2+ năm kinh nghiệm".
- Khi salary là null: hiển thị "Chưa đủ dữ liệu lương" — tuyệt đối không ẩn ngành đó đi.
- experience_distribution: donut/bar nhỏ, message tích cực kiểu "29% tin tuyển không yêu cầu
  hoặc chỉ cần dưới 1 năm kinh nghiệm".

## KHÔNG được làm

- Không tạo API/backend route mới hay đổi field response — nếu thiếu dữ liệu để làm 1 UI đẹp hơn
  (ví dụ cần time-series theo tháng), cứ để UI báo "chưa có dữ liệu xu hướng theo thời gian" thay vì
  tự bịa dữ liệu giả để lấp đầy biểu đồ.
- Không xoá banner/note minh bạch về coverage dữ liệu dù nó "làm dashboard trông kém hoàn hảo hơn" —
  đây là yêu cầu chấm điểm, không phải tuỳ chọn thẩm mỹ.
- Không thêm demographic filter (giới tính, dân tộc...) vào bất kỳ UI nào.
- Không hard-code lại dữ liệu tĩnh thay vì fetch từ API thật.

## Việc cần trả lại

Code Next.js/TSX/CSS hoàn chỉnh cho 5 route: `frontend/src/app/page.tsx`,
`frontend/src/app/dashboard/page.tsx`, `frontend/src/app/profile/quickstart/page.tsx`,
`frontend/src/app/profile/[id]/page.tsx`, `frontend/src/app/profile/[id]/pathways/page.tsx`,
cộng phần bổ sung `@theme` trong `frontend/src/app/globals.css`, và component con nếu tách ra
`frontend/src/components/`. Kèm 1 nav/header chung (layout.tsx) có link Trang chủ / Khám phá thị
trường / Hồ sơ của tôi (link hồ sơ đọc profile_id từ localStorage, chưa có thì trỏ về quickstart);
trên trang hồ sơ, thêm nút "Xem gợi ý lộ trình" trỏ tới `/profile/[id]/pathways`.
