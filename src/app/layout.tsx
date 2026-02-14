import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutonomyHome | Pre-Purchase Governance Intelligence",
  description:
    "Data-driven due diligence for property development in Michigan. Permits, fees, approval metrics. Residential and commercial paths. No advocacy—decision support only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
            <a href="/" className="text-xl font-semibold text-stone-900">
              AutonomyHome
            </a>
            <p className="mt-0.5 text-sm text-stone-500">
              Pre-Purchase Governance Intelligence · Michigan
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-stone-200 bg-stone-100 py-6">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="text-xs text-stone-500">
              Decision-support tool. Informational only. Always verify with the
              jurisdiction. We do not provide legal or professional advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
