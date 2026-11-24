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
import { describe, expect, test, vi } from 'vitest'
import { createHardwareWalletRegistry } from '@perawallet/wallet-extension-hardware-wallet'

const vault = vi.hoisted(() => ({
    bind: vi.fn(async () => true),
    getAuthorizedSeeds: vi.fn(),
    confirmSignTransaction: vi.fn(),
    signTransaction: vi.fn(),
    isSupported: vi.fn(() => true),
}))
vi.mock('@algorandfoundation/react-native-seed-vault', () => vault)

import { registerSeedVaultTransport } from '../seed-vault-transport'

const ADDRESS = 'TEST_VAULT_ADDRESS'

const connect = async () => {
    const registry = createHardwareWalletRegistry()
    registerSeedVaultTransport(registry)
    const provider = registry.getProvider('seed-vault-service', 'ipc')
    return provider!.connect('7', 'algorand')
}

describe('seed vault transport', () => {
    test('registers under the manufacturer and ipc transport the import uses', () => {
        const registry = createHardwareWalletRegistry()

        registerSeedVaultTransport(registry)

        expect(registry.hasProvider('seed-vault-service', 'ipc')).toBe(true)
    })

    test('approves then signs, returning the vault signed transaction', async () => {
        vault.getAuthorizedSeeds.mockResolvedValue([
            {
                id: 7,
                name: 'Seed',
                accounts: [{ index: 0, address: ADDRESS, publicKey: 'AQID' }],
            },
        ])
        vault.confirmSignTransaction.mockResolvedValue(true)
        const signed = new Uint8Array([9, 9])
        vault.signTransaction.mockResolvedValue(signed)
        const payload = new Uint8Array([1])
        const transport = await connect()

        const result = await transport.signTransaction(0, payload)

        expect(vault.confirmSignTransaction).toHaveBeenCalledWith(
            ADDRESS,
            payload,
        )
        expect(result).toBe(signed)
    })

    test('does not sign when the user declines in the vault', async () => {
        vault.confirmSignTransaction.mockResolvedValue(false)
        vault.signTransaction.mockClear()
        const transport = await connect()

        await expect(
            transport.signTransaction(0, new Uint8Array([1])),
        ).rejects.toThrow('not approved')
        expect(vault.signTransaction).not.toHaveBeenCalled()
    })
})
