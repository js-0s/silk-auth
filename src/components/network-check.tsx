'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useNetworkCheck } from '@/hooks/use-network';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { SwitchWalletNetwork } from './switch-wallet-network';
import { useAuth } from '@/contexts';
import { chainConfig } from '@/lib/web3/config/chain';
import { useWeb3Context } from '@/lib/web3';

interface NetworkCheckProps {
  children: ReactNode;
}

export function NetworkCheck({ children }: NetworkCheckProps) {
  const { isReady, authenticated } = useAuth();
  const { isCorrectNetwork, switchNetwork } = useNetworkCheck();
  const { chainId } = useWeb3Context();
  const { toast } = useToast();
  const wasWrongNetwork = useRef(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!authenticated) {
      return;
    }
    if (!chainId) {
      return;
    }
    if (!isCorrectNetwork) {
      wasWrongNetwork.current = true;
      toast({
        title: 'Network Error',
        description: (
          <div className="mt-2">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">
                Please switch to {chainConfig.name} to use this app
              </p>
            </div>
            <SwitchWalletNetwork />
          </div>
        ),
        variant: 'destructive',
        duration: Infinity,
      });
    } else if (wasWrongNetwork.current) {
      // Only show success toast if we were previously on wrong network
      wasWrongNetwork.current = false;
      toast({
        title: 'Network Connected',
        description: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-sm font-medium">
              Successfully connected to {chainConfig.name}
            </p>
          </div>
        ),
        variant: 'default',
        duration: 3000,
      });
    }
  }, [authenticated, isReady, chainId, isCorrectNetwork, switchNetwork, toast]);
  console.log('network-check::render', {
    isReady,
    authenticated,
    chainId,
    wc: wasWrongNetwork.current,
  });
  return children;
}
