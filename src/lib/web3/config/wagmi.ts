import { http, type Config, CreateConfigParameters } from 'wagmi';
import { sepolia, celoAlfajores, celo, mainnet } from 'wagmi/chains';

import { chainConfig } from '@/lib/web3/config/chain';

// Export chains for use in other files
export { sepolia, celoAlfajores, celo, mainnet };
import { injected } from 'wagmi/connectors';
// import { connector as silkConnector } from '@/lib/web3/adapter/silk/connector';
// import { options as silkConnectorOptions } from '@/lib/web3/adapter/silk/options';

// Add type declaration for wagmi config
declare module 'wagmi' {
  interface Register {
    config: Config;
  }
}

export const config: CreateConfigParameters = {
  chains: [celoAlfajores, sepolia, celo, mainnet],
  connectors: [
    // silkConnector(silkConnectorOptions),
    injected(),
  ],
  transports: {
    [celoAlfajores.id]: http(chainConfig.rpcUrl),
    [sepolia.id]: http(),
    [celo.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
};
