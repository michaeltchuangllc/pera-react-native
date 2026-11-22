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

import { useCallback, useEffect, useRef, useState } from 'react'
import { i18nKey, type I18nKey } from '@perawallet/wallet-core-chain-contract'
import { logger } from '@perawallet/wallet-core-shared'
import { useLanguage } from '@hooks/useLanguage'
import { useToast } from '@hooks/useToast'
import {
    seedVaultSourceOf,
    type SeedVaultChain,
    type SeedVaultSeed,
} from './seedVaultSources'

const ERROR_KEYS: Record<SeedVaultChain, { title: I18nKey; body: I18nKey }> = {
    algorand: {
        title: i18nKey(
            'onboarding.import_account_options.seed_vault_error_title',
        ),
        body: i18nKey(
            'onboarding.import_account_options.seed_vault_error_body',
        ),
    },
    solana: {
        title: i18nKey(
            'onboarding.import_account_options.solana_seed_vault_error_title',
        ),
        body: i18nKey(
            'onboarding.import_account_options.solana_seed_vault_error_body',
        ),
    },
}

export type UseSeedVaultSeedsResult = {
    seeds: SeedVaultSeed[]
    isLoading: boolean
    handleAuthorizeAnotherSeed: () => Promise<void>
    handleRefresh: () => Promise<void>
}

export const useSeedVaultSeeds = (
    chain: SeedVaultChain,
): UseSeedVaultSeedsResult => {
    const { t } = useLanguage()
    const { errorToast } = useToast()
    const [seeds, setSeeds] = useState<SeedVaultSeed[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // errorToast and t change identity per render; depending on them would re-run the load effect in a loop.
    const notifyRef = useRef({ errorToast, t })
    notifyRef.current = { errorToast, t }

    const showError = useCallback(
        (error: unknown) => {
            logger.warn('Seed Vault request failed', { chain, error })
            const { errorToast: toast, t: translate } = notifyRef.current
            toast(translate(ERROR_KEYS[chain].title), translate(ERROR_KEYS[chain].body))
        },
        [chain],
    )

    const refresh = useCallback(async () => {
        setIsLoading(true)
        try {
            const loaded = (await seedVaultSourceOf(chain).loadSeeds()) ?? []
            // The Seed Vault can return seeds with an empty name.
            setSeeds(
                loaded.map((seed, position) => ({
                    ...seed,
                    name:
                        seed.name?.trim() ||
                        notifyRef.current.t(
                            'onboarding.seed_vault.select_seed.default_name',
                            { number: position + 1 },
                        ),
                })),
            )
        } catch (error) {
            showError(error)
        } finally {
            setIsLoading(false)
        }
    }, [chain, showError])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const handleAuthorizeAnotherSeed = useCallback(async () => {
        try {
            if (await seedVaultSourceOf(chain).authorizeSeed()) await refresh()
        } catch (error) {
            showError(error)
        }
    }, [chain, refresh, showError])

    return {
        seeds,
        isLoading,
        handleAuthorizeAnotherSeed,
        handleRefresh: refresh,
    }
}
