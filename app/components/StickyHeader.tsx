/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { toast } from "sonner";
import nacl from "tweetnacl";
import adapter, {
  type CantonWallet,
  SignRequestResponseType,
  type SignRequestResponse,
} from "../misc/adapter";
import ActionStarryButton from "./ActionStarryButton";
import StarryButton from "./StarryButton";
import bs58 from "bs58";

// Helper functions for base64 encoding/decoding
const fromBase64 = (b64: string): Uint8Array => {
  return Uint8Array.from(Buffer.from(b64, "base64"));
};

const verifySignature = (
  message: string,
  signatureBase64: string,
  publicKeyBase64: string
): boolean => {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = fromBase64(signatureBase64);
    const publicKeyBytes = fromBase64(publicKeyBase64);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

const StickyHeader: React.FC = () => {
  const [wallet, setWallet] = React.useState<CantonWallet | null>(null);
  const [walletAddress, setWalletAddress] = React.useState<
    string | undefined
  >();

  useEffect(() => {
    // Initialize the adapter
    adapter.init({
      appName: "Canton Template",
      iconUrl: "https://docs.nightly.app/img/logo.png",
      network: "mainnet",
      onAccept: (connectedWallet) => {
        setWallet(connectedWallet);
        // Get the party ID or public key as address
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
      },
    });

    // Try eager connect for session restoration
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
                        "I love Nightly",
                        (response: SignRequestResponse) => {
                          if (
                            response.type ===
                            SignRequestResponseType.SIGN_REQUEST_APPROVED
                          ) {
                            const data = response.data as {
                              signature?: string;
                            };
                            console.log("Signature:", data.signature);

                            // Verify signature using nacl.sign.detached.verify
                            const message = "I love Nightly";
                            const publicKey = wallet?.publicKey;

                            if (data.signature && publicKey) {
                              const isValid = verifySignature(
                                message,
                                data.signature,
                                publicKey
                              );

                              console.log("Signature valid:", isValid);

                              if (isValid) {
                                toast.success("Message signed & verified!", {
                                  description: `Signature: ${data.signature.substring(
                                    0,
                                    20
                                  )}...`,
                                });
                              } else {
                                toast.warning(
                                  "Message signed but verification failed!",
                                  {
                                    description: `Signature: ${data.signature.substring(
                                      0,
                                      20
                                    )}...`,
                                  }
                                );
                              }
                            } else {
                              toast.success("Message signed!", {
                                description: `Signature: ${data.signature?.substring(
                                  0,
                                  20
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
                        }
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
                onClick={async () => {
                  const sendTransfer = async () => {
                    // Create a transfer command
                    const transferCommand = await adapter.createTransferCommand(
                      {
                        receiverPartyId: "example-receiver-party-id",
                        amount: "10",
                        instrument: {
                          id: "Amulet",
                          admin:
                            "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
                        },
                        memo: "Test transfer from Canton Template",
                      }
                    );

                    if (!transferCommand) {
                      throw new Error("Failed to create transfer command");
                    }

                    return new Promise<void>((resolve, reject) => {
                      adapter.submitTransactionCommand(
                        transferCommand,
                        (response: SignRequestResponse) => {
                          if (
                            response.type ===
                            SignRequestResponseType.SIGN_REQUEST_APPROVED
                          ) {
                            const data = response.data as { updateId?: string };
                            console.log(
                              "Transaction submitted:",
                              data.updateId
                            );
                            toast.success("Transaction submitted!", {
                              description: `Update ID: ${data.updateId}`,
                            });
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
                        }
                      );
                    });
                  };
                  toast.promise(sendTransfer, {
                    loading: "Sending transfer...",
                    success: (_) => {
                      return `Transfer sent!`;
                    },
                    error: "Operation has been rejected!",
                  });
                }}
                name="Send Transfer"
              />
              <ActionStarryButton
                onClick={async () => {
                  const getTransactions = async () => {
                    const result = await adapter.getHoldingTransactions();
                    if (result) {
                      console.log("Transactions:", result.transactions);
                      console.log("Next offset:", result.nextOffset);
                      toast.success(
                        `Found ${result.transactions.length} transactions`
                      );
                    }
                  };
                  toast.promise(getTransactions, {
                    loading: "Fetching transactions...",
                    success: (_) => {
                      return `Transactions fetched!`;
                    },
                    error: "Failed to fetch transactions",
                  });
                }}
                name="Get Transactions"
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default StickyHeader;
