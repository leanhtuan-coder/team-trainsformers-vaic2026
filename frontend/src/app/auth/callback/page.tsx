import { redirect } from "next/navigation";

// Giữ URL cũ để bookmark/OAuth callback cũ không gây màn hình treo.
export default function AuthCallbackPage() {
  redirect("/login");
}
