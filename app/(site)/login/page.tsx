import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Вход | Сосед.Про", robots: { index: false } };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith("/") && !searchParams.next.startsWith("//") ? searchParams.next : "/";
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200/60 bg-white p-6 shadow-lift sm:p-8">
        <LoginForm next={next} error={searchParams.error ?? null} />
      </div>
    </section>
  );
}
