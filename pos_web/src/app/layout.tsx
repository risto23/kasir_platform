import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Platform',
  description: 'POS Platform phase 1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}