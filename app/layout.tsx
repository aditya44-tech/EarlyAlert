import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EarlyAlert — Predictive Student Dropout Detection',
  description: 'AI-powered platform that identifies at-risk students and enables targeted interventions to reduce dropout rates.',
};

import { EarlyAlertProvider } from './providers';
import { Header } from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#F5F1E8] text-[#0D0D0D] font-sans" suppressHydrationWarning>
        <EarlyAlertProvider>
          <Header />
          <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </EarlyAlertProvider>
      </body>
    </html>
  );
}
