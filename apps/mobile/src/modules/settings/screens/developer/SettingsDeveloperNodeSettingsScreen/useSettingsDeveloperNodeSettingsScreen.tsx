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

import { useCallback, useMemo } from 'react'
import { getSyncService } from '@perawallet/wallet-core-background'
import {
    CUSTOM_NETWORK_ID,
    type ChainId,
    type NetworkId,
} from '@perawallet/wallet-core-chain-contract'
import {
    getChainDescriptor,
    nodeEndpointAdapters,
    selectChainNetworkId,
    selectEndpointOverride,
    useAnyEnabledChainHasCapability,
    useNetworkStore,
    useWalletDeployment,
} from '@perawallet/wallet-core-chain-shared'
import { getProvider } from '@perawallet/wallet-extension-provider'
import type { Optional } from '@perawallet/wallet-core-shared'
import { useLanguage } from '@hooks/useLanguage'
import { useBottomSheet } from '@modules/bottom-sheet'
import { chainUiFor } from '@modules/chain-ui'
import { EndpointOverrideSheet } from './EndpointOverrideSheet'
import { endpointHostOf } from './endpointHostOf'
import { isCustomNetworkOffered } from './isCustomNetworkOffered'

export type NodeSettingsNetworkRow = {
    networkId: NetworkId
    label: string
    isDefault: boolean
    isSelected: boolean
    /** Host only, so a provider key in the URL's path never shows. */
    endpointHost: Optional<string>
    isEndpointOverridden: boolean
    canOverrideEndpoint: boolean
}

export type NodeSettingsChainSection = {
    chainId: ChainId
    chainName: string
    /** Algorand and Solana share one TestNet/BetaNet/Custom choice; other chains list their own. */
    isShared: boolean
    networks: NodeSettingsNetworkRow[]
}

type UseSettingsDeveloperNodeSettingsScreenResult = {
    isDeveloperMode: boolean
    setDeveloperMode: (isEnabled: boolean) => void
    /** Empty in live mode, where every chain is on its main network. */
    chainSections: NodeSettingsChainSection[]
    /** One list shared by every chain: the first chain's networks, which each other chain maps onto. */
    networkRows: NodeSettingsNetworkRow[]
    primaryChainId: Optional<ChainId>
    otherChainSections: NodeSettingsChainSection[]
    selectNetwork: (networkId: NetworkId) => Promise<void>
    selectChainNetwork: (
        chainId: ChainId,
        networkId: NetworkId,
    ) => Promise<void>
    openEndpointOverride: (
        chainId: ChainId,
        networkId: NetworkId,
    ) => Promise<void>
}

const restartSync = () => {
    try {
        // Invalidation is owned by the shell's network effect;
        // calling it here too would double-refetch every query.
        getSyncService().restart()
    } catch {
        // SyncService not yet initialized
    }
}

