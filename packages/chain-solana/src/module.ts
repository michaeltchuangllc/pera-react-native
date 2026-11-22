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

import { accountsChainAdapters } from '@perawallet/wallet-core-accounts'
import { assetsChainAdapters } from '@perawallet/wallet-core-assets'
import {
    CHAIN_CAPABILITIES,
    addressCodecs,
    transactionPlanners,
    transactionReviewers,
    type ChainCapabilities,
    type ChainModule,
} from '@perawallet/wallet-core-chain-contract'
import {
    broadcasterChainAdapters,
    reviewerChainAdapters,
} from '@perawallet/wallet-core-signing'
import { transferChainAdapters } from '@perawallet/wallet-core-transactions'
import { createSolanaAccountsAdapter } from './accounts-adapter'
import { solanaAssetsAdapter } from './assets-adapter'
import { solanaAddressCodec } from './address-codec'
import { createSolanaBroadcasterAdapter } from './broadcaster'
import { solanaDescriptor } from './descriptor'
import { solanaPlanner } from './planner'
import { solanaReviewer, solanaSigningReviewer } from './reviewer'
import { createSolanaTransferAdapter } from './transfer-adapter'

// Hardware-backed import, balance and native SOL send; every other feature is off.
const capabilityDefaults = {
    ...(Object.fromEntries(
        CHAIN_CAPABILITIES.map(capability => [capability, false]),
    ) as ChainCapabilities),
    send: true,
}

export const solanaModule: ChainModule = {
    descriptor: solanaDescriptor,
    capabilityDefaults,
    supportedCapabilities: ['send'],
    register: ctx => {
        accountsChainAdapters.register(createSolanaAccountsAdapter(ctx))
        addressCodecs.register(solanaAddressCodec)
        assetsChainAdapters.register(solanaAssetsAdapter)
        transactionPlanners.register(solanaPlanner)
        transactionReviewers.register(solanaReviewer)
        reviewerChainAdapters.register(solanaSigningReviewer)
        transferChainAdapters.register(createSolanaTransferAdapter(ctx))
        broadcasterChainAdapters.register(createSolanaBroadcasterAdapter(ctx))
    },
}
