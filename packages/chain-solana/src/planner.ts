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

import type {
    Signature,
    SignedTransaction,
    SigningRequest,
    TransactionPlanner,
    UnsignedTransaction,
} from '@perawallet/wallet-core-chain-contract'
import {
    compileTransferMessage,
    serializeSigned,
    SIGNATURE_BYTES,
    transactionIdOf,
    type SolanaTransactionPayload,
} from './transaction'

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

// `payload` is `unknown` and may come from a dApp, so this is the trust boundary
// for both `plan` and `assemble`.
export const readSolanaPayload = (
    unsigned: UnsignedTransaction,
): SolanaTransactionPayload => {
    const { scope, chainData, payload } = unsigned
    if (scope.chainId !== 'solana' || chainData.family !== 'solana') {
        throw new Error(
            `Not a Solana transaction: ${scope.chainId}/${chainData.family}`,
        )
    }
    if (
        !isRecord(payload) ||
        typeof payload.from !== 'string' ||
        typeof payload.to !== 'string' ||
        typeof payload.lamports !== 'bigint' ||
        typeof payload.recentBlockhash !== 'string'
    ) {
        throw new Error('The Solana transaction payload is malformed')
    }
    return {
        from: payload.from,
        to: payload.to,
        lamports: payload.lamports,
        recentBlockhash: payload.recentBlockhash,
    }
}

export const solanaPlanner: TransactionPlanner = {
    chainId: 'solana',

    plan: (unsigned: UnsignedTransaction): SigningRequest[] => {
        const payload = readSolanaPayload(unsigned)
        const message = compileTransferMessage(payload)
        return [
            {
                requestIndex: 0,
                signer: payload.from,
                scheme: 'ed25519',
                payload: message,
                devicePayload: message,
            },
        ]
    },

    assemble: (
        unsigned: UnsignedTransaction,
        signatures: Signature[],
    ): SignedTransaction => {
        const payload = readSolanaPayload(unsigned)
        const [signature] = signatures
        if (
            signatures.length !== 1 ||
            signature.requestIndex !== 0 ||
            signature.scheme !== 'ed25519' ||
            signature.signer !== payload.from ||
            signature.bytes.length !== SIGNATURE_BYTES
        ) {
            throw new Error(
                'A Solana transaction takes exactly one ed25519 signature, from its sender',
            )
        }
        return {
            scope: unsigned.scope,
            id: transactionIdOf(signature.bytes),
            bytes: serializeSigned(
                compileTransferMessage(payload),
                signature.bytes,
            ),
        }
    },
}
