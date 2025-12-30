import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { invokeFunction } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import { ArrowLeft, Camera, Zap } from 'lucide-react'

export function JoinPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { deviceId, displayName, addToHistory, setActiveRoomToken } = useAppStore()

    const [error, setError] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const codeReader = useRef(new BrowserMultiFormatReader())
    const controlsRef = useRef<any>(null)

    const ridParam = searchParams.get('rid')
    const keyParam = searchParams.get('key')

    // Auto-join if params exist
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
            setError(e.message || 'Failed to join')
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
                            const rid = url.searchParams.get('rid')
                            const key = url.searchParams.get('key')
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
            setError('Camera access failed')
            setIsScanning(false)
        }
    }

    const stopScan = () => {
        setIsScanning(false);
        if (controlsRef.current) {
            controlsRef.current.stop()
            controlsRef.current = null
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop())
        }
    }

    useEffect(() => {
        return () => {
            stopScan()
        }
    }, [])

    return (
        <div className="h-screen flex flex-col bg-black text-white p-6 justify-between">
            <div className="flex items-center justify-between z-10">
                <button onClick={() => navigate('/home')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                    Scanner Active
                </div>
                <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Grid Overlay */}
                <div className="w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative w-72 h-72 border-2 border-white/30 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)]">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline />
                    {!isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
                            <button onClick={startScan} className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors">
                                <Camera size={48} />
                                <span className="text-sm font-mono">ACTIVATE SENSOR</span>
                            </button>
                        </div>
                    )}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-blue-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-blue-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-blue-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-blue-500 rounded-br-xl" />

                    {isScanning && <div className="absolute inset-x-0 top-0 h-1 bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]" />}
                </div>
            </div>

            <div className="z-10 space-y-4 mb-8">
                {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl text-center font-mono">{error}</div>}

                <details className="text-center group">
                    <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-neutral-500 text-sm hover:text-white transition-colors">
                        <Zap size={14} />
                        <span>Manual Override</span>
                    </summary>
                    <div className="mt-4 p-4 glass-panel rounded-2xl animate-enter">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.target as HTMLFormElement
                            joinRoom(form.rid.value, form.key.value)
                        }} className="flex flex-col space-y-3">
                            <input name="rid" placeholder="Target ID (UUID)" className="bg-black/50 border border-white/10 p-3 rounded-xl text-white font-mono text-sm outline-none focus:border-blue-500" />
                            <input name="key" placeholder="Access Key" className="bg-black/50 border border-white/10 p-3 rounded-xl text-white font-mono text-sm outline-none focus:border-blue-500" />
                            <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors">
                                Establish Link
                            </button>
                        </form>
                    </div>
                </details>
            </div>

            <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 1; }
            50% { top: 100%; opacity: 0.5; }
            51% { top: 100%; opacity: 0; }
            100% { top: 0; opacity: 0; }
        }
      `}</style>
        </div>
    )
}
