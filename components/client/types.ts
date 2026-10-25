export type Draft = {
  kind: "repair" | "cleaning" | "junior";
  skill: string;
  category: string;
  categoryLabel: string;
  brand?: string;
  errorCode?: string;
  diagnosis: string;
  bagHint?: string;
  details?: string;
  priceWorkFrom: number;
  priceWorkTo: number;
  priceTurnkeyTo: number;
};

export const SKILL_BY_ORDER = (o: { kind: string; category: string }) => (o.kind === "cleaning" ? "cleaning" : o.kind === "junior" ? "junior" : o.category);
