'use client';
/**
 * silk without wagmi
 *
 * this context initializes silk without wagmi.
 * use it when you want to interact with window.silk directly
 */
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
import {
  SilkEthereumProviderInterface,
  initSilk,
} from '@silk-wallet/silk-wallet-sdk';
import { options } from './options';
import { config } from '@/lib/web3/config/wagmi';
import { useSession } from 'next-auth/react';
import { debugWeb3ContextProvider as debug } from '@/lib/debug';

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
  requestWallet: () => Promise<{ address?: `0x${string}`; chainId?: number }>;
}
const Web3Context = createContext({
  chainId: undefined,
  chain: undefined,
  address: undefined,
  requestWallet: async () => ({ address: undefined, chainId: undefined }),
} as IWeb3Context);

/**
 * Initialize window.silk at a global scope
 * Find the commented-out 'useEffect' below if you need more fine-grained control
 * when silk is available
 */
if (typeof window !== 'undefined' && typeof window.silk === 'undefined') {
  initSilk(options);
}
export function getProvider() {
  return window.silk;
}

export function Web3ContextProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const session = useSession();

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

  const requestWallet = useCallback(async (): Promise<{
    address?: `0x${string}`;
    chainId?: number;
  }> => {
    const provider = getProvider();
    if (!provider) {
      console.warn(
        'web3/adapter/silk/context-provider: requestWallet called without a provider',
      );
      return {};
    }
    debug &&
      console.log(
        'web3/adapter/silk/context-provider: requestWallet: requesting wallet details',
      );
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as `0x${string}`[];
    const chainIdHex = await provider.request({
      method: 'eth_chainId',
    });
    const address = accounts[0];
    const chainId = Number(chainIdHex);
    debug &&
      console.log(
        'web3/adapter/silk/context-provider: requestWallet',
        address,
        chainId,
        accounts,
      );
    return { address, chainId };
  }, []);

  const checkWallet = useCallback(async (): Promise<{
    address?: `0x${string}`;
    chainId?: number;
  }> => {
    /**
     * check wallet shall only requestWallet when there is a active
     * next-auth session. otherwise we'll get the signin-dialog over & over
     * on navigation
     */
    if (session?.status !== 'authenticated') {
      console.log(
        'web3/adapter/silk/context-provider: checkWallet called without a session',
      );
      return {};
    }
    return requestWallet();
  }, [requestWallet, session]);
  const value = useMemo(() => {
    return {
      address,
      chainId,
      chain,
      requestWallet,
    };
  }, [address, chainId, chain, requestWallet]);
  useEffect(() => {
    let subscribed = true;
    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
    async function checkWalletConnection() {
      const provider = getProvider();
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
  }, [checkWallet]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider || typeof provider.on !== 'function') {
      return;
    }
    const handleAccountsChanged = (accounts: `0x${string}`) => {
      debug &&
        console.log(
          'web3/adapter/silk/context-provider:event: Accounts Changed:',
          accounts,
        );
      setAddress(accounts[0] || undefined);
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = Number(chainIdHex);
      debug &&
        console.log(
          'web3/adapter/silk/context-provider:event: Chain Changed:',
          chainId,
        );
      setChainId(chainId);
    };
    const handleDisconnect = (error: unknown) => {
      debug &&
        console.log(
          'web3/adapter/silk/context-provider: event: Wallet disconnected:',
          error,
        );
      setAddress(undefined);
      setChainId(undefined);
    };
    const handleConnect = () => {
      debug &&
        console.log(
          'web3/adapter/silk/context-provider:event: Connected to Human Wallet',
        );
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
  }, []);
  // alternative initialization
  // use when the silk wallet should not be available on every page
  // useEffect(() => {
  //   if (window.silk) {
  //     return;
  //   }
  //   // works the same as in global scope,
  //   // but global-scope has the advantage that it is loaded at page-load,
  //   // not with container
  //   initSilk(options);
  // }, []);

  // this app uses wagmi in pages & components and would throw bad errors
  // but as we do not initialize a connector, all wagmi-hooks will will be in
  // a 'not-connected' state
  return (
    <WagmiProvider config={createConfig(config)}>
      <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
    </WagmiProvider>
  );
}
export const useWeb3Context = () => useContext(Web3Context);
