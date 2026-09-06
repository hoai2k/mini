import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hopper the Grasshopper',
  description:
    'A small boy. A giant leap. A world to save. A hand-painted mecha adventure in three episodes.',
  icons: { icon: '/favicon.ico', apple: '/assets/hopper-icon-192.png' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
