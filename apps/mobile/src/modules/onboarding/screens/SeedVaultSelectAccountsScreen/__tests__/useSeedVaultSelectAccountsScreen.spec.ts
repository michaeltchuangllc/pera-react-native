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
import { useSeedVaultSelectAccountsScreen } from '../useSeedVaultSelectAccountsScreen'

const mocks = vi.hoisted(() => ({
    addHardwareChainAccount: vi.fn(),
    findAccountByAddressOn: vi.fn(),
    setSelectedAccountId: vi.fn(),
    setShouldPlayConfetti: vi.fn(),
    exitAccountFlow: vi.fn(),
    errorToast: vi.fn(),
    params: {} as unknown,
}))

vi.mock('@react-navigation/native', async () => ({
    ...(await vi.importActual<object>('@react-navigation/native')),
    useRoute: () => ({ params: mocks.params }),
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

vi.mock('../../../hooks/useExitAccountFlow', () => ({
    useExitAccountFlow: () => ({ exitAccountFlow: mocks.exitAccountFlow }),
}))

vi.mock('../../../hooks/useOnboardingStore', () => ({
    useShouldPlayConfetti: () => ({
        setShouldPlayConfetti: mocks.setShouldPlayConfetti,
    }),
}))

vi.mock('@hooks/useToast', () => ({
    useToast: () => ({ errorToast: mocks.errorToast }),
}))

const seed = {
    id: '14',
    name: 'Seed 14',
    accounts: [
        { index: 0, address: 'ADDR-0' },
        { index: 1, address: 'ADDR-1' },
        { index: 2, address: 'ADDR-2' },
    ],
}

describe('useSeedVaultSelectAccountsScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.params = { chain: 'algorand', seed }
        mocks.findAccountByAddressOn.mockImplementation(
            (_accounts, _chainId, address) =>
                address === 'ADDR-0' ? { id: 'existing' } : undefined,
        )
    })

    it('flags already imported addresses and excludes them from select all', () => {
        const { result } = renderHook(() => useSeedVaultSelectAccountsScreen())

        expect([...result.current.importedAddresses]).toEqual(['ADDR-0'])

        act(() => result.current.toggleSelectAll())

        expect([...result.current.selectedAddresses]).toEqual([
            'ADDR-1',
            'ADDR-2',
        ])
        expect(result.current.isAllSelected).toBe(true)
    })

    it('disables continue until an address is selected', () => {
        const { result } = renderHook(() => useSeedVaultSelectAccountsScreen())
        expect(result.current.canContinue).toBe(false)

        act(() => result.current.toggleSelection('ADDR-1'))
        expect(result.current.canContinue).toBe(true)

        act(() => result.current.toggleSelection('ADDR-1'))
        expect(result.current.canContinue).toBe(false)
    })

    it('saves each selected address as a seed-specific hardware account and exits', () => {
        mocks.findAccountByAddressOn
            .mockReturnValueOnce({ id: 'existing' })
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({ id: 'saved' })
        const { result } = renderHook(() => useSeedVaultSelectAccountsScreen())

        act(() => result.current.toggleSelection('ADDR-2'))
        act(() => result.current.handleContinue())

        expect(mocks.addHardwareChainAccount).toHaveBeenCalledTimes(1)
        expect(mocks.addHardwareChainAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                deviceId: '14',
                deviceName: 'Seed 14',
                accountIndex: 2,
                transportType: 'ipc',
            }),
            'algorand',
            'ADDR-2',
        )
        expect(mocks.setSelectedAccountId).toHaveBeenCalledWith('saved')
        expect(mocks.setShouldPlayConfetti).toHaveBeenCalledWith(true)
        expect(mocks.exitAccountFlow).toHaveBeenCalled()
    })

    it('toasts and stays put when saving fails', () => {
        mocks.addHardwareChainAccount.mockImplementation(() => {
            throw new Error('boom')
        })
        const { result } = renderHook(() => useSeedVaultSelectAccountsScreen())

        act(() => result.current.toggleSelection('ADDR-1'))
        act(() => result.current.handleContinue())

        expect(mocks.errorToast).toHaveBeenCalled()
        expect(mocks.exitAccountFlow).not.toHaveBeenCalled()
    })
})
