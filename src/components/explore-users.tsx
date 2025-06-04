'use client';
import { useAuth } from '@/contexts';
import { useWeb3Context } from '@/lib/web3/adapter/silk/context-provider';
import { useSession } from 'next-auth/react';

export function ExploreUsers() {
  const session = useSession();
  const { authenticated, isReady, address } = useAuth();
  const { chain, chainId } = useWeb3Context();
  if (!isReady) {
    return <p>Waiting for authentication to be ready</p>;
  }
  if (!authenticated) {
    return <p>user-list for public</p>;
  }
  return (
    <div>
      <p>user-list for authenticated</p>
      <p>session state: {session?.data?.user?.address ?? 'no session'}</p>
      <p>
        providerState: {address}:{chainId}:{chain?.name ?? ''}
      </p>
    </div>
  );
}
