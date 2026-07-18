"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/ui/Compass";
import { Loader2, ArrowLeft, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { savePortalRef } from "@/lib/profile";

const HOLLAND_GROUPS = [
  {
    key: "R",
    name: "Nhóm 1: Realistic — Kỹ thuật / Thực tế",
    questions: [
      "Yêu thích vận động",
      "Thẳng thắn",
      "Thích làm việc với máy móc, dụng cụ",
      "Thích sự cụ thể, rõ ràng",
      "Khép kín",
      "Thích làm việc ngoài trời",
      "Sửa chữa các thiết bị điện/ ô tô, xe máy, xe đạp, …",
      "Chơi 1 môn thể thao",
      "Đọc bản vẽ/ bản thiết kế",
      "Sử dụng/ vận hành/ bảo trì máy móc, thiết bị",
      "Sử dụng công cụ để tạo kiểu tóc mới cho mình",
      "Tự may áo/váy/đầm cho mình",
      "Làm vườn/ trồng cây xanh, hoa kiểng",
      "Xây dựng/ lắp ráp mô hình",
      "Vận động tay chân và sử dụng tay chân để làm việc",
      "Tự ráp đồ nội thất (bàn/ghế/tủ)/ tự đóng bàn, ghế, tủ,…",
      "Nấu ăn/ làm bánh",
      "Tham dự khoá học kỹ thuật (điện, sữa chữa máy móc…)"
    ]
  },
  {
    key: "I",
    name: "Nhóm 2: Investigative — Nghiên cứu / Phân tích",
    questions: [
      "Hiểu biết rộng",
      "Thích làm việc một mình",
      "Khả năng phân tích cao",
      "Suy nghĩ logic",
      "Thích khoa học",
      "Có khả năng quan sát tốt",
      "Suy nghĩ trừu tượng",
      "Giải các bài toán khó, phức tạp",
      "Tiếp thu nhanh các lý thuyết khoa học",
      "Giải thích các công thức toán học",
      "Phân tích dữ liệu",
      "Tiến hành những thí nghiệm khoa học",
      "Đặt câu hỏi",
      "Tìm hiểu nhiều ý kiến khác nhau về 1 vấn đề cụ thể nào đó",
      "Sử dụng máy vi tính",
      "Đọc sách/ báo chuyên ngành/ kỹ thuật",
      "Thiết lập đề tài nghiên cứu, làm khảo sát và kiểm tra kết quả",
      "Tham quan bảo tàng khoa học, phòng thí nghiệm, cơ sở khoa học"
    ]
  },
  {
    key: "A",
    name: "Nhóm 3: Artistic — Sáng tạo / Nghệ thuật",
    questions: [
      "Rất sáng tạo",
      "Giàu trí tưởng tượng",
      "Thích cải tiến, đổi mới",
      "Độc đáo, khác lạ",
      "Dễ xúc động",
      "Rất nhạy cảm",
      "Phác thảo, vẽ, tô tranh",
      "Chơi 1 nhạc cụ",
      "Viết truyện/ thơ/ sáng tác nhạc",
      "Hát/ diễn xuất/ nhảy/ khiêu vũ",
      "Tự thiết kế quần áo cho mình, bạn bè và người thân/ thiết kế nội thất cho nhà mình",
      "Chụp hình với những góc ảnh đẹp",
      "Tham gia khóa học thiết kế",
      "Học hát/ nhạc/ nhảy/ khiêu vũ/ diễn xuất",
      "Làm đồ thủ công, tự làm quà cho bạn bè và người thân",
      "Đọc truyện viễn tưởng/ kịch/ thơ ca",
      "Thể hiện mình một cách sáng tạo/ mặc những thời trang lạ và thú vị",
      "Xem hòa nhạc/ xem kịch/ triển lãm nghệ thuật"
    ]
  },
  {
    key: "S",
    name: "Nhóm 4: Social — Con người / Xã hội",
    questions: [
      "Rất thân thiện, hòa đồng",
      "Dễ thấu hiểu người khác",
      "Hào phóng",
      "Hay giúp đỡ người khác",
      "Có tinh thần đồng đội, tinh thần hợp tác",
      "Dễ tha thứ",
      "Chỉ dẫn hoặc dạy người khác",
      "Điều hành các cuộc thảo luận",
      "Hòa giải mâu thuẫn/ tranh chấp",
      "Diễn đạt suy nghĩ và cảm xúc rất rõ ràng",
      "Hợp tác tốt với những người khác",
      "Chơi môn thể thao có tính đồng đội",
      "Làm việc nhóm",
      "Tham gia hoạt động tình nguyện với các nhóm hoạt động xã hội tại trường, cộng đồng",
      "Gặp gỡ và làm quen bạn mới",
      "Lắng nghe và tư vấn cho người khác",
      "Đóng góp trong các cuộc thảo luận",
      "Tham gia các hội thảo về phát triển cộng đồng và giải quyết các vấn đề xã hội"
    ]
  },
  {
    key: "E",
    name: "Nhóm 5: Enterprising — Dẫn dắt / Quản lý",
    questions: [
      "Thích phiêu lưu",
      "Quyết đoán",
      "Thuộc dạng nổi tiếng ở trường",
      "Có sức thuyết phục",
      "Có nhiều hoài bão/ tham vọng",
      "Thích giao du, thích kết bạn",
      "Khởi đầu/ đề xuất dự án mới",
      "Thuyết phục người khác làm việc theo ý của tôi",
      "Lãnh đạo một nhóm",
      "Bán hàng hoặc quảng bá ý tưởng",
      "Lên kế hoạch/ chiến lược để đạt được mục tiêu",
      "Điều hành hoạt động kinh doanh của gia đình",
      "Có quyền lực, địa vị/ được bầu cử vào những vị trí quan trọng",
      "Đưa ra quyết định có ảnh hưởng đến những người khác",
      "Giành chiến thắng một giải thưởng lãnh đạo hoặc bán hàng",
      "Gặp gỡ những người quan trọng",
      "Tham gia khóa học về kinh doanh/ marketing/ bán hàng",
      "Đọc tạp chí kinh doanh"
    ]
  },
  {
    key: "C",
    name: "Nhóm 6: Conventional — Quy trình / Nghiệp vụ",
    questions: [
      "Gọn gàng, ngăn nắp",
      "Làm việc nguyên tắc, có trình tự, có kế hoạch",
      "Chính xác",
      "Làm việc tốt trong khuôn khổ hệ thống",
      "Giải quyết công việc giấy tờ một cách nhanh chóng, hiệu quả và ngăn nắp",
      "Sử dụng các thiết bị xử lý dữ liệu",
      "Sưu tầm đồ kỉ niệm",
      "Học, tìm hiểu các thủ tục, quy định, luật lệ (vd: luật thuế, luật kinh doanh …)",
      "Sắp xếp nhà cửa hoặc nơi làm việc",
      "Thích làm việc với dữ liệu, con số, văn bản",
      "Tuân thủ nguyên tắc",
      "Chu đáo, tỉ mỉ",
      "Thực hiện các công việc đòi hỏi chú ý đến các chi tiết",
      "Tổ chức, dàn dựng chương trình cho các hoạt động, sự kiện",
      "Gõ nhanh hoặc viết tốc ký",
      "Lưu trữ dữ liệu, hồ sơ chính xác",
      "Chơi trò tìm sự khác biệt giữa hai hình ảnh",
      "Làm việc dựa trên hướng dẫn cụ thể"
    ]
  }
];

function HollandTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState<string>("");
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string[]>>({
    R: [], I: [], A: [], S: [], E: [], C: []
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let id = searchParams.get("profileId");
    if (!id) {
      id = "u_" + Math.random().toString(36).substr(2, 9);
    }
    setProfileId(id);
  }, [searchParams]);

  const handleToggleQuestion = (groupKey: string, question: string) => {
    const prev = selectedQuestions[groupKey] || [];
    if (prev.includes(question)) {
      setSelectedQuestions({
        ...selectedQuestions,
        [groupKey]: prev.filter((q) => q !== question)
      });
    } else {
      setSelectedQuestions({
        ...selectedQuestions,
        [groupKey]: [...prev, question]
      });
    }
  };

  const handleNext = () => {
    if (activeGroupIdx < HOLLAND_GROUPS.length - 1) {
      setActiveGroupIdx(activeGroupIdx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (activeGroupIdx > 0) {
      setActiveGroupIdx(activeGroupIdx - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // 1. Tạo các claims tương ứng cho 6 nhóm RIASEC
      const claims = Object.entries(selectedQuestions).map(([groupKey, list]) => {
        return {
          group: "activity_interest",
          dimension: `Holland ${groupKey}`,
          value: list.length.toString() // Điểm số thô (số câu được tick)
        };
      });

      const totalChecked = Object.values(selectedQuestions).reduce((sum, list) => sum + list.length, 0);

      // 2. Gửi assessment test Holland đầy đủ lên Backend
      await fetch(`${API_BASE}/profile/${profileId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Trắc nghiệm sở thích nghề nghiệp Holland đầy đủ",
          provider: "T&C Việt Nam",
          score: totalChecked,
          scale_max: 108,
          claims: claims
        })
      });

      // 3. Cập nhật Portal Ref
      savePortalRef({
        profile_id: profileId,
        name: "Học sinh mới",
        region: "Toàn quốc",
        completedAt: new Date().toISOString()
      });

      router.push(`/profile/${profileId}`);
    } catch (err) {
      console.error("Lỗi khi gửi kết quả trắc nghiệm Holland:", err);
      alert("Có lỗi xảy ra trong quá trình nộp bài. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeGroup = HOLLAND_GROUPS[activeGroupIdx];
  const progressPercent = Math.round(((activeGroupIdx + 1) / HOLLAND_GROUPS.length) * 100);

  return (
    <div className="min-h-screen bg-[#f4f2ec] font-sans text-[#1f1e1c] flex flex-col">
      {/* Navigation */}
      <nav className="h-16 md:h-20 bg-white border-b border-[#e3e1d8] px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="w-8 h-8 text-[#005c6d]" />
          <span className="font-bold text-lg text-[#005c6d]">CareerRadar</span>
        </div>
        <span className="text-xs font-semibold text-[#8a8981] bg-[#f4f2ec] px-3 py-1.5 rounded-full">
          Trắc nghiệm Holland đầy đủ
        </span>
      </nav>

      {/* Main Container */}
      <div className="flex-1 max-w-[760px] w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h1 className="text-xl font-bold text-[#1f1e1c]">Trắc nghiệm Sở thích Nghề nghiệp Holland</h1>
            <p className="text-xs text-[#6b6a64]">Đánh dấu chọn các câu mô tả mà bạn thấy đúng với bản thân mình nhất.</p>
          </div>
          <span className="text-xs font-bold text-[#0c447c] bg-[#e6f1fb] px-2.5 py-1 rounded-lg">
            Nhóm {activeGroupIdx + 1}/6
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white rounded-full h-2 mb-6 border border-[#e3e1d8] overflow-hidden">
          <div
            className="bg-[#005c6d] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Questions Box */}
        <div className="bg-white rounded-2xl border border-[#e3e1d8] p-5 md:p-7 shadow-sm relative">
          <h3 className="text-base font-bold text-[#005c6d] border-b border-gray-100 pb-3.5 mb-5 flex items-center gap-2">
            <span className="grid w-6 h-6 rounded-full bg-[#005c6d] text-white text-xs font-bold place-items-center">
              {activeGroup.key}
            </span>
            {activeGroup.name}
          </h3>

          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-2">
            {activeGroup.questions.map((q, idx) => {
              const isChecked = (selectedQuestions[activeGroup.key] || []).includes(q);
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3.5 p-3.5 bg-white border rounded-xl cursor-pointer hover:border-[#005c6d] transition ${
                    isChecked ? "border-2 border-[#005c6d] bg-[#e6f1fb]" : "border-[#e3e1d8]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-[#005c6d] h-4 w-4 rounded cursor-pointer"
                    checked={isChecked}
                    onChange={() => handleToggleQuestion(activeGroup.key, q)}
                  />
                  <span className="text-sm text-[#1f1e1c] leading-relaxed">{q}</span>
                </label>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={activeGroupIdx === 0}
              className="flex items-center gap-2 border border-[#cfcdc2] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-semibold transition text-sm text-[#6b6a64]"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#005c6d] hover:bg-[#004b59] text-white px-5 py-2.5 rounded-xl font-semibold transition text-sm"
            >
              {activeGroupIdx === HOLLAND_GROUPS.length - 1 ? (
                <>
                  Hoàn thành trắc nghiệm <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Tiếp tục <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* OVERLAY LOADING */}
          {submitting && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center rounded-2xl z-20">
              <Loader2 className="w-8 h-8 text-[#005c6d] animate-spin mb-3" />
              <p className="font-bold text-sm text-[#1f1e1c]">Đang tính toán mã Holland...</p>
              <p className="text-xs text-[#6b6a64]">Đang xử lý kết quả trắc nghiệm và đồng bộ la bàn.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HollandTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#005c6d]" />
          <p className="text-sm text-[#6b6a64] font-medium">Đang tải...</p>
        </div>
      </div>
    }>
      <HollandTestContent />
    </Suspense>
  );
}
