// Luồng phỏng vấn scripted (demo offline) + recommender đơn giản.
// Backend AI thật (Đức Minh/Tuấn) sẽ thay thế phần này qua cùng interface:
// mỗi bước trả về câu hỏi + lựa chọn; kết thúc trả về UserProfile.

import type { CareerRec, UserProfile } from "./profile";

export interface Step {
  id: string;
  question: string;
  options?: { key: string; label: string }[]; // nếu có: quick replies
  multi?: boolean;
  freeText?: boolean;
}

export const STEPS: Step[] = [
  {
    id: "workStyle",
    question: "Khi làm việc, bạn thấy mình “vào guồng” nhất khi làm gì?",
    options: [
      { key: "people", label: "Với con người — trò chuyện, giúp đỡ, kết nối" },
      { key: "data", label: "Với con số / dữ liệu — phân tích, tìm quy luật" },
      { key: "machine", label: "Với máy móc / kỹ thuật — lắp ráp, vận hành" },
      { key: "idea", label: "Với ý tưởng / sáng tạo — viết, thiết kế" },
      { key: "hands", label: "Với đôi tay — làm ra sản phẩm cụ thể" },
    ],
  },
  {
    id: "angle",
    question: "Điều gì ở kiểu công việc đó khiến bạn cuốn nhất?",
    options: [
      { key: "insight", label: "Khám phá ra điều người khác chưa thấy" },
      { key: "build", label: "Xây thứ chạy được, dùng được" },
      { key: "impact", label: "Thấy kết quả giúp được người khác" },
    ],
  },
  {
    id: "subjects",
    question: "Bạn học tốt (hoặc thấy dễ thở) nhất ở môn nào? Chọn tối đa 3.",
    options: [
      { key: "Toán", label: "Toán" }, { key: "Lý", label: "Lý" },
      { key: "Hoá", label: "Hoá" }, { key: "Tiếng Anh", label: "Tiếng Anh" },
      { key: "Văn", label: "Văn" }, { key: "Tin", label: "Tin học" },
    ],
    multi: true,
  },
  {
    id: "values",
    question: "Bạn coi trọng điều gì nhất ở công việc tương lai? Chọn tối đa 2.",
    options: [
      { key: "thu nhập", label: "Thu nhập tốt" },
      { key: "ổn định", label: "Ổn định" },
      { key: "sáng tạo", label: "Được sáng tạo" },
      { key: "giúp người", label: "Tạo tác động / giúp người" },
    ],
    multi: true,
  },
  {
    id: "studyHorizon",
    question: "Bạn sẵn sàng học tới đâu trước khi đi làm?",
    options: [
      { key: "đường ngắn", label: "Đường ngắn — khoá nghề / chứng chỉ, đi làm sớm" },
      { key: "cao đẳng", label: "Cao đẳng (~2–2.5 năm)" },
      { key: "đại học", label: "Đại học (4 năm)" },
    ],
  },
];

// Recommender demo: rule-based trên profile + dữ liệu cầu (demoData).
// Bản thật sẽ do backend AI đảm nhiệm (LLM + labor signal).
export function recommend(p: Omit<UserProfile, "recommendations" | "completedAt">): CareerRec[] {
  const recs: CareerRec[] = [];
  const hasEnglish = p.subjects.includes("Tiếng Anh");
  const short = p.studyHorizon === "đường ngắn";

  if (p.workStyle === "data" || p.subjects.includes("Toán")) {
    recs.push({
      title: "Chuyên viên Phân tích dữ liệu",
      match: 92,
      why: `Bạn thích ${p.workStyle === "data" ? "tìm quy luật trong số liệu" : "tư duy logic"}${hasEnglish ? ", và Tiếng Anh là đòn bẩy lớn cho ngành này" : ""} — nhu cầu tại Hà Nội đang tăng +41%.`,
      skills: ["Excel nâng cao", "SQL", "Power BI"],
      path: short ? "Khoá ngắn 6–12 tháng + chứng chỉ → thực tập → junior" : p.studyHorizon === "cao đẳng" ? "Cao đẳng CNTT/HTTT ~2 năm" : "Đại học nhóm ngành Dữ liệu ~4 năm",
      evidence: ["Nhu cầu +41% ở Hà Nội", "Lương ~22.000.000đ", "SQL: 20% tin tuyển dụng"],
    });
  }
  if (short || p.workStyle === "data" || p.subjects.includes("Tin")) {
    recs.push({
      title: "Kiểm thử phần mềm (QA/Tester)",
      match: 85,
      why: "Hợp tư duy tỉ mỉ, logic; đường vào ngành IT ngắn nhất, không cần code sâu — thu nhập ổn định từ sớm.",
      skills: ["Kiểm thử cơ bản", "SQL cơ bản", hasEnglish ? "Tiếng Anh tài liệu" : "Tiếng Anh đọc hiểu"],
      path: "Khoá 3–6 tháng → thực tập → junior tester",
      evidence: ["Cửa vào IT nhanh nhất", "Lương khởi điểm ~14–18 triệu", "Có đường lên automation"],
    });
  }
  if (p.workStyle === "people" || p.values.includes("giúp người")) {
    recs.push({
      title: "Sư phạm / Đào tạo",
      match: 80,
      why: "Bạn hướng về con người và tạo tác động — giáo dục cần đúng kiểu người như bạn.",
      skills: ["Kỹ năng giảng dạy", "Thiết kế bài giảng", "Giao tiếp"],
      path: p.studyHorizon === "đại học" ? "Đại học Sư phạm ~4 năm" : "Chứng chỉ nghiệp vụ + trợ giảng trung tâm",
      evidence: ["Giáo dục: lương trung vị 18,5 triệu", "Nhu cầu ổn định"],
    });
  }
  if (p.workStyle === "machine" || p.workStyle === "hands") {
    recs.push({
      title: "Vận hành CNC / Kỹ thuật công nghiệp",
      match: 84,
      why: "Bạn mạnh thao tác kỹ thuật — khu công nghiệp Bình Dương/Bắc Ninh đang thiếu người vận hành.",
      skills: ["Đọc bản vẽ", "Vận hành CNC", "An toàn lao động"],
      path: "Trung cấp nghề 1–2 năm hoặc đào tạo tại nhà máy",
      evidence: ["Nhu cầu +34% ở Bình Dương", "Được đào tạo, không cần kinh nghiệm"],
    });
  }
  if (p.workStyle === "idea") {
    recs.push({
      title: "Digital Marketing / Content",
      match: 83,
      why: "Bạn nghiêng về sáng tạo — marketing số cho đường vào nhanh và đất dụng võ rộng.",
      skills: ["Content", "Chạy quảng cáo", "Thiết kế cơ bản"],
      path: "Khoá ngắn 3–6 tháng + dự án cá nhân → junior",
      evidence: ["Nhu cầu +38% ở TP.HCM", "Lương ~16.000.000đ"],
    });
  }
  // Kế toán làm phương án an toàn
  if (recs.length < 3) {
    recs.push({
      title: "Kế toán",
      match: 76,
      why: "Phương án an toàn, nhu cầu luôn có — hợp người cẩn thận, thích con số.",
      skills: ["Excel", "Nguyên lý kế toán", "Thuế cơ bản"],
      path: p.studyHorizon === "đại học" ? "Đại học Kế toán ~4 năm" : "Cao đẳng ~2 năm + chứng chỉ",
      evidence: ["Kinh doanh/Kế toán: 20% tin tuyển dụng", "Lương trung vị ~20 triệu"],
    });
  }
  return recs.slice(0, 3);
}
