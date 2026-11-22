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

export const LAMPORTS_PER_SIGNATURE = 5000n
export const SIGNATURE_BYTES = 64

const PUBKEY_BYTES = 32
const SYSTEM_PROGRAM_ID = new Uint8Array(PUBKEY_BYTES)
const TRANSFER_INSTRUCTION_INDEX = 2

/** A legacy-format message holding one System Program transfer. */
export type SolanaTransferMessage = {
    from: string
    to: string
    /** Lamports. */
    lamports: bigint
    recentBlockhash: string
}

/** What the planner carries as `UnsignedTransaction.payload`. */
export type SolanaTransactionPayload = SolanaTransferMessage

const concat = (parts: Uint8Array[]): Uint8Array => {
    const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
    let offset = 0
    for (const part of parts) {
        out.set(part, offset)
        offset += part.length
    }
    return out
}

const u64le = (value: bigint): Uint8Array => {
    const out = new Uint8Array(8)
    new DataView(out.buffer).setBigUint64(0, value, true)
    return out
}

const readU64le = (bytes: Uint8Array): bigint =>
    new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, true)

const key = (address: string): Uint8Array => {
    const bytes = base58.decode(address)
    if (bytes.length !== PUBKEY_BYTES) throw new Error('Invalid Solana address')
    return bytes
}

/**
 * Account keys are [from, to, system program], or [from, system program] when
 * sending to oneself, since a message lists each key once.
 */
export const compileTransferMessage = ({
    from,
    to,
    lamports,
    recentBlockhash,
}: SolanaTransferMessage): Uint8Array => {
    const isSelf = from === to
    const keys = isSelf
        ? [key(from), SYSTEM_PROGRAM_ID]
        : [key(from), key(to), SYSTEM_PROGRAM_ID]
    const programIndex = keys.length - 1
    const accountIndexes = isSelf ? [0, 0] : [0, 1]
    const data = concat([
        new Uint8Array([TRANSFER_INSTRUCTION_INDEX, 0, 0, 0]),
        u64le(lamports),
    ])
    return concat([
        // Signers, read-only signers, read-only non-signers (the program).
        new Uint8Array([1, 0, 1]),
        new Uint8Array([keys.length]),
        ...keys,
        key(recentBlockhash),
        new Uint8Array([1, programIndex, accountIndexes.length]),
        new Uint8Array(accountIndexes),
        new Uint8Array([data.length]),
        data,
    ])
}

/** Inverse of `compileTransferMessage`; throws for any other message shape. */
export const decodeTransferMessage = (
    message: Uint8Array,
): SolanaTransferMessage => {
    let o = 0
    if (message[o++] !== 1 || message[o++] !== 0 || message[o++] !== 1) {
        throw new Error('Unsupported Solana message header')
    }
    const keyCount = message[o++]
    if (keyCount !== 2 && keyCount !== 3) {
        throw new Error('Unsupported Solana account list')
    }
    const keys: Uint8Array[] = []
    for (let i = 0; i < keyCount; i++) {
        keys.push(message.slice(o, o + PUBKEY_BYTES))
        o += PUBKEY_BYTES
    }
    const blockhash = message.slice(o, o + PUBKEY_BYTES)
    o += PUBKEY_BYTES
    const instructionCount = message[o++]
    const programIndex = message[o++]
    const accountCount = message[o++]
    const accounts = [...message.slice(o, o + accountCount)]
    o += accountCount
    const dataLength = message[o++]
    const data = message.slice(o, o + dataLength)
    o += dataLength
    const isSystemProgram = keys[programIndex]?.every(byte => byte === 0)
    if (
        instructionCount !== 1 ||
        !isSystemProgram ||
        accountCount !== 2 ||
        dataLength !== 12 ||
        data[0] !== TRANSFER_INSTRUCTION_INDEX ||
        o !== message.length
    ) {
        throw new Error('Unsupported Solana instruction')
    }
    return {
        from: base58.encode(keys[accounts[0]]),
        to: base58.encode(keys[accounts[1]]),
        lamports: readU64le(data.slice(4)),
        recentBlockhash: base58.encode(blockhash),
    }
}

/** Wire format: compact-u16 signature count (1), the signature, then the message. */
export const serializeSigned = (
    message: Uint8Array,
    signature: Uint8Array,
): Uint8Array => {
    if (signature.length !== SIGNATURE_BYTES) {
        throw new Error('Invalid Solana signature length')
    }
    return concat([new Uint8Array([1]), signature, message])
}

/** A Solana transaction id is its first signature. */
export const transactionIdOf = (signature: Uint8Array): string =>
    base58.encode(signature)
