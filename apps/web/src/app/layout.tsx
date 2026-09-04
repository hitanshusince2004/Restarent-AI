import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurant OS — AI-Powered Dining & Management System',
  description: 'Instant QR Digital Dining, Live Kitchen Display System, and Intelligent Restaurant Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
