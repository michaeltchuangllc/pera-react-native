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
    type ChainCapabilities,
    type ChainModule,
} from '@perawallet/wallet-core-chain-contract'
import { createSolanaAccountsAdapter } from './accounts-adapter'
import { solanaAssetsAdapter } from './assets-adapter'
import { solanaAddressCodec } from './address-codec'
import { solanaDescriptor } from './descriptor'

// Only hardware-backed account import exists so far; every feature is off.
const capabilityDefaults = Object.fromEntries(
    CHAIN_CAPABILITIES.map(capability => [capability, false]),
) as ChainCapabilities

export const solanaModule: ChainModule = {
    descriptor: solanaDescriptor,
    capabilityDefaults,
    supportedCapabilities: [],
    register: ctx => {
        accountsChainAdapters.register(createSolanaAccountsAdapter(ctx))
        addressCodecs.register(solanaAddressCodec)
        assetsChainAdapters.register(solanaAssetsAdapter)
    },
}
