"use client";

// Dashboard cá nhân hoá — hiện sau khi hoàn thành phỏng vấn AI.

import { useState, useEffect } from "react";
import { TOP_SKILLS } from "@/lib/demoData";
import type { UserProfile } from "@/lib/profile";
import { looseMatch } from "@/lib/text";
import { IconBranch, IconCheck, IconGradCap, IconPencil, IconTrendUp } from "@/components/ui/icons";

const SHORT_WORKSTYLE: Record<string, string> = {
  people: "Hướng về con người",
  data: "Thích khám phá dữ liệu",
  machine: "Mạnh kỹ thuật, máy móc",
  idea: "Thiên hướng sáng tạo",
  hands: "Thích làm ra sản phẩm cụ thể",
};

const TIMELINE_STEPS = ["Học nền tảng", "Lấy chứng chỉ", "Thực tập", "Việc đầu tiên"];

const MILESTONES: Record<string, string[]> = {
  "đường ngắn": ["Tháng 1–6", "Tháng 6–12", "Tháng 12–15", "Tháng 15–18"],
  "cao đẳng": ["Năm 1", "Năm 2", "Cuối năm 2", "Năm thứ 3"],
  "đại học": ["Năm 1–2", "Năm 2–3", "Năm 3–4", "Sau tốt nghiệp"],
};

