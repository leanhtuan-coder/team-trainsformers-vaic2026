"use client";

// Modal chỉnh sửa hồ sơ — lưu lại localStorage và tính lại gợi ý thật qua backend cho nhất quán.

import { useEffect, useState } from "react";
import { REGIONS } from "@/lib/demoData";
import { STEPS, recommend } from "@/lib/interview";
import type { UserProfile } from "@/lib/profile";
import { IconX } from "@/components/ui/icons";

const LEVELS = ["Học sinh THPT", "Sinh viên", "Người đi làm", "Khác"];
const SUBJECT_LIMIT = 3;
const VALUE_LIMIT = 2;

const subjectOptions = STEPS.find((s) => s.id === "subjects")?.options ?? [];
const valueOptions = STEPS.find((s) => s.id === "values")?.options ?? [];
const horizonOptions = STEPS.find((s) => s.id === "studyHorizon")?.options ?? [];

type Props = {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
};

export function ProfileModal({ profile, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name);
  const [region, setRegion] = useState(profile.region);
  const [level, setLevel] = useState(profile.level);
  const [subjects, setSubjects] = useState<string[]>(profile.subjects);
  const [values, setValues] = useState<string[]>(profile.values);
  const [studyHorizon, setStudyHorizon] = useState(profile.studyHorizon);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleLimited = (list: string[], key: string, limit: number): string[] => {
    if (list.includes(key)) return list.filter((k) => k !== key);
    if (list.length >= limit) return list;
    return [...list, key];
  };

  const regionOptions = REGIONS.filter((r) => r !== "Toàn quốc");
  if (region && !regionOptions.includes(region)) regionOptions.push(region);
  const levelOptions = LEVELS.includes(level) ? LEVELS : [...LEVELS, level];

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = { ...profile, name: name.trim() || profile.name, region, level, subjects, values, studyHorizon };
      
      if (profile.profile_id) {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        
        // Gửi quickstart mới lên backend để cập nhật snapshot
        const answersPayload = [
          { question_id: "qs-01-object", answer: profile.workStyle },
          { question_id: "qs-02-teamrole", answer: profile.subjects[0] || "" },
          { question_id: "qs-03-satisfaction", answer: profile.angle },
          { question_id: "qs-04-subject", answer: subjects },
          { question_id: "qs-05-building", answer: profile.workStyle },
          { question_id: "qs-06-strength", answer: subjects.slice(0, 2) },
          { question_id: "qs-07-datahandling", answer: profile.angle },
          { question_id: "qs-08-environment", answer: profile.workStyle },
          { question_id: "qs-09-route", answer: studyHorizon },
          { question_id: "qs-10-avoid", answer: values },
        ];

        await fetch(`${API_BASE}/profile/${profile.profile_id}/quickstart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersPayload }),
        });

        // Lấy lại gợi ý lộ trình thật
        const resPath = await fetch(`${API_BASE}/profile/${profile.profile_id}/pathways`);
        const portfolio = await resPath.json();

        // Map sang recommendations
        const recommendations = (portfolio.candidates || []).map((c: any) => {
          const matchPercent = Math.min(70 + c.relevance_score * 5, 96);
          let whyStr = "";
          if (c.matched_profile_evidence && c.matched_profile_evidence.length > 0) {
            const ev1 = c.matched_profile_evidence[0];
            whyStr = `Bạn có thiên hướng "${ev1.value}" (khớp từ khóa: ${ev1.matched_tokens.join(", ")})`;
            if (c.market_evidence?.salary) {
              whyStr += `, kết hợp mức lương trung vị ngành là ${c.market_evidence.salary.median_trieu} triệu/tháng.`;
            }
          } else {
            whyStr = `Khối ngành đang tuyển dụng sôi động với ${c.market_evidence?.posting_count || 0} tin tuyển dụng.`;
          }

          return {
            title: c.industry,
            match: matchPercent,
            why: whyStr,
            skills: (c.market_evidence?.top_skills || []).slice(0, 3).map((s: any) => s.name),
            path: c.market_evidence?.entry_level_ratio >= 0.25
              ? "Độ mở entry-level tốt: Có thể bắt đầu bằng khoá nghề ngắn hạn hoặc Cao đẳng"
              : "Yêu cầu kỹ thuật/học thuật sâu: Khuyên học Đại học chính quy",
            evidence: [
              `${c.market_evidence?.posting_count || 0} tin tuyển dụng`,
              c.market_evidence?.salary ? `Lương trung vị: ${c.market_evidence.salary.median_trieu} triệu` : "Lương thỏa thuận",
              `Cho người mới: ${(c.market_evidence?.entry_level_ratio * 100).toFixed(0)}%`
            ]
          };
        });

        onSave({
          ...base,
          recommendations
        });
      } else {
        // Fallback
        onSave({ ...base, recommendations: recommend(base) });
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật profile lên backend:", err);
      // Fallback
      const base = { ...profile, name: name.trim() || profile.name, region, level, subjects, values, studyHorizon };
      onSave({ ...base, recommendations: recommend(base) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="fade-up thin-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="profile-modal-title" className="text-lg font-bold text-ink">
            Chỉnh sửa thông tin
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-gray-100 hover:text-ink"
          >
            <IconX />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Họ tên</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-ink transition-colors focus:border-brand"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Khu vực</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink"
              >
                {regionOptions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Trình độ</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink"
              >
                {levelOptions.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Môn mạnh <span className="font-normal text-ink-soft">(tối đa {SUBJECT_LIMIT})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((o) => {
                const selected = subjects.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSubjects(toggleLimited(subjects, o.key, SUBJECT_LIMIT))}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-gray-300 bg-white text-ink hover:border-brand hover:text-brand"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Ưu tiên <span className="font-normal text-ink-soft">(tối đa {VALUE_LIMIT})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {valueOptions.map((o) => {
                const selected = values.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setValues(toggleLimited(values, o.key, VALUE_LIMIT))}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-gray-300 bg-white text-ink hover:border-brand hover:text-brand"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Lộ trình học</legend>
            <div className="space-y-2">
              {horizonOptions.map((o) => (
                <label
                  key={o.key}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-brand"
                >
                  <input
                    type="radio"
                    name="studyHorizon"
                    checked={studyHorizon === o.key}
                    onChange={() => setStudyHorizon(o.key)}
                    className="accent-brand"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
