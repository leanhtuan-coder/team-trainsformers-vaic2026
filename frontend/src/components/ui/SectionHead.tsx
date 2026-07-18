type Props = {
  kicker: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
  light?: boolean;
};

export function SectionHead({ kicker, title, sub, align = "center", light = false }: Props) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-xs font-bold uppercase tracking-[0.22em] ${light ? "text-white/70" : "text-brand"}`}>
        {kicker}
      </p>
      <h2 className={`mt-3 text-3xl font-extrabold leading-tight md:text-4xl ${light ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {sub && (
        <p className={`mt-4 text-base md:text-lg ${light ? "text-white/80" : "text-ink-soft"}`}>{sub}</p>
      )}
    </div>
  );
}
