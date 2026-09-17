import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <div className="neo-card p-10 max-w-md text-center">
        <div className="text-8xl font-black text-[#0D0D0D] mb-2">404</div>
        <h1 className="text-2xl font-black text-[#0D0D0D] mb-2">Page Not Found</h1>
        <p className="text-neutral-600 font-semibold mb-6 text-sm">The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-[#0D0D0D] text-white font-bold uppercase tracking-wide border-2 border-[#0D0D0D] shadow-[4px_4px_0px_#555] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
