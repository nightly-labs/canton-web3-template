/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import nacl from "tweetnacl";
import adapter, {
  type CantonWallet,
  SignRequestResponseType,
  type SignRequestResponse,
  Instrument,
} from "../misc/adapter";
import ActionStarryButton from "./ActionStarryButton";
import StarryButton from "./StarryButton";

const MESSAGE_TO_SIGN = Buffer.from("I love Nightly", "utf-8").toString(
  "base64",
);

// Helper functions for base64 encoding/decoding
const fromBase64 = (b64: string): Uint8Array => {
  return Uint8Array.from(Buffer.from(b64, "base64"));
};

const verifySignature = (
  message: string,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean => {
  try {
    const messageBytes = Uint8Array.from(Buffer.from(message, "base64"));
    const signatureBytes = fromBase64(signatureBase64);
    const publicKeyBytes = fromBase64(publicKeyBase64);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

// Default instrument for Canton
const DEFAULT_INSTRUMENT = {
  id: "Amulet",
  admin:
    "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
};

const StickyHeader: React.FC = () => {
  const [wallet, setWallet] = React.useState<CantonWallet | null>(null);
  const [walletAddress, setWalletAddress] = React.useState<
    string | undefined
  >();
  const [pendingTransactions, setPendingTransactions] = React.useState<
    Array<{
      contractId: string;
      instrumentId: Instrument;
      type: "sender" | "receiver";
    }>
  >([]);
  const [transferAmount, setTransferAmount] = React.useState<string>("");
  const [transferAddress, setTransferAddress] = React.useState<string>(
    "nightly::12201bfaf9c92404ae0832a5f47f2d8bfae0b1da65184953b1633394a65cff48b5cd",
  );

  const fetchPendingTransactions = async () => {
    try {
      const result = await adapter.getPendingTransactions();
      console.log(result);
      if (result) {
        setPendingTransactions(result);
      }
    } catch (error) {
      console.error("Failed to fetch pending transactions:", error);
    }
  };

  const filteredPendingTransactions = useMemo(() => {
    return pendingTransactions.filter((tx) => tx.type === "receiver");
  }, [pendingTransactions]);

  useEffect(() => {
    // Initialize the adapter
    adapter.init({
      appName: "Canton Template",
      iconUrl: "https://docs.nightly.app/img/logo.png",
      network: "mainnet",
      onAccept: (connectedWallet) => {
        setWallet(connectedWallet);
        const address =
          connectedWallet.partyId || connectedWallet.publicKey || "Connected";
        setWalletAddress(address);
      },
      onReject: () => {
        console.log("Connection rejected");
        toast.error("Connection rejected or Nightly wallet not available");
      },
      onDisconnect: () => {
        setWallet(null);
        setWalletAddress(undefined);
        setPendingTransactions([]);
      },
    });

    const init = async () => {
      if (adapter.canEagerConnect()) {
        try {
          await adapter.eagerConnect();
        } catch (error) {
          console.log("Eager connect failed:", error);
          await adapter.disconnect().catch(() => {});
        }
      }
    };
    init();
  }, []);

  // Fetch pending transactions when wallet connects
  useEffect(() => {
    if (wallet) {
      fetchPendingTransactions();
    }
  }, [wallet]);

  const handleTransactionChoice = async (
    contractId: string,
    choice: "Accept" | "Reject",
    instrumentId: Instrument = DEFAULT_INSTRUMENT,
  ) => {
    try {
      const choiceCommand = await adapter.createTransactionChoiceCommand({
        transferContractId: contractId,
        choice,
        instrument: instrumentId,
      });

      if (!choiceCommand) {
        throw new Error("Failed to create choice command");
      }

      return new Promise<void>((resolve, reject) => {
        adapter.submitTransactionCommand(
          choiceCommand,
          (response: SignRequestResponse) => {
            if (
              response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED
            ) {
              const data = response.data as { updateId?: string };
              toast.success(`Transaction ${choice.toLowerCase()}ed!`, {
                description: `Update ID: ${data.updateId}`,
              });
              fetchPendingTransactions();
              resolve();
            } else if (
              response.type === SignRequestResponseType.SIGN_REQUEST_REJECTED
            ) {
              const data = response.data as { reason: string };
              reject(new Error(data.reason));
            } else {
              const data = response.data as { error: string };
              reject(new Error(data.error));
            }
          },
        );
      });
    } catch (error) {
      console.error(`Failed to ${choice.toLowerCase()} transaction:`, error);
      toast.error(`Failed to ${choice.toLowerCase()} transaction`);
    }
  };

  const handleSendTransfer = async () => {
    if (!transferAmount || !transferAddress) {
      toast.error("Please enter amount and address");
      return;
    }

    try {
      const transferCommand = await adapter.createTransferCommand({
        receiverPartyId: transferAddress,
        amount: transferAmount,
        instrument: DEFAULT_INSTRUMENT,
        memo: "Transfer from Canton Template",
      });
      console.log(transferCommand);
      if (!transferCommand) {
        throw new Error("Failed to create transfer command");
      }

      return new Promise<void>((resolve, reject) => {
        adapter.submitTransactionCommand(
          transferCommand,
          (response: SignRequestResponse) => {
            if (
              response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED
            ) {
              const data = response.data as { updateId?: string };
              toast.success("Transfer sent!", {
                description: `Update ID: ${data.updateId}`,
              });
              setTransferAmount("");
              resolve();
            } else if (
              response.type === SignRequestResponseType.SIGN_REQUEST_REJECTED
            ) {
              const data = response.data as { reason: string };
              reject(new Error(data.reason));
            } else {
              const data = response.data as { error: string };
              reject(new Error(data.error));
            }
          },
        );
      });
    } catch (error) {
      console.error("Failed to send transfer:", error);
      toast.error("Failed to send transfer");
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-opacity-50 p-6 z-50">
      <div className="flex items-center justify-between">
        <div>{/* Logo placeholder */}</div>
        <div className="flex flex-col space-y-4">
          <StarryButton
            connected={wallet !== null}
            onConnect={async () => {
              try {
                await adapter.connect();
              } catch (error) {
                console.error("Connection error:", error);
                await adapter.disconnect().catch(() => {});
              }
            }}
            onDisconnect={async () => {
              try {
                await adapter.disconnect();
              } catch (error) {
                console.log(error);
              }
            }}
            publicKey={walletAddress}
          />
          {wallet && (
            <>
              <ActionStarryButton
                onClick={async () => {
                  const signMessage = () => {
                    return new Promise<void>((resolve, reject) => {
                      adapter.signMessage(
                        MESSAGE_TO_SIGN,
                        (response: SignRequestResponse) => {
                          if (
                            response.type ===
                            SignRequestResponseType.SIGN_REQUEST_APPROVED
                          ) {
                            const data = response.data as {
                              signature?: string;
                            };
                            console.log("Signature:", data.signature);

                            const publicKey = wallet?.publicKey;

                            if (data.signature && publicKey) {
                              const isValid = verifySignature(
                                MESSAGE_TO_SIGN,
                                data.signature,
                                publicKey,
                              );

                              console.log("Signature valid:", isValid);

                              if (isValid) {
                                toast.success("Message signed & verified!", {
                                  description: `Signature: ${data.signature.substring(
                                    0,
                                    20,
                                  )}...`,
                                });
                              } else {
                                toast.warning(
                                  "Message signed but verification failed!",
                                  {
                                    description: `Signature: ${data.signature.substring(
                                      0,
                                      20,
                                    )}...`,
                                  },
                                );
                              }
                            } else {
                              toast.success("Message signed!", {
                                description: `Signature: ${data.signature?.substring(
                                  0,
                                  20,
                                )}...`,
                              });
                            }
                            resolve();
                          } else if (
                            response.type ===
                            SignRequestResponseType.SIGN_REQUEST_REJECTED
                          ) {
                            const data = response.data as { reason: string };
                            console.log("Rejected:", data.reason);
                            reject(new Error(data.reason));
                          } else {
                            const data = response.data as { error: string };
                            console.log("Error:", data.error);
                            reject(new Error(data.error));
                          }
                        },
                      );
                    });
                  };
                  toast.promise(signMessage, {
                    loading: "Signing message...",
                    success: (_) => {
                      return `Message signed!`;
                    },
                    error: "Operation has been rejected!",
                  });
                }}
                name="Sign Message"
              />

              <ActionStarryButton
                onClick={fetchPendingTransactions}
                name="Refresh Pending"
              />

              {/* Pending Transactions List */}
              {filteredPendingTransactions.length > 0 && (
                <div className="bg-black bg-opacity-80 rounded-lg p-3 max-w-[320px]">
                  <div className="text-white text-sm font-semibold mb-2">
                    Pending Transactions ({filteredPendingTransactions.length})
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {filteredPendingTransactions.map((contractId, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-800 rounded p-2"
                      >
                        <span
                          className="text-white text-xs truncate max-w-[120px]"
                          title={contractId.contractId}
                        >
                          {contractId.contractId?.substring(0, 8)}...
                          {contractId.contractId?.substring(
                            contractId.contractId?.length - 6,
                          )}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() =>
                              toast.promise(
                                handleTransactionChoice(
                                  contractId.contractId,
                                  "Accept",
                                  contractId.instrumentId,
                                ),
                                {
                                  loading: "Accepting...",
                                  success: "Accepted!",
                                  error: "Failed to accept",
                                },
                              )
                            }
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              toast.promise(
                                handleTransactionChoice(
                                  contractId.contractId,
                                  "Reject",
                                  contractId.instrumentId,
                                ),
                                {
                                  loading: "Rejecting...",
                                  success: "Rejected!",
                                  error: "Failed to reject",
                                },
                              )
                            }
                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfer Form */}
              <div className="bg-black bg-opacity-80 rounded-lg p-3 max-w-[320px]">
                <div className="text-white text-sm font-semibold mb-2">
                  Send CC
                </div>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    placeholder="Receiver Party ID"
                    value={transferAddress}
                    onChange={(e) => setTransferAddress(e.target.value)}
                    className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() =>
                      toast.promise(handleSendTransfer, {
                        loading: "Sending transfer...",
                        success: "Transfer sent!",
                        error: "Failed to send transfer",
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded transition-colors"
                  >
                    Send CC
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default StickyHeader;
