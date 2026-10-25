import { NextResponse } from "next/server";
import { getState } from "@/lib/state";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getState();
  // Чаты с контактами клиентов и анкеты кандидатов (персональные данные) видит только админ-панель.
  if (!isAdmin()) return NextResponse.json({ ...state, chats: [], applications: [] });
  return NextResponse.json(state);
}
