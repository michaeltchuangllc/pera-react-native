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
// PermissionsAndroid is Android-only by design; Solana Seed Vault is only supported on Android.
// eslint-disable-next-line react-native/split-platform-components
import { PermissionsAndroid, Platform, type Permission } from 'react-native'
import { solana } from '@algorandfoundation/react-native-seed-vault'
import { toError, type Nullable } from '@perawallet/wallet-core-shared'

type SolanaSeedVaultSeed = Awaited<
    ReturnType<typeof solana.getAuthorizedSeeds>
>[number]

const MESSAGE = new TextEncoder().encode('Seed Vault')
const BASE58_ALPHABET =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const base58Decode = (value: string): Uint8Array => {
    const bytes: number[] = []
    for (const char of value) {
        let carry = BASE58_ALPHABET.indexOf(char)
        if (carry < 0) throw new Error('Invalid base58 address')
        for (let i = 0; i < bytes.length; i++) {
            carry += bytes[i] * 58
            bytes[i] = carry & 0xff
            carry >>= 8
        }
        while (carry > 0) {
            bytes.push(carry & 0xff)
            carry >>= 8
        }
    }
    const leadingZeros = value.length - value.replace(/^1+/, '').length
    return Uint8Array.from([
        ...new Array<number>(leadingZeros).fill(0),
        ...bytes.reverse(),
    ])
}

// Legacy-format message for a 0-lamport System Program self-transfer; the
// zeroed blockhash keeps it from ever being landable.
const buildSelfTransferMessage = (address: string): Uint8Array => {
    const publicKey = base58Decode(address)
    const transferData = new Uint8Array(12)
    transferData[0] = 2
    return Uint8Array.from([
        1,
        0,
        1,
        2,
        ...publicKey,
        ...new Uint8Array(32),
        ...new Uint8Array(32),
        1,
        1,
        2,
        0,
        0,
        12,
        ...transferData,
    ])
}

const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')

const preview = (bytes: Nullable<Uint8Array>) =>
    bytes
        ? `${bytes.length} bytes: ${toHex(bytes).slice(0, 32)}...`
        : 'rejected'

export type UseSettingsDeveloperSolanaSeedVaultResult = {
    isAvailable: boolean
    isBusy: boolean
    seeds: SolanaSeedVaultSeed[]
    selectedAddress: Nullable<string>
    log: string[]
    onSelectAddress: (address: string) => void
    onCheckInstalled: () => void
    onRequestPermission: () => void
    onAuthorizeSeed: () => void
    onLoadSeeds: () => void
    onSignMessage: () => void
    onSignTransaction: () => void
    onClearLog: () => void
}

export const useSettingsDeveloperSolanaSeedVault =
    (): UseSettingsDeveloperSolanaSeedVaultResult => {
        const [isBusy, setIsBusy] = useState(false)
        const [seeds, setSeeds] = useState<SolanaSeedVaultSeed[]>([])
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
                        moduleLinked: solana.isSupported(),
                        serviceInstalled: solana.isInstalled(),
                        hasUnauthorizedSeeds: solana.hasUnauthorizedSeeds(),
                    }),
                ),
            [run],
        )

        // ACCESS_SEED_VAULT is a dangerous permission: reading seeds fails until it is granted at runtime.
        const onRequestPermission = useCallback(
            () =>
                run('Permission', async () => {
                    const permission = solana.getPermission() as Permission
                    if (await PermissionsAndroid.check(permission)) {
                        return 'already granted'
                    }
                    return PermissionsAndroid.request(permission)
                }),
            [run],
        )

        const onAuthorizeSeed = useCallback(
            () =>
                run(
                    'Authorize seed',
                    async () => `authToken = ${await solana.authorizeSeed()}`,
                ),
            [run],
        )

        const onLoadSeeds = useCallback(
            () =>
                run('Authorized seeds', async () => {
                    const loaded = await solana.getAuthorizedSeeds()
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

        const onSignMessage = useCallback(
            () =>
                withAddress('Sign message', async address =>
                    preview(await solana.signMessage(address, MESSAGE)),
                ),
            [withAddress],
        )

        const onSignTransaction = useCallback(
            () =>
                withAddress('Sign transaction', async address =>
                    preview(
                        await solana.signTransaction(
                            address,
                            buildSelfTransferMessage(address),
                        ),
                    ),
                ),
            [withAddress],
        )

        const onClearLog = useCallback(() => setLog([]), [])

        return {
            isAvailable: solana.isSupported(),
            isBusy,
            seeds,
            selectedAddress,
            log,
            onSelectAddress: setSelectedAddress,
            onCheckInstalled,
            onRequestPermission,
            onAuthorizeSeed,
            onLoadSeeds,
            onSignMessage,
            onSignTransaction,
            onClearLog,
        }
    }
