'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Direct access: No login required
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-xs">
      <span>Redirecting to Restaurant Dashboard...</span>
    </div>
  );
}
