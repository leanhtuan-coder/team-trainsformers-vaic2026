import type { DimensionGroup } from "./schema.js";

export interface QuickstartQuestion {
  id: string;
  text: string;
  type: "text" | "single" | "multi";
  options?: string[];
  group: DimensionGroup;
  dimension: string;
}

export const QUICKSTART_QUESTIONS: QuickstartQuestion[] = [
  {
    id: "qs-01-object",
    text: "Câu 1. Đối tượng làm việc nào khiến bạn thấy cuốn hút nhất?",
    type: "single",
    options: [
      "Máy móc, thiết bị, xây dựng thứ gì đó bằng tay",
      "Con số, dữ liệu, phân tích",
      "Con người: giúp đỡ, chăm sóc, dạy dỗ",
      "Ý tưởng, sáng tạo, cái đẹp"
    ],
    group: "activity_interest",
    dimension: "đối tượng làm việc cuốn hút",
  },
  {
    id: "qs-02-teamrole",
    text: "Câu 2. Trong một dự án nhóm, bạn thường là người…?",
    type: "single",
    options: [
      "Đứng ra dẫn dắt, thuyết phục mọi người",
      "Lên kế hoạch, sắp xếp cho chạy trơn tru",
      "Kết nối, hòa giải, chăm lo cảm xúc nhóm",
      "Giải quyết phần khó nhất về kỹ thuật/logic"
    ],
    group: "ability_skill",
    dimension: "vai trò trong dự án nhóm",
  },
  {
    id: "qs-03-satisfaction",
    text: "Câu 3. Bạn thấy thỏa mãn nhất khi…?",
    type: "single",
    options: [
      "Sửa được một thứ hỏng / làm ra sản phẩm chạy được",
      "Tìm ra quy luật ẩn trong mớ thông tin",
      "Thấy người khác tiến bộ/khỏe hơn nhờ mình",
      "Tạo ra thứ chưa ai làm, được công nhận"
    ],
    group: "work_values",
    dimension: "nguồn gốc sự thỏa mãn",
  },
  {
    id: "qs-04-subject",
    text: "Câu 4. Môn học hoặc hoạt động bạn thấy dễ chịu nhất?",
    type: "single",
    options: [
      "Toán, Lý, Tin",
      "Văn, Ngoại ngữ, Sử",
      "Sinh, Hóa",
      "Mỹ thuật, Âm nhạc, sáng tạo"
    ],
    group: "ability_skill",
    dimension: "môn học hoạt động dễ chịu",
  },
  {
    id: "qs-05-building",
    text: "Câu 5. Bạn thích \"xây\" thứ nào hơn?",
    type: "single",
    options: [
      "Thứ vô hình: phần mềm, hệ thống, quy trình",
      "Thứ sờ được: máy móc, công trình, sản phẩm vật lý",
      "Thứ thuộc về con người: trải nghiệm, bài giảng, dịch vụ",
      "Thứ thuộc về cái đẹp: hình ảnh, âm thanh, tác phẩm"
    ],
    group: "activity_interest",
    dimension: "đối tượng muốn xây dựng",
  },
  {
    id: "qs-06-strength",
    text: "Câu 6. Việc nào bạn thấy mình làm tốt hơn hẳn bạn bè cùng lớp? (chọn tối đa 2)",
    type: "multi",
    options: [
      "Giải bài logic/toán khó",
      "Viết, thuyết trình, thuyết phục",
      "Nhớ chi tiết, làm cẩn thận không sai sót",
      "Vẽ, thiết kế, cảm nhận thẩm mỹ",
      "Làm tay chân, lắp ráp, sửa chữa"
    ],
    group: "ability_skill",
    dimension: "năng lực nổi trội tự nhận",
  },
  {
    id: "qs-07-datahandling",
    text: "Câu 7. Với một bảng dữ liệu, bạn thích làm gì hơn?",
    type: "single",
    options: [
      "Kiểm tra cho khớp, đúng quy tắc, không sai sót",
      "Tìm insight, dự đoán xu hướng từ nó",
      "Trình bày cho người khác hiểu, kể thành câu chuyện"
    ],
    group: "activity_interest",
    dimension: "phương thức xử lý dữ liệu",
  },
  {
    id: "qs-08-environment",
    text: "Câu 8. Môi trường làm việc bạn muốn?",
    type: "single",
    options: [
      "Ngoài hiện trường, vận động, không ngồi bàn nhiều",
      "Văn phòng, ổn định, quy trình rõ ràng",
      "Tiếp xúc nhiều người, năng động",
      "Tự do, linh hoạt, tự đặt nhịp"
    ],
    group: "context_preferences",
    dimension: "môi trường làm việc mong muốn",
  },
  {
    id: "qs-09-route",
    text: "Câu 9. Con đường nào nghe hấp dẫn hơn với bạn?",
    type: "single",
    options: [
      "Nghề ổn định, rõ lộ trình, ít biến động",
      "Nghề mới, thay đổi nhanh, nhiều cơ hội đột phá",
      "Tự làm chủ, tự do nhưng tự chịu rủi ro"
    ],
    group: "goals_exploration",
    dimension: "độ mở định hướng nghề",
  },
  {
    id: "qs-10-avoid",
    text: "Câu 10. Điều gì khiến bạn thấy ngán nhất ở một công việc?",
    type: "single",
    options: [
      "Ngồi yên một chỗ, lặp đi lặp lại",
      "Giao tiếp/thuyết phục người lạ liên tục",
      "Làm việc mơ hồ, không có đáp án đúng",
      "Áp lực deadline/cạnh tranh cao"
    ],
    group: "work_values",
    dimension: "yếu tố né tránh trong công việc",
  },
];
