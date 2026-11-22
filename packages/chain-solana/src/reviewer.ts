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

import { Decimal } from 'decimal.js'
import type {
    TransactionNative,
    TransactionReviewer,
    UnsignedTransaction,
} from '@perawallet/wallet-core-chain-contract'
import {
    bridgeTransactionReviewer,
    isTransactionRequest,
    isUnsignedTransactionRequest,
    type ReviewerChainAdapter,
    type SingleTransactionItem,
} from '@perawallet/wallet-core-signing'
import { solanaDescriptor } from './descriptor'
import { readSolanaPayload } from './planner'
import { solTransferSummary } from './summary'
import { LAMPORTS_PER_SIGNATURE } from './transaction'

const NATIVE = solanaDescriptor.nativeAsset.ref

export const solanaReviewer: TransactionReviewer = {
    chainId: 'solana',
    decoder: {
        decode: async transactions => {
            const payloads = transactions.map(readSolanaPayload)
            return {
                totalFees: new Decimal(
                    (
                        LAMPORTS_PER_SIGNATURE * BigInt(payloads.length)
                    ).toString(),
                ),
                signableAddresses: payloads.map(({ from }) => from),
                transactions: payloads.map(payload => ({
                    summary: solTransferSummary(
                        payload.from,
                        payload.to,
                        NATIVE,
                        payload.lamports,
                    ),
                    native: { family: 'solana', transaction: payload },
                })),
            }
        },
    },
    warnings: { detect: () => [] },
    policy: {
        autoApproveLocal: () => true,
        matchesApprovedPreview: (transaction, preview) => {
            const a = readSolanaPayload(transaction)
            const b = readSolanaPayload(preview)
            return (
                a.from === b.from && a.to === b.to && a.lamports === b.lamports
            )
        },
    },
}

const toItems = (transactions: TransactionNative[]): SingleTransactionItem[] =>
    transactions.map((transaction, groupIndex) => ({
        type: 'transaction',
        transaction,
        groupIndex,
        isExternal: false,
    }))

export const solanaSigningReviewer: ReviewerChainAdapter = {
    ...bridgeTransactionReviewer(solanaReviewer),
    chainId: 'solana',
    createTransactionListItems: toItems,
    classifyRequestStructure: items => (items.length > 1 ? 'list' : 'single'),
    aggregateTransactionWarnings: () => [],
    resolveAllSignerAddresses: request => {
        if (!isTransactionRequest(request)) return []
        if (!isUnsignedTransactionRequest(request)) return []
        return request.txs.flatMap(unsigned => {
            try {
                return [readSolanaPayload(unsigned).from]
            } catch {
                return []
            }
        })
    },
    getDelegatedUnsignableReason: () => null,
    decodeArbitraryDataForDisplay: data => ({ kind: 'text', text: data }),
    reviewedAddresses: transaction => {
        const payload = transaction.transaction as { to?: unknown }
        return typeof payload?.to === 'string'
            ? [{ address: payload.to, role: 'recipient' }]
            : []
    },
    toTransactionNative: (transaction: UnsignedTransaction) => {
        try {
            return {
                family: 'solana',
                transaction: readSolanaPayload(transaction),
            }
        } catch {
            return null
        }
    },
}
