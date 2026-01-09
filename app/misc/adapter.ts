/**
 * Canton Wallet Adapter
 *
 * This adapter provides integration with Nightly Wallet for Canton network.
 * The wallet is available at window.nightly.canton
 */

// Types based on Zoro SDK documentation
export enum SignRequestResponseType {
  SIGN_REQUEST_APPROVED = "sign_request_approved",
  SIGN_REQUEST_REJECTED = "sign_request_rejected",
  SIGN_REQUEST_ERROR = "sign_request_error",
}

export interface Instrument {
  id: string;
  admin: string;
}

export interface CreateTransferCommandParams {
  receiverPartyId: string;
  amount: string;
  instrument: Instrument;
  memo?: string;
  expiryDate?: string;
}

export interface CreateTransactionChoiceCommandParams {
  transferContractId: string;
  choice: "Accept" | "Reject" | "Withdraw";
  instrument: Instrument;
}

export interface TransactionCommand {
  command: any;
  disclosedContracts: any[];
}

export interface SignRequestApprovedResponse {
  signature?: string;
  updateId?: string;
}

export interface SignRequestRejectedResponse {
  reason: string;
}

export interface SignRequestErrorResponse {
  error: string;
}

export interface SignRequestResponse {
  type: SignRequestResponseType;
  data:
    | SignRequestApprovedResponse
    | SignRequestRejectedResponse
    | SignRequestErrorResponse;
}

export interface CantonWallet {
  partyId: string;
  publicKey: string;
  authToken: string;
  getHoldingTransactions: () => Promise<{
    transactions: any[];
    nextOffset: string | null;
  }>;
  getPendingTransactions: () => Promise<
    Array<{
      contractId: string;
      instrumentId: Instrument;
      type: "sender" | "receiver";
    }>
  >;
  getHoldingUtxos: () => Promise<any[]>;
  getActiveContractsByInterfaceId: (interfaceId: string) => Promise<any[]>;
  getActiveContractsByTemplateId: (templateId: string) => Promise<any[]>;
  signMessage: (
    message: string,
    onResponse: (response: SignRequestResponse) => void
  ) => void;
  createTransferCommand: (
    params: CreateTransferCommandParams
  ) => Promise<TransactionCommand>;
  createTransactionChoiceCommand: (
    params: CreateTransactionChoiceCommandParams
  ) => Promise<TransactionCommand>;
  submitTransactionCommand: (
    transactionCommand: TransactionCommand,
    onResponse: (response: SignRequestResponse) => void
  ) => void;
}

// Nightly Canton wallet interface
interface NightlyCantonProvider extends CantonWallet {
  connect: () => Promise<{
    partyId: string;
    publicKey: string;
    authToken: string;
  }>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
}

// Declare Nightly wallet on window
declare global {
  interface Window {
    nightly?: {
      canton?: NightlyCantonProvider;
    };
  }
}

// State
let _wallet: CantonWallet | null = null;
let _onAcceptCallback: ((wallet: CantonWallet) => void) | null = null;
let _onRejectCallback: (() => void) | null = null;
let _onDisconnectCallback: (() => void) | null = null;

/**
 * Check if Nightly Canton wallet is available
 */
export const isNightlyAvailable = (): boolean => {
  return typeof window !== "undefined" && !!window.nightly?.canton;
};

/**
 * Initialize the Canton adapter
 */
export const init = (options: {
  appName: string;
  iconUrl?: string;
  network?: "mainnet" | "local";
  onAccept?: (wallet: CantonWallet) => void;
  onReject?: () => void;
  onDisconnect?: () => void;
}) => {
  _onAcceptCallback = options.onAccept || null;
  _onRejectCallback = options.onReject || null;
  _onDisconnectCallback = options.onDisconnect || null;
};

/**
 * Connect to Canton wallet via Nightly
 */
