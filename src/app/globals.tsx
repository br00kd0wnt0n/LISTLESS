import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Listless - AI-Powered Task Management',
  description: 'Manage your tasks with AI assistance',
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