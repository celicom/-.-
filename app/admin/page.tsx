import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/AdminApp";
import { adminMode, isAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Сосед.ру — Командный пункт", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!isAdmin()) redirect("/admin/login");
  return <AdminApp canLogout={adminMode() === "password"} />;
}
