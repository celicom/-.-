import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, currentUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user: user ? publicUser(user) : null });
}

/** Выход: удаляет сессионную cookie. */
export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
