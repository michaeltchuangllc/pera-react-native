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

import { PWListItem, PWScreen } from '@components/core'
import { useLanguage } from '@hooks/useLanguage'
import { useSettingsDeveloperSelectSeedVault } from './useSettingsDeveloperSelectSeedVault'

export const SettingsDeveloperSelectSeedVaultScreen = () => {
    const { t } = useLanguage()
    const { handleOpenAlgorand, handleOpenSolana } =
        useSettingsDeveloperSelectSeedVault()

    return (
        <PWScreen testID='debug_select_seed_vault_screen'>
            <PWListItem
                onPress={handleOpenAlgorand}
                icon='shield-check'
                title={t('screens.seed_vault')}
                testID='debug_select_seed_vault_algorand_item'
            />
            <PWListItem
                onPress={handleOpenSolana}
                icon='shield-check'
                title={t('screens.solana_seed_vault')}
                testID='debug_select_seed_vault_solana_item'
            />
        </PWScreen>
    )
}
