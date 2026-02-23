import * as sdk from '@canton-network/dapp-sdk'
import type * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'

export type CantonConnectResult = dappAPI.ConnectResult
export type CantonStatusEvent = dappAPI.StatusEvent
export type CantonWalletAccount = dappAPI.Wallet
export type CantonTxChangedEvent = dappAPI.TxChangedEvent
export type CantonPrepareExecuteParams = dappAPI.PrepareExecuteParams
export type CantonPrepareExecuteResult = dappAPI.PrepareExecuteResult
export type CantonLedgerApiRequest = dappAPI.LedgerApiParams
export type CantonLedgerApiResult = dappAPI.LedgerApiResult

export interface CantonSignMessageRequest {
  message: string
}

export interface CantonSignMessageResult {
  signature: string
}

export type CantonProviderEventName = 'statusChanged' | 'accountsChanged' | 'txChanged'

export interface CantonProviderEventMap {
  statusChanged: dappAPI.StatusEvent
  accountsChanged: dappAPI.AccountsChangedEvent
  txChanged: dappAPI.TxChangedEvent
}

export type CantonProviderListener<E extends CantonProviderEventName> = (
  payload: CantonProviderEventMap[E]
) => void

export interface CantonProviderRequestArgs {
  method: string
  params?: unknown
}

type CantonProvider = {
  request: <T = unknown>(args: CantonProviderRequestArgs) => Promise<T>
  on?: <E extends CantonProviderEventName>(
    event: E,
    listener: CantonProviderListener<E>
  ) => CantonProvider
  removeListener?: <E extends CantonProviderEventName>(
    event: E,
    listener: CantonProviderListener<E>
  ) => CantonProvider
}

const getProvider = (): CantonProvider => {
  if (typeof window === 'undefined') {
    throw new Error('Canton provider is not available in a non-browser environment')
  }

  const provider = (window as unknown as { canton?: CantonProvider }).canton
  if (!provider) {
    throw new Error('Canton provider is not available on window.canton')
  }

  return provider
}

const request = async <T = unknown>(args: CantonProviderRequestArgs): Promise<T> => {
  const provider = getProvider()
  return provider.request<T>(args)
}

export const isProviderAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  return Boolean((window as unknown as { canton?: CantonProvider }).canton)
}

export const connect = async (): Promise<CantonConnectResult> => {
  return sdk.connect()
}

export const disconnect = async (): Promise<null> => {
  await sdk.disconnect()
  return null
}

export const status = async (): Promise<CantonStatusEvent> => {
  return sdk.status()
}

export const requestAccounts = async (): Promise<CantonWalletAccount[]> => {
  return sdk.requestAccounts()
}

export const prepareExecute = async (
  params: CantonPrepareExecuteParams
): Promise<CantonPrepareExecuteResult> => {
  return sdk.prepareExecute(params)
}

export const ledgerApi = async (params: CantonLedgerApiRequest): Promise<CantonLedgerApiResult> => {
  return sdk.ledgerApi(params)
}

export const open = async (): Promise<void> => {
  return sdk.open()
}

export const signMessage = async (
  params: CantonSignMessageRequest
): Promise<CantonSignMessageResult> => {
  return request<CantonSignMessageResult>({
    method: 'signMessage',
    params,
  })
}

export const on = <E extends CantonProviderEventName>(
  event: E,
  listener: CantonProviderListener<E>
): void => {
  const provider = getProvider()

  if (typeof provider.on !== 'function') {
    throw new Error('Canton provider does not support event listeners')
  }

  provider.on(event, listener)
}

export const removeListener = <E extends CantonProviderEventName>(
  event: E,
  listener: CantonProviderListener<E>
): void => {
  const provider = getProvider()
  provider.removeListener?.(event, listener)
}

const adapter = {
  connect,
  disconnect,
  status,
  requestAccounts,
  prepareExecute,
  ledgerApi,
  open,
  signMessage,
  on,
  removeListener,
  isProviderAvailable,
}

export default adapter
