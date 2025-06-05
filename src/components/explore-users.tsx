'use client';
import { useAuth } from '@/contexts';
import { useCurrentChain } from '@/lib/web3';

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { TestWriteContract } from './test-write-contract';
import { WagmiStatus } from './wagmi-status';

export function ExploreUsers() {
  const session = useSession();
  const { authenticated, isReady, address, login } = useAuth();
  const currentChain = useCurrentChain();

  const connect = useCallback(() => {
    login();
  }, [login]);

  if (!isReady) {
    return (
      <p>
        Waiting for authentication to be ready. Displaying only public content.
      </p>
    );
  }
  if (!authenticated) {
    return (
      <div>
        <p>public content, user cannot interact with web3</p>
        <button onClick={connect}>Connect</button>
      </div>
    );
  }
  return (
    <div>
      <p>authenticated content, user can interact with web3</p>
      <p>session state: {session?.data?.user?.address ?? 'no session'}</p>
      <p>
        web3ContextState: {address}:{currentChain?.id ?? ''}:
        {currentChain?.name ?? ''}
      </p>
      <WagmiStatus />
      <TestWriteContract />
    </div>
  );
}
