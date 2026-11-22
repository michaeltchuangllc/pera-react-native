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
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useAppNavigation } from '@hooks/useAppNavigation'
import type { ImportFlowParamList } from '../../routes/types'
import type { SeedVaultSeed } from '../../hooks/seedVaultSources'
import {
    useSeedVaultSeeds,
    type UseSeedVaultSeedsResult,
} from '../../hooks/useSeedVaultSeeds'

export type UseSeedVaultSelectSeedScreenResult = UseSeedVaultSeedsResult & {
    handleSelectSeed: (seed: SeedVaultSeed) => void
}

export const useSeedVaultSelectSeedScreen =
    (): UseSeedVaultSelectSeedScreenResult => {
        const navigation = useAppNavigation()
        const { chain } =
            useRoute<RouteProp<ImportFlowParamList, 'SeedVaultSelectSeed'>>()
                .params
        const seedsResult = useSeedVaultSeeds(chain)

        const handleSelectSeed = useCallback(
            (seed: SeedVaultSeed) => {
                navigation.push('SeedVaultSelectAccounts', { chain, seed })
            },
            [navigation, chain],
        )

        return { ...seedsResult, handleSelectSeed }
    }
