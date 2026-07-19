"use client";

// Biểu đồ bong bóng động (bubble race) việc làm 2000–2025 — thuần SVG/CSS, không chart lib.
// Mỗi bong bóng = một nhóm ngành. Trục X = quy mô lao động (thang log), trục Y = tăng trưởng so với
// năm trước, kích thước = quy mô lao động, màu = khu vực. Số năm hiển thị lớn mờ phía sau (watermark),
// animation chạy qua từng năm, mỗi năm 1 giây.

import { useEffect, useMemo, useRef, useState } from "react";
import { JOBS_SERIES, JOBS_YEARS } from "@/lib/jobsTimeSeries";
import { fmtInt } from "@/lib/format";

const VIEW_W = 760;
const VIEW_H = 480;
const PLOT_X0 = 62;
const PLOT_X1 = 736;
const PLOT_Y0 = 26;
const PLOT_Y1 = 424;
const R_MIN = 6;
const R_MAX = 44;
const MS_PER_YEAR = 1000;

const SECTOR_COLORS: Record<string, string> = {
  "Công nghiệp": "#007C76", // brand
  "Dịch vụ": "#3DAE5A", // accent
  "Nông nghiệp": "#E8A13A", // warm
};
const DEFAULT_COLOR = "#5B6B69";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface PreparedSeries {
  name: string;
  short: string;
  sector: string;
  color: string;
  cx: number[]; // toạ độ x theo từng năm (đã scale)
  cy: number[]; // toạ độ y theo từng năm
  r: number[]; // bán kính theo từng năm
  growth: number[]; // % tăng trưởng theo năm
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function JobsBubbleRace() {
  const N = JOBS_YEARS.length;
  const reducedMotion = usePrefersReducedMotion();

  const { series, xTicks, yTicks, y0Line } = useMemo(() => {
    const allValues = JOBS_SERIES.flatMap((s) => s.values);
    const vMin = Math.min(...allValues);
    const vMax = Math.max(...allValues);

    // Trục X log để trải đều dải 15 → 24.000 nghìn lao động.
    const logMin = Math.log10(vMin * 0.85);
    const logMax = Math.log10(vMax * 1.12);
    const xScale = (v: number) => PLOT_X0 + ((Math.log10(v) - logMin) / (logMax - logMin)) * (PLOT_X1 - PLOT_X0);

    // Bán kính tỉ lệ diện tích (sqrt) trên toàn dải giá trị.
    const rootMin = Math.sqrt(vMin);
    const rootMax = Math.sqrt(vMax);
    const rScale = (v: number) => R_MIN + ((Math.sqrt(v) - rootMin) / (rootMax - rootMin)) * (R_MAX - R_MIN);

    // Tăng trưởng YoY cho mọi ngành/năm để lấy miền trục Y cố định.
    const growthOf = (values: number[]) =>
      values.map((v, t) => (t === 0 ? 0 : ((v - values[t - 1]) / values[t - 1]) * 100));
    const allGrowth = JOBS_SERIES.flatMap((s) => growthOf(s.values));
    const gMin = Math.min(...allGrowth);
    const gMax = Math.max(...allGrowth);
    const gPad = (gMax - gMin) * 0.12;
    const gLo = gMin - gPad;
    const gHi = gMax + gPad;
    const yScale = (g: number) => PLOT_Y1 - ((g - gLo) / (gHi - gLo)) * (PLOT_Y1 - PLOT_Y0);

    const prepared: PreparedSeries[] = JOBS_SERIES.map((s) => {
      const growth = growthOf(s.values);
      return {
        name: s.name,
        short: s.name.split(" / ")[0],
        sector: s.sector,
        color: SECTOR_COLORS[s.sector] ?? DEFAULT_COLOR,
        cx: s.values.map(xScale),
        cy: growth.map(yScale),
        r: s.values.map(rScale),
        growth,
      };
    });

    const xTickVals = [10, 100, 1000, 10000].filter((v) => v >= vMin * 0.8 && v <= vMax * 1.2);
    const xTicks = xTickVals.map((v) => ({ v, x: xScale(v) }));

    // Nhãn trục Y: các mốc % chẵn trong miền.
    const yTickVals: number[] = [];
    const step = 5;
    for (let g = Math.ceil(gLo / step) * step; g <= gHi; g += step) yTickVals.push(g);
    const yTicks = yTickVals.map((g) => ({ g, y: yScale(g) }));

    return { series: prepared, xTicks, yTicks, y0Line: yScale(0) };
  }, []);

  // progress ∈ [0, N-1] — phần nguyên là năm, phần thập phân là tween giữa hai năm.
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const hasAutoStarted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Vòng lặp animation.
  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setProgress((p) => {
        const next = p + dt / MS_PER_YEAR;
        if (next >= N - 1) {
          setPlaying(false);
          return N - 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, N]);

  // Tự chạy khi cuộn tới (một lần). Nếu người dùng bật giảm chuyển động: nhảy thẳng tới năm cuối.
  useEffect(() => {
    if (reducedMotion) {
      setProgress(N - 1);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAutoStarted.current) {
          hasAutoStarted.current = true;
          setProgress(0);
          setPlaying(true);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion, N]);

  const yearIndex = clamp(Math.round(progress), 0, N - 1);
  const year = JOBS_YEARS[yearIndex];
  const atEnd = progress >= N - 1;

  const togglePlay = () => {
    if (atEnd) {
      setProgress(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  const onScrub = (value: number) => {
    setPlaying(false);
    setProgress(value);
  };

  // Vẽ bong bóng lớn trước để bong bóng nhỏ nổi lên trên.
  const i0 = Math.floor(progress);
  const i1 = Math.min(i0 + 1, N - 1);
  const frac = progress - i0;
  const frame = series
    .map((s) => ({
      s,
      cx: lerp(s.cx[i0], s.cx[i1], frac),
      cy: lerp(s.cy[i0], s.cy[i1], frac),
      r: lerp(s.r[i0], s.r[i1], frac),
    }))
    .sort((a, b) => b.r - a.r);

  const hoveredFrame = hovered ? frame.find((f) => f.s.name === hovered) : null;
  const hoveredValue = hovered ? JOBS_SERIES.find((s) => s.name === hovered)?.values[yearIndex] : undefined;
  const hoveredGrowth = hovered ? series.find((s) => s.name === hovered)?.growth[yearIndex] : undefined;

  const sectors = Object.keys(SECTOR_COLORS);

  return (
    <div ref={containerRef}>
      {/* Điều khiển */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          aria-label={playing ? "Tạm dừng" : atEnd ? "Chạy lại" : "Chạy"}
        >
          {playing ? (
            <>
              <PauseIcon /> Tạm dừng
            </>
          ) : atEnd ? (
            <>
              <ReplayIcon /> Chạy lại
            </>
          ) : (
            <>
              <PlayIcon /> Chạy
            </>
          )}
        </button>
        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={N - 1}
            step={0.01}
            value={progress}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            aria-label="Chọn năm"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand"
          />
          <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-brand">{year}</span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Biểu đồ bong bóng việc làm theo ngành, năm ${year}. Trục ngang là quy mô lao động (thang log), trục dọc là tăng trưởng so với năm trước, kích thước bong bóng theo quy mô lao động.`}
        >
          {/* Watermark năm — phía sau, lớn và mờ */}
          <text
            x={(PLOT_X0 + PLOT_X1) / 2}
            y={(PLOT_Y0 + PLOT_Y1) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={220}
            fontWeight={800}
            className="fill-ink"
            style={{ opacity: 0.05, letterSpacing: "-0.02em" }}
          >
            {year}
          </text>

          {/* Lưới trục X (log) */}
          {xTicks.map((t) => (
            <g key={`x-${t.v}`}>
              <line x1={t.x} y1={PLOT_Y0} x2={t.x} y2={PLOT_Y1} stroke="#EDF1F0" strokeWidth={1} />
              <text x={t.x} y={PLOT_Y1 + 18} textAnchor="middle" className="fill-ink-soft" fontSize={11}>
                {fmtInt(t.v)}
              </text>
            </g>
          ))}

          {/* Lưới trục Y + đường 0% đậm */}
          {yTicks.map((t) => (
            <g key={`y-${t.g}`}>
              <line
                x1={PLOT_X0}
                y1={t.y}
                x2={PLOT_X1}
                y2={t.y}
                stroke={t.g === 0 ? "#CBD5D3" : "#EDF1F0"}
                strokeWidth={t.g === 0 ? 1.5 : 1}
              />
              <text x={PLOT_X0 - 8} y={t.y + 4} textAnchor="end" className="fill-ink-soft" fontSize={11}>
                {t.g > 0 ? `+${t.g}` : t.g}%
              </text>
            </g>
          ))}

          {/* Nhãn trục */}
          <text x={(PLOT_X0 + PLOT_X1) / 2} y={VIEW_H - 8} textAnchor="middle" className="fill-ink-soft" fontSize={11} fontWeight={600}>
            Quy mô lao động (nghìn người · thang log) →
          </text>
          <text
            x={16}
            y={(PLOT_Y0 + PLOT_Y1) / 2}
            textAnchor="middle"
            className="fill-ink-soft"
            fontSize={11}
            fontWeight={600}
            transform={`rotate(-90 16 ${(PLOT_Y0 + PLOT_Y1) / 2})`}
          >
            Tăng trưởng so với năm trước ↑
          </text>

          {/* Bong bóng */}
          {frame.map(({ s, cx, cy, r }) => {
            const isActive = hovered === s.name;
            const dim = hovered != null && !isActive;
            return (
              <g
                key={s.name}
                className="cursor-pointer"
                style={{ opacity: dim ? 0.25 : 1, transition: "opacity .2s" }}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${s.name}, khu vực ${s.sector}`}
                onFocus={() => setHovered(s.name)}
                onBlur={() => setHovered(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={s.color}
                  fillOpacity={isActive ? 0.42 : 0.24}
                  stroke={s.color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {r > 22 && (
                  <text x={cx} y={cy + 3.5} textAnchor="middle" fill={s.color} fontSize={r > 32 ? 11 : 9.5} fontWeight={700}>
                    {s.short}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredFrame && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[135%] whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${(hoveredFrame.cx / VIEW_W) * 100}%`,
              top: `${(hoveredFrame.cy / VIEW_H) * 100}%`,
            }}
          >
            <p className="font-bold">{hoveredFrame.s.name}</p>
            <p className="mt-0.5 text-white/85">
              {year} · {hoveredValue != null ? fmtInt(Math.round(hoveredValue)) : "—"} nghìn lao động
              {hoveredGrowth != null && yearIndex > 0 ? (
                <>
                  {" · "}
                  {hoveredGrowth >= 0 ? "+" : ""}
                  {hoveredGrowth.toFixed(1)}%
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>

      {/* Chú giải khu vực */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
        {sectors.map((sec) => (
          <span key={sec} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: SECTOR_COLORS[sec], opacity: 0.5 }} />
            {sec}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-ink-soft" />
          <span className="h-3.5 w-3.5 rounded-full border border-ink-soft" />
          Bong bóng lớn = nhiều lao động
        </span>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
    </svg>
  );
}
