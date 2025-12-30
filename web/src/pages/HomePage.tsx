import { Link, useNavigate } from 'react-router-dom'
import { Settings, Plus, QrCode, Hash, Users, Clock } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { useState } from 'react'
import { invokeFunction } from '../lib/supabase'

export function HomePage() {
    const roomHistory = useAppStore(state => state.roomHistory)
    const deviceId = useAppStore(state => state.deviceId)
    const displayName = useAppStore(state => state.displayName)
    const addToHistory = useAppStore(state => state.addToHistory)
    const navigate = useNavigate()

    const [isCreating, setIsCreating] = useState(false)

    const handleCreateRoom = async () => {
        const name = prompt("Enter Room Name (Optional)")
        if (name === null) return

        setIsCreating(true)
        try {
            const { room } = await invokeFunction('create_room', {
                device_id: deviceId,
                display_name: displayName,
                room_name: name || 'Untitled Protocol'
            })

            if (room) {
                addToHistory({
                    id: room.id,
                    name: room.name || 'Untitled Protocol',
                    joinedAt: new Date().toISOString()
                })
                navigate(`/room/${room.id}`)
            }
        } catch (e: any) {
            console.error(e)
            alert("Error creating room: " + (e.message || "Unknown error"))
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-deep text-white relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center">
                        <Hash className="text-blue-500" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Channels</h1>
                        <p className="text-xs text-neutral-500 font-mono">Active Uplinks: {roomHistory.length}</p>
                    </div>
                </div>
                <Link to="/settings" className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                    <Settings size={20} className="text-neutral-400" />
                </Link>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 z-10 pb-24">
                {roomHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-enter">
                        <div className="w-20 h-20 rounded-full bg-surface border border-dashed border-neutral-700 flex items-center justify-center">
                            <Users className="text-neutral-600" size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-neutral-300 font-medium">No Active Signals</p>
                            <p className="text-neutral-500 text-sm max-w-[200px] mx-auto">Create a secure room or scan a code to join the network.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {roomHistory.map((room, i) => (
                            <Link
                                key={room.id}
                                to={`/room/${room.id}`}
                                className="group block bg-surface/50 border border-white/5 p-5 rounded-2xl hover:bg-surface hover:border-blue-500/30 transition-all duration-300 animate-enter"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-lg text-neutral-200 group-hover:text-blue-400 transition-colors">
                                        {room.name}
                                    </div>
                                    <span className="text-[10px] font-mono bg-white/5 py-1 px-2 rounded text-neutral-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                        {room.id.slice(0, 4)}...
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono">
                                    <Clock size={12} />
                                    <span>Joined {new Date(room.joinedAt).toLocaleDateString()}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Action Bar */}
            <div className="absolute bottom-6 left-6 right-6 z-20">
                <div className="glass-panel p-2 rounded-2xl flex items-center justify-between shadow-2xl shadow-black/50">
                    <Link to="/join" className="flex-1 py-4 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl">
                        <QrCode size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Scan</span>
                    </Link>
                    <div className="w-[1px] h-8 bg-white/10 mx-2" />
                    <button
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className="flex-1 py-4 flex flex-col items-center justify-center gap-1 text-blue-400 hover:text-blue-300 transition-colors hover:bg-blue-500/10 rounded-xl"
                    >
                        {isCreating ? (
                            <span className="animate-spin w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full" />
                        ) : (
                            <Plus size={24} />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider">Create</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
