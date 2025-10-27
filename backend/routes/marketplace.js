import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { getTokenMints, TOKEN_NAMES } from '../config/solana.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/listings', optionalAuth, async (req, res) => {
  try {
    const { tokenType, seller, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    const query = { status: 'active' };
    
    if (tokenType) {
      const tokenName = TOKEN_NAMES[tokenType];
      if (tokenName) {
        query.tokenName = tokenName;
      }
    }
    
    if (seller) {
      query.seller = seller;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const listings = await Listing.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(100);

    res.json({ listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post(
  '/listings',
  authenticateToken,
  [
    body('tokenType').isIn(['APPLE_JUICE', 'ORANGE_JUICE', 'GRAPE_SODA']).withMessage('Invalid token type'),
    body('price').isFloat({ min: 0.001 }).withMessage('Price must be greater than 0.001 SOL'),
    body('amount').isInt({ min: 1 }).withMessage('Amount must be greater than 0'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tokenType, price, amount } = req.body;
      const { walletAddress } = req.user;

      const tokenMints = getTokenMints();
      const mintAddress = tokenMints[tokenType];

      if (!mintAddress) {
        return res.status(400).json({ error: 'Token not configured' });
      }

      const listing = new Listing({
        tokenMint: mintAddress.toString(),
        tokenName: TOKEN_NAMES[tokenType],
        seller: walletAddress,
        price,
        amount,
        status: 'active',
      });

      await listing.save();

      await User.findOneAndUpdate(
        { walletAddress },
        { $inc: { totalListingsCreated: 1 } }
      );

      res.status(201).json({
        success: true,
        message: 'Listing created successfully',
        listing,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.delete('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.user;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller !== walletAddress) {
      return res.status(403).json({ error: 'You cannot delete someone else\'s listing' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not active' });
    }

    listing.status = 'cancelled';
    listing.updatedAt = new Date();
    await listing.save();

    res.json({
      success: true,
      message: 'Listing cancelled',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/buy/:id', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.user;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not active' });
    }

    if (listing.seller === walletAddress) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    res.json({
      success: true,
      transactionDetails: {
        seller: listing.seller,
        tokenMint: listing.tokenMint,
        price: listing.price,
        amount: listing.amount,
        listingId: listing._id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post(
  '/confirm-purchase',
  authenticateToken,
  [
    body('listingId').isMongoId().withMessage('Invalid listing ID'),
    body('transactionSignature').notEmpty().withMessage('Transaction signature is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { listingId, transactionSignature } = req.body;
      const { walletAddress } = req.user;

      const listing = await Listing.findById(listingId);

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Listing is not active' });
      }

      listing.status = 'sold';
      listing.buyer = walletAddress;
      listing.transactionSignature = transactionSignature;
      listing.updatedAt = new Date();
      await listing.save();

      await User.findOneAndUpdate(
        { walletAddress },
        { $inc: { totalPurchases: 1 } }
      );

      res.json({
        success: true,
        message: 'Purchase confirmed successfully',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.user;
    const status = req.query.status || 'active';

    const listings = await Listing.find({
      seller: walletAddress,
      status,
    }).sort({ createdAt: -1 });

    res.json({ listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

