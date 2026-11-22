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
import {
    addressOn,
    getAccountChainStateRow,
} from '@perawallet/wallet-core-accounts'
import {
    isNativeAsset,
    type ChainContext,
    type FeeEstimate,
    type TransactionIntent,
    type TransferIntent,
} from '@perawallet/wallet-core-chain-contract'
import { toBigInt } from '@perawallet/wallet-core-shared'
import {
    InvalidSendParamsError,
    UnsupportedTransactionIntentError,
    type TransferChainAdapter,
} from '@perawallet/wallet-core-transactions'
import { solanaAddressCodec } from './address-codec'
import { solanaDescriptor } from './descriptor'
import {
    getBalanceLamports,
    getLatestBlockhash,
    getRentExemptMinimum,
} from './rpc'
import { solTransferSummary } from './summary'
import { LAMPORTS_PER_SIGNATURE } from './transaction'

const NATIVE = solanaDescriptor.nativeAsset.ref
const ZERO = new Decimal(0)

const toTransfer = (intent: TransactionIntent): TransferIntent => {
    if (intent.kind !== 'transfer') {
        throw new UnsupportedTransactionIntentError(intent.kind, 'solana')
    }
    if (
        intent.assetRef.chainId !== 'solana' ||
        !isNativeAsset(intent.assetRef, solanaDescriptor) ||
        !solanaAddressCodec.isValid(intent.from) ||
        !solanaAddressCodec.isValid(intent.to) ||
        intent.amount.lte(0) ||
        !intent.amount.isInteger()
    ) {
        throw new InvalidSendParamsError()
    }
    return intent
}

const feeEstimate = (): FeeEstimate => ({
    assetRef: NATIVE,
    amount: new Decimal(LAMPORTS_PER_SIGNATURE.toString()),
})

export const createSolanaTransferAdapter = (
    ctx: ChainContext,
): TransferChainAdapter => ({
    chainId: 'solana',

    build: async (intent, { scope }) => {
        const transfer = toTransfer(intent)
        const lamports = toBigInt(transfer.amount)
        // An account that doesn't exist yet can't be created with less than the rent-exempt minimum.
        const [blockhash, recipientBalance, rent] = await Promise.all([
            getLatestBlockhash(ctx, scope),
            getBalanceLamports(ctx, scope, transfer.to),
            getRentExemptMinimum(ctx, scope),
        ])
        if (recipientBalance === 0n && lamports < rent) {
            throw new InvalidSendParamsError(['amount'])
        }
        return [
            {
                scope,
                payload: {
                    from: transfer.from,
                    to: transfer.to,
                    lamports,
                    recentBlockhash: blockhash,
                },
                summary: solTransferSummary(
                    transfer.from,
                    transfer.to,
                    NATIVE,
                    lamports,
                ),
                chainData: { family: 'solana' },
            },
        ]
    },

    getFeeEstimate: async intent => {
        toTransfer(intent)
        return feeEstimate()
    },

    spendableBalance: async ({ account, asset, scope, fee }) => {
        const address = addressOn(account, scope)
        if (
            scope.chainId !== 'solana' ||
            !address ||
            !isNativeAsset(asset, solanaDescriptor)
        ) {
            throw new InvalidSendParamsError()
        }
        const row = await getAccountChainStateRow({
            accountAddress: address,
            scope,
        })
        const balance = row?.nativeBalance ?? ZERO
        // The sender must stay rent-exempt after the send.
        const reserved = new Decimal(
            (await getRentExemptMinimum(ctx, scope)).toString(),
        )
        return {
            balance,
            max: Decimal.max(balance.sub(fee).sub(reserved), ZERO),
            reserved,
        }
    },

    holdingReserve: () => ZERO,
})
