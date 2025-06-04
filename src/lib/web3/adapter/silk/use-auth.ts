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
  const { address, checkWallet, provider } = useWeb3Context();
  const { toast } = useToast();

  const params = useSearchParams();
  const callbackUrl = params?.get('callbackUrl') || '/dashboard';

  const logout = useCallback(async () => {
    await nextAuthSignOut();
    if (provider) {
      await provider.logout();
    }
    setState({});
  }, [provider]);

  const signInToBackend = useCallback(async () => {
    try {
      // we cannot rely on state here as login() has altered window values
      const { address, chainId } = await checkWallet();
      console.log('web3/adapter/silk/use-auth:signInToBackend', {
        address,
        chainId,
      });

      if (!address || typeof chainId !== 'number') {
        console.log(
          'web3/adapter/silk/use-auth:signInToBackend: missing address or chainId',
        );
        return;
      }
      if (!provider) {
        console.log(
          'web3/adapter/silk/use-auth:signInToBackend: missing provider instance',
        );
        return;
      }
      setState((prevState) => ({
        ...prevState,
        loading: true,
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
      const signature = await provider.request({
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
        console.info(
          'web3/adapter/silk/use-auth:User signed in:',
          session?.user?.name,
        );
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
  }, [callbackUrl, fetchNonce, checkWallet]);
  const login = useCallback(async () => {
    setState((prevState) => ({
      ...prevState,
      loading: true,
      error: undefined,
    }));
    console.log('web3/adapter/silk/use-auth:login');
    const defaultChain = chainConfig.defaultChain;
    try {
      if (!provider) {
        throw new Error('Provider missing');
      }
      const loginResult = await provider.login();
      console.log('web3/adapter/silk/use-auth:login loginResult', loginResult);
      await signInToBackend();
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
  }, [toast, signInToBackend, provider]);

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

  console.log('web3/adapter/silk/use-auth:render', ready, address);
  return {
    login,
    logout,
    ready,
    address,
  };
}
