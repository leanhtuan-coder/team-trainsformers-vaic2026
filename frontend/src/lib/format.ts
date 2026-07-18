// Định dạng số kiểu Việt Nam — dùng chung landing + dashboard.

export function fmtInt(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** 25.75 (triệu) -> "25.750.000đ" */
export function fmtSalaryFromMillions(millions: number): string {
  return `${Math.round(millions * 1_000_000).toLocaleString("vi-VN")}đ`;
}

/** 25.75 (triệu) -> "25,75 tr" — nhãn ngắn trên chart */
export function fmtMillionsShort(millions: number): string {
  return `${millions.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr`;
}
