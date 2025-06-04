import {
  getCsrfToken,
  getSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { SiweMessage } from 'siwe';
import { UserRejectedRequestError } from 'viem';
import { ethers } from 'ethers';
import { chainConfig } from '@/lib/web3/config/chain';

import { PROJECT_NAME } from '@/lib/constant';
import { useToast } from '@/hooks/use-toast';
import type { IWeb3UseAuthHook } from '@/lib/web3/types';
import { useWeb3Context } from './context-provider';

import { SilkEthereumProviderInterface } from '@silk-wallet/silk-wallet-sdk';

declare global {
  interface Window {
    silk: SilkEthereumProviderInterface;
  }
}
/**
 * Handles wagmi connect, signMessage, and logout using the Silk wallet.
 * @returns
 */
export function useAuth(): IWeb3UseAuthHook {
  const [state, setState] = useState<{
    loading?: boolean;
    nonce?: string;
    error?: Error;
    chainId?: number;
    address?: string;
  }>({});
  const { toast } = useToast();

  const params = useSearchParams();
  const callbackUrl = params?.get('callbackUrl') || '/dashboard';

  const fetchNonce = useCallback(async () => {
    try {
      const nonce = await getCsrfToken();
      setState((prevState) => ({ ...prevState, nonce }));
    } catch (error) {
      setState((prevState) => ({ ...prevState, error: error as Error }));
    }
  }, []);

  // Pre-fetch random nonce when component using the hook is rendered
  useEffect(() => {
    fetchNonce();
  }, [fetchNonce]);

  const address = useMemo(() => {
    console.log('web3/adapter/silk/use-auth:rememo address');
    if (typeof state.address !== 'string' || !state.address.startsWith('0x')) {
      return undefined;
    }
    return state.address;
  }, [state.address]);
  const signIn = useCallback(
    async (address: string, chainId: number) => {
      try {
        console.log('useAuth.signIn', { address, chainId });
        if (!address || typeof chainId !== 'number') {
          console.warn('useAuth::signIn: missing address or chainId');
          return;
        }

        setState((prevState) => ({
          ...prevState,
          loading: true,
          address: address,
          chainId: chainId,
          error: undefined,
        }));
        // Create SIWE message with pre-fetched nonce and sign with wallet
        const message = new SiweMessage({
          domain: window.location.host,
          address: ethers.getAddress(address),
          statement: `${PROJECT_NAME} - Please sign this message to log in to the app.`,
          uri: window.location.origin,
          version: '1',
          chainId,
          nonce: state.nonce,
        });

        const preparedMessage = message.prepareMessage();
        console.log(preparedMessage);
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
          nonce: undefined,
        }));
        fetchNonce();
      }
    },
    [callbackUrl, state.nonce, fetchNonce],
  );

  const logout = useCallback(async () => {
    await nextAuthSignOut();
    const loadedSilkConnector = window.silk;
    await loadedSilkConnector.logout();
    setState({});
  }, []);
  const login = useCallback(async () => {
    setState((prevState) => ({
      ...prevState,
      loading: true,
      error: undefined,
    }));
    console.log('useAuth.connect');
    const loadedSilkConnector = window.silk;
    const defaultChain = chainConfig.defaultChain;
    try {
      console.log('useAuth.connect with', loadedSilkConnector);
      const loginResult = await loadedSilkConnector.login();
      console.log('useAuth.connect loginResult', loginResult);

      // should be done with a event handler or similar
      const accounts = (await loadedSilkConnector.request({
        method: 'eth_requestAccounts',
      })) as `0x${string}`[];
      const chainIdHex = await loadedSilkConnector.request({
        method: 'eth_chainId',
      });

      console.log({ accounts, chainIdHex });
      const address = accounts[0];
      await signIn(address, Number(chainIdHex));
      setState((prevState) => ({ ...prevState, loading: false }));
    } catch (error) {
      console.error('Error connecting to Silk:', error);
      if (error instanceof UserRejectedRequestError) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Operation cancelled by user',
        });
      }
      setState((prevState) => ({
        ...prevState,
        loading: false,
        error: error as Error,
      }));
    }
  }, [toast, signIn]);
  const authenticated = useMemo(() => {
    console.log('web3/adapter/silk/use-auth:rememo authenticated');
    return (
      state.loading === false &&
      typeof address === 'string' &&
      address.length > 0
    );
  }, [state.loading, address]);
  const ready = useMemo(() => {
    console.log(
      'web3/adapter/silk/use-auth:rememo ready',
      state.loading,
      state.error,
    );
    return state.loading === false;
  }, [state.loading, state.error]);
  return {
    login,
    logout,
    authenticated,
    ready,
    address,
  };
}
