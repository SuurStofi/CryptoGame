import express from 'express';
import rateLimit from 'express-rate-limit';
import { getTokenMints } from '../config/solana.js';
import { getTokenBalance, isValidSolanaAddress, mintTokensToPlayer } from '../utils/solana.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const mintLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many mint requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.includes('/health') || req.path.includes('/balance');
  }
});

router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const tokenMints = getTokenMints();
    
    const balances = await Promise.all([
      getTokenBalance(tokenMints.APPLE_JUICE?.toString(), walletAddress),
      getTokenBalance(tokenMints.ORANGE_JUICE?.toString(), walletAddress),
      getTokenBalance(tokenMints.GRAPE_SODA?.toString(), walletAddress),
    ]);

    res.json({
      walletAddress,
      balances: {
        appleJuice: balances[0],
        orangeJuice: balances[1],
        grapeSoda: balances[2],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/mint', mintLimiter, authenticateToken, async (req, res) => {
  try {
    const { tokenType } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!tokenType) {
      return res.status(400).json({ error: 'Token type is required' });
    }

    const normalizedTokenType = tokenType?.toUpperCase();
    if (!['APPLE_JUICE', 'APPLE', 'ORANGE_JUICE', 'ORANGE', 'GRAPE_SODA', 'GRAPE'].includes(normalizedTokenType)) {
      return res.status(400).json({ 
        error: 'Invalid token type. Use: APPLE_JUICE, ORANGE_JUICE, or GRAPE_SODA' 
      });
    }

    const tokenMints = getTokenMints();
    
    let mintAddress;
    switch (normalizedTokenType) {
      case 'APPLE_JUICE':
      case 'APPLE':
        mintAddress = tokenMints.APPLE_JUICE;
        break;
      case 'ORANGE_JUICE':
      case 'ORANGE':
        mintAddress = tokenMints.ORANGE_JUICE;
        break;
      case 'GRAPE_SODA':
      case 'GRAPE':
        mintAddress = tokenMints.GRAPE_SODA;
        break;
    }

    if (!mintAddress) {
      return res.status(500).json({ error: 'Token mint not configured' });
    }

    console.log(`🪙 Minting request: ${tokenType} to ${walletAddress}`);
    
    const signature = await mintTokensToPlayer(
      mintAddress.toString(),
      walletAddress,
      1
    );

    console.log(`Mint successful: ${tokenType} to ${walletAddress}, signature: ${signature}`);

    res.json({
      success: true,
      signature,
      walletAddress,
      tokenType: normalizedTokenType,
      amount: 1,
    });
  } catch (error) {
    console.error('❌ Mint error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('mint authority')) {
      return res.status(403).json({ 
        error: 'Mint authority validation failed. Please contact support.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.message.includes('Invalid mint address')) {
      return res.status(400).json({ 
        error: 'Invalid mint address. Token configuration error.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during minting',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

