import express from 'express';
import { getTokenMints } from '../config/solana.js';
import { getTokenBalance, isValidSolanaAddress } from '../utils/solana.js';

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

export default router;

