import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerRadar — La Bàn Nghề",
  description: "Trợ lý AI hướng nghiệp cho học sinh, sinh viên Việt Nam — chọn nghề bằng dữ liệu thật.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }} className="bg-brand-mist text-ink">
        {children}
      </body>
    </html>
  );
}
