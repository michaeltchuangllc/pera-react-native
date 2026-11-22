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

import { PWButton, PWScreen, PWText, PWView } from '@components/core'
import { PanelButton } from '@components/PanelButton'
import { ScreenHeader } from '@components/ScreenHeader'
import { useLanguage } from '@hooks/useLanguage'
import { useSeedVaultSelectSeedScreen } from './useSeedVaultSelectSeedScreen'
import { useStyles } from './styles'

export const SeedVaultSelectSeedScreen = () => {
    const styles = useStyles()
    const { t } = useLanguage()
    const {
        seeds,
        isLoading,
        handleSelectSeed,
        handleAuthorizeAnotherSeed,
        handleRefresh,
    } = useSeedVaultSelectSeedScreen()

    return (
        <PWScreen>
            <ScreenHeader
                title={t('onboarding.seed_vault.select_seed.title')}
            />
            {!isLoading && seeds.length === 0 && (
                <PWView style={styles.empty}>
                    <PWText
                        variant='body'
                        style={styles.emptyText}
                    >
                        {t('onboarding.seed_vault.select_seed.empty')}
                    </PWText>
                    <PWButton
                        testID='seed_vault_refresh_button'
                        title={t('onboarding.seed_vault.select_seed.refresh')}
                        variant='secondary'
                        onPress={() => void handleRefresh()}
                    />
                </PWView>
            )}
            {!isLoading && seeds.length > 0 && (
                <PWView style={styles.list}>
                    {seeds.map(seed => (
                        <PanelButton
                            key={seed.id}
                            testID={`seed_vault_seed_${seed.id}`}
                            title={seed.name}
                            titleWeight='h3'
                            leftIcon='wallet'
                            rightIcon='chevron-right'
                            onPress={() => handleSelectSeed(seed)}
                        />
                    ))}
                    <PanelButton
                        testID='seed_vault_authorize_another_seed'
                        title={t('onboarding.seed_vault.select_seed.authorize')}
                        titleWeight='h3'
                        leftIcon='plus'
                        rightIcon='chevron-right'
                        onPress={() => void handleAuthorizeAnotherSeed()}
                    />
                </PWView>
            )}
        </PWScreen>
    )
}
