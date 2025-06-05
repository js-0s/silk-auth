import {
  getCsrfToken,
  getSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

import { SiweMessage } from 'siwe';
import { UserRejectedRequestError } from 'viem';
import {
  useAccount,
  useConnect,
  useReconnect,
  useDisconnect,
  useSignMessage,
} from 'wagmi';

import { chainConfig } from '@/lib/web3/config/chain';

import { PROJECT_NAME } from '@/lib/constant';
import { useToast } from '@/hooks/use-toast';
import type { IWeb3UseAuthHook } from '@/lib/web3/types';
import { useWeb3Context } from './context-provider';
import { ConnectorAlreadyConnectedError } from 'wagmi';
import { ethers } from 'ethers';

async function fetchNonce() {
  try {
    return await getCsrfToken();
  } catch (error) {
    console.error('Failure fetching nonce (next-auth csrf-token)');
  }
  return;
}
/**
 * Handles wagmi connect, signMessage, and logout using the Silk wallet.
 * @returns
 */
export function useAuth(): IWeb3UseAuthHook {
  const [state, setState] = useState<{
    loading?: boolean;
    error?: Error;
  }>({});
  const { toast } = useToast();
  const { checkWallet, provider } = useWeb3Context();

  const { connectAsync: wagmiConnect, connectors } = useConnect();
  const { address } = useAccount();
  const { reconnect: wagmiReconnect } = useReconnect();
  const { disconnectAsync: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const params = useSearchParams();
  const callbackUrl = useMemo(
    () => params?.get('callbackUrl') || '/dashboard',
    [params],
  );
  const reconnectingRef = useRef(false);
  const loginRef = useRef(false);
  const normalizedAddress = useMemo(() => {
    if (typeof address !== 'string' || !address.startsWith('0x')) {
      return undefined;
    }
    return address.toLowerCase();
  }, [address]);
  const logout = useCallback(async () => {
    await nextAuthSignOut();
    await wagmiDisconnect();
    if (provider) {
      await provider.logout();
    }
    setState({});
  }, [provider, wagmiDisconnect]);

  const signInToBackend = useCallback(async () => {
    try {
      // we cannot rely on state here as login() has altered window values
      const { address, chainId } = await checkWallet();
      console.log('useAuth.signIn', { address, chainId });
      if (!address || typeof chainId !== 'number') {
        return;
      }

      setState((prevState) => ({
        ...prevState,
        loading: true,
        error: undefined,
      }));
      const nonce = await fetchNonce();
      if (!nonce) {
        throw new Error('Failed to fetch nonce for signature');
      }
      // Create SIWE message with pre-fetched nonce and sign with wallet
      const message = new SiweMessage({
        domain: window.location.host,
        address: ethers.getAddress(address),
        statement: `${PROJECT_NAME} - Please sign this message to log in to the app.`,
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });

      const preparedMessage = message.prepareMessage();
      if (typeof signMessageAsync !== 'function') {
        throw new Error('Wagmi signMessageAsync not found');
      }
      // signMessageAsync cannot work because the wagmi connector is not set yet
      // that signature would only work if we detach the nextauth login from the wagmi connect
      // in a way that react could process the contexts&providers
      // const signature = await signMessageAsync({
      //   message: preparedMessage,
      // });
      if (!window.silk) {
        throw new Error('Silk Wallet is not loaded');
      }
      const signature = await window.silk.request({
        method: 'personal_sign',
        params: [
          ethers.hexlify(ethers.toUtf8Bytes(preparedMessage)),
          ethers.getAddress(address),
        ],
      });

      const authResult = await nextAuthSignIn('siwe', {
        redirect: false,
        message: JSON.stringify(message),
        signature,
        callbackUrl,
      });
      if (authResult?.ok && !authResult.error) {
        const session = await getSession();
        console.info('User signed in:', session?.user?.name);
      } else if (authResult?.error) {
        const errorMessage =
          'An error occurred while signin in.' +
          ` Code: ${authResult.status} - ${authResult.error}`;
        console.error(errorMessage);
        setState((prevState) => ({
          ...prevState,
          error: new Error(
            authResult.error || 'Unable to authenticate the message',
          ),
        }));
      }

      setState((prevState) => ({ ...prevState, loading: false }));
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        loading: false,
        error: error as Error,
      }));
    }
  }, [callbackUrl, signMessageAsync, checkWallet]);

  const login = useCallback(async () => {
    setState((prevState) => ({
      ...prevState,
      loading: true,
      error: undefined,
    }));
    loginRef.current = true;
    console.log('useAuth.connect');
    const loadedSilkConnector = connectors.find(
      (connector) => connector.id === 'silk',
    );
    const defaultChain = chainConfig.defaultChain;
    try {
      if (!loadedSilkConnector) {
        throw new Error(
          'Configuration issue: silk connector not in wagmi config',
        );
      }
      //await window.silk.login();
      await wagmiConnect({
        chainId: defaultChain.id,
        connector: loadedSilkConnector,
      });

      await signInToBackend();
      setState((prevState) => ({ ...prevState, loading: false }));
    } catch (error) {
      console.error('Error connecting to Silk:', error);
      if (error instanceof ConnectorAlreadyConnectedError) {
        console.log('already connected error - retrying');
        await wagmiDisconnect();
        return await login();
      }
      if (error instanceof UserRejectedRequestError)
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Operation cancelled by user',
        });
      else
        setState((prevState) => ({
          ...prevState,
          loading: false,
          error: error as Error,
        }));
    } finally {
      loginRef.current = false;
    }
  }, [toast, connectors, wagmiConnect, wagmiDisconnect, signInToBackend]);

  const ready = useMemo(() => {
    console.log(
      'web3/adapter/silk/use-auth:rememo ready',
      address,
      typeof provider,
      state.loading,
      typeof state.loading,
    );
    if (!provider) {
      console.log(
        'web3/adapter/silk/use-auth:rememo ready: silk not yet initialized',
      );
      return false;
    }
    if (typeof address === 'string' && address.startsWith('0x')) {
      console.log(
        'web3/adapter/silk/use-auth:rememo ready: silk provided a address',
      );
      // silk has provided a address
      // via
      // - accountsChanged event
      // - checkWallet = eth_requestAccounts
      return true;
    }
    console.log(
      'web3/adapter/silk/use-auth:rememo ready: check loading state',
      state.loading === false,
      typeof state.loading === 'undefined',
    );
    return state.loading === false || typeof state.loading === 'undefined';
  }, [address, state.loading, provider]);

  useEffect(() => {
    if (
      typeof normalizedAddress !== 'string' ||
      !normalizedAddress.startsWith('0x')
    ) {
      // no session ignore
    }
    if (reconnectingRef.current || loginRef.current) {
      return;
    }
    console.log('web3/adapter/silk/use-auth:reconnect effect');
    reconnectingRef.current = true;
    wagmiReconnect(undefined, {
      onSettled: () => {
        reconnectingRef.current = false;
      },
    });
  }, [normalizedAddress, wagmiReconnect]);
  console.log('web3/adapter/silk/use-auth:render', {
    ready,
    address,
  });
  return {
    login,
    logout,
    ready,
    address: normalizedAddress,
  };
}
