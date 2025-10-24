import React, { useState } from 'react';
import { MessageCircle, ShoppingCart, User, Search, X, Send, LogOut, Package, Wallet } from 'lucide-react';

const MarketplaceApp = () => {
  const [currentPage, setCurrentPage] = useState('marketplace');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showChat, setShowChat] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [messages, setMessages] = useState([
    { id: 1, user: 'Support', text: 'How can I help you today?', time: '10:30 AM', isOwn: false }
  ]);
  const [newMessage, setNewMessage] = useState('');
  
  const [user, setUser] = useState(null);
  
  // User's inventory - items they own but haven't listed for sale
  // Тут пишем Инвентарь
  const [inventory, setInventory] = useState([
    { id: 'inv1', name: 'Dragon Sword', icon: '⚔️', type: 'Weapon' },
    { id: 'inv2', name: 'Magic Shield', icon: '🛡️', type: 'Armor' },
    { id: 'inv3', name: 'Health Potion', icon: '🧪', type: 'Consumable' },
    { id: 'inv4', name: 'Gold Ring', icon: '💍', type: 'Accessory' },
    { id: 'inv5', name: 'Ancient Scroll', icon: '📜', type: 'Collectible' },
    { id: 'inv6', name: 'Crystal Gem', icon: '💎', type: 'Resource' },
  ]);
  
  // Marketplace listings - items listed for sale by all users
  
  //Сам маркетплейс. - Тут выставляем стартовый баланс, и.тд
  const [marketListings, setMarketListings] = useState([]);

// Вход + Стартовый баланс при логине
  const handleLogin = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setUser({
      username: formData.get('username'),
      balance: 250.00,
      avatar: '👤',
    });
    setIsLoggedIn(true);
    setShowAuthModal(false);
  };

// Авторизация + стартовый баланс при signup
  const handleSignup = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setUser({
      username: formData.get('username'),
      balance: 100.00,
      avatar: '👤',
    });
    setIsLoggedIn(true);
    setShowAuthModal(false);
  };

// Выход
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage('marketplace');
  };

// Продажа
  const openSellModal = (item) => {
    setSelectedItem(item);
    setSellPrice('');
  };

// Логика листинга
  const handleListItemForSale = () => {
    if (!selectedItem || !sellPrice || parseFloat(sellPrice) <= 0) return;
    
    const newListing = {
      id: Date.now(),
      itemId: selectedItem.id,
      name: selectedItem.name,
      icon: selectedItem.icon,
      type: selectedItem.type,
      price: parseFloat(sellPrice),
      seller: user.username,
      listedAt: new Date().toISOString(),
    };
    
    setMarketListings([newListing, ...marketListings]);
    setInventory(inventory.filter(item => item.id !== selectedItem.id));
    setSelectedItem(null);
    setSellPrice('');
    setShowInventoryModal(false);
  };


//Логика покупки - продажи.
  const handleBuyItem = (listing) => {
    if (listing.seller === user.username) {
      alert("You can't buy your own item!");
      return;
    }
    
    if (user.balance < listing.price) {
      alert("Insufficient balance!");
      return;
    }
    
    // Обновление баланса
    setUser({ ...user, balance: user.balance - listing.price });
    setInventory([...inventory, {
      id: listing.itemId,
      name: listing.name,
      icon: listing.icon,
      type: listing.type
    }]);
    
    // Удаление с маркетплейса
    setMarketListings(marketListings.filter(l => l.id !== listing.id));
    
    alert(`Successfully purchased ${listing.name}!`);
  };

  const handleRemoveListing = (listingId) => {
    const listing = marketListings.find(l => l.id === listingId);
    if (listing) {
      // Возвращение вещи в инвентарь
      setInventory([...inventory, {
        id: listing.itemId,
        name: listing.name,
        icon: listing.icon,
        type: listing.type
      }]);
      setMarketListings(marketListings.filter(l => l.id !== listingId));
    }
  };


// Реализация микро чата. Можешь удалить. 
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        user: user.username,
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true
      }]);
      setNewMessage('');
      
      // Типа ответ
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          user: 'Support',
          text: 'Thanks for your message. How can I assist you?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn: false
        }]);
      }, 1000);
    }
  };

  const filteredListings = marketListings.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.seller.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myListings = marketListings.filter(l => l.seller === user?.username);

// Стиль и функции. (Короче тут у нас нажатие кнопочек и.т.д. Вся логика сверху.)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
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
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                    <Wallet size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">${user.balance.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="relative p-2 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <MessageCircle size={20} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage('profile')}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <User size={18} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{user.username}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title="Logout"
                  >
                    <LogOut size={20} className="text-gray-600" />
                  </button>
                </>
              )}
              {!isLoggedIn && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentPage === 'marketplace' && (
          <div>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No items listed yet</p>
                {isLoggedIn && (
                  <p className="text-sm text-gray-400 mt-2">Be the first to list an item from your inventory!</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center text-6xl">
                      {listing.icon}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">{listing.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{listing.type} • by {listing.seller}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">${listing.price.toFixed(2)}</span>
                        {isLoggedIn && listing.seller !== user.username && (
                          <button
                            onClick={() => handleBuyItem(listing)}
                            className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                          >
                            Buy
                          </button>
                        )}
                        {isLoggedIn && listing.seller === user.username && (
                          <span className="text-xs text-gray-500 font-medium">Your listing</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentPage === 'inventory' && isLoggedIn && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Inventory</h2>
              <button
                onClick={() => setShowInventoryModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sell Item
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Your inventory is empty</p>
                <p className="text-sm text-gray-400 mt-2">Purchase items from the marketplace to add them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openSellModal(item)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center text-5xl">
                      {item.icon}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentPage === 'listings' && isLoggedIn && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Active Listings</h2>

            {myListings.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You have no active listings</p>
                <p className="text-sm text-gray-400 mt-2">List items from your inventory to start selling</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="text-4xl">{listing.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{listing.name}</h3>
                      <p className="text-sm text-gray-500">{listing.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">${listing.price.toFixed(2)}</div>
                      <button
                        onClick={() => handleRemoveListing(listing.id)}
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
        )}

        {currentPage === 'profile' && isLoggedIn && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl">{user.avatar}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
                  <p className="text-gray-500">Marketplace Member</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{inventory.length}</div>
                  <div className="text-sm text-gray-500">Items Owned</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{myListings.length}</div>
                  <div className="text-sm text-gray-500">Active Listings</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${user.balance.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Balance</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {authMode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Item Modal (when clicking from inventory) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sell Item</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-5xl">{selectedItem.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
                <p className="text-sm text-gray-500">{selectedItem.type}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
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
                disabled={!sellPrice || parseFloat(sellPrice) <= 0}
                className="flex-1 py-2 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                List for Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Selection Modal (when clicking Sell Item button) */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Item to Sell</h2>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Your inventory is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {inventory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowInventoryModal(false);
                      openSellModal(item);
                    }}
                    className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 transition-colors"
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center text-5xl">
                      {item.icon}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col h-96">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-gray-900">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-lg max-w-[85%] ${
                    msg.isOwn
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {msg.user} • {msg.time}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceApp;