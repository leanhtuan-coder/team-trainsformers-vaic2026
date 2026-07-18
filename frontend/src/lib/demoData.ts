// Dữ liệu demo NHẤT QUÁN toàn site (landing + app).
// Khi backend/pipeline thật sẵn sàng, thay bằng labor_signal.json từ data pipeline.

export const META = {
  totalJobs: 3365,
  careerGroups: 30,
  provinces: 25,
  avgMatch: 92,
};

export const REGIONS = ["Toàn quốc", "Hà Nội", "TP.HCM", "Đà Nẵng", "Bắc Ninh", "Bình Dương", "Hải Phòng"];

export interface SkillDemand { name: string; pct: number; cluster: string; salary: string; }

export const TOP_SKILLS: SkillDemand[] = [
  { name: "Giao tiếp", pct: 15, cluster: "Kỹ năng mềm", salary: "15.000.000đ" },
  { name: "Đàm phán", pct: 12, cluster: "Kỹ năng mềm", salary: "18.000.000đ" },
  { name: "Excel", pct: 10, cluster: "Tin học văn phòng", salary: "14.500.000đ" },
  { name: "Làm việc nhóm", pct: 9, cluster: "Kỹ năng mềm", salary: "14.000.000đ" },
  { name: "Phân tích dữ liệu", pct: 8, cluster: "Dữ liệu / AI", salary: "22.000.000đ" },
  { name: "SQL", pct: 7, cluster: "CNTT", salary: "24.000.000đ" },
  { name: "Bán hàng", pct: 6, cluster: "Kinh doanh", salary: "20.000.000đ" },
  { name: "Digital Marketing", pct: 5, cluster: "Marketing", salary: "16.000.000đ" },
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

export interface ClusterDemand { cluster: string; jobs: number; trend: string; }

export const CLUSTER_DEMAND: ClusterDemand[] = [
  { cluster: "Kinh doanh / Bán hàng", jobs: 870, trend: "+18%" },
  { cluster: "CNTT / Lập trình", jobs: 495, trend: "+27%" },
  { cluster: "Sản xuất / Kỹ thuật", jobs: 410, trend: "+34%" },
  { cluster: "Dữ liệu / AI", jobs: 320, trend: "+41%" },
  { cluster: "Marketing", jobs: 250, trend: "+38%" },
  { cluster: "Giáo dục", jobs: 180, trend: "+12%" },
  { cluster: "Logistics / Xuất nhập khẩu", jobs: 115, trend: "+29%" },
];

export const REGION_DEMAND = [
  { region: "Hà Nội", jobs: 820, top: ["Phân tích dữ liệu", "Bán hàng", "Kế toán"] },
  { region: "TP.HCM", jobs: 970, top: ["Digital Marketing", "CNTT", "Tiếng Anh"] },
  { region: "Đà Nẵng", jobs: 280, top: ["Du lịch - KS", "Tiếng Anh", "CNTT"] },
  { region: "Bắc Ninh", jobs: 320, top: ["Điện tử", "Vận hành CNC", "Tiếng Trung"] },
  { region: "Bình Dương", jobs: 350, top: ["Vận hành CNC", "May mặc", "Kho vận"] },
  { region: "Hải Phòng", jobs: 140, top: ["Xuất nhập khẩu", "Kho vận", "Tiếng Anh"] },
];
