import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  tokenMint: {
    type: String,
    required: true,
    trim: true,
  },
  tokenName: {
    type: String,
    required: true,
    enum: ['Apple Juice', 'Orange Juice', 'Grape Soda'],
  },
  seller: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
    default: 'active',
  },
  buyer: {
    type: String,
    trim: true,
  },
  transactionSignature: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;

