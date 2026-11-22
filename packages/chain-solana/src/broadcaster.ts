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

import { base64 } from '@scure/base'
import type {
    ChainContext,
    ChainScope,
} from '@perawallet/wallet-core-chain-contract'
import { toError, type Nullable } from '@perawallet/wallet-core-shared'
import {
    SubmissionError,
    TransportError,
    type BroadcasterChainAdapter,
    type DataTransport,
    type OnConfirmedHandler,
} from '@perawallet/wallet-core-signing'
import { getSignatureStatuses, SolanaRpcError, sendRawTransaction } from './rpc'
import {
    decodeTransferMessage,
    SIGNATURE_BYTES,
    transactionIdOf,
} from './transaction'

const CONFIRMATION_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 1500
const SIGNATURE_PREFIX = 1 + SIGNATURE_BYTES

const idOf = (bytes: Uint8Array): string =>
    transactionIdOf(bytes.slice(1, SIGNATURE_PREFIX))

const nodeError = (error: unknown): Error & { code: string } => {
    const source = toError(error)
    return Object.assign(source, {
        code:
            error instanceof SolanaRpcError && error.code !== undefined
                ? String(error.code)
                : 'unknown',
    })
}

const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms))

export const createSolanaBroadcasterAdapter = (
    ctx: ChainContext,
): BroadcasterChainAdapter => {
    let onConfirmed: Nullable<OnConfirmedHandler> = null

    const submit = async (
        scope: ChainScope,
        signedTransactions: readonly Uint8Array[],
    ): Promise<string[]> => {
        const txIds = signedTransactions.map(idOf)
        try {
            for (const bytes of signedTransactions) {
                await sendRawTransaction(ctx, scope, base64.encode(bytes))
            }
        } catch (error) {
            // A JSON-RPC error is the node's verdict; anything else (network, timeout) may still have landed.
            const isRefused =
                error instanceof SolanaRpcError && error.code !== undefined
            throw new SubmissionError(
                txIds,
                isRefused ? 'rejected-by-node' : 'unknown-outcome',
                nodeError(error),
                { isUnanswered: !isRefused },
            )
        }
        return txIds
    }

    const waitForConfirmation = async (
        scope: ChainScope,
        txIds: readonly string[],
    ): Promise<void> => {
        const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS
        while (Date.now() < deadline) {
            const statuses = await getSignatureStatuses(ctx, scope, [...txIds])
            if (statuses.some(status => status?.err)) {
                throw new Error('The Solana transaction failed on chain')
            }
            if (
                statuses.every(
                    status =>
                        status?.confirmationStatus === 'confirmed' ||
                        status?.confirmationStatus === 'finalized',
                )
            ) {
                return
            }
            await sleep(POLL_INTERVAL_MS)
        }
        throw new Error('Timed out waiting for Solana confirmation')
    }

    const notifyConfirmed = (
        scope: ChainScope,
        signedTransactions: readonly Uint8Array[],
    ): void => {
        const handler = onConfirmed
        if (!handler) return
        const senders = signedTransactions.map(
            bytes => decodeTransferMessage(bytes.slice(SIGNATURE_PREFIX)).from,
        )
        void Promise.resolve(handler(senders, scope)).catch(() => undefined)
    }

    const submitAndNotify = async (
        scope: ChainScope,
        signedTransactions: readonly Uint8Array[],
    ): Promise<string[]> => {
        const txIds = await submit(scope, signedTransactions)
        void waitForConfirmation(scope, txIds)
            .then(() => notifyConfirmed(scope, signedTransactions))
            .catch(() => undefined)
        return txIds
    }

    return {
        chainId: 'solana',
        submit,
        waitForConfirmation,
        createSubmitTransport: (capturedScope): DataTransport => ({
            send: async (result, source) => {
                const { signedData } = result
                if (signedData.type !== 'signed-transactions') {
                    throw new TransportError(
                        'Solana transport only supports signed transactions',
                    )
                }
                const txIds = await submitAndNotify(
                    capturedScope,
                    signedData.signed.map(signed => signed.bytes),
                )
                if (source.callbacks?.approve) {
                    try {
                        await source.callbacks.approve(result, { txIds })
                        return { type: 'submitted-and-answered', txIds }
                    } catch {
                        // The transaction is in flight, so a failing callback must not fail the pipeline.
                    }
                }
                return { type: 'submitted', txIds }
            },
        }),
        submitAndAutoRefresh: (scope, signedTransactions) =>
            submitAndNotify(
                scope,
                signedTransactions.map(signed => signed.bytes),
            ),
        isRequestGroupAlreadySubmitted: async () => false,
        findStaleGroupReason: async () => null,
        reconcileOpenSubmissions: async () => ({
            probed: 0,
            confirmed: 0,
            progressed: 0,
            failed: 0,
        }),
        deriveSubmissionAttemptFromBytes: bytesList => ({
            txIds: bytesList.map(idOf),
            chainData: { family: 'solana' },
        }),
        setOnConfirmedHandler: handler => {
            onConfirmed = handler
        },
        setSubmissionSettledHandler: () => undefined,
        submitTimeoutError: timeoutMs =>
            new SubmissionError(
                [],
                'unknown-outcome',
                nodeError(
                    new Error(
                        `Transaction submit timed out after ${timeoutMs}ms`,
                    ),
                ),
                { isUnanswered: true },
            ),
    }
}
