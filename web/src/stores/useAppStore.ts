import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RoomHistoryItem {
    id: string
    name: string
    joinedAt: string
}

interface AppState {
    deviceId: string
    displayName: string | null
    roomHistory: RoomHistoryItem[]

    setDisplayName: (name: string) => void
    addToHistory: (room: RoomHistoryItem) => void
    clearHistory: () => void

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

            setDisplayName: (name) => set({ displayName: name }),

            addToHistory: (room) => {
                const { roomHistory } = get()
                // Remove if exists, add to top, limit 20
                const filtered = roomHistory.filter(r => r.id !== room.id)
                const newHistory = [room, ...filtered].slice(0, 20)
                set({ roomHistory: newHistory })
            },

            clearHistory: () => set({ roomHistory: [] }),
            setActiveRoomToken: (token) => set({ activeRoomToken: token })
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                deviceId: state.deviceId,
                displayName: state.displayName,
                roomHistory: state.roomHistory
            })
        }
    )
)
