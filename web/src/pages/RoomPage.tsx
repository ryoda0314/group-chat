import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import { Send, Image as ImageIcon, QrCode, ChevronLeft, Lock, MoreVertical } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export function RoomPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { deviceId, displayName } = useAppStore()

    const [messages, setMessages] = useState<any[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [roomName, setRoomName] = useState('Loading...')
    const [showQR, setShowQR] = useState(false)

    // Future implementation: Lock status
    const isLocked = false

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!id) return

        // Initial Fetch
        const fetchRoom = async () => {
            // Mock fetch room metadata
            setRoomName(`Room ${id.slice(0, 4)}`)
            setLoading(false)
        }
        fetchRoom()

        // Realtime Subscription
        const channel = supabase
            .channel(`room:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, (payload) => {
                setMessages(prev => [...prev, payload.new])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!text.trim() || !id) return
        const body = text.trim()
        setText('')

        // Optimistic update
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender_name_snapshot: displayName,
            sender_device_id: deviceId, // Own message
            body: body,
            kind: 'text',
            created_at: new Date().toISOString()
        }])

        try {
            await supabase.from('room_messages').insert({
                room_id: id,
                sender_device_id: deviceId,
                sender_name_snapshot: displayName || 'Anon',
                kind: 'text',
                body: body
            })
        } catch (e) {
            console.error('Send failed', e)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-deep text-white">
            {/* Header */}
            <header className="px-4 py-4 backdrop-blur-md bg-surface/80 border-b border-white/5 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold flex items-center gap-2">
                            {roomName}
                            {isLocked && <Lock size={14} className="text-red-400" />}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-neutral-500 font-mono">LIVE SECURE CHANNEL</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowQR(!showQR)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-blue-400">
                        <QrCode size={20} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </header>

            {/* QR Overlay */}
            {showQR && id && (
                <div className="absolute inset-x-0 top-16 z-30 p-4 animate-enter">
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-4 text-center shadow-2xl">
                        <div className="bg-white p-2 rounded-xl">
                            <QRCodeSVG value={`https://groupchat.app/join?rid=${id}&key=placeholder`} size={180} />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Scan to Join</p>
                            <p className="text-xs text-neutral-500 font-mono mt-1 break-all">{id}</p>
                        </div>
                        <button onClick={() => setShowQR(false)} className="text-sm text-blue-400">Close</button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !loading && (
                    <div className="text-center text-neutral-600 mt-20 text-sm font-mono">
                        Beginning of encrypted history.
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isMe = msg.sender_device_id === deviceId
                    return (
                        <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && <span className="text-[10px] text-neutral-500 ml-3 mb-1">{msg.sender_name_snapshot}</span>}
                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-br-sm'
                                    : 'bg-surface border border-white/10 text-neutral-200 rounded-bl-sm'
                                }`}>
                                {msg.body}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Input */}
            <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-white/5">
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-2 py-2">
                    <button className="p-2 text-neutral-500 hover:text-white transition-colors">
                        <ImageIcon size={20} />
                    </button>
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-neutral-600 px-2"
                        placeholder="Message..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim()}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:bg-neutral-800"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
