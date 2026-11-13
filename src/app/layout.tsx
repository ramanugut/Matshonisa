import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Machonisa — Quick Loans, Flexible Repayments', template: '%s · Machonisa' },
  description: 'Apply online for a short-term loan from R500 to R8 000. Fast decisions, transparent fees, flexible repayments.',
  icons: { icon: '/logo-mark.svg' },
};
export const viewport: Viewport = { themeColor: '#14327F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
