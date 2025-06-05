'use client';
import {
  useMemo,
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';

import { WagmiProvider, createConfig } from 'wagmi';
import { EthereumProvider, initSilk } from '@silk-wallet/silk-wallet-sdk';
import { options } from './options';
import { config } from '@/lib/web3/config/wagmi';

import { SilkEthereumProviderInterface } from '@silk-wallet/silk-wallet-sdk';

declare global {
  interface Window {
    silk?: SilkEthereumProviderInterface;
  }
}
interface IWeb3ContextChain {
  name?: string;
  blockExplorers?: { default: { url: string } };
}

interface IWeb3Context {
  chainId?: number;
  chain?: IWeb3ContextChain;
  address?: string;
  provider?: EthereumProvider;
  checkWallet: () => Promise<{ address?: `0x${string}`; chainId?: number }>;
}
const Web3Context = createContext({
  chainId: undefined,
  chain: undefined,
  address: undefined,
  provider: undefined,
  checkWallet: async () => ({ address: undefined, chainId: undefined }),
} as IWeb3Context);

if (typeof window !== 'undefined' && typeof window.silk === 'undefined') {
  initSilk(options);
}

export function Web3ContextProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [provider, setProvider] = useState<EthereumProvider | undefined>();

  const checkWallet = useCallback(async () => {
    console.log('silk/context-provider checkWallet');
    if (!provider) {
      console.warn('checkWallet called without a provider');
      return {};
    }
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as `0x${string}`[];
    const chainIdHex = await provider.request({
      method: 'eth_chainId',
    });
    const address = accounts[0];
    const chainId = Number(chainIdHex);
    console.log(
      'silk/context-provider::checkWallet',
      address,
      chainId,
      accounts,
    );
    return { address, chainId };
  }, [provider]);
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
  const value = useMemo(() => {
    return {
      address,
      chainId,
      chain,
      checkWallet,
      provider,
    };
  }, [address, chainId, chain, checkWallet, provider]);
  useEffect(() => {
    let subscribed = true;
    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
    async function checkWalletConnection() {
      if (!provider) {
        timerId = setTimeout(() => checkWalletConnection(), 100);
        return;
      }
      const { address, chainId } = await checkWallet();
      if (!subscribed) {
        return;
      }
      setAddress(address);
      setChainId(chainId);
    }
    checkWalletConnection();
    return () => {
      clearTimeout(timerId);
      subscribed = false;
    };
  }, [provider, checkWallet]);
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
    function checkProvider() {
      if (provider !== window.silk) {
        setProvider(window.silk as EthereumProvider);
        console.warn('window.silk changed');
      }
      timerId = setTimeout(() => checkProvider(), 100);
    }
    checkProvider();
    return () => {
      clearTimeout(timerId);
    };
  }, [provider]);

  useEffect(() => {
    if (!provider || typeof provider.on !== 'function') {
      return;
    }
    const handleAccountsChanged = (accounts: `0x${string}`) => {
      console.log('silk/context-provider/event: Accounts Changed:', accounts);
      setAddress(accounts[0] || undefined);
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = Number(chainIdHex);
      console.log('silk/context-provider/event: Chain Changed:', chainId);
      setChainId(chainId);
    };
    const handleDisconnect = (error: unknown) => {
      console.log('silk/context-provider/event: Wallet disconnected:', error);
      setAddress(undefined);
      setChainId(undefined);
    };
    const handleConnect = () => {
      console.log('silk/context-provider/event: Connected to Human Wallet');
    };

    // Add listeners
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);
    provider.on('connect', handleConnect);
    // Cleanup on unmount
    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
      provider.removeListener('connect', handleConnect);
    };
  }, [provider]);
  useEffect(() => {
    if (window.silk) {
      return;
    }
    //works the same as in global scope:
    //setProvider(initSilk(options) as EthereumProvider);
  }, []);
  return (
    <WagmiProvider config={createConfig(config)}>
      <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
    </WagmiProvider>
  );
}
export const useWeb3Context = () => useContext(Web3Context);
