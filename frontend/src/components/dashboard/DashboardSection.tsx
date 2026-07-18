"use client";

// Mặt tiền sản phẩm: dashboard công khai -> (phỏng vấn AI) -> dashboard cá nhân hoá.

import { Compass } from "@/components/ui/Compass";
import { MarketCharts } from "./MarketCharts";
import { PersonalPanel } from "./PersonalPanel";
import { META, REGIONS } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import type { UserProfile } from "@/lib/profile";

type Props = {
  ready: boolean;
  profile: UserProfile | null;
  matching: boolean;
  onStart: () => void;
  onEdit: () => void;
  onRetake: () => void;
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex gap-4">
        <div className="h-10 w-40 rounded-xl bg-gray-100" />
        <div className="h-10 w-52 rounded-xl bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function MatchingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Compass className="spin-slow h-20 w-20" />
      <p className="mt-6 font-semibold text-ink">
        Đang khớp nối hồ sơ của bạn với {fmtInt(META.totalJobs)} tin tuyển dụng...
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">So kỹ năng · đối chiếu nhu cầu vùng · tính độ phù hợp</p>
      <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-gray-100">
        <div className="progress-indeterminate h-full w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

export function DashboardSection({ ready, profile, matching, onStart, onEdit, onRetake }: Props) {
  const personalized = !matching && profile !== null;

  return (
    <section id="dashboard" aria-labelledby="dashboard-heading" className="scroll-mt-20 px-4 pb-20 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
            {personalized ? "Lộ trình cá nhân hoá" : "Dữ liệu thị trường · Tương tác trực tiếp"}
          </p>
          <h2 id="dashboard-heading" className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {personalized ? `Lộ trình của ${profile.name}` : "Khám phá thị trường việc làm hôm nay"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            {personalized
              ? "Đối chiếu từ câu trả lời của bạn với dữ liệu thị trường — kèm lý do cho từng gợi ý."
              : `Lọc theo vùng và khối ngành — dữ liệu từ ${fmtInt(META.totalJobs)} tin tuyển dụng.`}
          </p>
        </div>

        <div className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl shadow-brand-deep/10 md:p-6">
          {!ready ? (
            <Skeleton />
          ) : matching ? (
            <MatchingState />
          ) : profile ? (
            <div className="space-y-8">
              <PersonalPanel profile={profile} onEdit={onEdit} onRetake={onRetake} />
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold text-ink">Thị trường chung</h3>
                <p className="mt-0.5 mb-4 text-sm text-ink-soft">
                  So sánh vị trí của bạn với toàn thị trường — bộ lọc đang đặt theo khu vực của bạn.
                </p>
                <MarketCharts
                  onStart={onStart}
                  initialRegion={REGIONS.includes(profile.region) ? profile.region : undefined}
                  showCta={false}
                />
              </div>
            </div>
          ) : (
            <MarketCharts onStart={onStart} />
          )}
        </div>
      </div>
    </section>
  );
}
