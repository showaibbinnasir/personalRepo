import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { getPortfolio } from "@/lib/api";

const SITE_URL = "https://www.showaibbinnasir.site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171313"
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Showaib Bin Nasir — Robotics & AI Engineer",
    template: "%s | Showaib Bin Nasir"
  },
  description: "Portfolio of Mohammad Showaib Bin Nasir, MSc Robotics and Artificial Intelligence graduate, showcasing projects, experience and research in robotics, AI and intelligent systems.",
  keywords: ["Showaib Bin Nasir", "Robotics engineer", "Artificial intelligence", "AI portfolio", "Robotics and AI graduate", "Machine learning", "Intelligent systems"],
  authors: [{ name: "Showaib Bin Nasir", url: SITE_URL }],
  creator: "Showaib Bin Nasir",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  },
  openGraph: {
    title: "Showaib Bin Nasir — Robotics & AI Engineer",
    description: "Robotics, artificial intelligence, software and intelligent systems.",
    url: SITE_URL,
    siteName: "Showaib Bin Nasir",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Showaib Bin Nasir — Robotics & AI Engineer",
    description: "Robotics, artificial intelligence, software and intelligent systems."
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const portfolio = await getPortfolio();

  const personLd = portfolio ? {
    "@context": "https://schema.org",
    "@type": "Person",
    name: portfolio.profile.name,
    alternateName: portfolio.profile.shortName,
    jobTitle: portfolio.profile.title,
    description: portfolio.profile.heroStatement,
    image: portfolio.profile.portraitUrl || undefined,
    email: portfolio.profile.email || undefined,
    telephone: portfolio.profile.phone || undefined,
    address: portfolio.profile.location ? { "@type": "PostalAddress", addressLocality: portfolio.profile.location } : undefined,
    url: SITE_URL,
    sameAs: (portfolio.socialLinks || []).map(s => s.url).filter(Boolean)
  } : null;

  const gaId = process.env.NEXT_GA_ID;

  return (
    <html lang="en">
      <body>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        {personLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
          />
        )}
        {children}
      </body>
    </html>
  );
}