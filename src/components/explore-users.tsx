'use client';
import { useAuth } from '@/contexts';

export function ExploreUsers() {
  const { authenticated, isReady, address } = useAuth();
  if (!isReady) {
    return <p>Waiting for authentication to be ready</p>;
  }
  if (!authenticated) {
    return <p>user-list for public</p>;
  }
  return <p>user-list for authenticated {address}</p>;
}
