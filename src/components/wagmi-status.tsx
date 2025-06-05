import { useAccount, useChainId, useDisconnect, useReconnect } from 'wagmi';
export function WagmiStatus() {
  const { address, status } = useAccount();
  const chainId = useChainId();

  const { reconnect } = useReconnect();
  const { disconnect } = useDisconnect();

  return (
    <div>
      wagmiStatus: {address}:{chainId}:{status}
      <button
        onClick={() => {
          reconnect();
        }}
      >
        ReConnect
      </button>
      |
      <button
        onClick={() => {
          disconnect();
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
