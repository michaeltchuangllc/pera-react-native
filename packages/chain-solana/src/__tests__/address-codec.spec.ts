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

import { describe, expect, it } from 'vitest'
import { base58 } from '@scure/base'
import { solanaAddressCodec as codec } from '../address-codec'

const ADDRESS = base58.encode(new Uint8Array(32).fill(7))

describe('solanaAddressCodec', () => {
    it('accepts a base58 address that decodes to 32 bytes', () => {
        expect(codec.isValid(ADDRESS)).toBe(true)
    })

    it('rejects wrong length and non-base58 input', () => {
        expect(codec.isValid(base58.encode(new Uint8Array(31)))).toBe(false)
        expect(codec.isValid('0OIl')).toBe(false)
    })

    it('encodes a public key as its base58 address', () => {
        const key = new Uint8Array(32).fill(7)
        const opts = { scheme: 'ed25519', networkId: 'mainnet-beta' } as const
        expect(codec.fromPublicKey(key, opts)).toBe(ADDRESS)
    })

    it('does not case-fold addresses', () => {
        expect(codec.areEqual(ADDRESS, ADDRESS.toLowerCase())).toBe(false)
    })

    it('truncates long addresses', () => {
        expect(codec.truncate(ADDRESS)).toBe(
            `${ADDRESS.slice(0, 4)}...${ADDRESS.slice(-4)}`,
        )
    })

    it('round-trips a payment URI', () => {
        const uri = codec.toPaymentUri(ADDRESS)
        expect(codec.parsePaymentUri(uri)).toEqual({ address: ADDRESS })
    })
})
