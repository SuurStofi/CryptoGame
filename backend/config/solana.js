import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';

export const getSolanaConnection = () => {
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  return new Connection(rpcUrl, 'confirmed');
};

export const getAuthorityKeypair = () => {
  if (!process.env.AUTHORITY_PRIVATE_KEY) {
    throw new Error('AUTHORITY_PRIVATE_KEY');
  }
  
  try {
    const privateKeyBytes = bs58.decode(process.env.AUTHORITY_PRIVATE_KEY);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error('Invalid AUTHORITY_PRIVATE_KEY format');
  }
};

export const getTokenMints = () => {
  return {
    APPLE_JUICE: process.env.APPLE_JUICE_MINT ? new PublicKey(process.env.APPLE_JUICE_MINT) : null,
    ORANGE_JUICE: process.env.ORANGE_JUICE_MINT ? new PublicKey(process.env.ORANGE_JUICE_MINT) : null,
    GRAPE_SODA: process.env.GRAPE_SODA_MINT ? new PublicKey(process.env.GRAPE_SODA_MINT) : null,
  };
};

export const TOKEN_NAMES = {
  APPLE_JUICE: 'Apple Juice',
  ORANGE_JUICE: 'Orange Juice',
  GRAPE_SODA: 'Grape Soda',
};

