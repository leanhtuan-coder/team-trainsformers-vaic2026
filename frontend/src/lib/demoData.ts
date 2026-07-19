// Dữ liệu fallback sinh từ data/processed/market_signal_snapshot.json.
// Dashboard ưu tiên API backend; các hằng số này được dùng khi API chưa sẵn sàng.

export const BRAND = {
  name: "CareerRadar",
  productName: "La Bàn Nghề",
  slogan: "La Bàn Nghề — trợ lý AI hướng nghiệp bằng dữ liệu thật cho học sinh, sinh viên Việt Nam.",
  team: "TrainSformers",
  partner: "VEX Technology Solutions",
  event: "VAIC 2026",
  location: "Hà Nội, Việt Nam",
  year: "2026"
};

export const META = {
  totalJobs: 3365,
  analyzedJobs: 1332,
  careerGroups: 30,
  provinces: 21,
  avgMatch: 92,
};

export const REGIONS = ["Toàn quốc", "Hồ Chí Minh", "Hà Nội", "Bắc Ninh", "Đà Nẵng", "Đồng Nai", "Hải Phòng"];

export interface SkillDemand { name: string; pct: number; cluster: string; salary: string; }

export const TOP_SKILLS: SkillDemand[] = [
  { name: "Giao tiếp", pct: 10, cluster: "Kỹ năng chuyên môn", salary: "17.500.000đ" },
  { name: "Đàm phán", pct: 5, cluster: "Kỹ năng chuyên môn", salary: "22.500.000đ" },
  { name: "Excel", pct: 4, cluster: "Kỹ năng chuyên môn", salary: "14.800.000đ" },
  { name: "Tin học văn phòng", pct: 4, cluster: "Kỹ năng chuyên môn", salary: "17.500.000đ" },
  { name: "Chăm Sóc Khách Hàng", pct: 3, cluster: "Kỹ năng chuyên môn", salary: "19.300.000đ" },
  { name: "Giải quyết vấn đề", pct: 3, cluster: "Kỹ năng chuyên môn", salary: "20.000.000đ" },
  { name: "AutoCAD", pct: 3, cluster: "Kỹ năng chuyên môn", salary: "16.500.000đ" },
  { name: "Lập Kế Hoạch", pct: 2, cluster: "Kỹ năng chuyên môn", salary: "24.500.000đ" },
];

export const SALARY_BY_CLUSTER = [
  { cluster: "Ngân hàng", salary: 25 },
  { cluster: "IT - Phần mềm", salary: 22.5 },
  { cluster: "Kiểm toán", salary: 22.5 },
  { cluster: "Bất động sản", salary: 22 },
  { cluster: "Tài chính", salary: 21 },
  { cluster: "Xây dựng", salary: 20 },
];

export const HOT_LOCAL = [
  { region: "Hồ Chí Minh", skill: "Bán lẻ - Hàng tiêu dùng - FMCG", growth: "12% tin của vùng", salary: "Đang cập nhật" },
  { region: "Hà Nội", skill: "IT - Phần mềm", growth: "11% tin của vùng", salary: "Đang cập nhật" },
  { region: "Bắc Ninh", skill: "Điện / Điện tử / Điện lạnh", growth: "22% tin của vùng", salary: "Đang cập nhật" },
  { region: "Đà Nẵng", skill: "Xây dựng", growth: "19% tin của vùng", salary: "Đang cập nhật" },
  { region: "Đồng Nai", skill: "Cơ khí / Tự động hóa", growth: "48% tin của vùng", salary: "Đang cập nhật" },
  { region: "Hải Phòng", skill: "Cơ khí / Tự động hóa", growth: "24% tin của vùng", salary: "Đang cập nhật" },
];

export interface ClusterDemand { cluster: string; jobs: number; trend: string; }

export const CLUSTER_DEMAND: ClusterDemand[] = [
  { cluster: "Kế toán", jobs: 143, trend: "18% mới" },
  { cluster: "Bán lẻ - Hàng tiêu dùng - FMCG", jobs: 141, trend: "25% mới" },
  { cluster: "Marketing / Quảng cáo", jobs: 140, trend: "27% mới" },
  { cluster: "Xây dựng", jobs: 127, trend: "32% mới" },
  { cluster: "Tài chính", jobs: 96, trend: "29% mới" },
  { cluster: "IT - Phần mềm", jobs: 96, trend: "17% mới" },
  { cluster: "Điện / Điện tử / Điện lạnh", jobs: 83, trend: "40% mới" },
];

export const REGION_DEMAND = [
  { region: "Hồ Chí Minh", jobs: 637, top: ["Bán lẻ - Hàng tiêu dùng - FMCG", "Marketing / Quảng cáo", "Xây dựng"] },
  { region: "Hà Nội", jobs: 629, top: ["IT - Phần mềm", "Bán lẻ - Hàng tiêu dùng - FMCG", "Kế toán"] },
  { region: "Bắc Ninh", jobs: 27, top: ["Điện / Điện tử / Điện lạnh", "Kế toán", "Xây dựng"] },
  { region: "Đà Nẵng", jobs: 26, top: ["Xây dựng", "Thiết kế / Kiến trúc", "Thương mại điện tử"] },
  { region: "Đồng Nai", jobs: 23, top: ["Cơ khí / Tự động hóa", "Sản xuất", "Công nghệ kỹ thuật"] },
  { region: "Hải Phòng", jobs: 21, top: ["Cơ khí / Tự động hóa", "Kế toán", "Điện / Điện tử / Điện lạnh"] },
];
