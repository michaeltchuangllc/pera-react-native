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

import { Decimal } from 'decimal.js'
import {
    DEFAULT_ASSET_METADATA,
    PeraAssetVerificationTier,
    type AssetsChainAdapter,
    type PeraAsset,
} from '@perawallet/wallet-core-assets'
import type { ChainId } from '@perawallet/wallet-core-chain-contract'
import { solanaDescriptor } from './descriptor'

const { nativeAsset: native } = solanaDescriptor

const nativeAsset: PeraAsset = {
    assetId: native.ref.assetId,
    name: native.name,
    unitName: native.symbol,
    decimals: native.decimals,
    totalSupply: new Decimal(0),
    creator: { address: '' },
    peraMetadata: {
        ...DEFAULT_ASSET_METADATA,
        verificationTier: PeraAssetVerificationTier.verified,
    },
}

const unsupported = (chainId: ChainId) =>
    Promise.reject(new Error(`${chainId} token data is not supported yet`))

// Only the native coin resolves; there is no price or token source yet.
export const solanaAssetsAdapter: AssetsChainAdapter = {
    chainId: 'solana',
    priceProvider: 'pera',
    maxPriceIdsPerRequest: 1,
    getNativeAsset: () => nativeAsset,
    syncAssets: async () => undefined,
    getAssetMetadata: ref =>
        ref.assetId === nativeAsset.assetId
            ? Promise.resolve(nativeAsset)
            : unsupported(ref.chainId),
    fetchOnChainAsset: ref =>
        ref.assetId === nativeAsset.assetId
            ? Promise.resolve(nativeAsset)
            : unsupported(ref.chainId),
    getPrices: async () => [],
}
