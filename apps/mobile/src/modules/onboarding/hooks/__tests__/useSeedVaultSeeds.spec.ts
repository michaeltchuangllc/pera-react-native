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

import { renderHook, act, waitFor } from '@test-utils/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSeedVaultSeeds } from '../useSeedVaultSeeds'

const mocks = vi.hoisted(() => ({
    loadSeedVaultSeeds: vi.fn(),
    authorizeSeedVaultSeed: vi.fn(),
    errorToast: vi.fn(),
}))

vi.mock('../seedVaultSources', () => ({
    seedVaultSourceOf: () => ({
        loadSeeds: mocks.loadSeedVaultSeeds,
        authorizeSeed: mocks.authorizeSeedVaultSeed,
    }),
}))

vi.mock('@hooks/useToast', () => ({
    useToast: () => ({ errorToast: mocks.errorToast }),
}))

const seed14 = { id: '14', name: 'Seed 14', accounts: [] }
const seed15 = { id: '15', name: 'Seed 15', accounts: [] }

describe('useSeedVaultSeeds', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads the authorized seeds for the chain', async () => {
        mocks.loadSeedVaultSeeds.mockResolvedValue([seed14, seed15])

        const { result } = renderHook(() => useSeedVaultSeeds('solana'))

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.seeds).toEqual([seed14, seed15])
    })

    it('names seeds that come back without a name', async () => {
        mocks.loadSeedVaultSeeds.mockResolvedValue([
            { ...seed14, name: '' },
            seed15,
        ])

        const { result } = renderHook(() => useSeedVaultSeeds('solana'))

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.seeds[0].name).not.toBe('')
        expect(result.current.seeds[1].name).toBe('Seed 15')
    })

    it('shows no seeds when the permission is denied', async () => {
        mocks.loadSeedVaultSeeds.mockResolvedValue(null)

        const { result } = renderHook(() => useSeedVaultSeeds('algorand'))

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.seeds).toEqual([])
        expect(mocks.errorToast).not.toHaveBeenCalled()
    })

    it('reloads the seeds after another seed is authorized', async () => {
        mocks.loadSeedVaultSeeds
            .mockResolvedValueOnce([seed14])
            .mockResolvedValueOnce([seed14, seed15])
        mocks.authorizeSeedVaultSeed.mockResolvedValue(true)
        const { result } = renderHook(() => useSeedVaultSeeds('algorand'))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        await act(() => result.current.handleAuthorizeAnotherSeed())

        expect(result.current.seeds).toEqual([seed14, seed15])
    })

    it('picks up seeds created after an empty load when refreshed', async () => {
        mocks.loadSeedVaultSeeds
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([seed14])
        const { result } = renderHook(() => useSeedVaultSeeds('algorand'))
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.seeds).toEqual([])

        await act(() => result.current.handleRefresh())

        expect(result.current.seeds).toEqual([seed14])
    })

    it('keeps the list when authorization is declined', async () => {
        mocks.loadSeedVaultSeeds.mockResolvedValue([seed14])
        mocks.authorizeSeedVaultSeed.mockResolvedValue(false)
        const { result } = renderHook(() => useSeedVaultSeeds('algorand'))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        await act(() => result.current.handleAuthorizeAnotherSeed())

        expect(mocks.loadSeedVaultSeeds).toHaveBeenCalledTimes(1)
    })

    it('toasts when loading fails', async () => {
        mocks.loadSeedVaultSeeds.mockRejectedValue(new Error('unavailable'))

        const { result } = renderHook(() => useSeedVaultSeeds('algorand'))

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mocks.errorToast).toHaveBeenCalledTimes(1)
    })
})
