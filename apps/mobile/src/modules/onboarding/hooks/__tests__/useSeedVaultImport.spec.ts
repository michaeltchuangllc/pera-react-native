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

import { renderHook, act } from '@test-utils/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSeedVaultImport } from '../useSeedVaultImport'

const mocks = vi.hoisted(() => ({
    bind: vi.fn(),
    authorizeApp: vi.fn(),
    getAuthorizedSeeds: vi.fn(),
    addHardwareChainAccount: vi.fn(),
    findAccountByAddressOn: vi.fn(),
    setSelectedAccountId: vi.fn(),
    setShouldPlayConfetti: vi.fn(),
    exitAccountFlow: vi.fn(),
    errorToast: vi.fn(),
    requestSeedVaultPermission: vi.fn(),
}))

vi.mock('../seedVaultPermission', () => ({
    requestSeedVaultPermission: mocks.requestSeedVaultPermission,
}))

vi.mock('@algorandfoundation/react-native-seed-vault', () => ({
    isSupported: () => true,
    bind: mocks.bind,
    authorizeApp: mocks.authorizeApp,
    getAuthorizedSeeds: mocks.getAuthorizedSeeds,
}))

vi.mock('@perawallet/wallet-core-accounts', async importOriginal => ({
    ...(await importOriginal<object>()),
    addHardwareChainAccount: mocks.addHardwareChainAccount,
    findAccountByAddressOn: mocks.findAccountByAddressOn,
    getAllAccounts: () => [],
    useSelectedAccountId: () => ({
        setSelectedAccountId: mocks.setSelectedAccountId,
    }),
}))

vi.mock('../useExitAccountFlow', () => ({
    useExitAccountFlow: () => ({ exitAccountFlow: mocks.exitAccountFlow }),
}))

vi.mock('../useOnboardingStore', () => ({
    useShouldPlayConfetti: () => ({
        setShouldPlayConfetti: mocks.setShouldPlayConfetti,
    }),
}))

vi.mock('@hooks/useToast', () => ({
    useToast: () => ({ errorToast: mocks.errorToast }),
}))

const account = (index: number, address: string) => ({ index, address })

describe('useSeedVaultImport', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.bind.mockResolvedValue(true)
        mocks.requestSeedVaultPermission.mockResolvedValue(true)
        mocks.findAccountByAddressOn.mockReturnValue({ id: 'saved' })
    })

    it('saves only the index-0 account of each seed as a hardware account', async () => {
        mocks.getAuthorizedSeeds.mockResolvedValue([
            {
                id: 14,
                name: 'Seed 14',
                accounts: [account(0, 'ADDR14-0'), account(1, 'ADDR14-1')],
            },
            { id: 15, name: 'Seed 15', accounts: [account(0, 'ADDR15-0')] },
        ])
        const { result } = renderHook(() => useSeedVaultImport())

        await act(() => result.current.handleImportSeedVault())

        expect(mocks.addHardwareChainAccount).toHaveBeenCalledTimes(2)
        expect(mocks.addHardwareChainAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                manufacturer: 'seed-vault-service',
                transportType: 'ipc',
                deviceId: '14',
                deviceName: 'Seed 14',
                accountIndex: 0,
            }),
            expect.any(String),
            'ADDR14-0',
        )
        expect(mocks.setSelectedAccountId).toHaveBeenCalledWith('saved')
        expect(mocks.exitAccountFlow).toHaveBeenCalled()
    })

    it('asks for authorization when no seed is authorized yet', async () => {
        mocks.getAuthorizedSeeds
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                { id: 1, name: 'Seed 1', accounts: [account(0, 'A')] },
            ])
        mocks.authorizeApp.mockResolvedValue(true)
        const { result } = renderHook(() => useSeedVaultImport())

        await act(() => result.current.handleImportSeedVault())

        expect(mocks.authorizeApp).toHaveBeenCalled()
        expect(mocks.addHardwareChainAccount).toHaveBeenCalledTimes(1)
    })

    it('imports nothing when the user declines authorization', async () => {
        mocks.getAuthorizedSeeds.mockResolvedValue([])
        mocks.authorizeApp.mockResolvedValue(false)
        const { result } = renderHook(() => useSeedVaultImport())

        await act(() => result.current.handleImportSeedVault())

        expect(mocks.addHardwareChainAccount).not.toHaveBeenCalled()
        expect(mocks.exitAccountFlow).not.toHaveBeenCalled()
    })

    it('does not bind to the service when the permission is denied', async () => {
        mocks.requestSeedVaultPermission.mockResolvedValue(false)
        const { result } = renderHook(() => useSeedVaultImport())

        await act(() => result.current.handleImportSeedVault())

        expect(mocks.bind).not.toHaveBeenCalled()
        expect(mocks.addHardwareChainAccount).not.toHaveBeenCalled()
    })

    it('shows an error when the service fails', async () => {
        mocks.bind.mockRejectedValue(new Error('no permission'))
        const { result } = renderHook(() => useSeedVaultImport())

        await act(() => result.current.handleImportSeedVault())

        expect(mocks.errorToast).toHaveBeenCalled()
        expect(mocks.addHardwareChainAccount).not.toHaveBeenCalled()
    })
})
