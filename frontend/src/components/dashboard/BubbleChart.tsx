"use client";

// Bản đồ cơ hội nghề nghiệp — bubble chart thuần SVG (không chart lib, theo ràng buộc spec).
// 3 chiều dữ liệu trong một hình: X = lương trung vị, Y = tốc độ tăng trưởng, kích thước = số tin tuyển.
// Bong bóng lớn nằm góc trên–phải = "vùng cơ hội" (lương cao, tăng nhanh, nhiều việc).

import { useState } from "react";
import { fmtInt, fmtMillionsShort, fmtSalaryFromMillions } from "@/lib/format";
import { looseMatch } from "@/lib/text";

export interface BubblePoint {
  cluster: string;
  salary: number; // triệu đồng / tháng (trục X)
  growth: number; // % tăng trưởng (trục Y)
  jobs: number; // số tin tuyển (kích thước bong bóng)
}

type Props = {
  points: BubblePoint[];
  /** Bộ lọc "Khối ngành" từ dashboard — dùng để làm mờ bong bóng không khớp. */
  activeCluster?: string;
  onStart: () => void;
};

const VIEW_W = 720;
const VIEW_H = 440;
const PLOT_X0 = 58;
const PLOT_X1 = 696;
const PLOT_Y0 = 26; // đỉnh vùng vẽ (growth cao)
const PLOT_Y1 = 384; // đáy vùng vẽ (growth thấp)
const R_MIN = 16;
const R_MAX = 46;

const BRAND = "#007C76";
const ACCENT = "#3DAE5A";

