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
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { algorandSeedVaultSource } from '../algorandSeedVaultSource'

const mocks = vi.hoisted(() => ({
    getAuthorizedSeeds: vi.fn(),
}))

vi.mock('@algorandfoundation/react-native-seed-vault', () => ({
    authorizeApp: vi.fn(),
    bind: vi.fn(),
    isSupported: vi.fn(),
    getAuthorizedSeeds: mocks.getAuthorizedSeeds,
}))

vi.mock('../seedVaultPermission', () => ({
    requestSeedVaultPermission: vi.fn().mockResolvedValue(true),
}))

describe('algorandSeedVaultSource', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('only exposes the first account of each seed', async () => {
        mocks.getAuthorizedSeeds.mockResolvedValue([
            {
                id: 14,
                name: 'Seed 14',
                accounts: [
                    { index: 0, address: 'ADDR0' },
                    { index: 1, address: 'ADDR1' },
                ],
            },
        ])

        const seeds = await algorandSeedVaultSource.loadSeeds()

        expect(seeds).toEqual([
            {
                id: '14',
                name: 'Seed 14',
                accounts: [{ index: 0, address: 'ADDR0' }],
            },
        ])
    })
})
