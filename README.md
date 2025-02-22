### Game Multisig Vault Program

# Game Multisig Vault Program

This Solana program, written in Rust using the Anchor framework, implements a multi-signature vault system. The vault allows for secure management of funds, requiring multiple signers to authorize transactions such as deposits and withdrawals. Below is an explanation of the program's functionality.

---

## Table of Contents
1. [Overview](#overview)
2. [Program Structure](#program-structure)
3. [Instructions](#instructions)
   - [Create Vault](#create-vault)
   - [Rotate Signers](#rotate-signers)
   - [Deposit](#deposit)
   - [Withdraw](#withdraw)
4. [Error Handling](#error-handling)
5. [Accounts](#accounts)
6. [Deployment](#deployment)

---

## Overview

The program allows users to:
- Create a vault with a specified number of signers.
- Rotate or update the list of signers for an existing vault.
- Deposit funds into the vault.
- Withdraw funds from the vault, requiring signatures from all authorized signers.

The vault is secured by a multi-signature mechanism, ensuring that no single user can unilaterally control the funds.

---

## Program Structure

The program consists of the following components:
- **`Vault` Account**: Stores the vault's metadata, including the list of signers, the number of signers, and the vault's balance.
- **`DepositAccount` Account**: Tracks deposits made by individual users into the vault.
- **Instructions**: Functions that define the logic for creating, managing, and interacting with the vault.
- **Error Handling**: Custom error codes for invalid operations.

---

## Instructions

### Create Vault
- **Function**: `create_vault`
- **Description**: Initializes a new vault with a unique ID, a specified number of signers, and their public keys.
- **Parameters**:
  - `id`: Unique identifier for the vault.
  - `count`: Number of signers (must be between 1 and 8).
- **Validation**:
  - The number of signers must match the number of provided public keys.
  - The number of signers must be between 1 and 8.

### Rotate Signers
- **Function**: `rotate_signers`
- **Description**: Updates the list of signers for an existing vault.
- **Parameters**:
  - `id`: Unique identifier for the vault.
  - `new_count`: New number of signers.
- **Validation**:
  - All existing signers must provide signatures to authorize the rotation.
  - The new list of signers must be provided.

### Deposit
- **Function**: `deposit`
- **Description**: Allows a user to deposit funds into the vault.
- **Parameters**:
  - `id`: Unique identifier for the vault.
  - `lamports`: Amount of SOL to deposit.
- **Validation**:
  - The deposit is recorded in a `DepositAccount` associated with the user and vault.

### Withdraw
- **Function**: `withdraw`
- **Description**: Allows funds to be withdrawn from the vault, requiring signatures from all authorized signers.
- **Parameters**:
  - `id`: Unique identifier for the vault.
  - `lamports`: Amount of SOL to withdraw.
- **Validation**:
  - The vault must have sufficient balance.
  - All signers must provide valid signatures.

---

## Error Handling

The program defines custom errors to handle invalid operations:
- **`WrongAmountOfSigners`**: Incorrect number of signers provided.
- **`MissingSignature`**: A required signature is missing.
- **`WrongSigner`**: An invalid signer attempted to authorize an operation.
- **`NotEnoughSol`**: Insufficient balance in the vault for a withdrawal.

---

## Accounts

### `Vault`
- Stores the vault's metadata:
  - `id`: Unique identifier.
  - `signers`: Array of public keys for authorized signers.
  - `count`: Number of signers.
  - `balance`: Total SOL balance in the vault.

### `DepositAccount`
- Tracks individual deposits:
  - `owner`: Public key of the depositor.
  - `vault`: Public key of the vault.
  - `amount`: Amount of SOL deposited.

---

## Deployment

To deploy the program, use the following command:

```bash
solana program deploy --skip-fee-check ./program.so --with-compute-unit-price 100 --use-rpc --max-sign-attempts 1000
```
