'use client';
import {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';

import { config as wagmiConfig } from '@/lib/web3/config/wagmi';
import {
  WagmiProvider,
  createConfig,
  CreateConnectorFn,
  CreateConfigParameters,
} from 'wagmi';
import { initSilk } from '@silk-wallet/silk-wallet-sdk';
import { options } from './options';
const Web3Context = createContext({});

initSilk(options);

export function Web3ContextProvider({ children }: { children: ReactNode }) {
  return <Web3Context.Provider value={{}}>{children}</Web3Context.Provider>;
}
export const useWeb3Context = () => useContext(Web3Context);
