'use client';

import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { Web3ContextProvider } from '@/lib/web3/context-provider';
import { AuthProvider, SidebarProvider } from '@/contexts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <Web3ContextProvider>
          <SidebarProvider>
            <AuthProvider>{children} </AuthProvider>
          </SidebarProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </Web3ContextProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
