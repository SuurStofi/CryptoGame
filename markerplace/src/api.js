import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      localStorage.removeItem('jwt_token');
      // Don't redirect here, let the component handle it
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  getNonce: async (walletAddress) => {
    const response = await api.post('/auth/nonce', { walletAddress });
    return response.data;
  },

  verify: async (walletAddress, signature) => {
    const response = await api.post('/auth/verify', { walletAddress, signature });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const tokensAPI = {
  getBalance: async (walletAddress) => {
    const response = await api.get(`/tokens/balance/${walletAddress}`);
    return response.data;
  },
};

export const marketplaceAPI = {
  getListings: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/marketplace/listings?${params}`);
    return response.data;
  },

  getListing: async (id) => {
    const response = await api.get(`/marketplace/listings/${id}`);
    return response.data;
  },

  createListing: async (tokenType, price, amount) => {
    const response = await api.post('/marketplace/listings', {
      tokenType,
      price,
      amount,
    });
    return response.data;
  },

  deleteListing: async (id) => {
    const response = await api.delete(`/marketplace/listings/${id}`);
    return response.data;
  },

  initiateBuy: async (id) => {
    const response = await api.post(`/marketplace/buy/${id}`);
    return response.data;
  },

  confirmPurchase: async (listingId, transactionSignature) => {
    const response = await api.post('/marketplace/confirm-purchase', {
      listingId,
      transactionSignature,
    });
    return response.data;
  },

  getMyListings: async (status = 'active') => {
    const response = await api.get(`/marketplace/my-listings?status=${status}`);
    return response.data;
  },

  getEscrowInfo: async (tokenType) => {
    const response = await api.get(`/marketplace/escrow/${tokenType}`);
    return response.data;
  },
};

export default api;

