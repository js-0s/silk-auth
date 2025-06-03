import { useEffect, useState, useMemo } from 'react';
import { ConnectedWallet } from '@/lib/web3/types';
import { EthereumProvider } from '@silk-wallet/silk-wallet-sdk';
import { getAccount } from '@wagmi/core';

export function useWallet(): ConnectedWallet | null {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
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
  }, []);
  const { wallets: silkWallets } = useMemo(() => {
    if (!isConnected) {
      return { wallets: [] };
    }
    const normalizedAddress = accounts[0].toLowerCase();
    return {
      wallets: [
        {
          getEthereumProvider: async (): Promise<EthereumProvider> => {
            return window.silk as EthereumProvider;
          },
          isConnected: async () => {
            return isConnected;
          },
          address: normalizedAddress,
        },
      ],
    };
  }, [isConnected, accounts]);
  if (!silkWallets.length) {
    return null;
  }
  const wallet = silkWallets[0]; // Assuming first wallet
  return wallet;
}
