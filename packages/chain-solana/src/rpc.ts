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

import { AppError, type Nullable } from '@perawallet/wallet-core-shared'
import type {
    ChainContext,
    ChainScope,
} from '@perawallet/wallet-core-chain-contract'

const PUBLIC_RPC: Record<string, string> = {
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
}

type RpcResponse<T> = { result?: T; error?: { code?: number; message: string } }

export class SolanaRpcError extends AppError {
    constructor(
        message: string,
        readonly code?: number,
    ) {
        super(message, {})
    }
}

export const rpcUrlFor = (ctx: ChainContext, scope: ChainScope): string => {
    const url = ctx.getEndpoints().rpc?.[0] ?? PUBLIC_RPC[scope.networkId]
    if (!url) throw new SolanaRpcError(`No Solana RPC for ${scope.networkId}`)
    return url
}

export const rpcCall = async <T>(
    ctx: ChainContext,
    scope: ChainScope,
    method: string,
    params: unknown[],
    timeoutMs: number = ctx.timeouts.readMs,
): Promise<T> => {
    // A JSON-RPC node, not the Pera backend, so the shared queryClient doesn't apply.
    // oxlint-disable-next-line no-restricted-globals
    const response = await fetch(rpcUrlFor(ctx, scope), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) throw new SolanaRpcError(`Solana RPC ${response.status}`)
    const body = (await response.json()) as RpcResponse<T>
    if (body.result === undefined) {
        throw new SolanaRpcError(
            body.error?.message ?? 'Solana RPC returned no result',
            body.error?.code,
        )
    }
    return body.result
}

export const getLatestBlockhash = async (
    ctx: ChainContext,
    scope: ChainScope,
): Promise<string> =>
    (
        await rpcCall<{ value: { blockhash: string } }>(
            ctx,
            scope,
            'getLatestBlockhash',
            [{ commitment: 'confirmed' }],
        )
    ).value.blockhash

export const getRentExemptMinimum = (
    ctx: ChainContext,
    scope: ChainScope,
): Promise<bigint> =>
    rpcCall<number>(ctx, scope, 'getMinimumBalanceForRentExemption', [0]).then(
        BigInt,
    )

export const getBalanceLamports = async (
    ctx: ChainContext,
    scope: ChainScope,
    address: string,
): Promise<bigint> =>
    BigInt(
        (
            await rpcCall<{ value: number }>(ctx, scope, 'getBalance', [
                address,
                { commitment: 'confirmed' },
            ])
        ).value,
    )

export const sendRawTransaction = (
    ctx: ChainContext,
    scope: ChainScope,
    base64: string,
): Promise<string> =>
    rpcCall<string>(
        ctx,
        scope,
        'sendTransaction',
        [
            base64,
            {
                encoding: 'base64',
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            },
        ],
        ctx.timeouts.submitMs,
    )

type SignatureStatus = Nullable<{
    confirmationStatus?: string
    err?: unknown
}>

export const getSignatureStatuses = async (
    ctx: ChainContext,
    scope: ChainScope,
    signatures: string[],
): Promise<SignatureStatus[]> =>
    (
        await rpcCall<{ value: SignatureStatus[] }>(
            ctx,
            scope,
            'getSignatureStatuses',
            [signatures, { searchTransactionHistory: true }],
        )
    ).value
