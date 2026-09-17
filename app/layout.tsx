import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sentinel: Predictive Student Dropout Detection',
  description: 'AI-powered platform that identifies at-risk students and enables targeted interventions to reduce dropout rates.',
};

import { SentinelProvider } from './providers';
import { Header } from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="sentinel-fetch-fix"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (typeof window === 'undefined') return;
  try {
    var rawFetch = window.fetch;
    if (typeof rawFetch === 'function') {
      var currentFetch = typeof rawFetch.bind === 'function' ? rawFetch.bind(window) : rawFetch;
      try {
        Object.defineProperty(window, 'fetch', {
          get: function() { return currentFetch; },
          set: function(fn) { currentFetch = fn; },
          configurable: true,
          enumerable: true
        });
      } catch (err) {
        try {
          Object.defineProperty(window, 'fetch', {
            value: currentFetch,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (err2) {}
      }
    }
    if (typeof window.Window !== 'undefined' && window.Window.prototype) {
      var pDesc = Object.getOwnPropertyDescriptor(window.Window.prototype, 'fetch');
      if (pDesc && pDesc.get && !pDesc.set && pDesc.configurable) {
        var origGetter = pDesc.get;
        Object.defineProperty(window.Window.prototype, 'fetch', {
          get: function() { return origGetter.call(this); },
          set: function(val) {
            try {
              Object.defineProperty(this, 'fetch', {
                value: val,
                writable: true,
                configurable: true,
                enumerable: true
              });
            } catch (e) {
              this._customFetch = val;
            }
          },
          configurable: true,
          enumerable: true
        });
      }
    }
  } catch (e) {}
})();
`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#F5F1E8] text-[#0D0D0D] font-sans" suppressHydrationWarning>
        <SentinelProvider>
          <Header />
          <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </SentinelProvider>
      </body>
    </html>
  );
}