function summaryLine(p: UserProfile): string {
  // Lấy text ngắn gọn của style
  const styleText = SHORT_WORKSTYLE[p.workStyle] || p.workStyle.split(" — ")[0] || p.workStyle;
  const parts = [
    styleText,
    p.subjects.length > 0 ? `Mạnh ${p.subjects.map(s => s.split(" — ")[0]).join(", ")}` : "",
    `Lộ trình: ${p.studyHorizon.split(" — ")[0] || p.studyHorizon}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

function ownedSkillNames(p: UserProfile, topSkillsList: typeof TOP_SKILLS): Set<string> {
  const owned = new Set<string>();
  for (const s of topSkillsList) {
    if (p.subjects.some(sub => looseMatch(sub, s.name))) owned.add(s.name);
  }
  const lowWorkStyle = p.workStyle.toLowerCase();
  if (lowWorkStyle.includes("con người") || lowWorkStyle === "people") {
    owned.add("Giao tiếp");
    owned.add("Làm việc nhóm");
  }
  return owned;
}

function skillsToLearn(p: UserProfile, topSkillsList: typeof TOP_SKILLS): Set<string> {
  const learn = new Set<string>();
  for (const rec of p.recommendations) {
    for (const skill of rec.skills) {
      for (const t of topSkillsList) {
        if (looseMatch(skill, t.name)) learn.add(t.name);
      }
    }
  }
  return learn;
}

type Props = {
  profile: UserProfile;
  onEdit: () => void;
  onRetake: () => void;
};

export function PersonalPanel({ profile, onEdit, onRetake }: Props) {
  const [topSkills, setTopSkills] = useState<typeof TOP_SKILLS>(TOP_SKILLS);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    fetch(`${API_BASE}/market/snapshot`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((apiData) => {
        if (apiData.top_skills_required) {
          const totalAnalyzed = apiData.total_jobs || 1332;
          const mapped = apiData.top_skills_required.slice(0, 8).map((s: any) => {
            const pct = Math.round((s.count / totalAnalyzed) * 100);
            return {
              name: s.name,
              pct: pct,
              cluster: "Kỹ năng chuyên môn",
              salary: "Đang cập nhật"
            };
          });
          setTopSkills(mapped);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu kỹ năng thật:", err);
      });
  }, []);

  const owned = ownedSkillNames(profile, topSkills);
  const toLearn = skillsToLearn(profile, topSkills);
  
  const horizonKey = profile.studyHorizon.toLowerCase().includes("ngắn") || profile.studyHorizon.toLowerCase().includes("nghề")
    ? "đường ngắn"
    : profile.studyHorizon.toLowerCase().includes("cao đẳng")
    ? "cao đẳng"
    : "đại học";

  const milestones = MILESTONES[horizonKey] ?? MILESTONES["đại học"];
  const maxSkillPct = Math.max(...topSkills.map((s) => s.pct), 1);

  const handleRetake = () => {
    if (window.confirm("Làm lại khảo sát sẽ xoá lộ trình hiện tại của bạn. Tiếp tục?")) onRetake();
  };

  return (
    <div className="fade-up space-y-6">
      {/* Widget hồ sơ */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand/15 bg-brand-light/50 p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white">
            {profile.name.charAt(0).toUpperCase() || "B"}
          </span>
          <div>
            <p className="font-bold text-ink">Hồ sơ: {profile.name}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{summaryLine(profile)}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profile.subjects.map((s) => (
                <span key={s} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-deep">
                  {s.split(" — ")[0] || s}
                </span>
              ))}
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-deep">
                {profile.region}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <IconPencil /> Chỉnh sửa thông tin
          </button>
          <button
            type="button"
            onClick={handleRetake}
            className="rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white hover:text-brand"
          >
            Làm lại đánh giá
          </button>
        </div>
      </div>

      {/* Định hướng gợi ý */}
      <div>
        <h3 className="text-lg font-bold text-ink">Định hướng gợi ý cho bạn</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {profile.recommendations.map((rec) => (
            <article
              key={rec.title}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-ink">{rec.title}</h4>
                <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                  {rec.match}% phù hợp
                </span>
              </div>
              <p className="mt-3 text-sm italic leading-relaxed text-ink-soft">
                <span className="font-semibold not-italic text-brand">Vì sao hợp bạn: </span>
                {rec.why}
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Kỹ năng cần học
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rec.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#FBF1DD] px-2.5 py-1 text-xs font-medium text-[#8A5B06]"
                  >
                    ↗ {s}
                  </span>
                ))}
              </div>
              <p className="mt-3.5 flex items-start gap-2 text-sm text-ink leading-relaxed">
                <span className="mt-1 shrink-0 text-brand">
                  <IconGradCap />
                </span>
                <span>{rec.path}</span>
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {rec.evidence.map((e) => (
                  <span key={e} className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] text-brand-deep font-medium">
                    {e}
                  </span>
                ))}
              </div>
              <p className="mt-auto pt-3 text-right text-[10px] text-ink-soft/50 italic">Gợi ý từ dữ liệu TopCV</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Skill gap — vị trí của bạn trên thị trường */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-7">
          <h3 className="font-bold text-ink">Kỹ năng thị trường cần — vị trí của bạn</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent-dark">
              <IconCheck /> Bạn đã có
            </span>
            <span className="rounded-full bg-[#FBF1DD] px-2.5 py-1 font-semibold text-[#8A5B06]">
              ↗ Nên học thêm
            </span>
            <span className="rounded-full bg-brand-light px-2.5 py-1 font-semibold text-brand-deep">
              Thị trường cần
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {topSkills.map((s) => {
              const isOwned = owned.has(s.name);
              const isToLearn = !isOwned && toLearn.has(s.name);
              return (
                <div key={s.name} className="group relative">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      {s.name}
                      {isOwned && (
                        <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-dark">
                          <IconCheck /> Đã có
                        </span>
                      )}
                      {isToLearn && (
                        <span className="rounded-full bg-[#FBF1DD] px-2 py-0.5 text-[11px] font-semibold text-[#8A5B06]">
                          ↗ Nên học
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-ink-soft">{s.pct}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="grow-bar h-full rounded-full bg-brand"
                      style={{ width: `${(s.pct / maxSkillPct) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-5">
          {/* Timeline 4 bước */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-ink">Lộ trình 4 bước của bạn</h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              Mốc thời gian ước lượng theo lựa chọn &ldquo;{profile.studyHorizon.split(" — ")[0] || profile.studyHorizon}&rdquo;
            </p>
            <ol className="relative mt-5 space-y-5">
              <span
                aria-hidden="true"
                className="absolute bottom-4 left-[15px] top-1 w-0.5 bg-brand-light"
              />
              {TIMELINE_STEPS.map((step, i) => (
                <li key={step} className="relative flex items-start gap-3.5">
                  <span
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      i === 0 ? "bg-brand text-white" : "border-2 border-brand-light bg-white text-brand"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{step}</p>
                    <p className="text-xs text-ink-soft">{milestones[i]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Mở rộng cơ hội */}
          <div className="rounded-2xl border border-brand-light bg-brand-light/60 p-5">
            <p className="flex items-center gap-2 font-bold text-ink">
              <span className="text-brand">
                <IconBranch />
              </span>
              Mở rộng cơ hội
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Bạn có thể đi làm sớm rồi liên thông đại học sau — nhiều công ty hỗ trợ học phí. Hướng
              đi không bao giờ đóng lại.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-4 text-xs text-ink-soft">
            <span className="shrink-0 text-base text-accent-dark">
              <IconTrendUp />
            </span>
            Gợi ý dựa trên dữ liệu thị trường và câu trả lời của bạn — quyết định cuối cùng luôn là
            của bạn.
          </div>
        </div>
      </div>
    </div>
  );
}
