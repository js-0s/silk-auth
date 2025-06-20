/**
 * Adapter
 *
 * This file controls the import of the web3 auth adapter
 * unfortunately this cannot be sanely controlled by a constant
 * as the opportunity to 'switch' would mean that all dependent
 * imports are also part of the development bundle.
 * Only developers want to switch the adapter (for trying out new ones
 * or to completely swap out to a dummy interface for enhanced
 * frontend development
 */
export {
  Web3ContextProvider,
  useWeb3Context,
  useAuth,
  getProvider,
} from './silk-wagmi';

// never commit this line uncommented, this is for local development only
// export { Web3ContextProvider, useAuth, useWallet } from './dummy';
