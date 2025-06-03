import { useMemo, useState, useEffect } from 'react';
import { type Address } from 'viem';
import { IWeb3UseChainHook } from '@/lib/web3/types';
import { config } from '@/lib/web3/config/wagmi';

export function useChain(): IWeb3UseChainHook {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  const address = useMemo(() => {
    if (!isConnected) {
      return undefined;
    }
    return accounts[0].toLowerCase() as `0x${string}`;
  }, [isConnected, accounts]);
  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    for (const configChain of config.chains) {
      if (configChain.id === chainId) {
        return configChain;
      }
    }
    return undefined;
  }, [chainId]);
  useEffect(() => {
    if (typeof window.silk?.request !== 'function') {
      return;
    }
    async function getChainId() {
      const chainIdHex = await window.silk.request({
        method: 'eth_chainId',
      });
      setChainId(parseInt(chainIdHex, 16));
    }
    getChainId();
  }, [accounts, window.silk]);
  useEffect(() => {
    if (typeof window.silk?.request !== 'function') {
      return;
    }
    async function getAccounts() {
      const silkAccounts = await window.silk.request({
        method: 'eth_requestAccounts',
      });
      setAccounts(silkAccounts);
      if (accounts.length === 0 || accounts[0].length === 0) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    }
    getAccounts();
  }, [window.silk]);
  const value = useMemo(
    () => ({
      address,
      chain,
      chainId,
    }),
    [address, chain, chainId],
  );
  return value;
}
