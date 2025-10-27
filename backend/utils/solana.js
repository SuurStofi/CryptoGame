import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
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

export const mintTokensToPlayer = async (mintAddress, playerAddress, amount) => {
  const connection = getSolanaConnection();
  const authority = getAuthorityKeypair();
  
  const mint = new PublicKey(mintAddress);
  const player = new PublicKey(playerAddress);
  
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

export const isValidSolanaAddress = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

