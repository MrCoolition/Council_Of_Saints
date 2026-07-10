import type { Metadata } from "next";
import { SiteNavigation } from "@/components/site-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sanctum Council",
    template: "%s | Sanctum Council",
  },
  description:
    "A digital oratory for Scripture, prayer, fidelity, and Catholic formation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <a className="skip-link" href="#main-content">
          Skip to prayer content
        </a>
        <SiteNavigation />
        <div
          className="oratory-content min-w-0 flex-1"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
