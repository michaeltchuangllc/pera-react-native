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

import { useCallback } from 'react'
import {
    authorizeApp,
    bind,
    getAuthorizedSeeds,
    isSupported,
} from '@algorandfoundation/react-native-seed-vault'
import {
    addHardwareChainAccount,
    findAccountByAddressOn,
    getAllAccounts,
    useSelectedAccountId,
} from '@perawallet/wallet-core-accounts'
import { logger } from '@perawallet/wallet-core-shared'
import { ALGORAND_CHAIN_ID } from '@modules/algorand/chain-id'
import { useLanguage } from '@hooks/useLanguage'
import { useToast } from '@hooks/useToast'
import { useExitAccountFlow } from './useExitAccountFlow'
import { requestSeedVaultPermission } from './seedVaultPermission'
import { useShouldPlayConfetti } from './useOnboardingStore'

export const SEED_VAULT_MANUFACTURER = 'seed-vault-service'

const FIRST_ACCOUNT_INDEX = 0

export type UseSeedVaultImportResult = {
    isSeedVaultSupported: boolean
    handleImportSeedVault: () => Promise<void>
}

export const useSeedVaultImport = (): UseSeedVaultImportResult => {
    const { t } = useLanguage()
    const { errorToast } = useToast()
    const { setSelectedAccountId } = useSelectedAccountId()
    const { setShouldPlayConfetti } = useShouldPlayConfetti()
    const { exitAccountFlow } = useExitAccountFlow()

    const handleImportSeedVault = useCallback(async () => {
        try {
            if (!(await requestSeedVaultPermission())) return
            await bind()
            let seeds = await getAuthorizedSeeds()
            if (seeds.length === 0) {
                if (!(await authorizeApp())) return
                seeds = await getAuthorizedSeeds()
            }

            const firstAccounts = seeds.flatMap(seed => {
                const account = seed.accounts.find(
                    ({ index }) => index === FIRST_ACCOUNT_INDEX,
                )
                return account ? [{ seed, address: account.address }] : []
            })
            if (firstAccounts.length === 0) {
                errorToast(
                    t(
                        'onboarding.import_account_options.seed_vault_error_title',
                    ),
                    t(
                        'onboarding.import_account_options.seed_vault_error_body',
                    ),
                )
                return
            }

            for (const { seed, address } of firstAccounts) {
                // Not 'usb': a USB position ignores deviceId, so two seeds
                // would collapse into one account.
                addHardwareChainAccount(
                    {
                        manufacturer: SEED_VAULT_MANUFACTURER,
                        deviceId: String(seed.id),
                        deviceName: seed.name,
                        accountIndex: FIRST_ACCOUNT_INDEX,
                        transportType: 'ipc',
                    },
                    ALGORAND_CHAIN_ID,
                    address,
                )
            }

            const selected = findAccountByAddressOn(
                getAllAccounts(),
                ALGORAND_CHAIN_ID,
                firstAccounts[0].address,
            )
            if (selected) setSelectedAccountId(selected.id)
            setShouldPlayConfetti(true)
            exitAccountFlow()
        } catch (error) {
            logger.warn('Seed Vault import failed', { error })
            errorToast(
                t('onboarding.import_account_options.seed_vault_error_title'),
                t('onboarding.import_account_options.seed_vault_error_body'),
            )
        }
    }, [
        errorToast,
        t,
        setSelectedAccountId,
        setShouldPlayConfetti,
        exitAccountFlow,
    ])

    return { isSeedVaultSupported: isSupported(), handleImportSeedVault }
}
