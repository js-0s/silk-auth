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
  const { chain: currentChain } = useCurrentChain();

  const connect = useCallback(() => {
    login();
  }, [login]);

  if (!isReady) {
    return (
      <p className="text-center italic text-gray-600">
        Waiting for authentication to be ready. Displaying only public content.
      </p>
    );
  }
  if (!authenticated) {
    return (
      <div className="space-y-4 rounded border p-4 shadow-md">
        <p className="text-gray-700">
          public content, user cannot interact with web3
        </p>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={connect}
        >
          Connect
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded border p-4 shadow-md">
      <p className="text-gray-700">
        authenticated content, user can interact with web3
      </p>
      <p className="text-sm text-gray-600">
        session state: {session?.data?.user?.address ?? 'no session'}
      </p>
      <p className="text-sm text-gray-600">
        web3ContextState: {address}:{currentChain?.id ?? ''}:
        {currentChain?.name ?? ''}
      </p>
      <WagmiStatus />
      <TestWriteContract />
    </div>
  );
}
