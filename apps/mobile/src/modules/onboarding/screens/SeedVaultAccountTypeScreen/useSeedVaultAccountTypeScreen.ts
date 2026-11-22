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

import { useCallback, useMemo } from 'react'
import {
    i18nKey,
    type ChainId,
    type I18nKey,
} from '@perawallet/wallet-core-chain-contract'
import { useAppNavigation } from '@hooks/useAppNavigation'
import {
    isSeedVaultChainSupported,
    SEED_VAULT_CHAINS,
    seedVaultSourceOf,
    type SeedVaultChain,
} from '../../hooks/seedVaultSources'

const COPY: Record<SeedVaultChain, { title: I18nKey; description: I18nKey }> = {
    algorand: {
        title: i18nKey('onboarding.seed_vault.account_type.algorand_title'),
        description: i18nKey(
            'onboarding.seed_vault.account_type.algorand_description',
        ),
    },
    solana: {
        title: i18nKey('onboarding.seed_vault.account_type.solana_title'),
        description: i18nKey(
            'onboarding.seed_vault.account_type.solana_description',
        ),
    },
}

export type SeedVaultAccountTypeOption = {
    chain: SeedVaultChain
    chainId: ChainId
    titleKey: I18nKey
    descriptionKey: I18nKey
    onPress: () => void
}

export type UseSeedVaultAccountTypeScreenResult = {
    options: SeedVaultAccountTypeOption[]
}

export const useSeedVaultAccountTypeScreen =
    (): UseSeedVaultAccountTypeScreenResult => {
        const navigation = useAppNavigation()

        const handleSelect = useCallback(
            (chain: SeedVaultChain) => {
                navigation.push('SeedVaultSelectSeed', { chain })
            },
            [navigation],
        )

        const options = useMemo(
            () =>
                SEED_VAULT_CHAINS.filter(isSeedVaultChainSupported).map(
                    chain => ({
                        chain,
                        chainId: seedVaultSourceOf(chain).chainId,
                        titleKey: COPY[chain].title,
                        descriptionKey: COPY[chain].description,
                        onPress: () => handleSelect(chain),
                    }),
                ),
            [handleSelect],
        )

        return { options }
    }
