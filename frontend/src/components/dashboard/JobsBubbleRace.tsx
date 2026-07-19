"use client";

// Biểu đồ bong bóng động (bubble race) việc làm 2000–2025 — thuần SVG/CSS, không chart lib.
// Mỗi bong bóng = một nhóm ngành. Trục X = quy mô lao động (thang log), trục Y = thay đổi số lao động
// so với năm trước (đơn vị lao động, âm/dương), kích thước = quy mô lao động, màu = khu vực.
// Số năm hiển thị lớn mờ phía sau (watermark), animation chạy qua từng năm, mỗi năm 1 giây.
// Bấm một bong bóng: tách riêng nó (các bong bóng khác blur + mất màu) và có tuỳ chọn hiện
// đường đi của nó qua các năm (trail kiểu Gapminder, vẽ tới vị trí hiện tại của animation).

import { useEffect, useMemo, useRef, useState } from "react";
import { JOBS_SERIES, JOBS_YEARS, JOBS_HISTORICAL_END } from "@/lib/jobsTimeSeries";
import { fmtInt } from "@/lib/format";
import { IconX } from "@/components/ui/icons";

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
  delta: number[]; // thay đổi số lao động so với năm trước (âm/dương)
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

  const { series, xTicks, yTicks } = useMemo(() => {
    const allValues = JOBS_SERIES.flatMap((s) => s.values);
    const vMin = Math.min(...allValues);
    const vMax = Math.max(...allValues);

    // Trục X log để trải đều dải 15 → 24.000 lao động.
    const logMin = Math.log10(vMin * 0.85);
    const logMax = Math.log10(vMax * 1.12);
    const xScale = (v: number) => PLOT_X0 + ((Math.log10(v) - logMin) / (logMax - logMin)) * (PLOT_X1 - PLOT_X0);

    // Bán kính tỉ lệ diện tích (sqrt) trên toàn dải giá trị.
    const rootMin = Math.sqrt(vMin);
    const rootMax = Math.sqrt(vMax);
    const rScale = (v: number) => R_MIN + ((Math.sqrt(v) - rootMin) / (rootMax - rootMin)) * (R_MAX - R_MIN);

    // Thay đổi TUYỆT ĐỐI số lao động so với năm trước (đơn vị: lao động, có thể âm/dương)
    // cho mọi ngành/năm để lấy miền trục Y cố định.
    const deltaOf = (values: number[]) => values.map((v, t) => (t === 0 ? 0 : v - values[t - 1]));
    const allDelta = JOBS_SERIES.flatMap((s) => deltaOf(s.values));
    const dMin = Math.min(...allDelta);
    const dMax = Math.max(...allDelta);
    const dPad = (dMax - dMin) * 0.1;
    const dLo = dMin - dPad;
    const dHi = dMax + dPad;
    const yScale = (d: number) => PLOT_Y1 - ((d - dLo) / (dHi - dLo)) * (PLOT_Y1 - PLOT_Y0);

    const prepared: PreparedSeries[] = JOBS_SERIES.map((s) => {
      const delta = deltaOf(s.values);
      return {
        name: s.name,
        short: s.name.split(" / ")[0],
        sector: s.sector,
        color: SECTOR_COLORS[s.sector] ?? DEFAULT_COLOR,
        cx: s.values.map(xScale),
        cy: delta.map(yScale),
        r: s.values.map(rScale),
        delta,
      };
    });

    const xTickVals = [10, 100, 1000, 10000].filter((v) => v >= vMin * 0.8 && v <= vMax * 1.2);
    const xTicks = xTickVals.map((v) => ({ v, x: xScale(v) }));

    // Bước chia "đẹp" cho trục Y (dải lao động rộng nên chọn bội của 1/2/5·10^n).
    const rawStep = (dHi - dLo) / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const niceStep = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const yTickVals: number[] = [];
    for (let d = Math.ceil(dLo / niceStep) * niceStep; d <= dHi; d += niceStep) yTickVals.push(d);
    const yTicks = yTickVals.map((d) => ({ d, y: yScale(d) }));

    return { series: prepared, xTicks, yTicks };
  }, []);

  // progress ∈ [0, N-1] — phần nguyên là năm, phần thập phân là tween giữa hai năm.
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showTrail, setShowTrail] = useState(true);
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
  const isForecast = year > JOBS_HISTORICAL_END; // 2026–2030 là dự báo
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

  const selectedSeries = selected ? series.find((s) => s.name === selected) ?? null : null;

  // Đường đi của bong bóng được chọn — vẽ từ 2000 tới vị trí hiện tại của animation,
  // chấm mốc từng năm, nhãn năm ở các mốc chia hết cho 5.
  let trailD = "";
  const trailMarks: { x: number; y: number; year: number; isMajor: boolean }[] = [];
  if (selectedSeries && showTrail) {
    const pts: [number, number][] = [];
    for (let t = 0; t <= i0; t++) {
      pts.push([selectedSeries.cx[t], selectedSeries.cy[t]]);
      trailMarks.push({
        x: selectedSeries.cx[t],
        y: selectedSeries.cy[t],
        year: JOBS_YEARS[t],
        isMajor: JOBS_YEARS[t] % 5 === 0,
      });
    }
    if (frac > 0) {
      pts.push([
        lerp(selectedSeries.cx[i0], selectedSeries.cx[i1], frac),
        lerp(selectedSeries.cy[i0], selectedSeries.cy[i1], frac),
      ]);
    }
    trailD = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  }

  const hoveredFrame = hovered ? frame.find((f) => f.s.name === hovered) : null;
  const hoveredValue = hovered ? JOBS_SERIES.find((s) => s.name === hovered)?.values[yearIndex] : undefined;
  const hoveredDelta = hovered ? series.find((s) => s.name === hovered)?.delta[yearIndex] : undefined;

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

      {/* Thanh trạng thái khi đã chọn một bong bóng */}
      {selectedSeries && (
        <div className="fade-up mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-brand-light/60 px-3.5 py-2.5 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedSeries.color }} />
            {selectedSeries.name}
          </span>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-ink-soft">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={(e) => setShowTrail(e.target.checked)}
              className="accent-brand"
            />
            Hiện đường đi theo thời gian
          </label>
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Bỏ chọn ngành"
            className="ml-auto rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-white hover:text-ink"
          >
            <IconX />
          </button>
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          onClick={() => setSelected(null)}
          role="img"
          aria-label={`Biểu đồ bong bóng việc làm theo ngành, năm ${year}${isForecast ? " (dự báo)" : ""}. Trục ngang là quy mô lao động (thang log), trục dọc là thay đổi số lao động so với năm trước, kích thước bong bóng theo quy mô lao động.`}
        >
          {/* Watermark năm — phía sau, lớn và mờ. Năm dự báo (2026+) đổi sang màu cam. */}
          <text
            x={(PLOT_X0 + PLOT_X1) / 2}
            y={(PLOT_Y0 + PLOT_Y1) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={220}
            fontWeight={800}
            fill={isForecast ? "#E8A13A" : "#10312E"}
            style={{ opacity: isForecast ? 0.11 : 0.05, letterSpacing: "-0.02em" }}
          >
            {year}
          </text>
          {isForecast && (
            <text
              x={(PLOT_X0 + PLOT_X1) / 2}
              y={(PLOT_Y0 + PLOT_Y1) / 2 + 92}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#CE8A25"
              style={{ opacity: 0.55, letterSpacing: "0.35em" }}
            >
              DỰ BÁO
            </text>
          )}

          {/* Lưới trục X (log) */}
          {xTicks.map((t) => (
            <g key={`x-${t.v}`}>
              <line x1={t.x} y1={PLOT_Y0} x2={t.x} y2={PLOT_Y1} stroke="#EDF1F0" strokeWidth={1} />
              <text x={t.x} y={PLOT_Y1 + 18} textAnchor="middle" className="fill-ink-soft" fontSize={11}>
                {fmtInt(t.v)}
              </text>
            </g>
          ))}

          {/* Lưới trục Y + đường 0 (không đổi so với năm trước) đậm */}
          {yTicks.map((t) => (
            <g key={`y-${t.d}`}>
              <line
                x1={PLOT_X0}
                y1={t.y}
                x2={PLOT_X1}
                y2={t.y}
                stroke={t.d === 0 ? "#CBD5D3" : "#EDF1F0"}
                strokeWidth={t.d === 0 ? 1.5 : 1}
              />
              <text x={PLOT_X0 - 8} y={t.y + 4} textAnchor="end" className="fill-ink-soft" fontSize={11}>
                {t.d > 0 ? "+" : ""}
                {fmtInt(Math.round(t.d))}
              </text>
            </g>
          ))}

          {/* Nhãn trục */}
          <text x={(PLOT_X0 + PLOT_X1) / 2} y={VIEW_H - 8} textAnchor="middle" className="fill-ink-soft" fontSize={11} fontWeight={600}>
            Quy mô lao động (thang log) →
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
            Thay đổi lao động so với năm trước ↑
          </text>

          {/* Đường đi của bong bóng được chọn */}
          {selectedSeries && showTrail && trailD && (
            <g className="pointer-events-none">
              <path
                d={trailD}
                fill="none"
                stroke={selectedSeries.color}
                strokeWidth={2}
                strokeOpacity={0.55}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {trailMarks.map((m) => (
                <g key={m.year}>
                  <circle cx={m.x} cy={m.y} r={m.isMajor ? 3.5 : 2} fill={selectedSeries.color} fillOpacity={0.85} />
                  {m.isMajor && (
                    <text
                      x={m.x}
                      y={m.y - 9}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontWeight={700}
                      fill={selectedSeries.color}
                      stroke="#fff"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {m.year}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* Bong bóng */}
          {frame.map(({ s, cx, cy, r }) => {
            const isSelected = selected === s.name;
            const isActive = hovered === s.name || isSelected;
            const isBlurred = selected != null && !isSelected;
            const dim = selected == null && hovered != null && !isActive;
            return (
              <g
                key={s.name}
                className="cursor-pointer"
                style={{
                  opacity: isBlurred ? 0.35 : dim ? 0.25 : 1,
                  filter: isBlurred ? "blur(3px) grayscale(85%)" : undefined,
                  transition: "opacity .25s, filter .25s",
                }}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${s.name}, khu vực ${s.sector} — bấm để tách riêng và xem đường đi qua các năm`}
                onFocus={() => setHovered(s.name)}
                onBlur={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(isSelected ? null : s.name);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isSelected ? null : s.name);
                  }
                }}
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
                {(r > 30 || isActive || isSelected) && (
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill={s.color}
                    fontSize={11}
                    fontWeight={700}
                    style={{ pointerEvents: "none" }}
                  >
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
              {year} · {hoveredValue != null ? fmtInt(Math.round(hoveredValue)) : "—"} lao động
              {hoveredDelta != null && yearIndex > 0 ? (
                <>
                  {" · "}
                  {hoveredDelta >= 0 ? "+" : ""}
                  {fmtInt(Math.round(hoveredDelta))} so với năm trước
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
