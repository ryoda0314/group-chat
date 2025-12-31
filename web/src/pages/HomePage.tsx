import { Link, useNavigate } from 'react-router-dom'
import { Plus, QrCode, MessageCircle, Settings } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { useState } from 'react'
import { invokeFunction, setAuthToken } from '../lib/supabase'

export function HomePage() {
    const roomHistory = useAppStore(state => state.roomHistory)
    const deviceId = useAppStore(state => state.deviceId)
    const displayName = useAppStore(state => state.displayName)
    const addToHistory = useAppStore(state => state.addToHistory)
    const setActiveRoomToken = useAppStore(state => state.setActiveRoomToken)
    const navigate = useNavigate()

    const [isCreating, setIsCreating] = useState(false)

    const handleCreateRoom = async () => {
        const name = prompt("トークルーム名を入力（任意）")
        if (name === null) return

        setIsCreating(true)
        try {
            const { room, token } = await invokeFunction('create_room', {
                device_id: deviceId,
                display_name: displayName,
                room_name: name || '新しいトークルーム'
            })

            if (room && token) {
                // Set auth token for RLS
                setAuthToken(token)
                setActiveRoomToken(token)

                addToHistory({
                    id: room.id,
                    name: room.name || '新しいトークルーム',
                    joinedAt: new Date().toISOString()
                })
                navigate(`/room/${room.id}`)
            }
        } catch (e: any) {
            console.error(e)
            alert("ルーム作成エラー: " + (e.message || "Unknown error"))
        } finally {
            setIsCreating(false)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        } else if (diffDays === 1) {
            return '昨日'
        } else if (diffDays < 7) {
            return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()] + '曜日'
        } else {
            return `${date.getMonth() + 1}/${date.getDate()}`
        }
    }

    const getInitial = (name: string) => {
        return name?.charAt(0)?.toUpperCase() || '?'
    }

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <header className="bg-line-green text-white px-4 py-4 flex items-center justify-between shadow-sm">
                <h1 className="font-bold text-xl">トーク</h1>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        {isCreating ? (
                            <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full block" />
                        ) : (
                            <Plus size={22} />
                        )}
                    </button>
                    <Link to="/settings" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Settings size={22} />
                    </Link>
                </div>
            </header>

            {/* Search placeholder (optional style) */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-gray-400 text-sm">
                    🔍 検索
                </div>
            </div>

            {/* Chat List */}
            <main className="flex-1 overflow-y-auto">
                {roomHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                            <MessageCircle className="text-gray-300" size={40} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-600 font-medium">トークがありません</p>
                            <p className="text-gray-400 text-sm">新しいトークルームを作成してみましょう</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        {roomHistory.map((room) => (
                            <Link
                                key={room.id}
                                to={`/room/${room.id}`}
                                className="room-item"
                            >
                                {/* Avatar */}
                                <div className="avatar text-lg">
                                    {getInitial(room.name)}
                                </div>

                                {/* Room info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900 truncate">{room.name}</span>
                                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                            {formatDate(room.joinedAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate mt-0.5">
                                        タップしてトークを開く
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <nav className="flex items-center justify-around py-2 bg-white border-t border-gray-200">
                <Link to="/home" className="flex flex-col items-center gap-1 text-line-green py-2 px-4">
                    <MessageCircle size={24} />
                    <span className="text-[10px] font-medium">トーク</span>
                </Link>
                <Link to="/join" className="flex flex-col items-center gap-1 text-gray-400 py-2 px-4 hover:text-line-green transition-colors">
                    <QrCode size={24} />
                    <span className="text-[10px] font-medium">QRスキャン</span>
                </Link>
            </nav>
        </div>
    )
}
