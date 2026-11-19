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
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as seedVault from '@algorandfoundation/react-native-seed-vault'
import { useSettingsDeveloperSeedVault } from '../useSettingsDeveloperSeedVault'

vi.mock('@algorandfoundation/react-native-seed-vault', () => ({
    authorizeApp: vi.fn(),
    bind: vi.fn(),
    confirmDeriveKeyMaterial: vi.fn(),
    confirmSignBytes: vi.fn(),
    confirmSignTransaction: vi.fn(),
    deriveKeyMaterial: vi.fn(),
    getAuthorizedSeeds: vi.fn(),
    getConstants: vi.fn(() => ({
        PACKAGE: 'svc',
        DERIVE_DOMAIN_PREFIX: 'passkey/',
        DERIVE_MIN_LENGTH: 32,
    })),
    isConnected: vi.fn(() => false),
    isInstalled: vi.fn(() => true),
    isSupported: vi.fn(() => true),
    signBytes: vi.fn(),
    signTransaction: vi.fn(),
    unbind: vi.fn(),
}))

const SEEDS = [
    {
        authToken: 1,
        name: 'seed',
        accounts: [{ id: 1, address: 'ADDR', name: 'a' }],
    },
]

describe('useSettingsDeveloperSeedVault', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads seeds and selects the first account', async () => {
        vi.mocked(seedVault.getAuthorizedSeeds).mockResolvedValue(
            SEEDS as never,
        )
        const { result } = renderHook(() => useSettingsDeveloperSeedVault())

        await act(() => result.current.onLoadSeeds())

        expect(result.current.selectedAddress).toBe('ADDR')
        expect(result.current.log[0]).toContain('1 seed(s), 1 account(s)')
    })

    it('asks for an account before signing', async () => {
        const { result } = renderHook(() => useSettingsDeveloperSeedVault())

        await act(() => result.current.onSignBytes())

        expect(seedVault.signBytes).not.toHaveBeenCalled()
        expect(result.current.log[0]).toContain('select an account first')
    })

    it('signs bytes after the user confirms', async () => {
        vi.mocked(seedVault.getAuthorizedSeeds).mockResolvedValue(
            SEEDS as never,
        )
        vi.mocked(seedVault.confirmSignBytes).mockResolvedValue(true)
        vi.mocked(seedVault.signBytes).mockResolvedValue(new Uint8Array(64))
        const { result } = renderHook(() => useSettingsDeveloperSeedVault())
        await act(() => result.current.onLoadSeeds())

        await act(() => result.current.onSignBytes())

        expect(seedVault.signBytes).toHaveBeenCalledWith(
            'ADDR',
            expect.any(Uint8Array),
        )
        expect(result.current.log[0]).toContain('64 bytes')
    })

    it('logs errors from the native module', async () => {
        vi.mocked(seedVault.bind).mockRejectedValue(new Error('no service'))
        const { result } = renderHook(() => useSettingsDeveloperSeedVault())

        await act(() => result.current.onBind())

        expect(result.current.log[0]).toBe('Bind failed: no service')
        expect(result.current.isBusy).toBe(false)
    })
})
