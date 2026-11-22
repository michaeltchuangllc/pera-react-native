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

import { algorandSeedVaultSource } from './algorandSeedVaultSource'
import { solanaSeedVaultSource } from './solanaSeedVaultSource'
import type { SeedVaultChain, SeedVaultSource } from './seedVaultTypes'

export type {
    SeedVaultAccount,
    SeedVaultChain,
    SeedVaultSeed,
} from './seedVaultTypes'

const SOURCES: Record<SeedVaultChain, SeedVaultSource> = {
    algorand: algorandSeedVaultSource,
    solana: solanaSeedVaultSource,
}

export const SEED_VAULT_CHAINS = Object.keys(SOURCES) as SeedVaultChain[]

export const seedVaultSourceOf = (chain: SeedVaultChain): SeedVaultSource =>
    SOURCES[chain]

export const isSeedVaultChainSupported = (chain: SeedVaultChain): boolean =>
    SOURCES[chain].isSupported()
