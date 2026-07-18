// Tiện ích so khớp text tiếng Việt (bỏ dấu) — dùng cho free-text mapping và skill-gap.

import { STEPS } from "./interview";

export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/** Hai chuỗi coi là "khớp" khi bản bỏ dấu của chuỗi này chứa chuỗi kia. */
export function looseMatch(a: string, b: string): boolean {
  const na = normalizeVi(a);
  const nb = normalizeVi(b);
  return na.includes(nb) || nb.includes(na);
}

/** Lấy label hiển thị của một option trong luồng phỏng vấn; fallback về key thô. */
export function optionLabel(stepId: string, key: string): string {
  const step = STEPS.find((s) => s.id === stepId);
  const opt = step?.options?.find((o) => o.key === key);
  return opt ? opt.label : key;
}
