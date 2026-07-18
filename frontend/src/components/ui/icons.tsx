import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconChart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M3 20h18" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function IconRoute(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="5" r="2.2" />
      <path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.6" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} strokeWidth={2.4} {...props}>
      <path d="M4.5 12.5 10 18 19.5 6.5" />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" />
      <path d="M10 12h10.5M17 8.5 20.5 12 17 15.5" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} strokeWidth={2.2} {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

export function IconGradCap(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
      <path d="M6.5 11.5V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.5" />
      <path d="M21.5 9.5V15" />
    </svg>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M14.5 6.5a4 4 0 0 1 5-5l-3 3 .8 2.2L19.5 7.5l3-3a4 4 0 0 1-5 5L8 19a2.1 2.1 0 0 1-3-3l9.5-9.5Z" />
    </svg>
  );
}

export function IconUnlink(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M9 6.5V4M6.5 9H4M15 17.5V20M17.5 15H20" />
      <path d="M8.5 12.5 6 15a3.5 3.5 0 0 0 5 5l2.5-2.5" />
      <path d="M15.5 11.5 18 9a3.5 3.5 0 0 0-5-5l-2.5 2.5" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrendUp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M3.5 17.5 9.5 11l4 4 7-8" />
      <path d="M15.5 7h5v5" />
    </svg>
  );
}

export function IconDatabase(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5V12c0 1.7 3.6 3 8 3s8-1.3 8-3V5.5" />
      <path d="M4 12v6.5c0 1.7 3.6 3 8 3s8-1.3 8-3V12" />
    </svg>
  );
}

export function IconBulb(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <path d="M9.5 18.5v-2.2a6.5 6.5 0 1 1 5 0v2.2" />
      <path d="M9.5 21.5h5M9.5 18.5h5" />
    </svg>
  );
}

export function IconBranch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M8 6.8c4 1.2 4 3.4 7.8 4.5M8 17.2c4-1.2 4-3.4 7.8-4.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.8.7 3 2.3 3 4.7" />
    </svg>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7M3 12.5h18" />
    </svg>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...strokeProps} {...props}>
      <circle cx="8" cy="8" r="6" />
      <circle cx="16" cy="16" r="6" />
      <path d="M12 8H8V10M16 12v4h-4" />
    </svg>
  );
}
