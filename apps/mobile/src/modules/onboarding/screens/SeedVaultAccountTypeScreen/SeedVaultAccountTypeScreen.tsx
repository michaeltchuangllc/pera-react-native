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

import { useTheme } from '@rneui/themed'
import {
    getIconPixelSize,
    PWScreen,
    PWText,
    PWTouchableOpacity,
    PWView,
} from '@components/core'
import { useLanguage } from '@hooks/useLanguage'
import { ChainIcon } from '@modules/chain-ui/icon'
import { useSeedVaultAccountTypeScreen } from './useSeedVaultAccountTypeScreen'
import { useStyles } from './styles'

export const SeedVaultAccountTypeScreen = () => {
    const styles = useStyles()
    const { theme } = useTheme()
    const { t } = useLanguage()
    const { options } = useSeedVaultAccountTypeScreen()

    return (
        <PWScreen>
            <PWText
                variant='h2'
                style={styles.title}
            >
                {t('onboarding.seed_vault.account_type.title')}
            </PWText>
            <PWView style={styles.list}>
                {options.map(option => (
                    <PWTouchableOpacity
                        key={option.chain}
                        style={styles.row}
                        onPress={option.onPress}
                        testID={`seed_vault_account_type_${option.chain}`}
                    >
                        <ChainIcon
                            chainId={option.chainId}
                            size={getIconPixelSize(theme, 'xl')}
                        />
                        <PWView style={styles.textContainer}>
                            <PWText variant='h4'>{t(option.titleKey)}</PWText>
                            <PWText
                                variant='body'
                                style={styles.description}
                            >
                                {t(option.descriptionKey)}
                            </PWText>
                        </PWView>
                    </PWTouchableOpacity>
                ))}
            </PWView>
        </PWScreen>
    )
}
