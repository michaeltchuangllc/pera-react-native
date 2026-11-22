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

// PermissionsAndroid is Android-only by design; Solana Seed Vault is only supported on Android.
// eslint-disable-next-line react-native/split-platform-components
import { PermissionsAndroid, type Permission } from 'react-native'
import { solana } from '@algorandfoundation/react-native-seed-vault'
import { getProvider } from '@perawallet/wallet-extension-provider'
import type { SeedVaultSource } from './seedVaultTypes'

const SOLANA_CHAIN_ID = 'solana'

const requestPermission = async (): Promise<boolean> => {
    const permission = solana.getPermission() as Permission
    if (await PermissionsAndroid.check(permission)) return true
    const result = await PermissionsAndroid.request(permission)
    return result === PermissionsAndroid.RESULTS.GRANTED
}

export const solanaSeedVaultSource: SeedVaultSource = {
    chainId: SOLANA_CHAIN_ID,
    // Hidden unless this build ships the Solana chain (CHAINS=algorand,solana).
    isSupported: () =>
        solana.isSupported() && getProvider().chains.has(SOLANA_CHAIN_ID),
    loadSeeds: async () => {
        if (!(await requestPermission())) return null
        const seeds = await solana.getAuthorizedSeeds()
        return seeds.map(seed => ({
            id: String(seed.authToken),
            name: seed.name,
            accounts: seed.accounts.map(({ address }, index) => ({
                index,
                address,
            })),
        }))
    },
    authorizeSeed: async () => {
        await solana.authorizeSeed()
        return true
    },
}
