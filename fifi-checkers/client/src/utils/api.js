import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('fifi_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('fifi_token');
            window.location.reload();
        }
        return Promise.reject(error.response?.data || error);
    }
);

// Auth
export const authenticate = (initData) =>
    api.post('/users/auth', { initData });

// User
export const getProfile = () =>
    api.get('/users/profile');

export const claimDailyReward = () =>
    api.post('/users/daily-reward');

export const getFriends = () =>
    api.get('/users/friends');

export const sendFriendRequest = (targetTelegramId) =>
    api.post('/users/friends/request', { targetTelegramId });

export const acceptFriendRequest = (fromTelegramId) =>
    api.post('/users/friends/accept', { fromTelegramId });

export const rejectFriendRequest = (fromTelegramId) =>
    api.post('/users/friends/reject', { fromTelegramId });

export const removeFriend = (friendTelegramId) =>
    api.post('/users/friends/remove', { friendTelegramId });

export const searchUsers = (query) =>
    api.get(`/users/search?query=${query}`);

// Leaderboard
export const getGlobalLeaderboard = () =>
    api.get('/leaderboard/global');

export const getFriendsLeaderboard = () =>
    api.get('/leaderboard/friends');

export const getMyRank = () =>
    api.get('/leaderboard/my-rank');

// Matches
export const getActiveMatch = () =>
    api.get('/matches/active');

export const getMatchHistory = (page = 1, limit = 20) =>
    api.get(`/matches/history?page=${page}&limit=${limit}`);

export const getStats = () =>
    api.get('/matches/stats');

export default api;