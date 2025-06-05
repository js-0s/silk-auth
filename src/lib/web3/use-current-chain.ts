import { useChainId, useConfig } from 'wagmi';
import { useMemo } from 'react';

export function useCurrentChain() {
  const config = useConfig();
  const chainId = useChainId();
  const currentChain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    return config.chains.find((chain) => chain.id === chainId);
  }, [chainId, config]);
  return currentChain;
}