export const useSettingsDeveloperNodeSettingsScreen =
    (): UseSettingsDeveloperNodeSettingsScreenResult => {
        const { t } = useLanguage()
        const { request } = useBottomSheet()
        const mode = useWalletDeployment()
        const selectedNetworkByChain = useNetworkStore(
            state => state.selectedNetworkByChain,
        )
        const customNetworksByChain = useNetworkStore(
            state => state.customNetworksByChain,
        )
        const endpointOverridesByChain = useNetworkStore(
            state => state.endpointOverridesByChain,
        )
        const setMode = useNetworkStore(state => state.setMode)
        const selectNetworkInStore = useNetworkStore(
            state => state.selectNetwork,
        )
        const hasCustomNetworks =
            useAnyEnabledChainHasCapability('customNetworks')
        const isDeveloperMode = mode === 'developer'

        const chainSections = useMemo<NodeSettingsChainSection[]>(() => {
            if (!isDeveloperMode) {
                return []
            }
            const { chains } = getProvider()
            const selection = {
                mode,
                selectedNetworkByChain,
                customNetworksByChain,
            }
            return chains.list().map(descriptor => {
                const selectedId = selectChainNetworkId(
                    selection,
                    descriptor.id,
                )
                const endpoints = nodeEndpointAdapters.has(descriptor.id)
                    ? nodeEndpointAdapters.get(descriptor.id)
                    : undefined
                const endpointFieldsOf = (networkId: NetworkId) => {
                    const url = endpoints?.endpointUrl(networkId)
                    return {
                        endpointHost: endpointHostOf(url),
                        isEndpointOverridden:
                            selectEndpointOverride(
                                { endpointOverridesByChain },
                                descriptor.id,
                                networkId,
                            ) !== undefined,
                        canOverrideEndpoint:
                            endpoints?.checkOverride !== undefined &&
                            url !== undefined,
                    }
                }
                const networks = descriptor.networks
                    .filter(
                        network =>
                            network.tier === 'testnet' &&
                            network.status === 'active',
                    )
                    .map<NodeSettingsNetworkRow>(network => ({
                        networkId: network.id,
                        label: network.isDefaultForTier
                            ? t(
                                  'settings.developer.node_settings.default_network_label',
                                  { network: network.displayName },
                              )
                            : network.displayName,
                        isDefault: network.isDefaultForTier,
                        isSelected: network.id === selectedId,
                        ...endpointFieldsOf(network.id),
                    }))
                if (
                    hasCustomNetworks &&
                    chains.capabilities(descriptor.id).customNetworks &&
                    chainUiFor(descriptor.family, descriptor.id).customNode &&
                    isCustomNetworkOffered()
                ) {
                    networks.push({
                        networkId: CUSTOM_NETWORK_ID,
                        label: t(
                            'settings.developer.node_settings.custom_label',
                        ),
                        isDefault: false,
                        isSelected: selectedId === CUSTOM_NETWORK_ID,
                        ...endpointFieldsOf(CUSTOM_NETWORK_ID),
                        canOverrideEndpoint: false,
                    })
                }
                return {
                    chainId: descriptor.id,
                    chainName: descriptor.displayName,
                    isShared:
                        descriptor.family === 'algorand' ||
                        descriptor.family === 'solana',
                    networks,
                }
            })
        }, [
            isDeveloperMode,
            mode,
            selectedNetworkByChain,
            customNetworksByChain,
            endpointOverridesByChain,
            hasCustomNetworks,
            t,
        ])

        const sharedSections = useMemo(
            () => chainSections.filter(section => section.isShared),
            [chainSections],
        )
        // The shared list spans chains, so one chain's node host would mislead.
        const networkRows = useMemo(
            () =>
                (sharedSections[0]?.networks ?? []).map(row => ({
                    ...row,
                    endpointHost: undefined,
                })),
            [sharedSections],
        )
        const otherChainSections = useMemo(
            () => chainSections.filter(section => !section.isShared),
            [chainSections],
        )

        const setDeveloperMode = useCallback(
            (isEnabled: boolean) => {
                setMode(isEnabled ? 'developer' : 'live')
                restartSync()
            },
            [setMode],
        )

        const selectChainNetwork = useCallback(
            async (chainId: ChainId, networkId: NetworkId) => {
                // Custom has no baked endpoints: the chain's form is the only
                // path that commits it.
                if (networkId === CUSTOM_NETWORK_ID) {
                    const CustomNodeForm = chainUiFor(
                        getChainDescriptor(chainId).family,
                        chainId,
                    ).customNode?.Form
                    if (CustomNodeForm) {
                        await request({
                            contents: <CustomNodeForm chainId={chainId} />,
                            options: {
                                size: 'modal',
                                autoCreateContainer: false,
                            },
                        })
                    }
                    return
                }

                selectNetworkInStore(chainId, networkId)
                restartSync()
            },
            [request, selectNetworkInStore],
        )

        // A shared chain without the chosen network stays on its default test
        // network (Solana keeps Devnet while Algorand is on BetaNet).
        const selectNetwork = useCallback(
            async (networkId: NetworkId) => {
                const customChainId =
                    networkId === CUSTOM_NETWORK_ID
                        ? sharedSections.find(section =>
                              section.networks.some(
                                  row => row.networkId === CUSTOM_NETWORK_ID,
                              ),
                          )?.chainId
                        : undefined
                if (networkId === CUSTOM_NETWORK_ID) {
                    if (customChainId !== undefined) {
                        await selectChainNetwork(customChainId, networkId)
                    }
                    return
                }

                for (const section of sharedSections) {
                    const target = section.networks.some(
                        row => row.networkId === networkId,
                    )
                        ? networkId
                        : section.networks.find(row => row.isDefault)?.networkId
                    if (target !== undefined) {
                        selectNetworkInStore(section.chainId, target)
                    }
                }
                restartSync()
            },
            [sharedSections, selectChainNetwork, selectNetworkInStore],
        )

        const openEndpointOverride = useCallback(
            async (chainId: ChainId, networkId: NetworkId) => {
                await request({
                    contents: (
                        <EndpointOverrideSheet
                            chainId={chainId}
                            networkId={networkId}
                        />
                    ),
                    options: { size: 'modal', autoCreateContainer: false },
                })
            },
            [request],
        )

        return {
            isDeveloperMode,
            setDeveloperMode,
            chainSections,
            networkRows,
            primaryChainId: sharedSections[0]?.chainId,
            otherChainSections,
            selectNetwork,
            selectChainNetwork,
            openEndpointOverride,
        }
    }
