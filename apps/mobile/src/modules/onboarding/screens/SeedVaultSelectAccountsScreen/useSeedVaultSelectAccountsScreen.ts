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

import { useCallback, useMemo, useState } from 'react'
import { useRoute, type RouteProp } from '@react-navigation/native'
import {
    addHardwareChainAccount,
    findAccountByAddressOn,
    getAllAccounts,
    useSelectedAccountId,
} from '@perawallet/wallet-core-accounts'
import { SEED_VAULT_MANUFACTURER } from '@perawallet/wallet-core-hardware-wallet'
import {
    i18nKey,
    type ChainId,
    type I18nKey,
} from '@perawallet/wallet-core-chain-contract'
import { logger } from '@perawallet/wallet-core-shared'
import { useLanguage } from '@hooks/useLanguage'
import { useToast } from '@hooks/useToast'
import { useExitAccountFlow } from '../../hooks/useExitAccountFlow'
import { useShouldPlayConfetti } from '../../hooks/useOnboardingStore'
import {
    seedVaultSourceOf,
    type SeedVaultAccount,
    type SeedVaultChain,
} from '../../hooks/seedVaultSources'
import type { ImportFlowParamList } from '../../routes/types'

const CHAIN_NAME_KEYS: Record<SeedVaultChain, I18nKey> = {
    algorand: i18nKey('onboarding.seed_vault.account_type.algorand_title'),
    solana: i18nKey('onboarding.seed_vault.account_type.solana_title'),
}

export type UseSeedVaultSelectAccountsScreenResult = {
    chainNameKey: I18nKey
    chainId: ChainId
    accounts: SeedVaultAccount[]
    selectedAddresses: ReadonlySet<string>
    importedAddresses: ReadonlySet<string>
    isAllSelected: boolean
    canSelectAll: boolean
    canContinue: boolean
    toggleSelection: (address: string) => void
    toggleSelectAll: () => void
    handleContinue: () => void
}

export const useSeedVaultSelectAccountsScreen =
    (): UseSeedVaultSelectAccountsScreenResult => {
        const { t } = useLanguage()
        const { errorToast } = useToast()
        const { setSelectedAccountId } = useSelectedAccountId()
        const { setShouldPlayConfetti } = useShouldPlayConfetti()
        const { exitAccountFlow } = useExitAccountFlow()
        const { chain, seed } =
            useRoute<
                RouteProp<ImportFlowParamList, 'SeedVaultSelectAccounts'>
            >().params
        const chainId = seedVaultSourceOf(chain).chainId
        const accounts = seed.accounts

        const importedAddresses = useMemo(() => {
            const existing = getAllAccounts()
            return new Set(
                accounts
                    .filter(
                        ({ address }) =>
                            !!findAccountByAddressOn(
                                existing,
                                chainId,
                                address,
                            ),
                    )
                    .map(({ address }) => address),
            )
        }, [accounts, chainId])

        const selectableAddresses = useMemo(
            () =>
                accounts
                    .map(({ address }) => address)
                    .filter(address => !importedAddresses.has(address)),
            [accounts, importedAddresses],
        )

        const [selectedAddresses, setSelectedAddresses] = useState<
            ReadonlySet<string>
        >(new Set())

        const toggleSelection = useCallback((address: string) => {
            setSelectedAddresses(current => {
                const next = new Set(current)
                if (!next.delete(address)) next.add(address)
                return next
            })
        }, [])

        const isAllSelected =
            selectableAddresses.length > 0 &&
            selectableAddresses.every(address => selectedAddresses.has(address))

        const toggleSelectAll = useCallback(() => {
            setSelectedAddresses(
                isAllSelected ? new Set() : new Set(selectableAddresses),
            )
        }, [isAllSelected, selectableAddresses])

        const handleContinue = useCallback(() => {
            const toImport = accounts.filter(({ address }) =>
                selectedAddresses.has(address),
            )
            if (toImport.length === 0) return
            try {
                for (const { index, address } of toImport) {
                    // Not 'usb': a USB position ignores deviceId, so two seeds
                    // would collapse into one account.
                    addHardwareChainAccount(
                        {
                            manufacturer: SEED_VAULT_MANUFACTURER,
                            deviceId: seed.id,
                            deviceName: seed.name,
                            accountIndex: index,
                            transportType: 'ipc',
                        },
                        chainId,
                        address,
                    )
                }
                const selected = findAccountByAddressOn(
                    getAllAccounts(),
                    chainId,
                    toImport[0].address,
                )
                if (selected) setSelectedAccountId(selected.id)
                setShouldPlayConfetti(true)
                exitAccountFlow()
            } catch (error) {
                logger.warn('Seed Vault import failed', { chain, error })
                errorToast(
                    t('onboarding.seed_vault.select_accounts.error_title'),
                    t('onboarding.seed_vault.select_accounts.error_body'),
                )
            }
        }, [
            accounts,
            selectedAddresses,
            seed.id,
            seed.name,
            chain,
            chainId,
            setSelectedAccountId,
            setShouldPlayConfetti,
            exitAccountFlow,
            errorToast,
            t,
        ])

        return {
            chainNameKey: CHAIN_NAME_KEYS[chain],
            chainId,
            accounts,
            selectedAddresses,
            importedAddresses,
            isAllSelected,
            canSelectAll: selectableAddresses.length > 0,
            canContinue: selectedAddresses.size > 0,
            toggleSelection,
            toggleSelectAll,
            handleContinue,
        }
    }
