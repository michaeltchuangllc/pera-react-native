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

import { addressCodecs } from '@perawallet/wallet-core-chain-contract'
import {
    PWButton,
    PWCheckbox,
    PWFlatList,
    PWScreen,
    PWText,
    PWTouchableOpacity,
    PWView,
} from '@components/core'
import { SelectableAccountCheckboxRow } from '@modules/accounts'
import { useLanguage } from '@hooks/useLanguage'
import type { SeedVaultAccount } from '../../hooks/seedVaultSources'
import { useSeedVaultSelectAccountsScreen } from './useSeedVaultSelectAccountsScreen'
import { useStyles } from './styles'

export const SeedVaultSelectAccountsScreen = () => {
    const styles = useStyles()
    const { t } = useLanguage()
    const {
        chainNameKey,
        chainId,
        accounts,
        selectedAddresses,
        importedAddresses,
        isAllSelected,
        canSelectAll,
        canContinue,
        toggleSelection,
        toggleSelectAll,
        handleContinue,
    } = useSeedVaultSelectAccountsScreen()

    const renderItem = ({ item }: { item: SeedVaultAccount }) => (
        <SelectableAccountCheckboxRow
            title={addressCodecs.get(chainId).truncate(item.address)}
            isSelected={selectedAddresses.has(item.address)}
            isImported={importedAddresses.has(item.address)}
            importedLabel={t('onboarding.seed_vault.select_accounts.imported')}
            onToggle={() => toggleSelection(item.address)}
            testID={`seed_vault_account_${item.address}`}
            checkboxTestID={`seed_vault_account_${item.address}-checkbox`}
        />
    )

    return (
        <PWScreen
            scroll='never'
            footer={
                <PWButton
                    testID='seed_vault_select_accounts_continue_button'
                    title={t('onboarding.seed_vault.select_accounts.cta')}
                    onPress={handleContinue}
                    variant='primary'
                    isDisabled={!canContinue}
                />
            }
        >
            <PWText
                variant='h2'
                style={styles.title}
            >
                {t('onboarding.seed_vault.select_accounts.title', {
                    chain: t(chainNameKey),
                })}
            </PWText>
            <PWText
                variant='body'
                style={styles.description}
            >
                {t('onboarding.seed_vault.select_accounts.description', {
                    count: accounts.length,
                })}
            </PWText>

            <PWView style={styles.summaryRow}>
                <PWText variant='h3'>
                    {t('onboarding.seed_vault.select_accounts.address_count', {
                        count: accounts.length,
                    })}
                </PWText>
                {canSelectAll && (
                    <PWTouchableOpacity
                        style={styles.selectAll}
                        onPress={toggleSelectAll}
                    >
                        <PWText
                            variant='body'
                            style={styles.selectAllText}
                        >
                            {t(
                                'onboarding.seed_vault.select_accounts.select_all',
                            )}
                        </PWText>
                        <PWCheckbox
                            checked={isAllSelected}
                            onPress={toggleSelectAll}
                            containerStyle={styles.checkboxContainer}
                            testID='seed_vault_select_all_checkbox'
                        />
                    </PWTouchableOpacity>
                )}
            </PWView>

            <PWFlatList
                data={accounts}
                renderItem={renderItem}
                keyExtractor={item => item.address}
                extraData={selectedAddresses}
                showsVerticalScrollIndicator={false}
                cardLayout
            />
        </PWScreen>
    )
}
