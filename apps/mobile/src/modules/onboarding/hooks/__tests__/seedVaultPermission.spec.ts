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

const mocks = vi.hoisted(() => ({
    check: vi.fn(),
    request: vi.fn(),
}))

vi.mock('react-native', () => ({
    PermissionsAndroid: {
        check: mocks.check,
        request: mocks.request,
        RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    },
}))

vi.mock('@algorandfoundation/react-native-seed-vault', () => ({
    getConstants: () => ({ PACKAGE: 'com.example.vault' }),
}))

import { requestSeedVaultPermission } from '../seedVaultPermission'

const PERMISSION = 'com.example.vault.ACCESS_SEED_VAULT'

describe('requestSeedVaultPermission', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('skips the prompt when the permission is already granted', async () => {
        mocks.check.mockResolvedValue(true)

        await expect(requestSeedVaultPermission()).resolves.toBe(true)

        expect(mocks.request).not.toHaveBeenCalled()
    })

    it('prompts for the service permission and reports a grant', async () => {
        mocks.check.mockResolvedValue(false)
        mocks.request.mockResolvedValue('granted')

        await expect(requestSeedVaultPermission()).resolves.toBe(true)

        expect(mocks.request).toHaveBeenCalledWith(PERMISSION)
    })

    it('reports false when the user denies the prompt', async () => {
        mocks.check.mockResolvedValue(false)
        mocks.request.mockResolvedValue('denied')

        await expect(requestSeedVaultPermission()).resolves.toBe(false)
    })
})
