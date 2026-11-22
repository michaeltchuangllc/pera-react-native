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
import { solana } from '@algorandfoundation/react-native-seed-vault'
import { useSettingsDeveloperSolanaSeedVault } from '../useSettingsDeveloperSolanaSeedVault'

vi.mock('@algorandfoundation/react-native-seed-vault', () => ({
    solana: {
        isSupported: vi.fn(() => true),
        isInstalled: vi.fn(() => true),
        hasUnauthorizedSeeds: vi.fn(() => false),
        getPermission: vi.fn(() => 'perm'),
        getAuthorizedSeeds: vi.fn(),
        authorizeSeed: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
    },
}))

const ADDRESS = '11111111111111111111111111111112'
const SEEDS = [
    {
        authToken: 1,
        name: 'seed',
        accounts: [
            { id: 1, address: ADDRESS, name: 'a', derivationPath: 'm/44' },
        ],
    },
]

describe('useSettingsDeveloperSolanaSeedVault', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads seeds and selects the first account', async () => {
        vi.mocked(solana.getAuthorizedSeeds).mockResolvedValue(SEEDS)
        const { result } = renderHook(() =>
            useSettingsDeveloperSolanaSeedVault(),
        )

        await act(() => result.current.onLoadSeeds())

        expect(result.current.selectedAddress).toBe(ADDRESS)
        expect(result.current.log[0]).toContain('1 seed(s), 1 account(s)')
    })

    it('asks for an account before signing', async () => {
        const { result } = renderHook(() =>
            useSettingsDeveloperSolanaSeedVault(),
        )

        await act(() => result.current.onSignMessage())

        expect(solana.signMessage).not.toHaveBeenCalled()
        expect(result.current.log[0]).toContain('select an account first')
    })

    it('signs a message for the selected account', async () => {
        vi.mocked(solana.getAuthorizedSeeds).mockResolvedValue(SEEDS)
        vi.mocked(solana.signMessage).mockResolvedValue(new Uint8Array(64))
        const { result } = renderHook(() =>
            useSettingsDeveloperSolanaSeedVault(),
        )
        await act(() => result.current.onLoadSeeds())

        await act(() => result.current.onSignMessage())

        expect(solana.signMessage).toHaveBeenCalledWith(
            ADDRESS,
            expect.any(Uint8Array),
        )
        expect(result.current.log[0]).toContain('64 bytes')
    })

    it('signs a well-formed self-transfer message', async () => {
        vi.mocked(solana.getAuthorizedSeeds).mockResolvedValue(SEEDS)
        vi.mocked(solana.signTransaction).mockResolvedValue(null)
        const { result } = renderHook(() =>
            useSettingsDeveloperSolanaSeedVault(),
        )
        await act(() => result.current.onLoadSeeds())

        await act(() => result.current.onSignTransaction())

        const [, message] = vi.mocked(solana.signTransaction).mock.calls[0]
        // header(3) + count(1) + 2 keys(64) + blockhash(32) + ix count(1) + ix(1+1+2+1+12)
        expect(message).toHaveLength(118)
        expect(message[4 + 31]).toBe(1)
        expect(result.current.log[0]).toBe('Sign transaction: rejected')
    })

    it('logs errors from the native module', async () => {
        vi.mocked(solana.authorizeSeed).mockRejectedValue(new Error('denied'))
        const { result } = renderHook(() =>
            useSettingsDeveloperSolanaSeedVault(),
        )

        await act(() => result.current.onAuthorizeSeed())

        expect(result.current.log[0]).toBe('Authorize seed failed: denied')
        expect(result.current.isBusy).toBe(false)
    })
})
