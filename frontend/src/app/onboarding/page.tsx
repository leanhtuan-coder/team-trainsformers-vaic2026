"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/ui/Compass";
import { Loader2, ArrowLeft, ArrowRight, Check, User, ListTodo, FileText, AlertTriangle } from "lucide-react";
import { savePortalRef } from "@/lib/profile";

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", 
  "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắc Lắk", 
  "Đắc Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", 
  "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", 
  "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", 
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", 
  "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", 
  "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái", 
  "Làm việc từ xa (Remote)", "Nước ngoài"
];

const HOLLAND_QUESTIONS = [
  {
    id: "qs-01-object",
    group: "activity_interest",
    dimension: "đối tượng cuốn hút",
    question: "Đối tượng làm việc nào khiến bạn thấy cuốn hút nhất?",
    options: [
      { text: "Máy móc, thiết bị, xây dựng thứ gì đó bằng tay", plus: ["4", "7"], minus: [] },
      { text: "Con số, dữ liệu, phân tích", plus: ["3", "1"], minus: [] },
      { text: "Con người: giúp đỡ, chăm sóc, dạy dỗ", plus: ["5", "6"], minus: [] },
      { text: "Ý tưởng, sáng tạo, cái đẹp", plus: ["9", "2"], minus: [] }
    ]
  },
  {
    id: "qs-02-teamrole",
    group: "activity_interest",
    dimension: "vai trò dự án nhóm",
    question: "Trong một dự án nhóm, bạn thường là người…?",
    options: [
      { text: "Đứng ra dẫn dắt, thuyết phục mọi người", plus: ["2"], minus: [] },
      { text: "Lên kế hoạch, sắp xếp cho chạy trơn tru", plus: ["3"], minus: [] },
      { text: "Kết nối, hòa giải, chăm lo cảm xúc nhóm", plus: ["6", "5"], minus: [] },
      { text: "Giải quyết phần khó nhất về kỹ thuật/logic", plus: ["1", "4"], minus: [] }
    ]
  },
  {
    id: "qs-03-satisfaction",
    group: "activity_interest",
    dimension: "động lực thỏa mãn",
    question: "Bạn thấy thỏa mãn nhất khi…?",
    options: [
      { text: "Sửa được một thứ hỏng / làm ra sản phẩm chạy được", plus: ["4", "1"], minus: [] },
      { text: "Tìm ra quy luật ẩn trong mớ thông tin", plus: ["3", "1"], minus: [] },
      { text: "Thấy người khác tiến bộ/khỏe hơn nhờ mình", plus: ["5", "6"], minus: [] },
      { text: "Tạo ra thứ chưa ai làm, được công nhận", plus: ["9", "2"], minus: [] }
    ]
  },
  {
    id: "qs-04-subject",
    group: "activity_interest",
    dimension: "môn học dễ chịu",
    question: "Môn học hoặc hoạt động bạn thấy dễ chịu nhất?",
    options: [
      { text: "Toán, Lý, Tin", plus: ["1", "4", "3"], minus: [] },
      { text: "Văn, Ngoại ngữ, Sử", plus: ["6", "2"], minus: [] },
      { text: "Sinh, Hóa", plus: ["5"], minus: [] },
      { text: "Mỹ thuật, Âm nhạc, sáng tạo", plus: ["9"], minus: [] }
    ]
  },
  {
    id: "qs-05-building",
    group: "activity_interest",
    dimension: "loại hình xây dựng",
    question: "Bạn thích \"xây\" thứ nào hơn?",
    options: [
      { text: "Thứ vô hình: phần mềm, hệ thống, quy trình", plus: ["1"], minus: [] },
      { text: "Thứ sờ được: máy móc, công trình, sản phẩm vật lý", plus: ["4", "7"], minus: [] },
      { text: "Thứ thuộc về con người: trải nghiệm, bài giảng, dịch vụ", plus: ["6"], minus: [] },
      { text: "Thứ thuộc về cái đẹp: hình ảnh, âm thanh, tác phẩm", plus: ["9"], minus: [] }
    ]
  },
  {
    id: "qs-06-strength",
    group: "ability_skill",
    dimension: "thế mạnh vượt trội",
    question: "Việc nào bạn thấy mình làm tốt hơn hẳn bạn bè cùng lớp?",
    options: [
      { text: "Giải bài logic/toán khó", plus: ["1", "3", "4"], minus: [] },
      { text: "Viết, thuyết trình, thuyết phục", plus: ["2", "6"], minus: [] },
      { text: "Nhớ chi tiết, làm cẩn thận không sai sót", plus: ["3", "5"], minus: [] },
      { text: "Vẽ, thiết kế, cảm nhận thẩm mỹ", plus: ["9"], minus: [] },
      { text: "Làm tay chân, lắp ráp, sửa chữa", plus: ["4", "7"], minus: [] }
    ]
  },
  {
    id: "qs-07-datahandling",
    group: "activity_interest",
    dimension: "tương tác dữ liệu",
    question: "Với một bảng dữ liệu, bạn thích làm gì hơn?",
    options: [
      { text: "Kiểm tra cho khớp, đúng quy tắc, không sai sót", plus: ["3"], minus: [] },
      { text: "Tìm insight, dự đoán xu hướng từ nó", plus: ["1", "2"], minus: [] },
      { text: "Trình bày cho người khác hiểu, kể thành câu chuyện", plus: ["2", "6"], minus: [] }
    ]
  },
  {
    id: "qs-08-environment",
    group: "context_preferences",
    dimension: "môi trường mong muốn",
    question: "Môi trường làm việc bạn muốn?",
    options: [
      { text: "Ngoài hiện trường, vận động, không ngồi bàn nhiều", plus: ["4", "7"], minus: [] },
      { text: "Văn phòng, ổn định, quy trình rõ ràng", plus: ["3"], minus: [] },
      { text: "Tiếp xúc nhiều người, năng động", plus: ["6", "2"], minus: [] },
      { text: "Tự do, linh hoạt, tự đặt nhịp", plus: ["9", "1"], minus: [] }
    ]
  },
  {
    id: "qs-09-route",
    group: "goals_exploration",
    dimension: "lộ trình định hướng",
    question: "Con đường nào nghe hấp dẫn hơn với bạn?",
    options: [
      { text: "Nghề ổn định, rõ lộ trình, ít biến động", plus: ["3", "6", "5"], minus: [] },
      { text: "Nghề mới, thay đổi nhanh, nhiều cơ hội đột phá", plus: ["1", "2"], minus: [] },
      { text: "Tự làm chủ, tự do nhưng tự chịu rủi ro", plus: ["9", "2"], minus: [] }
    ]
  },
  {
    id: "qs-10-avoid",
    group: "work_values",
    dimension: "nỗi sợ/điểm ghét công việc",
    question: "Điều gì khiến bạn thấy ngán nhất ở một công việc? (Câu phản chứng)",
    options: [
      { text: "Ngồi yên một chỗ, lặp đi lặp lại", plus: ["2", "4", "6"], minus: ["3", "7"] },
      { text: "Giao tiếp/thuyết phục người lạ liên tục", plus: ["1", "3", "4"], minus: ["2", "6"] },
      { text: "Làm việc mơ hồ, không có đáp án đúng", plus: ["3", "4"], minus: ["9", "2"] },
      { text: "Áp lực deadline/cạnh tranh cao", plus: ["3", "6"], minus: ["2", "5"] }
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState<string>("");
  const [activeTab, setActiveTab] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Màn 1: Về bạn
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [currentLoc, setCurrentLoc] = useState("");
  const [preferLoc, setPreferLoc] = useState("");

  // Màn 2: Trắc nghiệm Holland
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  // Màn 3: Hồ sơ / Chứng chỉ
  const [certText, setCertText] = useState("");
  const [academicText, setAcademicText] = useState("");
  const [expText, setExpText] = useState("");

  useEffect(() => {
    let id = searchParams.get("profileId");
    if (!id) {
      // Tự sinh ID ngẫu nhiên nếu truy cập trực tiếp
      id = "u_" + Math.random().toString(36).substr(2, 9);
    }
    setProfileId(id);
  }, [searchParams]);

  const triggerConfirm = (msg: string, onOk: () => void) => {
    setConfirmMsg(msg);
    setConfirmAction(() => onOk);
    setShowConfirm(true);
  };

  const handleNextTab1 = () => {
    if (!age || !gender || !currentLoc || !preferLoc) {
      alert("Vui lòng điền đầy đủ thông tin cơ bản trước khi tiếp tục.");
      return;
    }
    setActiveTab(2);
  };

  const handleNextTab2 = () => {
    const missing: number[] = [];
    HOLLAND_QUESTIONS.forEach((q, idx) => {
      if (answers[q.id] === undefined) {
        missing.push(idx + 1);
      }
    });

    if (missing.length > 0) {
      triggerConfirm(
        `Bạn chưa trả lời các câu: ${missing.join(", ")}. Bạn có chắc muốn tiếp tục không?`,
        () => {
          setShowConfirm(false);
          setActiveTab(3);
        }
      );
    } else {
      setActiveTab(3);
    }
  };

  const handleSubmit = async () => {
    const emptyFields: string[] = [];
    if (!certText.trim()) emptyFields.push("Chứng chỉ");
    if (!academicText.trim()) emptyFields.push("Hồ sơ học thuật");
    if (!expText.trim()) emptyFields.push("Trải nghiệm");

    if (emptyFields.length > 0) {
      triggerConfirm(
        `Bạn đang để trống phần: ${emptyFields.join(", ")}. Gửi hồ sơ rỗng sẽ làm giảm độ chính xác của kết quả. Vẫn gửi chứ?`,
        executeSubmission
      );
    } else {
      await executeSubmission();
    }
  };

  const executeSubmission = async () => {
    setShowConfirm(false);
    setSubmitting(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // 1. Tạo profile mới (nếu chưa có sẵn trên DB)
      await fetch(`${API_BASE}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      // 2. Gửi câu trả lời Holland Quickstart
      const formattedAnswers = Object.entries(answers).map(([qId, optIdx]) => {
        const q = HOLLAND_QUESTIONS.find((item) => item.id === qId);
        return {
          question_id: qId,
          answer: q ? q.options[optIdx].text : ""
        };
      });

      // Thêm thông tin cơ bản làm self_report
      formattedAnswers.push(
        { question_id: "age", answer: age },
        { question_id: "gender", answer: gender },
        { question_id: "current_location", answer: currentLoc },
        { question_id: "prefer_location", answer: preferLoc }
      );

      await fetch(`${API_BASE}/profile/${profileId}/quickstart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formattedAnswers })
      });

      // 3. Gửi hồ sơ năng lực tự khai/chứng chỉ (nếu có nhập)
      if (certText.trim()) {
        await fetch(`${API_BASE}/profile/${profileId}/assessment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Chứng chỉ khai báo",
            provider: "User",
            score: 1,
            scale_max: 1,
            claims: [{ group: "ability_skill", dimension: "chứng chỉ", value: certText.trim() }]
          })
        });
      }

      if (academicText.trim()) {
        await fetch(`${API_BASE}/profile/${profileId}/assessment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Học bạ tự khai",
            provider: "User",
            score: 1,
            scale_max: 1,
            claims: [{ group: "ability_skill", dimension: "học lực", value: academicText.trim() }]
          })
        });
      }

      if (expText.trim()) {
        await fetch(`${API_BASE}/profile/${profileId}/assessment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Trải nghiệm",
            provider: "User",
            score: 1,
            scale_max: 1,
            claims: [{ group: "ability_skill", dimension: "trải nghiệm dự án", value: expText.trim() }]
          })
        });
      }

      // Lưu Portal Ref vào localStorage
      savePortalRef({
        profile_id: profileId,
        name: "Học sinh mới",
        region: preferLoc,
        completedAt: new Date().toISOString()
      });

      router.push(`/profile/${profileId}`);
    } catch (err) {
      console.error("Lỗi khi gửi Onboarding:", err);
      alert("Có lỗi xảy ra trong quá trình kết nối server. Hãy thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ec] font-sans text-[#1f1e1c] flex flex-col">
      {/* Navigation */}
      <nav className="h-16 md:h-20 bg-white border-b border-[#e3e1d8] px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="w-8 h-8 text-[#005c6d]" />
          <span className="font-bold text-lg text-[#005c6d]">CareerRadar</span>
        </div>
        <span className="text-xs font-semibold text-[#8a8981] bg-[#f4f2ec] px-3 py-1.5 rounded-full">
          Onboarding
        </span>
      </nav>

      {/* Main container */}
      <div className="flex-1 max-w-[760px] w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-[#1f1e1c] mb-1">Định hướng nghề nghiệp</h1>
        <p className="text-sm text-[#6b6a64] mb-6">Hãy trả lời chân thực các câu hỏi dưới đây để CareerRadar vẽ la bàn hướng nghiệp cho riêng bạn.</p>

        {/* Tab Headers */}
        <div className="bg-white rounded-2xl border border-[#e3e1d8] p-5 shadow-sm relative">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => activeTab > 1 && setActiveTab(1)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === 1 ? "bg-[#e6f1fb] text-[#0c447c]" : "bg-white text-[#6b6a64] border border-[#e3e1d8]"
              }`}
            >
              <User className="w-4 h-4" />
              1. Về bạn
            </button>
            <button
              onClick={() => activeTab > 2 && setActiveTab(2)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === 2 ? "bg-[#e6f1fb] text-[#0c447c]" : "bg-white text-[#6b6a64] border border-[#e3e1d8]"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              2. Câu hỏi
            </button>
            <button
              onClick={() => activeTab > 3 && setActiveTab(3)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === 3 ? "bg-[#e6f1fb] text-[#0c447c]" : "bg-white text-[#6b6a64] border border-[#e3e1d8]"
              }`}
            >
              <FileText className="w-4 h-4" />
              3. Hồ sơ
            </button>
          </div>

          {/* TAB 1: VỀ BẠN */}
          {activeTab === 1 && (
            <div className="space-y-5 fade-up">
              <h3 className="text-base font-bold text-[#1f1e1c] border-b border-gray-100 pb-2">Cùng làm quen nhé</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Tuổi của bạn</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-2.5 outline-none focus:border-[#005c6d] text-sm"
                    placeholder="Ví dụ: 18"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Giới tính</label>
                  <select
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-2.5 outline-none focus:border-[#005c6d] text-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                    <option value="Không muốn tiết lộ">Không muốn tiết lộ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Nơi ở hiện tại</label>
                  <select
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-2.5 outline-none focus:border-[#005c6d] text-sm"
                    value={currentLoc}
                    onChange={(e) => setCurrentLoc(e.target.value)}
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Nơi mong muốn làm việc</label>
                  <select
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-2.5 outline-none focus:border-[#005c6d] text-sm"
                    value={preferLoc}
                    onChange={(e) => setPreferLoc(e.target.value)}
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={handleNextTab1}
                  className="flex items-center gap-2 bg-[#005c6d] hover:bg-[#004b59] text-white px-5 py-2.5 rounded-xl font-semibold transition text-sm"
                >
                  Tiếp tục <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CÂU HỎI HOLLAND */}
          {activeTab === 2 && (
            <div className="space-y-6 fade-up">
              <h3 className="text-base font-bold text-[#1f1e1c] border-b border-gray-100 pb-2">Hứng thú tự nhiên & sở thích</h3>
              <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
                {HOLLAND_QUESTIONS.map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-[#faf9f5] border border-[#e3e1d8] rounded-xl">
                    <p className="text-sm font-semibold text-[#1f1e1c] mb-3">
                      <span className="text-[#0c447c] font-bold">Câu {qIdx + 1}.</span> {q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-start gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-[#005c6d] transition ${
                            answers[q.id] === optIdx ? "border-2 border-[#005c6d] bg-[#e6f1fb]" : "border-[#e3e1d8]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            className="mt-1"
                            checked={answers[q.id] === optIdx}
                            onChange={() => setAnswers({ ...answers, [q.id]: optIdx })}
                          />
                          <span className="text-sm text-[#1f1e1c]">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => setActiveTab(1)}
                  className="flex items-center gap-2 border border-[#cfcdc2] hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold transition text-sm text-[#6b6a64]"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
                <button
                  onClick={handleNextTab2}
                  className="flex items-center gap-2 bg-[#005c6d] hover:bg-[#004b59] text-white px-5 py-2.5 rounded-xl font-semibold transition text-sm"
                >
                  Tiếp tục <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: HỒ SƠ & BẰNG CHỨNG */}
          {activeTab === 3 && (
            <div className="space-y-6 fade-up">
              <h3 className="text-base font-bold text-[#1f1e1c] border-b border-gray-100 pb-2">Hồ sơ năng lực học tập & hoạt động</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#faf9f5] border border-[#e3e1d8] rounded-xl">
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Chứng chỉ đạt được</label>
                  <textarea
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-3 outline-none focus:border-[#005c6d] text-sm min-height-[64px]"
                    placeholder="Ví dụ: IELTS 7.0, MOS Tin học Văn phòng, AWS Certified..."
                    value={certText}
                    onChange={(e) => setCertText(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-[#faf9f5] border border-[#e3e1d8] rounded-xl">
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Học thuật / Bảng điểm</label>
                  <textarea
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-3 outline-none focus:border-[#005c6d] text-sm min-height-[64px]"
                    placeholder="Ví dụ: Học sinh giỏi lớp 12, GPA 8.8, môn mạnh nhất là Toán và Tiếng Anh..."
                    value={academicText}
                    onChange={(e) => setAcademicText(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-[#faf9f5] border border-[#e3e1d8] rounded-xl">
                  <label className="block text-xs font-bold text-[#6b6a64] mb-2 uppercase">Trải nghiệm / Hoạt động</label>
                  <textarea
                    className="w-full bg-white border border-[#e3e1d8] rounded-xl px-4 py-3 outline-none focus:border-[#005c6d] text-sm min-height-[80px]"
                    placeholder="Ví dụ: Trưởng nhóm dự án khoa học kỹ thuật cấp trường, làm website bán hàng nhỏ..."
                    value={expText}
                    onChange={(e) => setExpText(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => setActiveTab(2)}
                  className="flex items-center gap-2 border border-[#cfcdc2] hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold transition text-sm text-[#6b6a64]"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-[#005c6d] hover:bg-[#004b59] text-white px-6 py-2.5 rounded-xl font-semibold transition text-sm"
                >
                  Gửi hồ sơ <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY LOADING */}
          {submitting && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center rounded-2xl z-20">
              <Loader2 className="w-8 h-8 text-[#005c6d] animate-spin mb-3" />
              <p className="font-bold text-sm text-[#1f1e1c]">Đang chấm điểm & lập la bàn...</p>
              <p className="text-xs text-[#6b6a64]">Hệ thống đang kết hợp dữ liệu thị trường và sinh lộ trình.</p>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#e3e1d8] p-6 max-w-[400px] w-full shadow-lg">
            <div className="flex items-center gap-2.5 text-[#ba7517] font-bold text-sm mb-3">
              <AlertTriangle className="w-5 h-5" />
              Bạn còn thiếu thông tin
            </div>
            <p className="text-sm text-[#6b6a64] mb-5">{confirmMsg}</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-[#cfcdc2] hover:bg-gray-50 rounded-xl text-xs md:text-sm font-semibold transition text-[#6b6a64]"
              >
                Hủy
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 bg-[#005c6d] hover:bg-[#004b59] text-white rounded-xl text-xs md:text-sm font-semibold transition"
              >
                Vẫn tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
