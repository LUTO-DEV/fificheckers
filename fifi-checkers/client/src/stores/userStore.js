import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: true,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setToken: (token) => {
                localStorage.setItem('fifi_token', token);
                set({ token });
            },

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            updateCoins: (coins) => set((state) => ({
                user: state.user ? { ...state.user, coins } : null
            })),

            setLoading: (isLoading) => set({ isLoading }),

            logout: () => {
                localStorage.removeItem('fifi_token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            // Computed
            get canPlay() {
                return get().user !== null;
            }
        }),
        {
            name: 'fifi-user-store',
            partialize: (state) => ({ token: state.token })
        }
    )
);

export default useUserStore;