import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token';
import { getSolanaConnection, getAuthorityKeypair } from '../config/solana.js';

export const getOrCreateAssociatedTokenAccount = async (mint, owner) => {
  const connection = getSolanaConnection();
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    owner
  );

  try {
    await getAccount(connection, associatedTokenAddress);
    return { address: associatedTokenAddress, needsCreation: false };
  } catch (error) {
    return { address: associatedTokenAddress, needsCreation: true };
  }
};

export const validateMintAuthority = async (mintAddress, authorityPublicKey) => {
  const connection = getSolanaConnection();
  const mint = new PublicKey(mintAddress);
  
  try {
    const mintInfo = await getMint(connection, mint);
    
    // Если mint authority null, токен не может быть наминт
    if (!mintInfo.mintAuthority) {
      throw new Error(`Token mint ${mintAddress} has no mint authority (supply frozen)`);
    }
    
    // Проверяем, что authority совпадает с mint authority
    if (mintInfo.mintAuthority.toString() !== authorityPublicKey.toString()) {
      throw new Error(`Authority ${authorityPublicKey.toString()} is not the mint authority for ${mintAddress}. Mint authority is ${mintInfo.mintAuthority.toString()}`);
    }
    
    return true;
  } catch (error) {
    if (error.message.includes('Invalid public key')) {
      throw new Error(`Invalid mint address: ${mintAddress}`);
    }
    throw error;
  }
};

export const mintTokensToPlayer = async (mintAddress, playerAddress, amount) => {
  const connection = getSolanaConnection();
  const authority = getAuthorityKeypair();
  
  const mint = new PublicKey(mintAddress);
  const player = new PublicKey(playerAddress);
  
  // Валидация mint authority перед минтингом
  await validateMintAuthority(mintAddress, authority.publicKey);
  
  const { address: tokenAccount, needsCreation } = await getOrCreateAssociatedTokenAccount(mint, player);
  
  const transaction = new Transaction();
  
  if (needsCreation) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey, // payer
        tokenAccount,
        player, // owner
        mint
      )
    );
  }
  
  transaction.add(
    createMintToInstruction(
      mint,
      tokenAccount,
      authority.publicKey,
      amount * Math.pow(10, 9)
    )
  );
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [authority]
  );
  
  return signature;
};

export const transferFromEscrowToBuyer = async (mintAddress, buyerAddress, amount) => {
  const connection = getSolanaConnection();
  const authority = getAuthorityKeypair();
  const mint = new PublicKey(mintAddress);
  const buyer = new PublicKey(buyerAddress);

  // Escrow ATA owned by authority
  const { address: escrowAta } = await getOrCreateAssociatedTokenAccount(mint, authority.publicKey);
  const { address: buyerAta, needsCreation } = await getOrCreateAssociatedTokenAccount(mint, buyer);

  const transaction = new Transaction();

  if (needsCreation) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        buyerAta,
        buyer,
        mint
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      escrowAta,
      buyerAta,
      authority.publicKey,
      amount * Math.pow(10, 9)
    )
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [authority]
  );

  return signature;
};

export const getTokenBalance = async (mintAddress, ownerAddress) => {
  try {
    const connection = getSolanaConnection();
    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(ownerAddress);
    
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);
    const accountInfo = await getAccount(connection, tokenAccount);
    
    return Number(accountInfo.amount) / Math.pow(10, 9);
  } catch (error) {
    return 0;
  }
};

export const getEscrowInfoForMint = async (mintAddress) => {
  const authority = getAuthorityKeypair();
  const mint = new PublicKey(mintAddress);
  const { address } = await getOrCreateAssociatedTokenAccount(mint, authority.publicKey);
  return {
    escrowAuthority: authority.publicKey.toString(),
    escrowTokenAccount: address.toString(),
  };
};

export const isValidSolanaAddress = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

