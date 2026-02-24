/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react'
import { toast } from 'sonner'
import nacl from 'tweetnacl'
import adapter, {
  CantonProviderListener,
  CantonStatusEvent,
  CantonTxChangedEvent,
  CantonWalletAccount
} from '../misc/adapter'
import ActionStarryButton from './ActionStarryButton'
import StarryButton from './StarryButton'
import {
  DEFAULT_TRANSFER_AMOUNT,
  DEFAULT_TRANSFER_RECEIVER_PARTY_ID,
  buildPrepareTransferExecuteParams
} from '../utils/prepareTransferCommand'

const MESSAGE_TO_SIGN = 'SSBsb3ZlIE5pZ2h0bHk='
const fromBase64 = (b64: string): Uint8Array => {
  const binary = window.atob(b64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const verifySignature = (
  messageBase64: string,
  signatureBase64: string,
  publicKeyBase64: string
): boolean => {
  try {
    const messageBytes = fromBase64(messageBase64)
    const signatureBytes = fromBase64(signatureBase64)
    const publicKeyBytes = fromBase64(publicKeyBase64)

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

const getPrimaryAccount = (accounts: CantonWalletAccount[]): CantonWalletAccount | null => {
  return accounts.find(account => account.primary) ?? accounts[0] ?? null
}

const isExecutedEvent = (
  event: CantonTxChangedEvent
): event is Extract<CantonTxChangedEvent, { status: 'executed' }> => {
  return event.status === 'executed'
}

const getConnected = (status?: CantonStatusEvent | null): boolean => Boolean(status?.isConnected)

const getNetworkConnected = (status?: CantonStatusEvent | null): boolean =>
  Boolean(status?.isNetworkConnected)

const getNetworkId = (status?: CantonStatusEvent | null): string | undefined => status?.networkId
const getGatewayId = (status?: CantonStatusEvent | null): string | undefined => status?.kernel?.id

const StickyHeader: React.FC = () => {
  const [status, setStatus] = React.useState<CantonStatusEvent | null>(null)
  const [accounts, setAccounts] = React.useState<CantonWalletAccount[]>([])
  const [primaryAccount, setPrimaryAccount] = React.useState<CantonWalletAccount | null>(null)
  const [ledgerApiVersion, setLedgerApiVersion] = React.useState<string | undefined>()
  const [queryResponse, setQueryResponse] = React.useState<Record<string, unknown> | null>(null)
  const [txEvents, setTxEvents] = React.useState<CantonTxChangedEvent[]>([])

  const connected = getConnected(status)

  const refreshStatus = async (): Promise<CantonStatusEvent | null> => {
    try {
      const nextStatus = await adapter.status()
      setStatus(nextStatus)
      return nextStatus
    } catch (error) {
      console.warn('Could not load status:', error)
      return null
    }
  }

  const refreshAccounts = async (): Promise<CantonWalletAccount[]> => {
    const nextAccounts = await adapter.requestAccounts()
    setAccounts(nextAccounts)

    const primary = getPrimaryAccount(nextAccounts)
    setPrimaryAccount(primary)

    return nextAccounts
  }

  const refreshLedgerApiVersion = async (): Promise<string | undefined> => {
    try {
      const result = await adapter.ledgerApi({
        requestMethod: 'GET',
        resource: '/v2/version'
      })

      const parsed = JSON.parse(result.response) as { version?: string }
      const version = parsed.version
      setLedgerApiVersion(version)
      return version
    } catch (error) {
      console.warn('Could not fetch ledger API version:', error)
      setLedgerApiVersion(undefined)
      return undefined
    }
  }

  const refreshSessionData = async (): Promise<void> => {
    const nextStatus = await refreshStatus()

    if (!getConnected(nextStatus)) {
      setAccounts([])
      setPrimaryAccount(null)
      setLedgerApiVersion(undefined)
      return
    }

    await refreshAccounts()

    if (getNetworkConnected(nextStatus)) {
      await refreshLedgerApiVersion()
    } else {
      setLedgerApiVersion(undefined)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await refreshSessionData()

      if (!adapter.isProviderAvailable()) {
        return
      }

      const onTxChanged: CantonProviderListener<'txChanged'> = event => {
        setTxEvents(previous => [event, ...previous].slice(0, 8))
      }

      const onAccountsChanged: CantonProviderListener<'accountsChanged'> = nextAccounts => {
        setAccounts(nextAccounts)
        const nextPrimary = getPrimaryAccount(nextAccounts)
        setPrimaryAccount(nextPrimary)
      }

      const onStatusChanged: CantonProviderListener<'statusChanged'> = nextStatus => {
        setStatus(nextStatus)
        if (!getConnected(nextStatus)) {
          setLedgerApiVersion(undefined)
          return
        }

        if (getNetworkConnected(nextStatus)) {
          void refreshLedgerApiVersion()
        }
      }

      adapter.on('txChanged', onTxChanged)
      adapter.on('accountsChanged', onAccountsChanged)
      adapter.on('statusChanged', onStatusChanged)

      return () => {
        adapter.removeListener('txChanged', onTxChanged)
        adapter.removeListener('accountsChanged', onAccountsChanged)
        adapter.removeListener('statusChanged', onStatusChanged)
      }
    }

    let cleanup: (() => void) | undefined

    void initialize().then(fn => {
      cleanup = fn
    })

    return () => {
      cleanup?.()
    }
  }, [])

  const handleConnect = async (): Promise<void> => {
    const connectedResult = await adapter.connect()
    setStatus(connectedResult.status)
    await refreshSessionData()
  }

  const handleDisconnect = async (): Promise<void> => {
    await adapter.disconnect()
    setStatus(null)
    setAccounts([])
    setPrimaryAccount(null)
    setLedgerApiVersion(undefined)
    setQueryResponse(null)
    setTxEvents([])
  }

  const handleSignMessage = async (): Promise<void> => {
    const signature = await adapter.signMessage({ message: MESSAGE_TO_SIGN })
    const publicKey = primaryAccount?.publicKey

    if (!publicKey) {
      toast.success('Message signed', {
        description: `Signature: ${signature.signature.substring(0, 20)}...`
      })
      return
    }

    const isValid = verifySignature(MESSAGE_TO_SIGN, signature.signature, publicKey)
    if (isValid) {
      toast.success('Message signed & verified!', {
        description: `Signature: ${signature.signature.substring(0, 20)}...`
      })
      return
    }

    toast.warning('Message signed but verification failed!', {
      description: `Signature: ${signature.signature.substring(0, 20)}...`
    })
  }

  const handlePrepareTransfer = async (): Promise<void> => {
    const partyId = primaryAccount?.partyId

    if (!partyId) {
      throw new Error('No primary party selected')
    }

    const params = await buildPrepareTransferExecuteParams({
      ledgerApi: request => adapter.ledgerApi(request),
      partyId,
      amount: DEFAULT_TRANSFER_AMOUNT,
      receiverPartyId: DEFAULT_TRANSFER_RECEIVER_PARTY_ID
    })

    await adapter.prepareExecute(params)
  }

  const handleQueryVersion = async (): Promise<void> => {
    const result = await adapter.ledgerApi({
      requestMethod: 'GET',
      resource: '/v2/version'
    })

    const parsed = JSON.parse(result.response) as Record<string, unknown>
    setQueryResponse(parsed)
  }

  return (
    <header className='relative md:fixed top-0 left-0 w-full bg-opacity-50 p-6 z-50 pb-28 md:pb-6'>
      <div className='flex items-start justify-between'>
        <div>{/* Logo placeholder */}</div>

        <div className='flex flex-col space-y-4'>
          <StarryButton
            connected={connected}
            onConnect={async () => {
              try {
                await handleConnect()
              } catch (error) {
                console.error('Connection error:', error)
                const details =
                  typeof error === 'object' &&
                  error !== null &&
                  'details' in error &&
                  typeof error.details === 'string'
                    ? error.details
                    : error instanceof Error
                      ? error.message
                      : String(error)
                toast.error(details)
              }
            }}
            onDisconnect={async () => {
              try {
                await handleDisconnect()
              } catch (error) {
                console.error('Disconnect error:', error)
              }
            }}
            publicKey={primaryAccount?.partyId}
          />

          {connected && (
            <>
              <ActionStarryButton
                onClick={async () => {
                  toast.promise(handleSignMessage(), {
                    loading: 'Signing message...',
                    success: 'Message signed!',
                    error: 'Signing failed'
                  })
                }}
                name='Sign Message'
              />

              <ActionStarryButton
                onClick={async () => {
                  toast.promise(handlePrepareTransfer(), {
                    loading: 'Preparing transfer command...',
                    success: 'Transfer command submitted',
                    error: 'Failed to prepare transfer command'
                  })
                }}
                name='Prepare Transfer (commands)'
              />

              <ActionStarryButton
                onClick={async () => {
                  await refreshSessionData()
                  toast.success('Status refreshed')
                }}
                name='Refresh Status'
              />

              <ActionStarryButton
                onClick={async () => {
                  toast.promise(handleQueryVersion(), {
                    loading: 'Querying version...',
                    success: 'Version loaded',
                    error: 'Failed to query version'
                  })
                }}
                name='Query Version'
              />

              <div className='bg-black bg-opacity-80 rounded-lg p-3 max-w-[360px] text-xs text-white space-y-1'>
                <div>
                  <span className='font-semibold'>Gateway:</span>{' '}
                  {getGatewayId(status) || 'unknown'}
                </div>
                <div>
                  <span className='font-semibold'>Connected:</span>{' '}
                  {getConnected(status) ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className='font-semibold'>Network connected:</span>{' '}
                  {getNetworkConnected(status) ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className='font-semibold'>Network:</span>{' '}
                  {getNetworkId(status) || 'unknown'}
                </div>
                <div>
                  <span className='font-semibold'>Primary party:</span>{' '}
                  {primaryAccount?.partyId || 'not selected'}
                </div>
                <div>
                  <span className='font-semibold'>Accounts:</span> {accounts.length}
                </div>
                <div>
                  <span className='font-semibold'>Ledger API version:</span>{' '}
                  {ledgerApiVersion || 'unknown'}
                </div>
              </div>

              {queryResponse && (
                <div className='bg-black bg-opacity-80 rounded-lg p-3 max-w-[360px]'>
                  <div className='text-white text-sm font-semibold mb-2'>Ledger API Response</div>
                  <pre className='text-xs text-green-300 overflow-x-auto whitespace-pre-wrap'>
                    {JSON.stringify(queryResponse, null, 2)}
                  </pre>
                </div>
              )}

              <div className='bg-black bg-opacity-80 rounded-lg p-3 max-w-[360px]'>
                <div className='text-white text-sm font-semibold mb-2'>
                  Recent txChanged events ({txEvents.length})
                </div>
                {txEvents.length === 0 ? (
                  <div className='text-xs text-gray-300'>No events yet</div>
                ) : (
                  <div className='space-y-2 max-h-[220px] overflow-y-auto'>
                    {txEvents.map((event, index) => (
                      <div key={index} className='bg-gray-800 rounded p-2'>
                        <div className='text-xs text-white'>
                          <span className='font-semibold'>Status:</span> {event.status}
                        </div>
                        <div className='text-xs text-gray-300'>
                          <span className='font-semibold'>Command:</span> {event.commandId}
                        </div>
                        {isExecutedEvent(event) && (
                          <div className='text-xs text-green-300'>
                            <span className='font-semibold'>Update ID:</span>{' '}
                            {event.payload.updateId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default StickyHeader
