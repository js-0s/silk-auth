import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
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
import { SilkEthereumProviderInterface } from '@silk-wallet/silk-wallet-sdk';
import { EthereumProvider } from '@silk-wallet/silk-wallet-sdk';
import {
  connector as silkConnectorCreator,
  connectorOptions as silkConnectorOptions,
} from './connector';
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
  provider?: EthereumProvider;
  checkWallet: () => Promise<{ address?: `0x${string}`; chainId?: number }>;
  addConnector: (arg0: CreateConnectorFn) => void;
}
const Web3Context = createContext({
  chainId: undefined,
  chain: undefined,
  address: undefined,
  provider: undefined,
  checkWallet: async () => ({ address: undefined, chainId: undefined }),
  addConnector: ({}) => undefined,
} as IWeb3Context);

export function Web3ContextProvider({ children }: { children: ReactNode }) {
  const [connectors, setConnectors] = useState<readonly CreateConnectorFn[]>(
    wagmiConfig.connectors ?? [],
  );
  const [provider, setProvider] = useState<EthereumProvider | undefined>();

  const config = useMemo(
    () =>
      createConfig({
        chains: wagmiConfig.chains,
        connectors,
        transports: wagmiConfig.transports,
        ssr: wagmiConfig.ssr,
      } as CreateConfigParameters),
    [connectors],
  );

  const addConnector = useCallback(
    (newConnector: CreateConnectorFn) => {
      console.log('silk/context-provider addConnector');
      setConnectors((prevState) => {
        if (prevState.includes(newConnector)) {
          return prevState;
        }
        return [...prevState, newConnector] as readonly CreateConnectorFn[];
      });
    },
    [setConnectors],
  );
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

  const value = useMemo(() => {
    return {
      checkWallet,
      provider,
      addConnector,
    };
  }, [checkWallet, provider, addConnector]);

  useEffect(() => {
    /**
     * This triggers the auto-connect of silk
     */
    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
    async function checkWalletConnection() {
      if (!provider) {
        timerId = setTimeout(() => checkWalletConnection(), 100);
        return;
      }
      await checkWallet();
    }
    checkWalletConnection();
    return () => {
      clearTimeout(timerId);
    };
  }, [provider, checkWallet]);
  useEffect(() => {
    /**
     * this effect ensures that the mutating window.silk is always
     * set to the provider instance.
     * beware: await login mutates, so you should not use provider
     *         afterwards. use window.silk directly or dispatch a
     *         memo/event
     */
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
    /**
     * this effect adds the silk connector to the wagmi-connectors
     * only in the client-code
     */
    const loadedSilkConnector = connectors.find(
      (connector) => connector === silkConnector,
    );
    if (!loadedSilkConnector) {
      addConnector(silkConnector);
    }
  }, [connectors, addConnector]);

  return (
    <WagmiProvider config={config}>
      <Suspense>
        <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
      </Suspense>
    </WagmiProvider>
  );
}
export const useWeb3Context = () => useContext(Web3Context);
