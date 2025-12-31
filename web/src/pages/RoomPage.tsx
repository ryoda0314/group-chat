import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import { Send, Plus, ChevronLeft, QrCode, Users, X, Settings, LogOut, FileText, Image, Video, File, PenTool, HelpCircle, TrendingUp } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { MathText } from '../components/MathText'
import { Whiteboard } from '../components/Whiteboard'
import { GraphMaker } from '../components/GraphMaker'

export function RoomPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { deviceId, displayName } = useAppStore()

    const [messages, setMessages] = useState<any[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [roomName, setRoomName] = useState('Loading...')
    const [participants, setParticipants] = useState<any[]>([])
    const [showQR, setShowQR] = useState(false)
    const [showMembers, setShowMembers] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [showGraphMaker, setShowGraphMaker] = useState(false)

    const removeFromHistory = useAppStore(state => state.removeFromHistory)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!id) return

        const fetchRoom = async () => {
            // Fetch room name
            const { data: roomData } = await supabase
                .from('rooms')
                .select('name')
                .eq('id', id)
                .single()
            if (roomData?.name) setRoomName(roomData.name)
            else setRoomName('グループチャット')

            // Fetch participants
            const { data: parts } = await supabase
                .from('room_participants')
                .select('device_id, display_name, joined_at')
                .eq('room_id', id)
            if (parts) setParticipants(parts)

            // Fetch existing messages
            const { data: msgs } = await supabase
                .from('room_messages')
                .select('*')
                .eq('room_id', id)
                .order('created_at', { ascending: true })
            if (msgs) setMessages(msgs)

            setLoading(false)
        }
        fetchRoom()

        const channel = supabase
            .channel(`room:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, (payload) => {
                setMessages(prev => [...prev, payload.new])
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, async () => {
                // Refresh participants on change
                const { data: parts } = await supabase
                    .from('room_participants')
                    .select('device_id, display_name, joined_at')
                    .eq('room_id', id)
                if (parts) setParticipants(parts)
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

        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender_name_snapshot: displayName,
            sender_device_id: deviceId,
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !id) return

        setUploading(true)
        try {
            // Upload to Supabase Storage
            const filePath = `${id}/${Date.now()}_${file.name}`
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath)

            // Determine if image or file
            const isImage = file.type.startsWith('image/')
            const kind = isImage ? 'image' : 'file'

            // Add to messages
            const newMessage = {
                id: crypto.randomUUID(),
                sender_name_snapshot: displayName,
                sender_device_id: deviceId,
                body: urlData.publicUrl,
                kind: kind,
                filename: file.name,
                created_at: new Date().toISOString()
            }
            setMessages(prev => [...prev, newMessage])

            // Save to database
            await supabase.from('room_messages').insert({
                room_id: id,
                sender_device_id: deviceId,
                sender_name_snapshot: displayName || 'Anon',
                kind: kind,
                body: urlData.publicUrl
            })

            // Save attachment record
            await supabase.from('room_attachments').insert({
                room_id: id,
                uploader_device_id: deviceId,
                kind: kind,
                storage_path: filePath,
                mime: file.type,
                size_bytes: file.size,
                filename: file.name
            })
        } catch (err) {
            console.error('Upload failed:', err)
            alert('ファイルのアップロードに失敗しました')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }

    const getInitial = (name: string) => {
        return name?.charAt(0)?.toUpperCase() || '?'
    }

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header - LINE Green */}
            <header className="bg-line-green text-white px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/home')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-semibold text-lg">{roomName}</h1>
                        <button
                            onClick={() => setShowMembers(true)}
                            className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition-colors"
                        >
                            <Users size={12} />
                            <span>{participants.length}人のメンバー</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowQR(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <QrCode size={20} />
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* QR Code Modal */}
            {showQR && id && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-enter" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-gray-900">友達を招待</h2>
                            <button onClick={() => setShowQR(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-3 rounded-xl border border-gray-200">
                                <QRCodeSVG
                                    value={`${window.location.origin}/join?rid=${id}&key=placeholder`}
                                    size={200}
                                    level="M"
                                />
                            </div>
                        </div>
                        <p className="text-center text-gray-500 text-sm">
                            このQRコードをスキャンしてグループに参加
                        </p>
                        <p className="text-center text-gray-400 text-xs mt-2 font-mono truncate">
                            ID: {id}
                        </p>
                    </div>
                </div>
            )}

            {/* Graph Maker */}
            {showGraphMaker && (
                <GraphMaker
                    onClose={() => setShowGraphMaker(false)}
                    onSend={async (graphText) => {
                        setShowGraphMaker(false)
                        const newMessage = {
                            id: crypto.randomUUID(),
                            sender_name_snapshot: displayName,
                            sender_device_id: deviceId,
                            body: graphText,
                            kind: 'text',
                            created_at: new Date().toISOString()
                        }
                        setMessages(prev => [...prev, newMessage])

                        // Save to DB
                        try {
                            await supabase.from('room_messages').insert({
                                room_id: id,
                                sender_device_id: deviceId,
                                sender_name_snapshot: displayName || 'Anon',
                                kind: 'text',
                                body: graphText
                            })
                        } catch (err) {
                            console.error('Failed to send graph:', err)
                        }
                    }}
                />
            )}

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-enter" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-gray-900">スマート機能の使い方</h2>
                            <button onClick={() => setShowHelp(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-6 text-sm text-gray-700">
                            {/* Code */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="bg-gray-100 p-1 rounded">{'```'}</span> コードの共有
                                </h3>
                                <p className="mb-2">コードブロックを作成します。言語を指定すると色分けされます。</p>
                                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs">
                                    <span className="text-gray-400">```python</span><br />
                                    print("Hello")<br />
                                    <span className="text-gray-400">```</span>
                                </div>
                            </div>

                            {/* Math */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="bg-gray-100 p-1 rounded">$</span> 数式の入力 (LaTeX)
                                </h3>
                                <p className="mb-2">
                                    インライン数式は <span className="font-mono bg-gray-100 px-1">$...$</span>、<br />
                                    ディスプレイ数式は <span className="font-mono bg-gray-100 px-1">$$...$$</span> で囲みます。
                                </p>
                                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs">
                                    {'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'}
                                </div>
                            </div>

                            {/* Graph */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="bg-gray-100 p-1 rounded">graph:</span> グラフの描画
                                </h3>
                                <p className="mb-2">数式のグラフを描画します。範囲指定も可能です。</p>
                                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs space-y-2">
                                    <p>基本: <span className="text-green-600">graph: sin(x)</span></p>
                                    <p>範囲指定: <span className="text-green-600">graph: x^2 | x:[-5, 5]</span></p>
                                    <p>Y軸も指定: <span className="text-green-600">graph: 1/x | x:[0.1, 5] | y:[0, 10]</span></p>
                                </div>
                            </div>

                            {/* Chemistry */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="bg-gray-100 p-1 rounded">\ce</span> 化学式
                                </h3>
                                <p className="mb-2">{`\\ce{...}`}を使って化学式をきれいに表示できます。</p>
                                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs">
                                    {`\\ce{H2O}`}<br />
                                    {`\\ce{CO2 + H2O -> H2CO3}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembers && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMembers(false)}>
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-enter max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-gray-900">メンバー ({participants.length})</h2>
                            <button onClick={() => setShowMembers(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {participants.map((p, i) => (
                                <div key={p.device_id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                                    <div className="avatar">
                                        {getInitial(p.display_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {p.display_name}
                                            {p.device_id === deviceId && (
                                                <span className="ml-2 text-xs bg-line-green text-white px-2 py-0.5 rounded-full">自分</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(p.joined_at).toLocaleDateString('ja-JP')} に参加
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {participants.length === 0 && (
                                <p className="text-center text-gray-400 py-4">メンバーがいません</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-enter" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-gray-900">設定</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">ルーム名</p>
                                <p className="font-medium text-gray-900">{roomName}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">ルームID</p>
                                <p className="font-mono text-xs text-gray-600 truncate">{id}</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm('このトークルームを退出しますか？履歴から削除されます。')) {
                                        if (id) {
                                            removeFromHistory(id)
                                        }
                                        navigate('/home')
                                    }
                                }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">トークルームを退出</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowSettings(false)
                                    setShowHelp(true)
                                }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl text-line-green hover:bg-green-50 transition-colors border-t border-gray-100 mt-2"
                            >
                                <HelpCircle size={20} />
                                <span className="font-medium">機能の使い方を見る</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages - Blue-ish chat background like LINE */}
            <main className="flex-1 overflow-y-auto bg-chat-bg p-4 space-y-3">
                {/* Date Separator */}
                <div className="date-separator">
                    <span>{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {messages.length === 0 && !loading && (
                    <div className="text-center text-white/70 mt-10 text-sm">
                        メッセージはまだありません
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isMe = msg.sender_device_id === deviceId
                    const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_device_id !== msg.sender_device_id)

                    return (
                        <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-enter w-full`}>
                            {/* Avatar for others */}
                            {!isMe && (
                                <div className="mr-2 flex-shrink-0">
                                    {showAvatar ? (
                                        <div className="avatar">{getInitial(msg.sender_name_snapshot)}</div>
                                    ) : (
                                        <div className="w-9" /> // Spacer
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {/* Sender name for others */}
                                {!isMe && showAvatar && (
                                    <span className="text-xs text-gray-600 mb-1 ml-1">{msg.sender_name_snapshot}</span>
                                )}

                                <div className={`flex items-end gap-1 ${isMe ? 'flex-row' : 'flex-row'}`}>
                                    {/* Timestamp for my messages (left side) */}
                                    {isMe && (
                                        <span className="timestamp flex-shrink-0">{formatTime(msg.created_at)}</span>
                                    )}

                                    {/* Message bubble */}
                                    <div className={`px-4 py-2.5 text-[15px] leading-relaxed ${isMe ? 'bubble-mine' : 'bubble-other'}`}>
                                        {msg.kind === 'image' ? (
                                            <img
                                                src={msg.body}
                                                alt="shared image"
                                                className="max-w-full rounded-lg cursor-pointer"
                                                onClick={() => window.open(msg.body, '_blank')}
                                            />
                                        ) : msg.kind === 'file' ? (
                                            <a
                                                href={msg.body}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-inherit hover:underline"
                                            >
                                                <FileText size={20} />
                                                <span className="truncate">{msg.filename || 'ファイル'}</span>
                                            </a>
                                        ) : (
                                            <MathText text={msg.body || ''} />
                                        )}
                                    </div>

                                    {/* Timestamp for others (right side) */}
                                    {!isMe && (
                                        <span className="timestamp flex-shrink-0">{formatTime(msg.created_at)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Bar */}
            <div className="input-bar flex items-center gap-2 relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {/* Attachment Menu */}
                {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-enter">
                        <button
                            onClick={() => {
                                fileInputRef.current!.accept = 'image/*'
                                fileInputRef.current?.click()
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Image size={20} className="text-green-600" />
                            </div>
                            <span className="font-medium">画像</span>
                        </button>
                        <button
                            onClick={() => {
                                fileInputRef.current!.accept = 'video/*'
                                fileInputRef.current?.click()
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <Video size={20} className="text-purple-600" />
                            </div>
                            <span className="font-medium">動画</span>
                        </button>
                        <button
                            onClick={() => {
                                fileInputRef.current!.accept = '*/*'
                                fileInputRef.current?.click()
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <File size={20} className="text-blue-600" />
                            </div>
                            <span className="font-medium">ファイル</span>
                        </button>
                        <button
                            onClick={() => {
                                setShowWhiteboard(true)
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <PenTool size={20} className="text-orange-600" />
                            </div>
                            <span className="font-medium">ホワイトボード</span>
                        </button>
                        <button
                            onClick={() => {
                                setShowGraphMaker(true)
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <TrendingUp size={20} className="text-indigo-600" />
                            </div>
                            <span className="font-medium">グラフ作成</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={uploading}
                    className="p-2 text-gray-500 hover:text-line-green transition-colors disabled:opacity-50"
                >
                    {uploading ? (
                        <span className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-line-green rounded-full block" />
                    ) : (
                        <Plus size={24} className={showAttachMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
                    )}
                </button>
                <input
                    className="input-field flex-1"
                    placeholder="メッセージを入力..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    onFocus={() => setShowAttachMenu(false)}
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="send-btn"
                >
                    <Send size={18} />
                </button>
            </div>

            {/* Whiteboard */}
            {showWhiteboard && (
                <Whiteboard
                    onClose={() => setShowWhiteboard(false)}
                    onSend={async (blob) => {
                        setShowWhiteboard(false)
                        setUploading(true)
                        try {
                            const fileName = `whiteboard_${Date.now()}.png`
                            const filePath = `${id}/${fileName}`

                            const { error: uploadError } = await supabase.storage
                                .from('attachments')
                                .upload(filePath, blob, { contentType: 'image/png' })

                            if (uploadError) throw uploadError

                            const { data: urlData } = supabase.storage
                                .from('attachments')
                                .getPublicUrl(filePath)

                            const newMessage = {
                                id: crypto.randomUUID(),
                                sender_name_snapshot: displayName,
                                sender_device_id: deviceId,
                                body: urlData.publicUrl,
                                kind: 'image',
                                created_at: new Date().toISOString()
                            }
                            setMessages(prev => [...prev, newMessage])

                            await supabase.from('room_messages').insert({
                                room_id: id,
                                sender_device_id: deviceId,
                                sender_name_snapshot: displayName || 'Anon',
                                kind: 'image',
                                body: urlData.publicUrl
                            })

                            await supabase.from('room_attachments').insert({
                                room_id: id,
                                uploader_device_id: deviceId,
                                kind: 'image',
                                storage_path: filePath,
                                mime: 'image/png',
                                size_bytes: blob.size,
                                filename: fileName
                            })
                        } catch (err) {
                            console.error('Whiteboard upload failed:', err)
                            alert('ホワイトボードの送信に失敗しました')
                        } finally {
                            setUploading(false)
                        }
                    }}
                />
            )}
        </div>
    )
}
