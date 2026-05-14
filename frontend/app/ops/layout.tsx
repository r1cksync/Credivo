'use client';
import Sidebar from '@/components/Sidebar';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
