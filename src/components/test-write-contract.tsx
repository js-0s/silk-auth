import { useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Log, parseEther, keccak256, stringToHex } from 'viem';
import { useAuth } from '@/lib/web3';

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
  const { writeContract, data: hash } = useWriteContract();
  const { address } = useAuth();
  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });
  const testWriteContract = useCallback(async () => {
    console.log('testWriteContract');
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
  }, [writeContract, address]);
  useEffect(() => {
    if (hash && isSuccess && receipt) {
      const campaignAddress = receipt.logs[0].address;
      const status = receipt.status;
      const event = receipt.logs.find(
        (log: Log) => log.transactionHash === hash,
      );
      console.log({ hash, status, campaignAddress, event });
    }
  }, [hash, isSuccess, receipt]);
  return (
    <div>
      <button onClick={testWriteContract}>Test Write Contract</button>
    </div>
  );
}
