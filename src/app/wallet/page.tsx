'use client';
import { useAuth } from '@/contexts';
import { DashboardNotAuthenticated } from '@/components/dashboard/not-authenticated';
import { PageDashboard } from '@/components/page/dashboard';

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
      <p>Wallet Content for authorized user ({address})</p>
    </PageDashboard>
  );
}
