// ===== frontend/src/app/layout.tsx =====
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
      <body className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}