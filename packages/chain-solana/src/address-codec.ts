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

import { base58 } from '@scure/base'
import type { AddressCodec } from '@perawallet/wallet-core-chain-contract'

const PUBLIC_KEY_BYTES = 32
const TRUNCATE_EDGE = 4

const isValidSolanaAddress = (address: string): boolean => {
    try {
        return base58.decode(address).length === PUBLIC_KEY_BYTES
    } catch {
        return false
    }
}

// Base58 is case-sensitive, so addresses are never case-folded.
export const solanaAddressCodec: AddressCodec = {
    chainId: 'solana',
    fromPublicKey: publicKey => base58.encode(publicKey),
    isValid: isValidSolanaAddress,
    normalize: address => address,
    areEqual: (a, b) => a === b,
    truncate: address =>
        address.length <= TRUNCATE_EDGE * 2
            ? address
            : `${address.slice(0, TRUNCATE_EDGE)}...${address.slice(-TRUNCATE_EDGE)}`,
    resembles: (a, b) =>
        a.slice(0, TRUNCATE_EDGE) === b.slice(0, TRUNCATE_EDGE) &&
        a.slice(-TRUNCATE_EDGE) === b.slice(-TRUNCATE_EDGE),
    toPaymentUri: address => `solana:${address}`,
    parsePaymentUri: uri => {
        const match = /^solana:([1-9A-HJ-NP-Za-km-z]+)/.exec(uri)
        return match && isValidSolanaAddress(match[1])
            ? { address: match[1] }
            : undefined
    },
}
