import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BrowserQRCodeReader } from '@zxing/browser'
import { invokeFunction } from '../lib/supabase'
import { useAppStore, THEME_COLORS } from '../stores/useAppStore'
import { ChevronLeft, Camera, Keyboard, ImageIcon } from 'lucide-react'

export function JoinPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { deviceId, displayName, addToHistory, setActiveRoomToken, themeColor } = useAppStore()
    const currentTheme = THEME_COLORS[themeColor]

    const [error, setError] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [showManual, setShowManual] = useState(false)
    const [isLoadingImage, setIsLoadingImage] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const codeReader = useRef(new BrowserMultiFormatReader())
    const qrReader = useRef(new BrowserQRCodeReader())
    const controlsRef = useRef<any>(null)

    const ridParam = searchParams.get('rid')
    const keyParam = searchParams.get('key')

    useEffect(() => {
        if (ridParam && keyParam && displayName) {
            joinRoom(ridParam, keyParam)
        }
    }, [ridParam, keyParam, displayName])

    const joinRoom = async (rid: string, key: string) => {
        try {
            const { room, token } = await invokeFunction('join_room', {
                device_id: deviceId,
                display_name: displayName,
                rid,
                key
            })

            if (room && token) {
                addToHistory({
                    id: room.id,
                    name: room.name || 'Room',
                    joinedAt: new Date().toISOString()
                })
                setActiveRoomToken(token)
                navigate(`/room/${room.id}`)
            }
        } catch (e: any) {
            setError(e.message || '参加に失敗しました')
        }
    }

    const startScan = async () => {
        setIsScanning(true)
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                const controls = await codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result: any, _err: any, controls: any) => {
                    if (result) {
                        const text = result.getText()
                        try {
                            const url = new URL(text)
                            let rid = url.searchParams.get('rid')
                            const key = url.searchParams.get('key')

                            // Fallback: Check for /join/:rid format
                            if (!rid && url.pathname.includes('/join/')) {
                                const matches = url.pathname.match(/\/join\/([^\/]+)/)
                                if (matches && matches[1]) {
                                    rid = matches[1]
                                }
                            }

                            if (rid && key) {
                                controls.stop()
                                controlsRef.current = null
                                stream.getTracks().forEach(t => t.stop())
                                joinRoom(rid, key)
                            }
                        } catch {
                            // Ignore
                        }
                    }
                })
                controlsRef.current = controls
            }
        } catch (e) {
            setError('カメラへのアクセスに失敗しました')
            setIsScanning(false)
        }
    }

    const stopScan = () => {
        setIsScanning(false)
        if (controlsRef.current) {
            controlsRef.current.stop()
            controlsRef.current = null
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(t => t.stop())
        }
    }

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoadingImage(true)
        setError(null)

        try {
            // Create image URL from file
            const imageUrl = URL.createObjectURL(file)

            // Decode QR code from image
            const result = await qrReader.current.decodeFromImageUrl(imageUrl)
            URL.revokeObjectURL(imageUrl)

            if (result) {
                const text = result.getText()
                try {
                    const url = new URL(text)
                    let rid = url.searchParams.get('rid')
                    const key = url.searchParams.get('key')

                    // Fallback: Check for /join/:rid format
                    if (!rid && url.pathname.includes('/join/')) {
                        const matches = url.pathname.match(/\/join\/([^\/]+)/)
                        if (matches && matches[1]) {
                            rid = matches[1]
                        }
                    }

                    if (rid && key) {
                        joinRoom(rid, key)
                    } else {
                        setError('有効なルーム参加用QRコードではありません')
                    }
                } catch {
                    setError('QRコードの内容が無効です')
                }
            }
        } catch (err) {
            setError('画像からQRコードを読み取れませんでした')
        } finally {
            setIsLoadingImage(false)
            if (imageInputRef.current) {
                imageInputRef.current.value = ''
            }
        }
    }

    useEffect(() => {
        return () => {
            stopScan()
        }
    }, [])

    return (
        <div className="h-screen max-h-[100dvh] flex flex-col bg-gray-900">
            {/* Header */}
            <header
                className="text-white px-4 py-3 pt-[calc(12px+env(safe-area-inset-top))] flex items-center gap-3 shadow-sm z-10"
                style={{ backgroundColor: currentTheme.primary }}
            >
                <button onClick={() => navigate('/home')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-semibold text-lg">QRコードスキャン</h1>
            </header>

            {/* Camera View */}
            <div className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                />

                {/* Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Scanning frame */}
                    <div className="w-64 h-64 relative">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-line-green rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-line-green rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-line-green rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-line-green rounded-br-lg" />

                        {/* Scanning animation */}
                        {isScanning && (
                            <div className="absolute inset-x-0 h-0.5 bg-line-green shadow-[0_0_10px_#06C755] animate-[scanLine_2s_ease-in-out_infinite]" />
                        )}
                    </div>
                </div>

                {/* Start scan overlay */}
                {!isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <button
                            onClick={startScan}
                            className="flex flex-col items-center gap-3 text-white"
                        >
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                                style={{ backgroundColor: currentTheme.primary }}
                            >
                                <Camera size={36} />
                            </div>
                            <span className="font-medium">タップしてスキャン開始</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Hidden file input for image selection */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
            />

            {/* Bottom Panel */}
            <div className="bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] space-y-3">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                <p className="text-center text-gray-500 text-sm">
                    友達のQRコードをスキャンしてルームに参加
                </p>

                {/* Image upload button */}
                <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isLoadingImage}
                    className="w-full flex items-center justify-center gap-2 py-3 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    style={{ color: currentTheme.primary }}
                >
                    {isLoadingImage ? (
                        <span className="animate-spin w-5 h-5 border-2 border-gray-300 rounded-full" style={{ borderTopColor: currentTheme.primary }} />
                    ) : (
                        <ImageIcon size={18} />
                    )}
                    <span>写真からQRコードを読み取る</span>
                </button>

                <button
                    onClick={() => setShowManual(!showManual)}
                    className="w-full flex items-center justify-center gap-2 py-3 font-medium"
                    style={{ color: currentTheme.primary }}
                >
                    <Keyboard size={18} />
                    <span>コードを手入力</span>
                </button>

                {showManual && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.target as HTMLFormElement
                            joinRoom(form.rid.value, form.key.value)
                        }}
                        className="space-y-3 animate-enter"
                    >
                        <input
                            name="rid"
                            placeholder="ルームID"
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-line-green"
                        />
                        <input
                            name="key"
                            placeholder="アクセスキー"
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-line-green"
                        />
                        <button
                            className="w-full text-white p-3 rounded-xl font-bold"
                            style={{ backgroundColor: currentTheme.primary }}
                        >
                            参加する
                        </button>
                    </form>
                )}
            </div>

            <style>{`
                @keyframes scanLine {
                    0%, 100% { top: 0; }
                    50% { top: 100%; }
                }
            `}</style>
        </div>
    )
}
