import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import MarketplaceApp from './MarketplaceAppNew.jsx'
import { WalletContextProvider } from './WalletProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletContextProvider>
      <MarketplaceApp />
    </WalletContextProvider>
  </React.StrictMode>,
)
