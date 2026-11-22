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

import type { ChainId } from '@perawallet/wallet-core-chain-contract'
import type { Nullable } from '@perawallet/wallet-core-shared'

export type SeedVaultChain = 'algorand' | 'solana'

export type SeedVaultAccount = {
    /** Position of the account within its seed. */
    index: number
    address: string
}

export type SeedVaultSeed = {
    /** Algorand: the vault's seed id. Solana: the seed's auth token. */
    id: string
    name: string
    accounts: SeedVaultAccount[]
}

export type SeedVaultSource = {
    chainId: ChainId
    isSupported: () => boolean
    /** Resolves `null` when the user denies the vault permission. */
    loadSeeds: () => Promise<Nullable<SeedVaultSeed[]>>
    /** Resolves whether the user approved a new seed. */
    authorizeSeed: () => Promise<boolean>
}
