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
    accountKindId,
    type AccountsChainAdapter,
} from '@perawallet/wallet-core-accounts'
import type {
    ChainContext,
    ChainScope,
} from '@perawallet/wallet-core-chain-contract'

import { solanaDescriptor } from './descriptor'

const PUBLIC_RPC: Record<string, string> = {
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
}

type BalanceResponse = {
    result?: { context: { slot: number }; value: number }
    error?: { message: string }
}

const readBalance = async (
    ctx: ChainContext,
    address: string,
    scope: ChainScope,
): Promise<{ lamports: Decimal; slot: number }> => {
    const url = ctx.getEndpoints().rpc?.[0] ?? PUBLIC_RPC[scope.networkId] ?? ''
    if (!url) throw new Error(`No Solana RPC for ${scope.networkId}`)
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address, { commitment: 'confirmed' }],
        }),
        signal: AbortSignal.timeout(ctx.timeouts.readMs),
    })
    if (!response.ok) throw new Error(`Solana RPC ${response.status}`)
    const body = (await response.json()) as BalanceResponse
    if (!body.result) {
        throw new Error(body.error?.message ?? 'Solana RPC returned no result')
    }
    return {
        lamports: new Decimal(body.result.value),
        slot: body.result.context.slot,
    }
}

// Read-only: balances come from public JSON-RPC; no tokens, history or signing.
export const createSolanaAccountsAdapter = (
    ctx: ChainContext,
): AccountsChainAdapter => ({
    chainId: 'solana',
    fetchAccountState: async (address, scope) => {
        const { lamports, slot } = await readBalance(ctx, address, scope)
        return {
            nativeBalanceBaseUnits: lamports,
            chainState: { family: 'solana' },
            holdings: [
                {
                    assetId: solanaDescriptor.nativeAsset.ref.assetId,
                    amount: lamports,
                },
            ],
            observedRound: slot,
        }
    },
    toChainState: () => ({ family: 'solana' }),
    summarizeChainState: () => ({
        reserveBalance: new Decimal(0),
        heldTokenCount: 0,
    }),
    accountExists: async (address, scope) =>
        (await readBalance(ctx, address, scope)).lamports.gt(0),
    checkActivity: async (addresses, scope) =>
        new Map(
            await Promise.all(
                addresses.map(
                    async address =>
                        [
                            address,
                            (
                                await readBalance(ctx, address, scope)
                            ).lamports.gt(0),
                        ] as const,
                ),
            ),
        ),
    hdKeyPairId: (seedKeyId, { account, keyIndex }) =>
        `${seedKeyId}-sol-acc${account}-idx${keyIndex}`,
    assertHdPathMatches: () => undefined,
    localKeyKinds: [],
    kindIdOf: ({ custody }) => accountKindId(custody.kind),
    resolveSigner: account =>
        account.custody.kind === 'watch'
            ? { kind: 'watch', account }
            : { kind: 'ok', signer: account },
    getAuthAccount: account => account,
})
