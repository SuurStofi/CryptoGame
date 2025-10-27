import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, ShoppingCart, User, Search, X, Send, LogOut, Package, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import { authAPI, tokensAPI, marketplaceAPI } from './api';
import { TOKEN_NAMES, TOKEN_ICONS, TOKEN_TYPES, SOLANA_RPC_URL, API_BASE_URL } from './config';
import appleJuiceImg from './img/apple_cocktail.png';
import orangeJuiceImg from './img/orange_cocktail.png';
import grapeSodaImg from './img/grape_cocktail.png';

const TOKEN_IMAGES = {
  'Apple Juice': appleJuiceImg,
  'Orange Juice': orangeJuiceImg,
  'Grape Soda': grapeSodaImg,
};

const MarketplaceApp = () => {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [currentPage, setCurrentPage] = useState('marketplace');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'
  
  const [user, setUser] = useState(null);
  const [tokenBalances, setTokenBalances] = useState({
    appleJuice: 0,
    orangeJuice: 0,
    grapeSoda: 0,
  });
  const [solBalance, setSolBalance] = useState(0);
  const [marketListings, setMarketListings] = useState([]);
  const [myListings, setMyListings] = useState([]);

  const handlePhantomAuth = async () => {
    if (!publicKey || !signMessage) return;
    
    try {
      setLoading(true);
      setError('');
      
      const walletAddress = publicKey.toString();
      
      const { nonce } = await authAPI.getNonce(walletAddress);
      
      const message = `Login to monster-cocktail Marketplace\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);
      
      const { token, user: userData } = await authAPI.verify(walletAddress, signatureBase58);
      
      localStorage.setItem('jwt_token', token);
      
      setUser(userData);
      setIsLoggedIn(true);
      
    } catch (error) {
      console.error('Authorization error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Authorization error';
      setError(`Error: ${errorMessage}. Check if your internet connection is stable`);
      disconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setIsLoggedIn(false);
    setUser(null);
    setTokenBalances({ appleJuice: 0, orangeJuice: 0, grapeSoda: 0 });
    setSolBalance(0);
    setMyListings([]);
    if (connected) {
      disconnect();
    }
  };

  const loadUserData = async () => {
    if (!publicKey) return;
    
    try {
      const walletAddress = publicKey.toString();
      
      // Load token balances
      const { balances } = await tokensAPI.getBalance(walletAddress);
      setTokenBalances(balances);
      
      // Load SOL balance
      const connection = new Connection(SOLANA_RPC_URL);
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / LAMPORTS_PER_SOL);
      
      // Load my listings
      const { listings } = await marketplaceAPI.getMyListings();
      setMyListings(listings);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Check connection to backend.');
    }
  };

  const loadMarketListings = async () => {
    try {
      const { listings } = await marketplaceAPI.getListings();
      setMarketListings(listings);
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        console.error('Backend unavailable:', error);
        setBackendStatus('offline');
        setError('Server is not responding. Make sure your internet connection is stable');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    if (connected && publicKey && !isLoggedIn && signMessage && backendStatus === 'online') {
      handlePhantomAuth();
    } else if (!connected && isLoggedIn) {
      handleLogout();
    }
  }, [connected, publicKey, isLoggedIn, signMessage, backendStatus]);

  useEffect(() => {
    if (isLoggedIn && publicKey) {
      loadUserData();
      loadMarketListings();
    }
  }, [isLoggedIn, publicKey]);

  const openSellModal = (tokenType) => {
    setSelectedItem(tokenType);
    setSellPrice('');
    setSellAmount('');
  };

  const handleListItemForSale = async () => {
    if (!selectedItem || !sellPrice || !sellAmount) {
      alert('Fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await marketplaceAPI.createListing(
        selectedItem,
        parseFloat(sellPrice),
        parseInt(sellAmount)
      );
      
      alert('✅ Listing created successfully!');
      
      setSelectedItem(null);
      setSellPrice('');
      setSellAmount('');
      setShowInventoryModal(false);
      
      // Update data
      await loadUserData();
      await loadMarketListings();
      
    } catch (error) {
      console.error('Error creating listing:', error);
      setError(error.response?.data?.error || 'Error creating listing');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (listing) => {
    if (listing.seller === publicKey.toString()) {
      alert("You cannot buy your own listing!");
      return; 
    }
    
    if (solBalance < listing.price) {
      alert("Insufficient SOL to purchase!");
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Get transaction details
      const { transactionDetails } = await marketplaceAPI.initiateBuy(listing._id);
      
      const connection = new Connection(SOLANA_RPC_URL);
      const transaction = new Transaction();
      
      // 1. Transfer SOL to seller
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(transactionDetails.seller),
          lamports: transactionDetails.price * LAMPORTS_PER_SOL,
        })
      );
      
      // 2. Receive SPL tokens (seller should do this separately)
      // In reality, this should be done through an escrow smart contract
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Sign and send transaction
      const { signature } = await window.solana.signAndSendTransaction(transaction);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      // Confirm purchase on backend
      await marketplaceAPI.confirmPurchase(listing._id, signature);
      
      alert(`✅ Purchase successful!\nTransaction: ${signature.slice(0, 20)}...`);
      
      // Update data
      await loadUserData();
      await loadMarketListings();
      
    } catch (error) {
      console.error('Error purchasing:', error);
      setError(error.response?.data?.error || 'Error during purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveListing = async (listingId) => {
    try {
      setLoading(true);
      await marketplaceAPI.deleteListing(listingId);
      
      alert('✅ Listing removed');
      
      await loadUserData();
      await loadMarketListings();
      
    } catch (error) {
      console.error('Error removing listing:', error);
      setError(error.response?.data?.error || 'Error removing listing');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = marketListings.filter(item =>
    item.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.seller.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTokenBalance = (tokenType) => {
    switch (tokenType) {
      case TOKEN_TYPES.APPLE_JUICE:
        return tokenBalances.appleJuice;
      case TOKEN_TYPES.ORANGE_JUICE:
        return tokenBalances.orangeJuice;
      case TOKEN_TYPES.GRAPE_SODA:
        return tokenBalances.grapeSoda;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900"> Monster-cocktail marketplace</h1>
              <nav className="hidden md:flex gap-1">
                <button
                  onClick={() => setCurrentPage('marketplace')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'marketplace'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Market
                </button>
                {isLoggedIn && (
                  <>
                    <button
                      onClick={() => setCurrentPage('inventory')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 'inventory'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Inventory
                    </button>
                    <button
                      onClick={() => setCurrentPage('listings')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 'listings'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      My Listings
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-md">
                    <Wallet size={16} className="text-purple-600" />
                    <span className="text-sm font-semibold text-gray-900">{solBalance.toFixed(4)} SOL</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title="Logout"
                  >
                    <LogOut size={20} className="text-gray-600" />
                  </button>
                </>
              )}
              <div className="wallet-adapter-button-wrapper">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing...</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {backendStatus === 'checking' ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking server connection...</p>
          </div>
        ) : backendStatus === 'offline' ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Server Unavailable</h2>
            <p className="text-gray-600 mb-4">Failed to connect to server</p>
            <p className="text-sm text-gray-500 mb-6">Make sure your internet connection is stable</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center py-20">
            <Wallet size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Phantom Wallet</h2>
            <p className="text-gray-600 mb-6">To use the marketplace, connect your Phantom wallet</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-700">Server Online</span>
            </div>
          </div>
        ) : (
          <>
            {currentPage === 'marketplace' && (
              <MarketplacePage 
                listings={filteredListings}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onBuy={handleBuyItem}
                currentWallet={publicKey?.toString()}
              />
            )}

            {currentPage === 'inventory' && (
              <InventoryPage 
                tokenBalances={tokenBalances}
                onSell={openSellModal}
              />
            )}

            {currentPage === 'listings' && (
              <MyListingsPage 
                listings={myListings}
                onRemove={handleRemoveListing}
              />
            )}
          </>
        )}
      </main>
    
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sell Tokens</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img 
                src={TOKEN_IMAGES[TOKEN_NAMES[selectedItem]]} 
                alt={TOKEN_NAMES[selectedItem]} 
                className="w-20 h-20 object-contain"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{TOKEN_NAMES[selectedItem]}</h3>
                <p className="text-sm text-gray-500">Balance: {getTokenBalance(selectedItem)}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Token Amount</label>
              <input
                type="number"
                min="1"
                max={getTokenBalance(selectedItem)}
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (SOL)</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleListItemForSale}
                disabled={!sellPrice || !sellAmount || parseFloat(sellPrice) <= 0 || parseInt(sellAmount) <= 0}
                className="flex-1 py-2 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                List Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MarketplacePage = ({ listings, searchQuery, setSearchQuery, onBuy, currentWallet }) => (
  <div>
    <div className="mb-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
        />
      </div>
    </div>

    {listings.length === 0 ? (
      <div className="text-center py-16">
        <Package size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No listings yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <div
            key={listing._id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-6">
              <img 
                src={TOKEN_IMAGES[listing.tokenName]} 
                alt={listing.tokenName}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{listing.tokenName}</h3>
              <p className="text-xs text-gray-500 mb-1">Amount: {listing.amount}</p>
              <p className="text-xs text-gray-500 mb-3 truncate">Seller: {listing.seller.slice(0, 8)}...</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">{listing.price} SOL</span>
                {listing.seller !== currentWallet && (
                  <button
                    onClick={() => onBuy(listing)}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Buy
                  </button>
                )}
                {listing.seller === currentWallet && (
                  <span className="text-xs text-gray-500 font-medium">Your listing</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const InventoryPage = ({ tokenBalances, onSell }) => {
  const availableItems = Object.entries(TOKEN_TYPES).filter(([key]) => {
    const balance = tokenBalances[key.toLowerCase().replace('_', '')];
    return balance > 0;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Inventory</h2>

      {availableItems.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Your inventory is empty</p>
          <p className="text-sm text-gray-400 mt-2">Purchase items from the marketplace to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {availableItems.map(([key, tokenType]) => {
            const balance = tokenBalances[key.toLowerCase().replace('_', '')];
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={TOKEN_IMAGES[TOKEN_NAMES[tokenType]]} 
                    alt={TOKEN_NAMES[tokenType]}
                    className="w-20 h-20 object-contain"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{TOKEN_NAMES[tokenType]}</h3>
                    <p className="text-2xl font-bold text-gray-900">{balance}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSell(tokenType)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Sell
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MyListingsPage = ({ listings, onRemove }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">My Listings</h2>

    {listings.length === 0 ? (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
        <Package size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">You have no active listings</p>
      </div>
    ) : (
      <div className="space-y-3">
        {listings.map((listing) => (
          <div
            key={listing._id}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4"
          >
            <img 
              src={TOKEN_IMAGES[listing.tokenName]} 
              alt={listing.tokenName}
              className="w-16 h-16 object-contain"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{listing.tokenName}</h3>
              <p className="text-sm text-gray-500">Amount: {listing.amount}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">{listing.price} SOL</div>
              <button
                onClick={() => onRemove(listing._id)}
                className="text-xs text-red-600 hover:text-red-700 font-medium mt-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default MarketplaceApp;

