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

import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import {
    authorizeApp,
    bind,
    confirmDeriveKeyMaterial,
    confirmSignBytes,
    confirmSignTransaction,
    deriveKeyMaterial,
    getAuthorizedSeeds,
    getConstants,
    isConnected,
    isInstalled,
    isSupported,
    signBytes,
    signTransaction,
    unbind,
    type AlgorandSeedVaultSeed,
} from '@algorandfoundation/react-native-seed-vault'
// Debug-only: builds a throwaway unsigned payment to exercise the signer
/* oxlint-disable pera/no-algorand-sdk-imports */
import {
    encodeUnsignedTransaction,
    makePaymentTxnWithSuggestedParamsFromObject,
} from 'algosdk'
/* oxlint-enable pera/no-algorand-sdk-imports */
import { toError, type Nullable } from '@perawallet/wallet-core-shared'

const MESSAGE = new TextEncoder().encode('Seed Vault')
const DERIVE_INFO = new TextEncoder().encode('pera-debug')
const TESTNET_GENESIS_HASH = Uint8Array.from(
    atob('SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='),
    char => char.charCodeAt(0),
)

const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')

const preview = (bytes: Nullable<Uint8Array>) =>
    bytes ? `${bytes.length} bytes: ${toHex(bytes).slice(0, 32)}...` : 'null'

export type UseSettingsDeveloperSeedVaultResult = {
    isAvailable: boolean
    isBusy: boolean
    seeds: AlgorandSeedVaultSeed[]
    selectedAddress: Nullable<string>
    log: string[]
    onSelectAddress: (address: string) => void
    onCheckInstalled: () => void
    onBind: () => void
    onUnbind: () => void
    onAuthorize: () => void
    onLoadSeeds: () => void
    onSignBytes: () => void
    onSignTransaction: () => void
    onDeriveKeyMaterial: () => void
    onClearLog: () => void
}

export const useSettingsDeveloperSeedVault =
    (): UseSettingsDeveloperSeedVaultResult => {
        const [isBusy, setIsBusy] = useState(false)
        const [seeds, setSeeds] = useState<AlgorandSeedVaultSeed[]>([])
        const [selectedAddress, setSelectedAddress] =
            useState<Nullable<string>>(null)
        const [log, setLog] = useState<string[]>([])

        const append = useCallback((line: string) => {
            setLog(current => [line, ...current])
        }, [])

        const run = useCallback(
            (label: string, action: () => Promise<string>) => {
                setIsBusy(true)
                void action()
                    .then(result => append(`${label}: ${result}`))
                    .catch((error: unknown) =>
                        append(`${label} failed: ${toError(error).message}`),
                    )
                    .finally(() => setIsBusy(false))
            },
            [append],
        )

        const withAddress = useCallback(
            (label: string, action: (address: string) => Promise<string>) => {
                if (!selectedAddress) {
                    append(`${label}: load seeds and select an account first`)
                    return
                }
                run(label, () => action(selectedAddress))
            },
            [append, run, selectedAddress],
        )

        const onCheckInstalled = useCallback(
            () =>
                run('Check', async () =>
                    JSON.stringify({
                        platform: Platform.OS,
                        moduleLinked: isSupported(),
                        serviceInstalled: isInstalled(),
                        connected: isConnected(),
                        package: getConstants().PACKAGE,
                    }),
                ),
            [run],
        )

        const onBind = useCallback(
            () => run('Bind', async () => `service ready = ${await bind()}`),
            [run],
        )

        const onUnbind = useCallback(
            () =>
                run('Unbind', async () => {
                    unbind()
                    return 'unbound'
                }),
            [run],
        )

        const onAuthorize = useCallback(
            () =>
                run('Authorize app', async () =>
                    (await authorizeApp()) ? 'approved' : 'cancelled',
                ),
            [run],
        )

        const onLoadSeeds = useCallback(
            () =>
                run('Authorized seeds', async () => {
                    const loaded = await getAuthorizedSeeds()
                    setSeeds(loaded)
                    const first = loaded[0]?.accounts[0]?.address ?? null
                    setSelectedAddress(current => current ?? first)
                    return `${loaded.length} seed(s), ${loaded.reduce(
                        (count, seed) => count + seed.accounts.length,
                        0,
                    )} account(s)`
                }),
            [run],
        )

        const onSignBytes = useCallback(
            () =>
                withAddress('Sign bytes', async address => {
                    if (!(await confirmSignBytes(address, MESSAGE))) {
                        return 'not approved'
                    }
                    return preview(await signBytes(address, MESSAGE))
                }),
            [withAddress],
        )

        const onSignTransaction = useCallback(
            () =>
                withAddress('Sign transaction', async address => {
                    const transaction = encodeUnsignedTransaction(
                        makePaymentTxnWithSuggestedParamsFromObject({
                            sender: address,
                            receiver: address,
                            amount: 0,
                            suggestedParams: {
                                fee: 1000,
                                minFee: 1000,
                                flatFee: true,
                                firstValid: 1,
                                lastValid: 1000,
                                genesisID: 'testnet-v1.0',
                                genesisHash: TESTNET_GENESIS_HASH,
                            },
                        }),
                    )
                    if (!(await confirmSignTransaction(address, transaction))) {
                        return 'not approved'
                    }
                    return preview(await signTransaction(address, transaction))
                }),
            [withAddress],
        )

        const onDeriveKeyMaterial = useCallback(
            () =>
                withAddress('Derive key material', async address => {
                    const domain = `${getConstants().DERIVE_DOMAIN_PREFIX}pera-debug`
                    const length = getConstants().DERIVE_MIN_LENGTH
                    if (
                        !(await confirmDeriveKeyMaterial(
                            address,
                            domain,
                            DERIVE_INFO,
                            length,
                        ))
                    ) {
                        return 'not approved'
                    }
                    return preview(
                        await deriveKeyMaterial(
                            address,
                            domain,
                            DERIVE_INFO,
                            length,
                        ),
                    )
                }),
            [withAddress],
        )

        const onClearLog = useCallback(() => setLog([]), [])

        return {
            isAvailable: isSupported(),
            isBusy,
            seeds,
            selectedAddress,
            log,
            onSelectAddress: setSelectedAddress,
            onCheckInstalled,
            onBind,
            onUnbind,
            onAuthorize,
            onLoadSeeds,
            onSignBytes,
            onSignTransaction,
            onDeriveKeyMaterial,
            onClearLog,
        }
    }
