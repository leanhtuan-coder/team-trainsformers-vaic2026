import { redirect } from "next/navigation";

// Toàn bộ trải nghiệm (dashboard + trợ lý AI + lộ trình) nằm ngay trang chủ
// theo luồng product-led — /app giữ lại để các link cũ không gãy.
export default function AppRedirect() {
  redirect("/");
}
