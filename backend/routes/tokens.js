import express from 'express';
import { getTokenMints } from '../config/solana.js';
import { getTokenBalance, isValidSolanaAddress, mintTokensToPlayer } from '../utils/solana.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

// Endpoint для видачі токенів
router.post('/mint', authenticateToken, async (req, res) => {
  try {
    const { tokenType } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!tokenType) {
      return res.status(400).json({ error: 'Token type is required' });
    }

    const tokenMints = getTokenMints();
    
    // Визначаємо mint адресу залежно від типу токена
    let mintAddress;
    switch (tokenType?.toUpperCase()) {
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
      default:
        return res.status(400).json({ 
          error: 'Invalid token type. Use: APPLE_JUICE, ORANGE_JUICE, or GRAPE_SODA' 
        });
    }

    if (!mintAddress) {
      return res.status(500).json({ error: 'Token mint not configured' });
    }

    // Видаємо 1 токен
    const signature = await mintTokensToPlayer(
      mintAddress.toString(),
      walletAddress,
      1
    );

    res.json({
      success: true,
      signature,
      walletAddress,
      tokenType,
      amount: 1,
    });
  } catch (error) {
    console.error('Mint error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