function makeLinearScale(dMin: number, dMax: number, rStart: number, rEnd: number) {
  const span = dMax - dMin || 1;
  return (value: number) => rStart + ((value - dMin) / span) * (rEnd - rStart);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function BubbleChart({ points, activeCluster, onStart }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  if (points.length < 2) {
    return (
      <p className="rounded-xl bg-brand-light/60 px-3 py-6 text-center text-sm text-ink-soft">
        Chưa đủ dữ liệu lương + tăng trưởng để dựng bản đồ cơ hội. Cần ít nhất 2 khối ngành có cả hai chỉ số.
      </p>
    );
  }

  const salaries = points.map((p) => p.salary);
  const growths = points.map((p) => p.growth);
  const jobs = points.map((p) => p.jobs);

  const sMin = Math.min(...salaries);
  const sMax = Math.max(...salaries);
  const gMin = Math.min(...growths);
  const gMax = Math.max(...growths);
  const jMin = Math.min(...jobs);
  const jMax = Math.max(...jobs);

  const sPad = (sMax - sMin || sMax || 1) * 0.16;
  const gPad = (gMax - gMin || gMax || 1) * 0.16;

  const xScale = makeLinearScale(sMin - sPad, sMax + sPad, PLOT_X0, PLOT_X1);
  // Trục Y đảo chiều: growth cao -> gần đỉnh (y nhỏ).
  const yScale = makeLinearScale(gMin - gPad, gMax + gPad, PLOT_Y1, PLOT_Y0);
  const rScale = (j: number) => {
    if (jMax === jMin) return (R_MIN + R_MAX) / 2;
    const t = Math.sqrt((j - jMin) / (jMax - jMin)); // xấp xỉ tỉ lệ diện tích
    return R_MIN + t * (R_MAX - R_MIN);
  };

  const medSalary = median(salaries);
  const medGrowth = median(growths);
  const xMed = xScale(medSalary);
  const yMed = yScale(medGrowth);

  const clusterFilterOn = Boolean(activeCluster) && activeCluster !== "Tất cả khối ngành";
  const isDimmed = (cluster: string) => clusterFilterOn && !looseMatch(cluster, activeCluster as string);

  // Vẽ bong bóng lớn trước để bong bóng nhỏ nổi lên trên khi chồng lấn.
  const drawOrder = [...points].sort((a, b) => rScale(b.jobs) - rScale(a.jobs));

  const hoveredPoint = points.find((p) => p.cluster === hovered) ?? null;
  const selectedPoint = points.find((p) => p.cluster === selected) ?? null;

  const xTicks = [sMin, medSalary, sMax];
  const yTicks = [gMin, medGrowth, gMax];

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Bản đồ cơ hội nghề nghiệp: lương trung vị theo trục ngang, tốc độ tăng trưởng theo trục dọc, kích thước bong bóng theo số tin tuyển dụng."
        >
          {/* Lưới quadrant theo trung vị */}
          <line x1={xMed} y1={PLOT_Y0} x2={xMed} y2={PLOT_Y1} stroke="#E2E8E7" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={PLOT_X0} y1={yMed} x2={PLOT_X1} y2={yMed} stroke="#E2E8E7" strokeWidth={1} strokeDasharray="4 4" />

          {/* Nhãn vùng cơ hội (góc trên–phải) */}
          <text x={PLOT_X1 - 6} y={PLOT_Y0 + 14} textAnchor="end" className="fill-accent-dark" fontSize={11} fontWeight={700}>
            ✦ Vùng cơ hội
          </text>

          {/* Trục */}
          <line x1={PLOT_X0} y1={PLOT_Y1} x2={PLOT_X1} y2={PLOT_Y1} stroke="#CBD5D3" strokeWidth={1.5} />
          <line x1={PLOT_X0} y1={PLOT_Y0} x2={PLOT_X0} y2={PLOT_Y1} stroke="#CBD5D3" strokeWidth={1.5} />

          {/* Vạch + nhãn trục X (lương) */}
          {xTicks.map((t, i) => {
            const x = xScale(t);
            return (
              <g key={`xt-${i}`}>
                <line x1={x} y1={PLOT_Y1} x2={x} y2={PLOT_Y1 + 5} stroke="#CBD5D3" strokeWidth={1.5} />
                <text x={x} y={PLOT_Y1 + 18} textAnchor="middle" className="fill-ink-soft" fontSize={11}>
                  {fmtMillionsShort(t)}
                </text>
              </g>
            );
          })}
          <text x={(PLOT_X0 + PLOT_X1) / 2} y={VIEW_H - 8} textAnchor="middle" className="fill-ink-soft" fontSize={11} fontWeight={600}>
            Lương trung vị / tháng →
          </text>

          {/* Vạch + nhãn trục Y (tăng trưởng) */}
          {yTicks.map((t, i) => {
            const y = yScale(t);
            return (
              <g key={`yt-${i}`}>
                <line x1={PLOT_X0 - 5} y1={y} x2={PLOT_X0} y2={y} stroke="#CBD5D3" strokeWidth={1.5} />
                <text x={PLOT_X0 - 9} y={y + 4} textAnchor="end" className="fill-ink-soft" fontSize={11}>
                  +{Math.round(t)}%
                </text>
              </g>
            );
          })}
          <text
            x={16}
            y={(PLOT_Y0 + PLOT_Y1) / 2}
            textAnchor="middle"
            className="fill-ink-soft"
            fontSize={11}
            fontWeight={600}
            transform={`rotate(-90 16 ${(PLOT_Y0 + PLOT_Y1) / 2})`}
          >
            Tăng trưởng ↑
          </text>

          {/* Bong bóng */}
          {drawOrder.map((p, i) => {
            const cx = xScale(p.salary);
            const cy = yScale(p.growth);
            const r = rScale(p.jobs);
            const inSweetSpot = p.salary >= medSalary && p.growth >= medGrowth;
            const color = inSweetSpot ? ACCENT : BRAND;
            const dim = isDimmed(p.cluster);
            const isActive = hovered === p.cluster || selected === p.cluster;
            const label = p.cluster.split(" / ")[0];
            return (
              <g
                key={p.cluster}
                className="bubble-pop cursor-pointer"
                style={{ animationDelay: `${i * 70}ms`, opacity: dim ? 0.2 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`${p.cluster}: lương trung vị ${fmtSalaryFromMillions(p.salary)}, tăng trưởng +${Math.round(
                  p.growth
                )}%, ${fmtInt(p.jobs)} tin tuyển.`}
                onMouseEnter={() => setHovered(p.cluster)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.cluster)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected(selected === p.cluster ? null : p.cluster)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(selected === p.cluster ? null : p.cluster);
                  }
                }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity={isActive ? 0.32 : 0.18}
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all"
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize={r > 26 ? 12 : 10} fontWeight={700}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip HTML — vị trí theo % của viewBox nên khớp mọi kích thước */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${(xScale(hoveredPoint.salary) / VIEW_W) * 100}%`,
              top: `${(yScale(hoveredPoint.growth) / VIEW_H) * 100}%`,
            }}
          >
            <p className="font-bold">{hoveredPoint.cluster}</p>
            <p className="mt-0.5 text-white/85">
              {fmtSalaryFromMillions(hoveredPoint.salary)}/tháng · +{Math.round(hoveredPoint.growth)}% ·{" "}
              {fmtInt(hoveredPoint.jobs)} tin
            </p>
          </div>
        )}
      </div>

      {/* Chú giải */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ACCENT, opacity: 0.4 }} />
          Vùng cơ hội (lương &amp; tăng trưởng trên trung vị)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND, opacity: 0.4 }} />
          Khối ngành khác
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-ink-soft" />
          <span className="h-3.5 w-3.5 rounded-full border border-ink-soft" />
          Bong bóng lớn = nhiều tin tuyển
        </span>
      </div>

      {/* CTA ngữ cảnh khi chọn một bong bóng */}
      {selectedPoint && (
        <div className="fade-up mt-4 flex items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="text-sm text-ink">
            <p>
              <b>{selectedPoint.cluster}</b>: lương trung vị{" "}
              <b className="text-accent-dark">{fmtSalaryFromMillions(selectedPoint.salary)}</b>, tăng trưởng{" "}
              <b className="text-accent-dark">+{Math.round(selectedPoint.growth)}%</b>, đang có{" "}
              <b>{fmtInt(selectedPoint.jobs)} tin</b>. Bạn có tố chất phù hợp không?
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Để AI La Bàn Nghề đánh giá ngay →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
