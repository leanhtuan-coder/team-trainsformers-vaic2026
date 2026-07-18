// Dữ liệu demo NHẤT QUÁN toàn site (landing + app).
// Khi backend/pipeline thật sẵn sàng, thay bằng labor_signal.json từ data pipeline.

export const META = {
  totalJobs: 12480,
  careerGroups: 63,
  provinces: 34,
  avgMatch: 92,
};

export const REGIONS = ["Toàn quốc", "Hà Nội", "TP.HCM", "Đà Nẵng", "Bắc Ninh", "Bình Dương", "Hải Phòng"];

export interface SkillDemand { name: string; pct: number; cluster: string; salary: string; }

export const TOP_SKILLS: SkillDemand[] = [
  { name: "Tiếng Anh", pct: 50, cluster: "Ngoại ngữ", salary: "17.250.000đ" },
  { name: "Giao tiếp", pct: 40, cluster: "Kỹ năng mềm", salary: "15.000.000đ" },
  { name: "Excel", pct: 30, cluster: "Dữ liệu / AI", salary: "15.500.000đ" },
  { name: "Làm việc nhóm", pct: 30, cluster: "Kỹ năng mềm", salary: "14.500.000đ" },
  { name: "Phân tích dữ liệu", pct: 26, cluster: "Dữ liệu / AI", salary: "22.000.000đ" },
  { name: "SQL", pct: 20, cluster: "CNTT", salary: "24.000.000đ" },
  { name: "Bán hàng", pct: 20, cluster: "Kinh doanh", salary: "20.000.000đ" },
  { name: "Digital Marketing", pct: 16, cluster: "Marketing", salary: "16.000.000đ" },
];

export const SALARY_BY_CLUSTER = [
  { cluster: "CNTT / Lập trình", salary: 25.75 },
  { cluster: "Kinh doanh", salary: 20.0 },
  { cluster: "Giáo dục", salary: 18.5 },
  { cluster: "Ngoại ngữ", salary: 17.25 },
  { cluster: "Dữ liệu / AI", salary: 15.5 },
  { cluster: "Kỹ năng mềm", salary: 15.0 },
];

export const HOT_LOCAL = [
  { region: "Hà Nội", skill: "Phân tích dữ liệu", growth: "+41%", salary: "22.000.000đ" },
  { region: "TP.HCM", skill: "Digital Marketing", growth: "+38%", salary: "16.000.000đ" },
  { region: "Bình Dương", skill: "Vận hành CNC", growth: "+34%", salary: "14.000.000đ" },
  { region: "Hải Phòng", skill: "Xuất nhập khẩu", growth: "+29%", salary: "17.000.000đ" },
];

// Nhu cầu tuyển dụng theo khối ngành — cùng snapshot 12.480 tin (tổng jobs = META.totalJobs).
// Tăng trưởng tái sử dụng tín hiệu đã có: +41% (Dữ liệu/AI — Hà Nội), +38% (Marketing — TP.HCM),
// +34% (Sản xuất/CNC — Bình Dương), +29% (Logistics/XNK — Hải Phòng).
export interface ClusterDemand { cluster: string; jobs: number; trend: string; }

export const CLUSTER_DEMAND: ClusterDemand[] = [
  { cluster: "Kinh doanh / Bán hàng", jobs: 2870, trend: "+18%" },
  { cluster: "CNTT / Lập trình", jobs: 2495, trend: "+27%" },
  { cluster: "Sản xuất / Kỹ thuật", jobs: 1910, trend: "+34%" },
  { cluster: "Dữ liệu / AI", jobs: 1620, trend: "+41%" },
  { cluster: "Marketing", jobs: 1450, trend: "+38%" },
  { cluster: "Giáo dục", jobs: 1120, trend: "+12%" },
  { cluster: "Logistics / Xuất nhập khẩu", jobs: 1015, trend: "+29%" },
];

export const REGION_DEMAND = [
  { region: "Hà Nội", jobs: 3120, top: ["Phân tích dữ liệu", "Bán hàng", "Kế toán"] },
  { region: "TP.HCM", jobs: 4370, top: ["Digital Marketing", "CNTT", "Tiếng Anh"] },
  { region: "Đà Nẵng", jobs: 1180, top: ["Du lịch - KS", "Tiếng Anh", "CNTT"] },
  { region: "Bắc Ninh", jobs: 1420, top: ["Điện tử", "Vận hành CNC", "Tiếng Trung"] },
  { region: "Bình Dương", jobs: 1650, top: ["Vận hành CNC", "May mặc", "Kho vận"] },
  { region: "Hải Phòng", jobs: 740, top: ["Xuất nhập khẩu", "Kho vận", "Tiếng Anh"] },
];
