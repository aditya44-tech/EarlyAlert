'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, background: '#F5F0E8', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: '3px solid #0D0D0D', padding: '2.5rem', maxWidth: '420px', textAlign: 'center', background: '#fff', boxShadow: '6px 6px 0 #0D0D0D' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Critical Error</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error.message || 'A fatal error occurred.'}</p>
            <button
              onClick={reset}
              style={{ padding: '0.6rem 1.5rem', background: '#0D0D0D', color: '#fff', fontWeight: 700, border: '2px solid #0D0D0D', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
