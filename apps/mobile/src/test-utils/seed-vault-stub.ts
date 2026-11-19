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

// The real package loads expo-modules-core, which needs the native runtime.
// Tests see Seed Vault as unsupported, like any non-Android platform.

export const isSupported = () => false
export const isInstalled = () => false
export const isConnected = () => false
export const getConstants = () => ({
    PACKAGE: '',
    DERIVE_DOMAIN_PREFIX: '',
    DERIVE_MIN_LENGTH: 0,
    DERIVE_MAX_LENGTH: 0,
    MAX_BATCH_TRANSACTIONS: 0,
})
export const bind = async () => false
export const unbind = () => undefined
export const authorizeApp = async () => false
export const getAuthorizedSeeds = async () => []
