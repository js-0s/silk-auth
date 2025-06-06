import { useAccount, useChainId, useDisconnect, useReconnect } from 'wagmi';
import { cn } from '@/lib/utils'; // Import the cn utility
import { Button } from '@/components/ui/button';

export function WagmiStatus() {
  const { address, status } = useAccount();
  const chainId = useChainId();

  const { reconnect } = useReconnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="space-y-4 rounded border p-4 shadow-md">
      <p className="text-sm text-gray-700">
        wagmiStatus: {address}:{chainId}:{status}
      </p>
      <div className="flex space-x-4">
        <Button
          onClick={() => {
            reconnect();
          }}
          className={cn(
            'rounded bg-blue-500 px-4 py-2 text-white',
            'hover:bg-blue-600 focus:outline-none',
          )}
        >
          ReConnect
        </Button>
        <Button
          onClick={() => {
            disconnect();
          }}
          className={cn(
            'rounded bg-red-500 px-4 py-2 text-white',
            'hover:bg-red-600 focus:outline-none',
          )}
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}
