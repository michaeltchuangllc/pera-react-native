/*
 Copyright 2022-2026 Pera Wallet, LDA
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License
 */

import type { Optional } from '@perawallet/wallet-core-shared'
import type { ChainDescriptor } from '@perawallet/wallet-core-chain-contract'

const NATIVE_ASSET_ID = 'native'
const EXPLORER_BASE = 'https://explorer.solana.com'
const CLUSTER_QUERY: Record<string, string> = {
    'mainnet-beta': '',
    devnet: '?cluster=devnet',
}

const explorerLink =
    (path: string) =>
    (networkId: string, id: string): Optional<string> => {
        const query = CLUSTER_QUERY[networkId]
        return query === undefined
            ? undefined
            : `${EXPLORER_BASE}/${path}/${id}${query}`
    }

export const solanaDescriptor: ChainDescriptor = {
    id: 'solana',
    family: 'solana',
    displayName: 'Solana',
    networks: [
        {
            id: 'mainnet-beta',
            tier: 'mainnet',
            displayName: 'Mainnet Beta',
            isDefaultForTier: true,
            caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            nativeRef: {
                kind: 'solana',
                genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
            },
            status: 'active',
        },
        {
            id: 'devnet',
            tier: 'testnet',
            displayName: 'Devnet',
            isDefaultForTier: true,
            caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
            nativeRef: {
                kind: 'solana',
                genesisHash: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wxMt4yoZZ6hG',
            },
            status: 'active',
        },
    ],
    nativeAsset: {
        ref: { chainId: 'solana', assetId: NATIVE_ASSET_ID },
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
    },
    signing: {
        schemes: ['ed25519'],
        derivationPaths: {
            ed25519: account => `m/44'/501'/${account}'/0'`,
        },
        rawKeySchemes: ['ed25519'],
    },
    protocol: {
        feeModel: 'flat',
        hasAccountNonce: false,
        supportsReplacement: false,
        supportsNativeMultisig: false,
        supportsRekey: false,
        hasTokenApproval: false,
        requiresAssetOptIn: false,
        confirmsOnSubmit: false,
    },
    explorer: {
        name: 'Solana Explorer',
        accountUrl: explorerLink('address'),
        transactionUrl: explorerLink('tx'),
        assetUrl: explorerLink('address'),
        collectibleUrl: explorerLink('address'),
    },
    finality: { kind: 'confirmations', recommended: 32 },
    uriSchemes: ['solana'],
    enabledByDefault: false,
}
