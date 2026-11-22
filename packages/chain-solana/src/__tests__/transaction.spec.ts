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
import { describe, expect, it } from 'vitest'
import {
    compileTransferMessage,
    decodeTransferMessage,
    serializeSigned,
} from '../transaction'

const addr = (byte: number) => base58.encode(new Uint8Array(32).fill(byte))

describe('solana transfer message', () => {
    it('round-trips a transfer', () => {
        const input = {
            from: addr(1),
            to: addr(2),
            lamports: 1_234_567_890n,
            recentBlockhash: addr(3),
        }

        const decoded = decodeTransferMessage(compileTransferMessage(input))

        expect(decoded).toEqual(input)
    })

    it('lists a self-transfer key once', () => {
        const message = compileTransferMessage({
            from: addr(1),
            to: addr(1),
            lamports: 1n,
            recentBlockhash: addr(3),
        })

        expect(message[3]).toBe(2)
    })

    it('rejects a message that is not a single system transfer', () => {
        const message = compileTransferMessage({
            from: addr(1),
            to: addr(2),
            lamports: 1n,
            recentBlockhash: addr(3),
        })

        expect(() => decodeTransferMessage(message.slice(0, -1))).toThrow()
    })

    it('prefixes the signature count', () => {
        const message = new Uint8Array([9, 9])

        const wire = serializeSigned(message, new Uint8Array(64).fill(7))

        expect(wire.length).toBe(1 + 64 + 2)
        expect(wire[0]).toBe(1)
    })
})
