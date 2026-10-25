import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalView } from "@/components/legal/LegalView";
import { Breadcrumbs } from "@/components/site/SiteParts";
import { LEGAL_SLUGS, buildDocuments, type LegalSlug } from "@/src/legal/documents";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = LEGAL_SLUGS.includes(params.slug as LegalSlug) ? buildDocuments()[params.slug as LegalSlug] : null;
  return doc ? { title: `${doc.title} | Сосед.Про`, description: doc.subtitle, alternates: { canonical: `/legal/${doc.slug}` } } : {};
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) notFound();
  const doc = buildDocuments()[params.slug as LegalSlug];
  return (
    <>
      <div className="no-print"><Breadcrumbs items={[{ label: "Документы", href: "/legal" }, { label: doc.title }]} /></div>
      <LegalView doc={doc} slug={doc.slug} />
    </>
  );
}
