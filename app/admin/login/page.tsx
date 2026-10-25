import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { adminMode, isAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Вход — Командный пункт Сосед.ру", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  if (isAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4">
      <AdminLoginForm locked={adminMode() === "locked"} />
    </main>
  );
}
