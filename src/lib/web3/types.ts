interface RequestArguments {
  method: string;
  params?:
    | {
        chainId: string;
        chainName?: string;
        nativeCurrency?: { decimals: number; name: string; symbol: string };
        rpcUrls?: string[];
        blockExplorerUrls?: string[];
      }[]
    | undefined;
}

export type EthereumProvider = {
  request: (args: RequestArguments) => Promise<unknown>;
  on: (event: string, handler: (payload: unknown) => void) => void;
  removeListener: (event: string, handler: (payload: unknown) => void) => void;
};
export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface IWeb3UseAuthHook {
  address?: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  ready: boolean;
}
