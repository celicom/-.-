import { prisma } from "./prisma";
import { ACTIVE_STATUSES } from "./catalog";
import { botConfigured } from "../telegram-bot";
import { FRAUD_MIN_ORDERS, FRAUD_THRESHOLD } from "./finance";

export type FraudInfo = { masterId: string; closed: number; visitOnly: number; ratio: number; flagged: boolean };

export async function computeFraud(): Promise<FraudInfo[]> {
  const masters = await prisma.master.findMany({ select: { id: true } });
  const grouped = await prisma.order.groupBy({
    by: ["masterId", "status"],
    where: { status: { in: ["done", "visit_only"] }, masterId: { not: null } },
    _count: { _all: true },
  });
  return masters.map((m) => {
    const done = grouped.find((g) => g.masterId === m.id && g.status === "done")?._count._all ?? 0;
    const visitOnly = grouped.find((g) => g.masterId === m.id && g.status === "visit_only")?._count._all ?? 0;
    const closed = done + visitOnly;
    const ratio = closed ? visitOnly / closed : 0;
    return { masterId: m.id, closed, visitOnly, ratio, flagged: closed >= FRAUD_MIN_ORDERS && ratio > FRAUD_THRESHOLD };
  });
}

export async function getState() {
  const [masters, orders, payments, books, lessons, donations, deeds, notifications, fines, fraud, applications, chats] = await Promise.all([
    prisma.master.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 120, include: { payment: true } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, include: { order: { select: { number: true, masterId: true, diagnosis: true, status: true } } } }),
    prisma.book.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.lesson.findMany(),
    prisma.donation.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.goodDeed.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.fine.findMany({ orderBy: { createdAt: "desc" } }),
    computeFraud(),
    prisma.application.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.chatThread.findMany({ orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);

  const gmv = payments.reduce((s, p) => s + p.clientPaid, 0);
  const platformFee = payments.reduce((s, p) => s + p.platformFee, 0);
  const serviceFee = payments.reduce((s, p) => s + p.serviceFee, 0);
  const acquiring = payments.reduce((s, p) => s + p.acquiring, 0);
  const finesTotal = fines.reduce((s, f) => s + f.amount, 0);
  const donated = donations.reduce((s, d) => s + d.amount, 0);
  const spent = deeds.filter((d) => d.status !== "planned").reduce((s, d) => s + d.cost, 0);

  const arrivals = orders
    .filter((o) => o.acceptedAt && o.arrivedAt)
    .map((o) => (o.arrivedAt!.getTime() - o.acceptedAt!.getTime()) / 60000);
  const sla = arrivals.length ? Math.round(arrivals.reduce((a, b) => a + b, 0) / arrivals.length) : 0;

  const ratings = orders.filter((o) => o.rating).map((o) => o.rating!);

  // Динамика: последние 14 дней против предыдущих 14
  const DAY = 86400000;
  const now = Date.now();
  const inRange = (d: Date, from: number, to: number) => d.getTime() > now - from * DAY && d.getTime() <= now - to * DAY;
  const sumBy = (from: number, to: number, f: (p: (typeof payments)[number]) => number) => payments.filter((p) => inRange(p.createdAt, from, to)).reduce((s, p) => s + f(p), 0);
  const growth = (cur: number, prev: number) => (prev ? (cur - prev) / prev : 0);
  const gmvSeries = Array.from({ length: 14 }, (_, i) => sumBy(14 - i, 13 - i, (p) => p.clientPaid));
  const gmvGrowth = growth(sumBy(14, 0, (p) => p.clientPaid), sumBy(28, 14, (p) => p.clientPaid));
  const feeGrowth = growth(sumBy(14, 0, (p) => p.platformFee + p.serviceFee), sumBy(28, 14, (p) => p.platformFee + p.serviceFee));
  const ordersGrowth = growth(sumBy(14, 0, () => 1), sumBy(28, 14, () => 1));

  return {
    serverTime: new Date().toISOString(),
    botConfigured: botConfigured(),
    masters,
    orders,
    payments: payments.slice(0, 40),
    books,
    lessons,
    deeds,
    donations,
    notifications,
    fines,
    fraud,
    applications,
    chats,
    metrics: {
      gmv,
      platformNet: platformFee + serviceFee - acquiring + finesTotal,
      platformFee,
      serviceFee,
      acquiring,
      fund: donated - spent,
      fundRaised: donated,
      sla,
      ordersTotal: orders.length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      takeRate: gmv ? (platformFee + serviceFee) / gmv : 0,
      gmvSeries,
      gmvGrowth,
      feeGrowth,
      ordersGrowth,
    },
  };
}

export type AppState = Awaited<ReturnType<typeof getState>>;
