import type {
  CantonLedgerApiRequest,
  CantonLedgerApiResult,
  CantonPrepareExecuteParams
} from '../misc/adapter'

const TRANSFER_FACTORY_INTERFACE_ID =
  '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory'
const DEFAULT_TRANSFER_INSTRUMENT_ID = 'Amulet'

export const DEFAULT_TRANSFER_AMOUNT = '1'
export const DEFAULT_TRANSFER_RECEIVER_PARTY_ID =
  'nightly::12201bfaf9c92404ae0832a5f47f2d8bfae0b1da65184953b1633394a65cff48b5cd'

interface IUtxoResponseEntry {
  contractId: string
  interfaceViewValue: {
    owner: string
    instrumentId: {
      admin: string
      id: string
    }
    amount: string
    lock: unknown | null
    meta: unknown
  }
}

interface ITokenFactoryResponse {
  factoryId: string
  choiceContext?: {
    disclosedContracts?: unknown[]
    choiceContextData?: Record<string, unknown>
  }
}

interface ITransferChoiceArguments {
  expectedAdmin: string
  transfer: {
    sender: string
    receiver: string
    amount: string
    instrumentId: {
      admin: string
      id: string
    }
    lock: null
    requestedAt: string
    executeBefore: string
    meta: {
      values: Record<string, unknown>
    }
    inputHoldingCids?: string[]
  }
  extraArgs: {
    context: {
      values: Record<string, unknown>
    }
    meta: {
      values: Record<string, unknown>
    }
  }
}

interface IDisclosedContract {
  templateId?: string
  contractId?: string
  createdEventBlob: string
  synchronizerId?: string
  [key: string]: unknown
}

