'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';

const debug = false;
import { useAuth as useWeb3Auth } from '@/lib/web3';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  address: string | null;
  authenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isReady: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  address: null,
  authenticated: false,
  isAdmin: false,
  isClient: false,
  isReady: false,
  login: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    login,
    logout,
    ready: web3Ready,
    address: web3Address,
  } = useWeb3Auth();
  const session = useSession();

  const [isClient, setIsClient] = useState(false);

  const authenticated = useMemo(() => {
    debug &&
      console.log('contexts/AuthContext: rememo authenticated', session.status);
    if (session.status === 'authenticated') {
      return true;
    }
    return false;
  }, [session]);

  const isReady = useMemo(() => {
    debug &&
      console.log(
        'contexts/AuthContext: rememo isReady',
        session.status,
        web3Ready,
      );
    if (session.status === 'loading') {
      return false;
    }
    return web3Ready;
  }, [web3Ready, session]);

  const address = useMemo(() => {
    debug &&
      console.log(
        'contexts/AuthContext: rememo address',
        session?.data?.user?.address,
        web3Address,
      );
    if (web3Address) {
      return web3Address;
    }
    if (!session?.data?.user?.address) {
      return null;
    }
    return session.data.user.address;
  }, [session, web3Address]);
  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isAdmin = useMemo(() => {
    return session?.data?.user?.roles?.includes('admin') ?? false;
  }, [session]);
  // Debugging logs
  useEffect(() => {
    if (!isClient || !debug) {
      return;
    }
    console.log(
      '[AUTH DEBUG]',
      JSON.stringify({
        authenticated,
        address,
        isAdmin,
      }),
    );
  }, [authenticated, address, isAdmin, isClient]);

  const value = useMemo(() => {
    return {
      address,
      authenticated,
      isReady,
      isAdmin,
      isClient,
      login,
      logout,
    };
  }, [address, authenticated, isReady, isAdmin, isClient, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
