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

// PermissionsAndroid is Android-only by design; Seed Vault is only supported on Android.
// eslint-disable-next-line react-native/split-platform-components
import { PermissionsAndroid, type Permission } from 'react-native'
import { getConstants } from '@algorandfoundation/react-native-seed-vault'

// The service declares ACCESS_SEED_VAULT as a dangerous permission, so binding
// to it is denied until the user grants it at runtime; declaring it in the
// manifest is not enough.
export const requestSeedVaultPermission = async (): Promise<boolean> => {
    const permission =
        `${getConstants().PACKAGE}.ACCESS_SEED_VAULT` as Permission
    if (await PermissionsAndroid.check(permission)) return true
    const result = await PermissionsAndroid.request(permission)
    return result === PermissionsAndroid.RESULTS.GRANTED
}
