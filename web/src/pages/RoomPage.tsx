import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, setAuthToken, invokeFunction } from '../lib/supabase'
import { useAppStore, THEME_COLORS } from '../stores/useAppStore'
import { Send, Plus, ChevronLeft, QrCode, Users, X, Settings, LogOut, FileText, Image, Video, File, PenTool, HelpCircle, TrendingUp, ListTodo, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { MathText } from '../components/MathText'
import { Whiteboard } from '../components/Whiteboard'
import { GraphMaker } from '../components/GraphMaker'
import { TodoList } from '../components/TodoList'

export function RoomPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const appStore = useAppStore()
    const deviceId = appStore.deviceId
    const displayName = appStore.displayName
    const themeColor = appStore.themeColor
    const activeRoomToken = appStore.activeRoomToken
    const currentTheme = THEME_COLORS[themeColor]

    const [messages, setMessages] = useState<any[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [roomName, setRoomName] = useState('Loading...')
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [currentJoinKey, setCurrentJoinKey] = useState<string | null>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [showQR, setShowQR] = useState(false)
    const [showMembers, setShowMembers] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [showGraphMaker, setShowGraphMaker] = useState(false)
    const [showTodoList, setShowTodoList] = useState(false)

    const removeFromHistory = useAppStore(state => state.removeFromHistory)

    const roomHistory = useAppStore(state => state.roomHistory)
    const updateRoomKey = useAppStore(state => state.updateRoomKey)

    // UI States for interactions
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: any } | null>(null)
    const longPressTimerRef = useRef<any>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!id) return

        // Set auth token for RLS
        if (activeRoomToken) {
            setAuthToken(activeRoomToken)
        }

        const fetchRoom = async () => {
            // Fetch room name
            const { data: roomData } = await supabase
                .from('rooms')
                .select('name, expires_at, owner_device_id')
                .eq('id', id)
                .single()
            if (roomData) {
                setRoomName(roomData.name || 'グループチャット')
                setExpiresAt(roomData.expires_at)
                setIsOwner(roomData.owner_device_id === deviceId)
            }

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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, (payload: any) => {
                setMessages(prev => [...prev, payload.new])
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, (payload: any) => {
                setMessages(prev => prev.filter(m => m.id !== payload.old.id))
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

    // Effect to initialize join key from history or URL
    useEffect(() => {
        if (!id) return

        // 1. Try URL param (most recent)
        const urlKey = location.search.split('key=')[1]?.replace('&', '')
        if (urlKey) {
            setCurrentJoinKey(urlKey)
            // Update history if exists
            const existing = roomHistory.find((r: any) => r.id === id)
            if (existing && existing.joinKey !== urlKey) {
                updateRoomKey(id, urlKey)
            }
        } else {
            // 2. Fallback to history
            const existing = roomHistory.find((r: any) => r.id === id)
            if (existing?.joinKey) {
                setCurrentJoinKey(existing.joinKey)
            }
        }
    }, [id, roomHistory])

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

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('5MB以下のファイルを選択してください')
            return
        }

        setUploading(true)
        try {
            // Get Signed URL
            const filePath = `${id}/${Date.now()}_${file.name}`
            const isImage = file.type.startsWith('image/')
            const kind = isImage ? 'image' : 'file'

            const { token, path } = await invokeFunction('sign_upload', {
                filename: filePath,
                mime: file.type
            }, activeRoomToken || undefined)

            // Upload via Signed URL
            const { error: uploadError } = await supabase.storage
                .from('room-uploads')
                .uploadToSignedUrl(path, token, file)

            if (uploadError) throw uploadError

            // Get Public URL (or use signed URL if private? MVP public)
            const { data: urlData } = supabase.storage
                .from('room-uploads')
                .getPublicUrl(path)

            const publicUrl = urlData.publicUrl

            // Add to messages
            const newMessage = {
                id: crypto.randomUUID(),
                sender_name_snapshot: displayName,
                sender_device_id: deviceId,
                kind: kind,
                body: publicUrl,
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
                body: publicUrl
            })

            // Save attachment record
            await supabase.from('room_attachments').insert({
                room_id: id,
                uploader_device_id: deviceId,
                kind: kind,
                storage_path: path,
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

    // Long press handlers
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, msg: any) => {
        // const touch = 'touches' in e ? e.touches[0] : e as unknown as React.MouseEvent
        // const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        // const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        // For simplicity, we just use a timer. The context menu position will be determined on trigger.
        // Actually, we need the position.

        // Determine coordinates
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        longPressTimerRef.current = setTimeout(() => {
            setContextMenu({
                x: clientX,
                y: clientY,
                message: msg
            })
        }, 500) // 500ms long press
    }

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        setContextMenu(null)
        if (!confirm('このメッセージを削除（送信取り消し）しますか？')) return

        try {
            await invokeFunction('delete_message', {
                room_id: id,
                device_id: deviceId,
                message_id: messageId
            }, activeRoomToken || undefined)
            // Optimistic update
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch (e) {
            alert('削除に失敗しました')
            console.error(e)
        }
    }

    return (
        <div className="flex flex-col h-screen max-h-[100dvh] bg-white" onClick={() => setContextMenu(null)}>
            {/* Header - Theme Color */}
            <header
                className="text-white px-4 py-3 pt-[calc(12px+env(safe-area-inset-top))] flex items-center justify-between shadow-sm"
                style={{ backgroundColor: currentTheme.primary }}
            >
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
                            <Users size={16} />
                            <span>{participants.length}人の参加者</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={async () => {
                            setShowQR(true)
                            // Re-fetch room info to get real expiration
                            if (id) {
                                const { data: roomData } = await supabase
                                    .from('rooms')
                                    .select('expires_at')
                                    .eq('id', id)
                                    .single()
                                if (roomData) {
                                    setExpiresAt(roomData.expires_at)
                                }
                            }
                        }}
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
                            <div id="qr-code-container" className="bg-white p-3 rounded-xl border border-gray-200">
                                {currentJoinKey ? (
                                    <QRCodeSVG
                                        value={`${window.location.origin}/join/${id}?key=${currentJoinKey}`}
                                        size={200}
                                        level="M"
                                    />
                                ) : (
                                    <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs text-center p-4 bg-gray-50 rounded">
                                        キー情報がありません。<br />更新してください。
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-center text-gray-500 text-sm mb-2">
                            このQRコードをスキャンしてグループに参加
                        </p>
                        <p className="text-center text-gray-400 text-xs font-mono truncate mb-4">
                            ID: {id}
                        </p>

                        {expiresAt && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-left">
                                <div className="text-xs text-gray-500 mb-1">QRコード有効期限</div>
                                <div className="text-sm font-medium mb-3">{new Date(expiresAt).toLocaleString()}</div>
                                {isOwner && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm('QRコードを更新しますか？\n(古いQRコードは無効になります)')) return
                                            try {
                                                const { join_key } = await invokeFunction('rotate_qr', {
                                                    room_id: id,
                                                    device_id: deviceId
                                                }, activeRoomToken || undefined)

                                                alert('QRコードを更新しました')
                                                // Update local state and store WITHOUT reload
                                                setCurrentJoinKey(join_key)
                                                updateRoomKey(id, join_key)
                                            } catch (e) {
                                                alert('更新に失敗しました: ' + e)
                                            }
                                        }}
                                        className="w-full text-sm bg-white border border-gray-300 py-2 rounded shadow-sm hover:bg-gray-50 font-medium text-gray-700"
                                    >
                                        QRコード更新
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                const container = document.getElementById('qr-code-container')
                                const svg = container?.querySelector('svg')
                                if (!svg) return

                                // Create canvas and draw SVG
                                const canvas = document.createElement('canvas')
                                const ctx = canvas.getContext('2d')
                                const svgData = new XMLSerializer().serializeToString(svg)
                                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                                const url = URL.createObjectURL(svgBlob)

                                const img = new window.Image()
                                img.onload = () => {
                                    canvas.width = img.width + 40
                                    canvas.height = img.height + 40
                                    if (ctx) {
                                        ctx.fillStyle = 'white'
                                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                                        ctx.drawImage(img, 20, 20)
                                    }
                                    URL.revokeObjectURL(url)

                                    // Download
                                    const link = document.createElement('a')
                                    link.download = `qr-code-${roomName}.png`
                                    link.href = canvas.toDataURL('image/png')
                                    link.click()
                                }
                                img.src = url
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-colors mb-2"
                            style={{ backgroundColor: currentTheme.primary }}
                        >
                            <Download size={18} />
                            <span>QRコードを保存</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Graph Maker */}
            {showGraphMaker && (
                <GraphMaker
                    onClose={() => setShowGraphMaker(false)}
                    onSend={async (graphText) => {
                        if (!id) return
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
                            <h3 className="font-medium mb-3">参加者リスト</h3>
                            <div className="space-y-3 mb-6">
                                {participants.map((p) => (
                                    <div key={p.device_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${p.device_id === deviceId ? 'bg-green-500' : 'bg-gray-400'
                                                }`}>
                                                {p.display_name?.slice(0, 1) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{p.display_name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(p.joined_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        {p.device_id === deviceId && (
                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Me</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* TODO List Modal */}
            {showTodoList && id && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setShowTodoList(false)}>
                    <div
                        className="w-full max-w-sm h-full bg-white shadow-xl animate-enter"
                        onClick={e => e.stopPropagation()}
                    >
                        <TodoList roomId={id} onClose={() => setShowTodoList(false)} />
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
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">ルーム名</p>
                                <p className="font-medium text-gray-900">{roomName}</p>
                            </div>

                            {expiresAt && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <div className="text-xs text-gray-500 mb-1">有効期限</div>
                                    <div className="text-sm font-medium">{new Date(expiresAt).toLocaleString()}</div>
                                </div>
                            )}

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
                                className="w-full flex items-center gap-3 p-4 rounded-xl text-line-green hover:bg-green-50 transition-colors border-t border-gray-100"
                            >
                                <HelpCircle size={20} />
                                <span className="font-medium">機能の使い方を見る</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center animate-enter" onClick={() => setPreviewImage(null)}>
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 rounded-full"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                        onClick={e => e.stopPropagation()}
                    />
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                        <button
                            onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                    const response = await fetch(previewImage);
                                    const blob = await response.blob();
                                    const file = new (window.File as any)([blob], `image-${Date.now()}.png`, { type: blob.type });

                                    // Try Web Share API first (Best for Mobile "Save to Photos")
                                    if (navigator.share && navigator.canShare({ files: [file] })) {
                                        await navigator.share({
                                            files: [file],
                                            title: '画像を保存',
                                        })
                                    } else {
                                        // Fallback to Download Link (Desktop / Unsupported browsers)
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `image-${Date.now()}.png`; // Simple download
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                    }
                                } catch (err) {
                                    console.error('Save failed', err)
                                    // If share is cancelled by user, it throws an error in some browsers, ignore it or show simplified alert
                                    if ((err as Error).name !== 'AbortError') {
                                        alert('保存または共有に失敗しました')
                                    }
                                }
                            }}
                            className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
                        >
                            <Download size={20} />
                            保存 / 共有
                        </button>
                    </div>
                </div>
            )}

            {/* Message Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[70] bg-white rounded-lg shadow-xl py-2 w-48 animate-enter border border-gray-100"
                    style={{
                        top: Math.min(contextMenu.y, window.innerHeight - 150),
                        left: Math.min(contextMenu.x, window.innerWidth - 200)
                    }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (contextMenu.message.body) {
                                navigator.clipboard.writeText(contextMenu.message.body)
                                setContextMenu(null)
                            }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2"
                    >
                        <FileText size={16} /> コピー
                    </button>

                    {/* Only show unsend if it's my message */}
                    {contextMenu.message.sender_device_id === deviceId && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteMessage(contextMenu.message.id)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-medium flex items-center gap-2"
                        >
                            <X size={16} /> 送信取り消し
                        </button>
                    )}
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
                                    <div
                                        className={`px-4 py-2.5 text-[15px] leading-relaxed ${isMe ? 'bubble-mine' : 'bubble-other'} relative group select-none`}
                                        style={isMe ? { backgroundColor: currentTheme.primary } : undefined}
                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                        onTouchEnd={handleTouchEnd}
                                        onContextMenu={(e) => {
                                            e.preventDefault()
                                            setContextMenu({ x: e.clientX, y: e.clientY, message: msg })
                                        }}
                                    >
                                        {msg.kind === 'image' ? (
                                            <img
                                                src={msg.body}
                                                alt="shared image"
                                                className="max-w-full rounded-lg cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setPreviewImage(msg.body)
                                                }}
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
            <div className="input-bar relative">
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
                        <button
                            onClick={() => {
                                setShowTodoList(true)
                                setShowAttachMenu(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                <ListTodo size={20} className="text-teal-600" />
                            </div>
                            <span className="font-medium">タスクリスト</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={uploading}
                    className="flex-shrink-0 p-2 text-gray-500 hover:text-line-green transition-colors disabled:opacity-50"
                >
                    {uploading ? (
                        <span className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-line-green rounded-full block" />
                    ) : (
                        <Plus size={24} className={showAttachMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
                    )}
                </button>
                <input
                    className="input-field"
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
                    style={{ backgroundColor: text.trim() ? currentTheme.primary : undefined }}
                >
                    <Send size={18} />
                </button>
            </div>

            {/* Whiteboard */}
            {
                showWhiteboard && (
                    <Whiteboard
                        onClose={() => setShowWhiteboard(false)}
                        onSend={async (blob) => {
                            if (!id) return
                            setShowWhiteboard(false)
                            setUploading(true)
                            try {
                                const fileName = `whiteboard_${Date.now()}.png`
                                const filePath = `${id}/${fileName}`

                                // Get Signed URL
                                const { token, path } = await invokeFunction('sign_upload', {
                                    filename: filePath,
                                    mime: 'image/png'
                                }, activeRoomToken || undefined)

                                // Upload
                                const { error: uploadError } = await supabase.storage
                                    .from('room-uploads')
                                    .uploadToSignedUrl(path, token, blob)

                                if (uploadError) throw uploadError

                                const { data: urlData } = supabase.storage
                                    .from('room-uploads')
                                    .getPublicUrl(path)

                                const publicUrl = urlData.publicUrl

                                const newMessage = {
                                    id: crypto.randomUUID(),
                                    sender_name_snapshot: displayName,
                                    sender_device_id: deviceId,
                                    body: publicUrl,
                                    kind: 'image',
                                    created_at: new Date().toISOString()
                                }
                                setMessages(prev => [...prev, newMessage])

                                await supabase.from('room_messages').insert({
                                    room_id: id,
                                    sender_device_id: deviceId,
                                    sender_name_snapshot: displayName || 'Anon',
                                    kind: 'image',
                                    body: publicUrl
                                })

                                await supabase.from('room_attachments').insert({
                                    room_id: id,
                                    uploader_device_id: deviceId,
                                    kind: 'image',
                                    storage_path: path,
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
                )
            }
        </div >
    )
}
