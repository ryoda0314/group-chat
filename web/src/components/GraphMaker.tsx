import { useState, useEffect, useRef } from 'react'
import { X, Send, TrendingUp, RotateCcw } from 'lucide-react'
import functionPlot from 'function-plot/dist/function-plot'

interface GraphMakerProps {
    onSend: (text: string) => void
    onClose: () => void
}

// Helper to add arrow marker to SVG
const addArrowMarker = (container: HTMLElement) => {
    const svg = container.querySelector('svg')
    if (!svg) return

    if (svg.querySelector('#graph-arrow')) return

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.setAttribute('id', 'graph-arrow')
    marker.setAttribute('viewBox', '0 0 10 10')
    marker.setAttribute('refX', '9')
    marker.setAttribute('refY', '5')
    marker.setAttribute('markerWidth', '6')
    marker.setAttribute('markerHeight', '6')
    marker.setAttribute('orient', 'auto')

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')
    path.setAttribute('fill', '#333')

    marker.appendChild(path)
    defs.appendChild(marker)
    svg.prepend(defs)
}

export function GraphMaker({ onSend, onClose }: GraphMakerProps) {
    const [fn, setFn] = useState('sin(x)')
    const [xMin, setXMin] = useState('-10')
    const [xMax, setXMax] = useState('10')
    const [yMin, setYMin] = useState('-5')
    const [yMax, setYMax] = useState('5')
    const [showGrid, setShowGrid] = useState(true)
    const [showAxis, setShowAxis] = useState(true)
    const [useYRange, setUseYRange] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    const [resetKey, setResetKey] = useState(0)

    // Simple LaTeX to Math converter
    const latexToMath = (latex: string) => {
        let s = latex
        // Remove \left, \right
        s = s.replace(/\\left|\\right/g, '')
        // Replace simple functions
        s = s.replace(/\\(sin|cos|tan|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|sqrt)/g, '$1')
        // Replace pi
        s = s.replace(/\\pi/g, 'PI')
        // Replace e^{...} or e^x -> exp(...)
        s = s.replace(/e\^\{([^{}]+)\}/g, 'exp($1)')
        s = s.replace(/e\^([a-zA-Z0-9]+)/g, 'exp($1)')
        // Replace frac: \frac{a}{b} -> (a)/(b) (handling nested braces simply)
        s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
        // Handle x^{2} -> x^(2)
        s = s.replace(/\^\{([^{}]+)\}/g, '^($1)')
        // Clean up remaining braces if they are just wrapper {x} -> (x)
        s = s.replace(/\{([^{}]+)\}/g, '($1)')
        // Remove remaining backslashes
        s = s.replace(/\\/g, '')
        return s
    }

    // Update preview
    useEffect(() => {
        if (!previewRef.current) return

        try {
            previewRef.current.innerHTML = ''

            // Check if input is empty
            if (!fn || !fn.trim()) return

            // Convert potential LaTeX to math string
            const mathFn = latexToMath(fn)
            if (!mathFn) return

            const xDomain = [parseFloat(xMin) || -10, parseFloat(xMax) || 10]
            const yDomain = useYRange
                ? [parseFloat(yMin) || -5, parseFloat(yMax) || 5]
                : undefined

            // Apply no-axis class if needed
            if (!showAxis) {
                previewRef.current.classList.add('no-axis')
            } else {
                previewRef.current.classList.remove('no-axis')
            }

            functionPlot({
                target: previewRef.current,
                width: previewRef.current.clientWidth,
                height: 200,
                xAxis: { domain: xDomain },
                yAxis: yDomain ? { domain: yDomain } : undefined,
                grid: showGrid,
                data: [{
                    fn: mathFn,
                    color: '#06C755'
                }]
            })

            // Add arrow marker
            addArrowMarker(previewRef.current)
        } catch (e) {
            // Ignore render errors during typing
        }
    }, [fn, xMin, xMax, yMin, yMax, showGrid, showAxis, useYRange, resetKey])

    const handleSend = () => {
        // Convert input to chartable format
        const mathFn = latexToMath(fn)

        // Construct the graph command
        // Format: graph: fn | x:[min, max] | y:[min, max]
        let command = `graph: ${mathFn}`

        // Add X range (always included to ensure consistency)
        command += ` | x:[${xMin}, ${xMax}]`

        // Add Y range if enabled
        if (useYRange) {
            command += ` | y:[${yMin}, ${yMax}]`
        }

        // Add options
        command += ` | grid:${showGrid} | axis:${showAxis}`

        onSend(command)
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-enter" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-line-green text-white px-4 py-3 flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                        <TrendingUp size={20} />
                        グラフ作成
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-4">
                        {/* Preview Card */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase tracking-wider">
                                    <TrendingUp size={12} /> Preview
                                </div>
                                <button
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="text-gray-400 hover:text-green-600 transition-colors p-1 rounded hover:bg-gray-100"
                                    title="原点に戻す"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            </div>
                            <div ref={previewRef} className="w-full h-[200px] flex items-center justify-center overflow-hidden graph-plot" />
                        </div>

                        {/* Settings */}
                        <div className="space-y-4">
                            {/* Function Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">関数 (y = )</label>
                                <input
                                    type="text"
                                    value={fn}
                                    onChange={e => setFn(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
                                    placeholder="例: sin(x)"
                                />
                            </div>

                            {/* X Axis Range */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">X軸の範囲</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={xMin}
                                        onChange={e => setXMin(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center"
                                        placeholder="-10"
                                    />
                                    <span className="text-gray-400 font-bold">~</span>
                                    <input
                                        type="number"
                                        value={xMax}
                                        onChange={e => setXMax(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center"
                                        placeholder="10"
                                    />
                                </div>
                            </div>

                            {/* Y Axis Toggle & Range */}
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">Y軸の範囲を指定</label>
                                    <input
                                        type="checkbox"
                                        checked={useYRange}
                                        onChange={e => setUseYRange(e.target.checked)}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                </div>

                                {useYRange && (
                                    <div className="flex items-center gap-2 mt-2 animate-enter">
                                        <input
                                            type="number"
                                            value={yMin}
                                            onChange={e => setYMin(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center"
                                            placeholder="-5"
                                        />
                                        <span className="text-gray-400 font-bold">~</span>
                                        <input
                                            type="number"
                                            value={yMax}
                                            onChange={e => setYMax(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center"
                                            placeholder="5"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Grid & Axis Toggles */}
                            <div className="flex items-center justify-between pt-2 border-t gap-4">
                                <div className="flex-1 flex items-center justify-between">
                                    <label className="text-sm text-gray-700">グリッド</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showGrid}
                                            onChange={e => setShowGrid(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                <div className="w-px h-6 bg-gray-200"></div>
                                <div className="flex-1 flex items-center justify-between">
                                    <label className="text-sm text-gray-700">軸・原点</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showAxis}
                                            onChange={e => setShowAxis(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleSend}
                                className="w-full bg-line-green text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Send size={20} />
                                グラフを送信
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
