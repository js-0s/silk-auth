import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  Suspense,
} from 'react';

import { config as wagmiConfig } from '@/lib/web3/config/wagmi';
import {
  WagmiProvider,
  createConfig,
  CreateConnectorFn,
  CreateConfigParameters,
} from 'wagmi';
import {
  SilkEthereumProviderInterface,
  initSilk,
} from '@silk-wallet/silk-wallet-sdk';
import { useSession } from 'next-auth/react';

import {
  connector as silkConnectorCreator,
  connectorOptions as silkConnectorOptions,
} from './connector';
import { debugWeb3ContextProvider as debug } from '@/lib/debug';
import { clearTimeout, setTimeout } from 'timers';

const silkConnector = silkConnectorCreator(silkConnectorOptions);

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
  initialized: boolean;
  requestWallet: () => Promise<{ address?: `0x${string}`; chainId?: number }>;
}
const Web3Context = createContext({
  chainId: undefined,
  chain: undefined,
  address: undefined,
  initialized: false,
  requestWallet: async () => ({ address: undefined, chainId: undefined }),
} as IWeb3Context);
/**
 * Initialize window.silk at a global scope
 * Find the commented-out 'useEffect' below if you need more fine-grained control
 * when silk is available
 */
if (typeof window !== 'undefined' && typeof window.silk === 'undefined') {
  initSilk(silkConnectorOptions);
}
export function getProvider() {
  if (typeof window !== 'undefined' && typeof window.silk !== 'undefined') {
    return window.silk;
  }
  return undefined;
}
export function Web3ContextProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [connectors, setConnectors] = useState<readonly CreateConnectorFn[]>(
    wagmiConfig.connectors ?? [],
  );
  const [initialized, setInitialized] = useState(false);
  const providerInitializedRef = useRef(false);
  const [autoConnected, setAutoConnected] = useState(false);
  const session = useSession();

  const config = useMemo(() => {
    debug &&
      console.log(
        'web3/adapter/silk-wagmi/context-provider: rememo wagmi config',
      );
    return createConfig({
      chains: wagmiConfig.chains,
      connectors,
      transports: wagmiConfig.transports,
      ssr: wagmiConfig.ssr,
    } as CreateConfigParameters);
  }, [connectors]);

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
  }, [chainId, config]);

  const addConnector = useCallback(
    (newConnector: CreateConnectorFn) => {
      debug &&
        console.log('web3/adapter/silk-wagmi/context-provider: addConnector');
      setConnectors((prevState) => {
        if (prevState.includes(newConnector)) {
          return prevState;
        }
        return [...prevState, newConnector] as readonly CreateConnectorFn[];
      });
    },
    [setConnectors],
  );

  const requestWallet = useCallback(async (): Promise<{
    address?: `0x${string}`;
    chainId?: number;
  }> => {
    const provider = getProvider();
    if (!provider) {
      console.warn(
        'web3/adapter/silk-wagmi/context-provider: requestWallet called without a provider',
      );
      return {};
    }
    debug &&
      console.log(
        'web3/adapter/silk-wagmi/context-provider: requestWallet: requesting wallet details',
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
        'web3/adapter/silk-wagmi/context-provider: requestWallet',
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
        'web3/adapter/silk-wagmi/context-provider: checkWallet called without a session',
      );
      return {};
    }
    return requestWallet();
  }, [requestWallet, session]);

  const value = useMemo(() => {
    debug &&
      console.log('web3/adapter/silk-wagmi/context-provider: rememo value');

    return {
      chain,
      chainId,
      address,
      initialized,
      requestWallet,
    };
  }, [chain, chainId, address, initialized, requestWallet]);

  useEffect(() => {
    /**
     * This triggers the auto-connect of silk
     */
    if (autoConnected) {
      return;
    }
    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
    async function checkWalletConnection() {
      const provider = getProvider();
      if (!provider) {
        timerId = setTimeout(() => checkWalletConnection(), 100);
        return;
      }
      debug &&
        console.log('web3/adapter/silk-wagmi/context-provider: auto-connect');
      const { address, chainId } = await checkWallet();
      if (
        typeof address === 'string' &&
        address.startsWith('0x') &&
        typeof chainId === 'number'
      ) {
        setAutoConnected(true);
        setAddress(address);
        setChainId(chainId);
      }
    }
    checkWalletConnection();
    return () => {
      clearTimeout(timerId);
    };
  }, [checkWallet, autoConnected]);

  useEffect(() => {
    /**
     * this effect adds the silk connector to the wagmi-connectors
     * only in the client-code
     */
    const loadedSilkConnector = connectors.find(
      (connector) => connector === silkConnector,
    );
    if (!loadedSilkConnector) {
      debug &&
        console.log(
          'web3/adapter/silk-wagmi/context-provider: Adding silk connector',
          silkConnector,
        );
      addConnector(silkConnector);
    }
  }, [connectors, addConnector]);
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
  useEffect(() => {
    /**
     * this effect checks if the provider is loaded
     */
    if (providerInitializedRef.current) {
      return;
    }
    let checkTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    const checkProviderInitialized = () => {
      const globalProvider = getProvider();
      if (!globalProvider) {
        checkTimer = setTimeout(checkProviderInitialized, 100);
        return;
      }
      setInitialized(true);
      providerInitializedRef.current = true;
    };
    checkProviderInitialized();
    return () => {
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
    };
  }, []);
  debug && console.log('web3/adapter/silk-wagmi/context-provider: render');
  return (
    <WagmiProvider config={config}>
      <Suspense>
        <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
      </Suspense>
    </WagmiProvider>
  );
}
export const useWeb3Context = () => useContext(Web3Context);
