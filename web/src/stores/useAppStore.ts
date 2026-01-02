import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RoomHistoryItem {
    id: string
    name: string
    joinedAt: string
    joinKey?: string
}

// Available theme colors
export const THEME_COLORS = {
    green: { name: 'グリーン', primary: '#06C755', dark: '#05a647' },
    blue: { name: 'ブルー', primary: '#0084FF', dark: '#006ACC' },
    purple: { name: 'パープル', primary: '#8B5CF6', dark: '#7C3AED' },
    pink: { name: 'ピンク', primary: '#EC4899', dark: '#DB2777' },
    orange: { name: 'オレンジ', primary: '#F97316', dark: '#EA580C' },
    red: { name: 'レッド', primary: '#EF4444', dark: '#DC2626' },
    teal: { name: 'ティール', primary: '#14B8A6', dark: '#0D9488' },
} as const

export type ThemeColorKey = keyof typeof THEME_COLORS

interface AppState {
    deviceId: string
    displayName: string | null
    roomHistory: RoomHistoryItem[]
    themeColor: ThemeColorKey

    setDisplayName: (name: string) => void
    addToHistory: (room: RoomHistoryItem) => void
    removeFromHistory: (roomId: string) => void
    clearHistory: () => void
    setThemeColor: (color: ThemeColorKey) => void
    updateRoomKey: (roomId: string, newKey: string) => void

    // Active Room State (not persisted)
    activeRoomToken: string | null
    setActiveRoomToken: (token: string | null) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            deviceId: crypto.randomUUID(), // Generated once
            displayName: null,
            roomHistory: [],
            activeRoomToken: null,
            themeColor: 'green' as ThemeColorKey,

            setDisplayName: (name) => set({ displayName: name }),

            addToHistory: (room) => {
                const { roomHistory } = get()
                // Remove if exists, add to top, limit 20
                const filtered = roomHistory.filter(r => r.id !== room.id)
                const newHistory = [room, ...filtered].slice(0, 20)
                set({ roomHistory: newHistory })
            },

            removeFromHistory: (roomId) => {
                const { roomHistory } = get()
                set({ roomHistory: roomHistory.filter(r => r.id !== roomId) })
            },

            clearHistory: () => set({ roomHistory: [] }),
            setActiveRoomToken: (token) => set({ activeRoomToken: token }),
            setThemeColor: (color) => set({ themeColor: color }),

            updateRoomKey: (roomId, newKey) => {
                const { roomHistory } = get()
                const updated = roomHistory.map(r =>
                    r.id === roomId ? { ...r, joinKey: newKey } : r
                )
                set({ roomHistory: updated })
            }
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                deviceId: state.deviceId,
                displayName: state.displayName,
                roomHistory: state.roomHistory,
                themeColor: state.themeColor,
                activeRoomToken: state.activeRoomToken
            })
        }
    )
)
