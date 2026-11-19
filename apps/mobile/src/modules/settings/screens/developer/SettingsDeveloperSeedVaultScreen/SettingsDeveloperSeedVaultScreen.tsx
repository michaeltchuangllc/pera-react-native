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

import { PWButton, PWScrollView, PWText, PWView } from '@components/core'
import { useSettingsDeveloperSeedVault } from './useSettingsDeveloperSeedVault'
import { useStyles } from './styles'

export const SettingsDeveloperSeedVaultScreen = () => {
    const styles = useStyles()
    const {
        isAvailable,
        isBusy,
        seeds,
        selectedAddress,
        log,
        onSelectAddress,
        onCheckInstalled,
        onBind,
        onUnbind,
        onAuthorize,
        onLoadSeeds,
        onSignBytes,
        onSignTransaction,
        onDeriveKeyMaterial,
        onClearLog,
    } = useSettingsDeveloperSeedVault()

    return (
        <PWScrollView testID='seed_vault_debug_screen'>
            <PWView style={styles.container}>
                <PWText variant='caption'>
                    {isAvailable
                        ? 'Seed Vault module linked'
                        : 'Seed Vault module not linked (Android builds only)'}
                </PWText>

                <PWView style={styles.section}>
                    <PWButton
                        variant='secondary'
                        title='1. Check module / service'
                        onPress={onCheckInstalled}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='2. Authorize app'
                        onPress={onAuthorize}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='3. Bind service'
                        onPress={onBind}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='4. Load authorized seeds'
                        onPress={onLoadSeeds}
                        isDisabled={isBusy}
                    />
                </PWView>

                {seeds.map(seed => (
                    <PWView
                        key={seed.id}
                        style={styles.section}
                    >
                        <PWText variant='caption'>{seed.name}</PWText>
                        {seed.accounts.map(account => (
                            <PWView
                                key={account.address}
                                style={styles.account}
                            >
                                <PWButton
                                    variant={
                                        account.address === selectedAddress
                                            ? 'primary'
                                            : 'secondary'
                                    }
                                    title={`#${account.index} ${account.address.slice(0, 8)}...${account.address.slice(-6)}${account.isAutosign ? ' (autosign)' : ''}`}
                                    onPress={() =>
                                        onSelectAddress(account.address)
                                    }
                                />
                            </PWView>
                        ))}
                    </PWView>
                ))}

                <PWView style={styles.section}>
                    <PWButton
                        variant='secondary'
                        title='Sign bytes ("Mithilesh")'
                        onPress={onSignBytes}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='Sign transaction (0 ALGO self-payment)'
                        onPress={onSignTransaction}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='Derive key material'
                        onPress={onDeriveKeyMaterial}
                        isDisabled={isBusy}
                    />
                    <PWButton
                        variant='secondary'
                        title='Unbind service'
                        onPress={onUnbind}
                        isDisabled={isBusy}
                    />
                </PWView>

                <PWView style={styles.log}>
                    <PWButton
                        variant='secondary'
                        title='Clear log'
                        onPress={onClearLog}
                    />
                    {log.map((line, index) => (
                        <PWText
                            key={`${index}-${line}`}
                            variant='caption'
                        >
                            {line}
                        </PWText>
                    ))}
                </PWView>
            </PWView>
        </PWScrollView>
    )
}
