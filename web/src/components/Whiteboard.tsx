import { useRef, useState, useEffect } from 'react'
import { X, Trash2, Send, Minus, Plus } from 'lucide-react'

interface WhiteboardProps {
    onSend: (imageBlob: Blob) => void
    onClose: () => void
}

const COLORS = [
    '#000000', // Black
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#007AFF', // Blue
    '#AF52DE', // Purple
    '#ffffff', // White (eraser)
]

export function Whiteboard({ onSend, onClose }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('#000000')
    const [lineWidth, setLineWidth] = useState(4)
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Get container size (CSS pixels)
        const rect = container.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        // Save CSS pixel dimensions for export
        setCanvasSize({ width, height })

        // Set canvas resolution for high DPI
        canvas.width = width * window.devicePixelRatio
        canvas.height = height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
    }, [])

    const getPos = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            }
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
        }
    }

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault()
        setIsDrawing(true)
        const pos = getPos(e)
        setLastPos(pos)
    }

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing || !lastPos) return
        e.preventDefault()

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const pos = getPos(e)

        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(lastPos.x, lastPos.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()

        setLastPos(pos)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        setLastPos(null)
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
    }

    const handleSend = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Create a new canvas at CSS pixel size (not high DPI)
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = canvasSize.width
        exportCanvas.height = canvasSize.height
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx) return

        // Draw the original canvas scaled down to CSS pixel size
        exportCtx.drawImage(canvas, 0, 0, canvasSize.width, canvasSize.height)

        exportCanvas.toBlob((blob) => {
            if (blob) {
                onSend(blob)
            }
        }, 'image/png')
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-line-green text-white px-4 py-3 flex items-center justify-between">
                <button onClick={onClose} className="p-1">
                    <X size={24} />
                </button>
                <h2 className="font-semibold">ホワイトボード</h2>
                <button
                    onClick={handleSend}
                    className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1"
                >
                    <Send size={16} />
                    送信
                </button>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="flex-1 bg-gray-100 p-2">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full bg-white rounded-lg shadow-inner touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Toolbar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 space-y-3">
                {/* Colors */}
                <div className="flex items-center justify-center gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-line-green' : 'border-gray-300'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Line Width & Clear */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLineWidth(Math.max(1, lineWidth - 2))}
                            className="p-2 text-gray-500 hover:text-gray-700"
                        >
                            <Minus size={20} />
                        </button>
                        <div className="w-20 flex items-center justify-center">
                            <div
                                className="rounded-full bg-current"
                                style={{
                                    width: lineWidth * 2,
                                    height: lineWidth * 2,
                                    backgroundColor: color
                                }}
                            />
                        </div>
                        <button
                            onClick={() => setLineWidth(Math.min(20, lineWidth + 2))}
                            className="p-2 text-gray-500 hover:text-gray-700"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <button
                        onClick={clearCanvas}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={20} />
                        クリア
                    </button>
                </div>
            </div>
        </div>
    )
}
