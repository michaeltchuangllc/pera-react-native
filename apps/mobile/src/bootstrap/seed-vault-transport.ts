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
import {
    bind,
    confirmSignTransaction,
    getAuthorizedSeeds,
    isSupported,
    signTransaction,
    solana,
} from '@algorandfoundation/react-native-seed-vault'
import { base58 } from '@scure/base'
import { SEED_VAULT_MANUFACTURER } from '@perawallet/wallet-core-hardware-wallet'
import type {
    HardwareWalletRegistry,
    HardwareWalletTransport,
    HardwareWalletTransportProvider,
} from '@perawallet/wallet-extension-hardware-wallet'

const accountOf = async (deviceId: string, accountIndex: number) => {
    await bind()
    const seed = (await getAuthorizedSeeds()).find(
        ({ id }) => String(id) === deviceId,
    )
    const account = seed?.accounts.find(({ index }) => index === accountIndex)
    if (!account) {
        throw new Error('The Seed Vault account is no longer authorized')
    }
    return account
}

const createTransport = (deviceId: string): HardwareWalletTransport => ({
    getAddress: async accountIndex => {
        const { address, publicKey } = await accountOf(deviceId, accountIndex)
        return {
            address,
            publicKey: Uint8Array.from(atob(publicKey), c => c.charCodeAt(0)),
            accountIndex,
        }
    },
    // Resolves to the complete signed transaction, not a bare signature.
    signTransaction: async (accountIndex, payload) => {
        const { address } = await accountOf(deviceId, accountIndex)
        if (!(await confirmSignTransaction(address, payload))) {
            throw new Error('Seed Vault signing was not approved')
        }
        const signed = await signTransaction(address, payload)
        if (!signed) throw new Error('Seed Vault returned no signature')
        return signed
    },
    signMessage: async () => {
        throw new Error('Seed Vault message signing is not supported')
    },
    getAppVersion: async () => ({ major: 0, minor: 0, patch: 0 }),
    disconnect: async () => undefined,
})

const SOLANA_CHAIN_ID = 'solana'

const solanaAccountOf = async (deviceId: string, accountIndex: number) => {
    const seed = (await solana.getAuthorizedSeeds()).find(
        ({ authToken }) => String(authToken) === deviceId,
    )
    const account = seed?.accounts[accountIndex]
    if (!account) {
        throw new Error('The Seed Vault account is no longer authorized')
    }
    return account
}

const createSolanaTransport = (deviceId: string): HardwareWalletTransport => ({
    getAddress: async accountIndex => {
        const { address } = await solanaAccountOf(deviceId, accountIndex)
        return { address, publicKey: base58.decode(address), accountIndex }
    },
    // Resolves to the bare 64-byte Ed25519 signature over the message.
    signTransaction: async (accountIndex, payload) => {
        const { address } = await solanaAccountOf(deviceId, accountIndex)
        const signature = await solana.signTransaction(address, payload)
        if (!signature) throw new Error('Seed Vault signing was not approved')
        return signature
    },
    signMessage: async () => {
        throw new Error('Seed Vault message signing is not supported')
    },
    getAppVersion: async () => ({ major: 0, minor: 0, patch: 0 }),
    disconnect: async () => undefined,
})

const seedVaultTransportProvider: HardwareWalletTransportProvider = {
    manufacturer: SEED_VAULT_MANUFACTURER,
    transportType: 'ipc',
    // Seeds are chosen in the Seed Vault's own UI, never scanned for.
    scan: () => () => undefined,
    connect: async (deviceId, chainId) =>
        chainId === SOLANA_CHAIN_ID
            ? createSolanaTransport(deviceId)
            : createTransport(deviceId),
    isSupported: async () => isSupported(),
}

export const registerSeedVaultTransport = (
    hardwareWalletRegistry: HardwareWalletRegistry,
): void => {
    hardwareWalletRegistry.register(seedVaultTransportProvider)
}