export const connect = async (): Promise<CantonWallet | null> => {
  if (!isNightlyAvailable()) {
    console.error(
      "Nightly Canton wallet is not available. Please install Nightly wallet extension."
    );
    if (_onRejectCallback) {
      _onRejectCallback();
    }
    return null;
  }

  try {
    await window.nightly!.canton!.connect();
    const wallet = await window.nightly!.canton!;
    _wallet = wallet;
    if (_onAcceptCallback) {
      _onAcceptCallback(wallet);
    }
    return wallet;
  } catch (error) {
    console.error("Failed to connect to Nightly Canton wallet:", error);
    if (_onRejectCallback) {
      _onRejectCallback();
    }
    return null;
  }
};

/**
 * Disconnect from Canton wallet
 */
export const disconnect = async (): Promise<void> => {
  if (!isNightlyAvailable()) {
    _wallet = null;
    return;
  }

  try {
    await window.nightly!.canton!.disconnect();
  } catch (error) {
    console.error("Failed to disconnect from Nightly Canton wallet:", error);
  }

  _wallet = null;

  if (_onDisconnectCallback) {
    _onDisconnectCallback();
  }
};

/**
 * Get current connected wallet
 */
export const getWallet = (): CantonWallet | null => {
  return _wallet;
};

/**
 * Check if wallet can eager connect (for session restoration)
 */
export const canEagerConnect = (): boolean => {
  if (!isNightlyAvailable()) {
    return false;
  }

  // Check if isConnected method exists
  if (typeof window.nightly?.canton?.isConnected === "function") {
    return window.nightly.canton.isConnected();
  }

  return false;
};

/**
 * Try to restore previous session
 */
export const eagerConnect = async (): Promise<CantonWallet | null> => {
  if (!canEagerConnect()) {
    return null;
  }

  return connect();
};

/**
 * Sign a message using the connected wallet
 */
export const signMessage = (
  message: string,
  onResponse: (response: SignRequestResponse) => void
): void => {
  if (!_wallet) {
    onResponse({
      type: SignRequestResponseType.SIGN_REQUEST_ERROR,
      data: { error: "No wallet connected" },
    });
    return;
  }

  _wallet.signMessage(message, onResponse);
};

/**
 * Create a transfer command
 */
export const createTransferCommand = async (
  params: CreateTransferCommandParams
): Promise<TransactionCommand | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.createTransferCommand(params);
};

/**
 * Create a transaction choice command
 */
export const createTransactionChoiceCommand = async (
  params: CreateTransactionChoiceCommandParams
): Promise<TransactionCommand | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.createTransactionChoiceCommand(params);
};

/**
 * Submit a transaction command
 */
export const submitTransactionCommand = (
  transactionCommand: TransactionCommand,
  onResponse: (response: SignRequestResponse) => void
): void => {
  if (!_wallet) {
    onResponse({
      type: SignRequestResponseType.SIGN_REQUEST_ERROR,
      data: { error: "No wallet connected" },
    });
    return;
  }

  _wallet.submitTransactionCommand(transactionCommand, onResponse);
};

/**
 * Get holding transactions
 */
export const getHoldingTransactions = async (): Promise<{
  transactions: any[];
  nextOffset: string | null;
} | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.getHoldingTransactions();
};

/**
 * Get pending transactions
 */
export const getPendingTransactions = async (): Promise<any[] | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.getPendingTransactions();
};

/**
 * Get holding UTXOs
 */
export const getHoldingUtxos = async (): Promise<any[] | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.getHoldingUtxos();
};

/**
 * Get active contracts by interface ID
 */
export const getActiveContractsByInterfaceId = async (
  interfaceId: string
): Promise<any[] | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.getActiveContractsByInterfaceId(interfaceId);
};

/**
 * Get active contracts by template ID
 */
export const getActiveContractsByTemplateId = async (
  templateId: string
): Promise<any[] | null> => {
  if (!_wallet) {
    throw new Error("No wallet connected");
  }

  return _wallet.getActiveContractsByTemplateId(templateId);
};

// Export default adapter interface
const adapter = {
  init,
  connect,
  disconnect,
  getWallet,
  canEagerConnect,
  eagerConnect,
  signMessage,
  createTransferCommand,
  createTransactionChoiceCommand,
  submitTransactionCommand,
  getHoldingTransactions,
  getPendingTransactions,
  getHoldingUtxos,
  getActiveContractsByInterfaceId,
  getActiveContractsByTemplateId,
  isNightlyAvailable,
};

export default adapter;