interface IPrepareTransferCommandParams {
  ledgerApi: (params: CantonLedgerApiRequest) => Promise<CantonLedgerApiResult>
  partyId: string
  amount?: string
  receiverPartyId?: string
  instrumentId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const parseLedgerApiResponse = <T,>(response: string, errorMessage: string): T => {
  try {
    return JSON.parse(response) as T
  } catch {
    throw new Error(errorMessage)
  }
}

const normalizeDisclosedContracts = (value: unknown[] | undefined): IDisclosedContract[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(contract => {
    if (!isRecord(contract) || typeof contract.createdEventBlob !== 'string') {
      return []
    }

    const templateId = typeof contract.templateId === 'string' ? contract.templateId : undefined
    const contractId = typeof contract.contractId === 'string' ? contract.contractId : undefined
    const synchronizerId =
      typeof contract.synchronizerId === 'string' ? contract.synchronizerId : undefined

    return [
      {
        ...contract,
        ...(templateId ? { templateId } : {}),
        ...(contractId ? { contractId } : {}),
        createdEventBlob: contract.createdEventBlob,
        ...(synchronizerId ? { synchronizerId } : {})
      }
    ]
  })
}

const selectInstrumentInputs = ({
  utxos,
  amount,
  instrumentId
}: {
  utxos: IUtxoResponseEntry[]
  amount: number
  instrumentId: string
}): { instrumentAdmin: string; inputHoldingCids: string[] } => {
  const matchingUtxos = utxos.filter(
    utxo => utxo.interfaceViewValue.instrumentId.id === instrumentId
  )

  if (matchingUtxos.length === 0) {
    throw new Error(`No ${instrumentId} holdings available for transfer`)
  }

  const instrumentAdmin = matchingUtxos[0]?.interfaceViewValue.instrumentId.admin
  if (!instrumentAdmin) {
    throw new Error(`Unable to resolve ${instrumentId} instrument admin`)
  }

  const singleUtxo = matchingUtxos.find(utxo => {
    const numericAmount = Number(utxo.interfaceViewValue.amount)
    return Number.isFinite(numericAmount) && numericAmount >= amount
  })

  if (singleUtxo) {
    return {
      instrumentAdmin,
      inputHoldingCids: [singleUtxo.contractId]
    }
  }

  return {
    instrumentAdmin,
    inputHoldingCids: matchingUtxos.map(utxo => utxo.contractId)
  }
}

const buildTransferChoiceArguments = ({
  senderPartyId,
  receiverPartyId,
  amount,
  instrumentAdmin,
  instrumentId,
  inputHoldingCids
}: {
  senderPartyId: string
  receiverPartyId: string
  amount: string
  instrumentAdmin: string
  instrumentId: string
  inputHoldingCids?: string[]
}): ITransferChoiceArguments => {
  const nowIso = new Date().toISOString()
  const executeBefore = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const transfer: ITransferChoiceArguments['transfer'] = {
    sender: senderPartyId,
    receiver: receiverPartyId,
    amount,
    instrumentId: {
      admin: instrumentAdmin,
      id: instrumentId
    },
    lock: null,
    requestedAt: nowIso,
    executeBefore,
    meta: {
      values: {}
    },
    ...(inputHoldingCids && inputHoldingCids.length > 0 ? { inputHoldingCids } : {})
  }

  return {
    expectedAdmin: instrumentAdmin,
    transfer,
    extraArgs: {
      context: {
        values: {}
      },
      meta: {
        values: {}
      }
    }
  }
}

const mergeFactoryChoiceArgument = (
  choiceContextData: Record<string, unknown> | undefined,
  fallback: ITransferChoiceArguments
): Record<string, unknown> => {
  if (!choiceContextData) {
    return fallback as unknown as Record<string, unknown>
  }

  const normalized =
    isRecord(choiceContextData.values) && Object.keys(choiceContextData).length === 1
      ? choiceContextData.values
      : choiceContextData

  const mergedContext: Record<string, unknown> = {
    ...(fallback.extraArgs.context.values ?? {})
  }
  const mergedMeta: Record<string, unknown> = {
    ...(fallback.extraArgs.meta.values ?? {})
  }

  const topLevelContext = normalized.context
  if (isRecord(topLevelContext) && isRecord(topLevelContext.values)) {
    Object.assign(mergedContext, topLevelContext.values)
  }

  const topLevelMeta = normalized.meta
  if (isRecord(topLevelMeta) && isRecord(topLevelMeta.values)) {
    Object.assign(mergedMeta, topLevelMeta.values)
  }

  const extraArgs = normalized.extraArgs
  if (isRecord(extraArgs)) {
    const extraContext = extraArgs.context
    if (isRecord(extraContext) && isRecord(extraContext.values)) {
      Object.assign(mergedContext, extraContext.values)
    }

    const extraMeta = extraArgs.meta
    if (isRecord(extraMeta) && isRecord(extraMeta.values)) {
      Object.assign(mergedMeta, extraMeta.values)
    }
  }

  for (const [key, value] of Object.entries(normalized)) {
    if (
      key === 'expectedAdmin' ||
      key === 'transfer' ||
      key === 'context' ||
      key === 'meta' ||
      key === 'extraArgs'
    ) {
      continue
    }

    mergedContext[key] = value
  }

  const resolvedTransfer = isRecord(normalized.transfer)
    ? normalized.transfer
    : (fallback.transfer as unknown as Record<string, unknown>)

  return {
    expectedAdmin:
      typeof normalized.expectedAdmin === 'string'
        ? normalized.expectedAdmin
        : fallback.expectedAdmin,
    transfer: resolvedTransfer,
    extraArgs: {
      context: {
        values: mergedContext
      },
      meta: {
        values: mergedMeta
      }
    }
  }
}

const resolveTransferFactoryTemplateId = (
  factoryId: string,
  disclosedContracts: IDisclosedContract[]
): string => {
  for (const contract of disclosedContracts) {
    if (
      contract.contractId === factoryId &&
      typeof contract.templateId === 'string' &&
      contract.templateId.includes('TransferFactory')
    ) {
      return contract.templateId
    }
  }

  return TRANSFER_FACTORY_INTERFACE_ID
}

export const buildPrepareTransferExecuteParams = async ({
  ledgerApi,
  partyId,
  amount = DEFAULT_TRANSFER_AMOUNT,
  receiverPartyId = DEFAULT_TRANSFER_RECEIVER_PARTY_ID,
  instrumentId = DEFAULT_TRANSFER_INSTRUMENT_ID
}: IPrepareTransferCommandParams): Promise<CantonPrepareExecuteParams> => {
  const listUtxosResult = await ledgerApi({
    requestMethod: 'POST',
    resource: '/listUtxos',
    body: JSON.stringify({ includeLocked: false })
  })
  const utxos = parseLedgerApiResponse<IUtxoResponseEntry[]>(
    listUtxosResult.response,
    'Invalid /listUtxos response payload'
  )

  const { instrumentAdmin, inputHoldingCids } = selectInstrumentInputs({
    utxos,
    amount: Number(amount),
    instrumentId
  })

  const fallbackChoiceArguments = buildTransferChoiceArguments({
    senderPartyId: partyId,
    receiverPartyId,
    amount,
    instrumentAdmin,
    instrumentId,
    inputHoldingCids
  })

  const tokenFactoryResult = await ledgerApi({
    requestMethod: 'POST',
    resource: '/tokenFactory',
    body: JSON.stringify({
      choiceArguments: fallbackChoiceArguments
    })
  })

  const tokenFactory = parseLedgerApiResponse<ITokenFactoryResponse>(
    tokenFactoryResult.response,
    'Invalid /tokenFactory response payload'
  )

  const disclosedContracts = normalizeDisclosedContracts(tokenFactory.choiceContext?.disclosedContracts)

  const choiceArgument = mergeFactoryChoiceArgument(
    tokenFactory.choiceContext?.choiceContextData,
    fallbackChoiceArguments
  )

  const command = {
    ExerciseCommand: {
      templateId: resolveTransferFactoryTemplateId(tokenFactory.factoryId, disclosedContracts),
      contractId: tokenFactory.factoryId,
      choice: 'TransferFactory_Transfer',
      choiceArgument
    }
  }

  return {
    commands: command,
    disclosedContracts
  }
}
