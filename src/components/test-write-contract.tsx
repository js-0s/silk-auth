import { useCallback, useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Log, parseEther, keccak256, stringToHex } from 'viem';
import { useAuth } from '@/lib/web3';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CAMPAIGN_INFO_FACTORY = '0xe50856faec2b797eb15b78acfb7c1ebf45374903';
const PUBLIC_PLATFORM_HASH =
  '0x8dfe5499a94ebda35ae3d6c7b6c32b140c2cb04687d76f2cc3564ada0ef5dce6';

const CampaignInfoFactoryABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'globalParams',
        type: 'address',
        internalType: 'contract IGlobalParams',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: '_initialize',
    inputs: [
      {
        name: 'treasuryFactoryAddress',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'globalParams',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createCampaign',
    inputs: [
      {
        name: 'creator',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'identifierHash',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'selectedPlatformBytes',
        type: 'bytes32[]',
        internalType: 'bytes32[]',
      },
      {
        name: 'platformDataKey',
        type: 'bytes32[]',
        internalType: 'bytes32[]',
      },
      {
        name: 'platformDataValue',
        type: 'bytes32[]',
        internalType: 'bytes32[]',
      },
      {
        name: 'campaignData',
        type: 'tuple',
        internalType: 'struct ICampaignData.CampaignData',
        components: [
          {
            name: 'launchTime',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'deadline',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'goalAmount',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'CampaignInfoFactoryCampaignCreated',
    inputs: [
      {
        name: 'identifierHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'campaignInfoAddress',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'CampaignInfoFactoryAlreadyInitialized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'CampaignInfoFactoryCampaignCreationFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'CampaignInfoFactoryInvalidInput',
    inputs: [],
  },
];
export function TestWriteContract() {
  const [logs, setLogs] = useState<string[]>([]);

  const {
    writeContract,
    data: hash,
    isPending: isWriting,
  } = useWriteContract();
  const { address } = useAuth();
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const log = useCallback((message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  }, []);

  const testWriteContract = useCallback(async () => {
    log('Attempting to write contract...');
    const campaignData = {
      launchTime: BigInt(new Date('2025-07-01').getTime() / 1000),
      deadline: BigInt(new Date('2025-08-01').getTime() / 1000),
      goalAmount: parseEther('100'),
    };

    // Then proceed with blockchain transaction
    const identifierHash = keccak256(stringToHex('KickStarter'));
    writeContract({
      address: CAMPAIGN_INFO_FACTORY as `0x${string}`,
      abi: CampaignInfoFactoryABI,
      functionName: 'createCampaign',
      args: [
        address,
        identifierHash,
        [PUBLIC_PLATFORM_HASH as `0x${string}`],
        [], // Platform data keys
        [], // Platform data values
        campaignData,
      ],
    });
  }, [writeContract, address, log]); // Include log in dependencies

  useEffect(() => {
    if (hash) {
      log(`Transaction sent, hash: ${hash}`);
    }
  }, [hash, log]);

  useEffect(() => {
    if (isConfirming) {
      log(`Waiting for transaction receipt for hash: ${hash}`);
    }
  }, [isConfirming, hash, log]);

  useEffect(() => {
    if (isSuccess && receipt) {
      const campaignAddress = receipt.logs[0]?.address; // Use optional chaining
      const status = receipt.status;
      // Find the relevant event log if possible
      const campaignCreatedEvent = receipt.logs.find(
        (logEntry: Log) =>
          (logEntry.topics?.[0] as string) ===
          keccak256(
            stringToHex('CampaignInfoFactoryCampaignCreated(bytes32,address)'),
          ),
      );

      log('Transaction successful!');
      log(`Status: ${status}`);
      if (campaignAddress) {
        log(`Campaign Address from first log: ${campaignAddress}`);
      }
      if (campaignCreatedEvent) {
        log(`CampaignCreated event found in logs.`);
        // You might parse event data here if needed
      } else {
        log(`CampaignCreated event not found in logs.`);
        log(`All logs: ${JSON.stringify(receipt.logs, null, 2)}`);
      }
    }
  }, [isSuccess, receipt, log, hash]);

  const isLoading = isWriting || isConfirming;

  return (
    <div className="space-y-4 rounded border bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold text-gray-800">
        Test Write Contract
      </h3>
      <Button
        onClick={testWriteContract}
        disabled={isLoading}
        className={cn(
          'w-full',
          isLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-600',
        )}
      >
        {isWriting
          ? 'Sending...'
          : isConfirming
            ? 'Confirming...'
            : 'Create Test Campaign'}
      </Button>

      {logs.length > 0 && (
        <div
          className={cn(
            'mt-4 max-h-60 overflow-y-auto rounded border bg-gray-100 p-4 text-sm',
          )}
        >
          <h4 className="mb-2 font-medium text-gray-700">Execution Log:</h4>
          <pre className="whitespace-pre-wrap break-all text-gray-600">
            {logs.join('\\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
