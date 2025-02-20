import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { GameMultisigVault } from "../target/types/game_multisig_vault";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, util } from "chai";
describe("game-multisig-vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.GameMultisigVault as Program<GameMultisigVault>;
  let signers: Keypair[] = Array.from({length: 4}).map(() => Keypair.generate());
  it("creates a vault", async () =>{
    console.log(signers);
    await program.methods.createVault(new BN(1), new BN(4)).accounts({
      payer: wallet.publicKey,
    }).remainingAccounts(signers.map(signer => {
      return {
        pubkey: signer.publicKey,
        isSigner: false,
        isWritable: false,
      }
    })).rpc();
    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), new BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const vaultAccount = await program.account.vault.fetch(vaultAddress);
    assert(vaultAccount.id.eq(new BN(1)), "Incorrect id")
    assert(vaultAccount.balance.eq(new BN(0)), "Incorrect balance"),
    assert(vaultAccount.count.eq(new BN(4)), "Incorrect count");
    assert(!signers.find((s, i) => !vaultAccount.signers[i].equals(s.publicKey)), "Incorrect signer order");
  });
  it("creating vault fails if count is 0", async () => {
    try {
      await program.methods.createVault(new BN(4), new BN(0)).accounts({
        payer: wallet.publicKey
      }).remainingAccounts([]).rpc();
      assert(false, "Did not fail")
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail")
      }
    }
  })
  it("creating vault fails if count is unequal to remaining accounts length", async () => {
    try {
      await program.methods.createVault(new BN(4), new BN(2)).accounts({
        payer: wallet.publicKey
      }).remainingAccounts(signers.map(signer => {
        return {
          pubkey: signer.publicKey,
          isSigner: false,
          isWritable: false,
        }
      })).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  let new_signers: Keypair[] = Array.from({length: 5}).map(() => Keypair.generate());
  it("rotating signers fails if count is incorrect", async () => {
    try {
      await program.methods.rotateSigners(new BN(1), new BN(4)).remainingAccounts(
        [
          ...signers.map((signer) => {
            return {
              pubkey: signer.publicKey,
              isSigner: true,
              isWritable: false,
            }
          }),
          ...new_signers.map((signer) => {
            return {
              pubkey: signer.publicKey,
              isSigner: false,
              isWritable: false,
            }
          })
        ]
      ).signers(signers).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("rotating signers fails if missing a signature", async () => {
    let s: anchor.web3.AccountMeta[] = [
      {
        pubkey: signers[0].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[1].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[2].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[3].publicKey,
        isSigner: false,
        isWritable: false
      },
    ]
    try {
      await program.methods.rotateSigners(new BN(1), new BN(5)).remainingAccounts([
        ...s,
        ...new_signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isWritable: false,
            isSigner: false,
          }
        })
      ]).signers([signers[0], signers[1], signers[2]]).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("rotating signers fails if wrong account order", async () => {
    let s: anchor.web3.AccountMeta[] = [
      {
        pubkey: signers[0].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[1].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[3].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: signers[2].publicKey,
        isSigner: true,
        isWritable: false
      },
    ]
    try {
      await program.methods.rotateSigners(new BN(1), new BN(5)).remainingAccounts([
        ...s,
        ...new_signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isWritable: false,
            isSigner: false,
          }
        })
      ]).signers(signers).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("rotates signers for a vault", async () => {
    await program.methods.rotateSigners(new BN(1), new BN(5)).remainingAccounts(
      [
        ...signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isSigner: true,
            isWritable: false,
          }
        }),
        ...new_signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isSigner: false,
            isWritable: false,
          }
        })
      ]
    ).signers(signers).rpc();
    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), new BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const vaultAccount = await program.account.vault.fetch(vaultAddress);
    assert(vaultAccount.balance.eq(new BN(0)), "Incorrect balance");
    assert(vaultAccount.count.eq(new BN(5)), "Incorrect count");
    assert(vaultAccount.id.eq(new BN(1)), "Incorrect id");
    assert(!new_signers.find((s, i) => !vaultAccount.signers[i].equals(s.publicKey)), "Incorrect signers");
  })
  it("deposits into a vault", async () => {
    await provider.connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), new BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [depositAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("deposit"), wallet.publicKey.toBuffer(), vaultAddress.toBuffer()],
      program.programId
    );
    await program.methods.deposit(new BN(1), new BN(LAMPORTS_PER_SOL)).accounts({
      signer: wallet.publicKey,
      depositAccount: depositAddress
    }).rpc();

    const vaultAccount = await program.account.vault.fetch(vaultAddress);
    const depositAccount = await program.account.depositAccount.fetch(depositAddress);
    assert(vaultAccount.balance.eq(new BN(LAMPORTS_PER_SOL)), "Incorrect vault balance");
    assert(depositAccount.amount.eq(new BN(LAMPORTS_PER_SOL)), "Incorrect deposit account balance");
    assert(depositAccount.owner.equals(wallet.publicKey), "Incorrect deposit owner");
    assert(depositAccount.vault.equals(vaultAddress), "Incorrect deposit vault");
  });
  it("fails to withdraw from a vault if signers are in the wrong order", async () => {
    let s: anchor.web3.AccountMeta[] = [
      {
        pubkey: new_signers[0].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: new_signers[1].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: new_signers[3].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: new_signers[2].publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: new_signers[4].publicKey,
        isSigner: true,
        isWritable: false,
      }
    ]
    try {
      await program.methods.withdraw(new BN(1), new BN(LAMPORTS_PER_SOL)).remainingAccounts(s).signers(new_signers).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("fails to withdraw from a vault if incorrect signers", async () => {
    try {
      await program.methods.withdraw(new BN(1), new BN(LAMPORTS_PER_SOL)).remainingAccounts(
        new_signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isWritable: false,
            isSigner: true,
          }
        })
      ).signers(signers).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("fails to withdraw from a vault if withdraw too large", async () => {
    try {
      await program.methods.withdraw(new BN(1), new BN(LAMPORTS_PER_SOL + 1)).remainingAccounts(
        new_signers.map((signer) => {
          return {
            pubkey: signer.publicKey,
            isWritable: false,
            isSigner: true,
          }
        })
      ).signers(new_signers).rpc();
      assert(false)
    } catch (e) {
      if (e.name === "AssertionError") {
        throw new Error("Did not fail");
      }
    }
  })
  it("withdraws from a vault", async () => {
    const to = Keypair.generate();
    await program.methods.withdraw(new BN(1), new BN(LAMPORTS_PER_SOL)).accounts({
      to: to.publicKey,
    }).remainingAccounts(new_signers.map((signer) => {
      return {
        pubkey: signer.publicKey,
        isWritable: false,
        isSigner: true,
      }
    })).signers(new_signers).rpc();
    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), new BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const vaultAccount = await program.account.vault.fetch(vaultAddress);
    const toAccount = await provider.connection.getAccountInfo(to.publicKey);
    assert(toAccount.lamports === LAMPORTS_PER_SOL, "Incorrect lamports in to account");
    assert(vaultAccount.balance.eq(new BN(0)), "Did not withdraw correctly")
  })
});
