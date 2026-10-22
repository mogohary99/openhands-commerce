import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";
import { NavLinks } from "@/components/NavLinks";
import { getStore } from "@/lib/store";
import { readSessionId } from "@/lib/session";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers.
const body = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "OpenHands Commerce", template: "%s · OpenHands Commerce" },
  description: "Accessible AI shopping that checks your order before you pay. Fictional demo store on PayPal Sandbox.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sid = await readSessionId();
  const cart = sid ? getStore().getOpenCart(sid) : null;
  const items = cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;

  return (
    <html lang="en" className={body.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header>
          <div className="sandbox-bar">
            <div className="wrap">
              <strong>Demo store.</strong>
              <span>Fictional products. Payments use PayPal Sandbox — no real money moves.</span>
            </div>
          </div>
          <div className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              <LogoMark />
              <span>
                OpenHands <small>Commerce</small>
              </span>
            </Link>
            <nav aria-label="Main" className="site-nav">
              <NavLinks items={items} />
            </nav>
          </div>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="wrap">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              OpenHands Demo Store is fictional and is our own PayPal sandbox merchant. Product facts come from our verified catalog; customer reviews are
              shown as written and are not verified. The AI assistant explains — it cannot pay, approve or change prices.
            </p>
          </div>
        </footer>
        {/* Single polite live region for short status messages (WCAG 4.1.3). */}
        <div id="sr-status" role="status" aria-live="polite" aria-atomic="true" className="visually-hidden" />
      </body>
    </html>
  );
}
