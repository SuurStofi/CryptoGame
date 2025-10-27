import express from 'express';
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import User from '../models/User.js';
import { isValidSolanaAddress } from '../utils/solana.js';

const router = express.Router();

router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    let user = await User.findOne({ walletAddress });

    if (!user) {
      user = new User({ walletAddress, nonce: '' });
    }

    const nonce = user.generateNonce();
    await user.save();

    res.json({ nonce });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature are required' });
    }

    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: 'User not found. First get nonce.' });
    }

    const message = `Login to monster-cocktail Marketplace\nNonce: ${user.nonce}`;
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    user.lastLogin = new Date();
    user.generateNonce();
    await user.save();

    const token = jwt.sign(
      { walletAddress, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token is missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      totalListingsCreated: user.totalListingsCreated,
      totalPurchases: user.totalPurchases,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

