'use client';
import { useAuth } from '@/contexts';
import { DashboardNotAuthenticated } from '@/components/dashboard/not-authenticated';
import { PageDashboard } from '@/components/page/dashboard';
import Link from 'next/link';

export default function DashboardPage() {
  const { authenticated, address } = useAuth();
  if (!authenticated) {
    return (
      <PageDashboard>
        <DashboardNotAuthenticated />
      </PageDashboard>
    );
  }

  return (
    <PageDashboard>
      <p>Dashboard Content for authorized user ({address})</p>
      <Link href="/wallet">Review Wallet</Link>
    </PageDashboard>
  );
}
