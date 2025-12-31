import { useMemo, useRef, useEffect, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-latex'
import { Copy, Check, TrendingUp, RotateCcw } from 'lucide-react'
import functionPlot from 'function-plot/dist/function-plot'

interface RichTextProps {
    text: string
    className?: string
}

// Regex patterns
// Regex patterns
const CODE_BLOCK = /```(\w+)?\n([\s\S]*?)```/g
const DISPLAY_MATH = /\$\$([\s\S]*?)\$\$/g
const INLINE_MATH = /\$([^\$\n]+?)\$/g
// Updated regex to include grid and axis options (simple parsing based on order for now, or match optional groups)
// Adjusted to be more flexible: graph: fn | ... options
const GRAPH_PATTERN = /graph:\s*(.+?)(?:\s*\|\s*x:\s*\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\])?(?:\s*\|\s*y:\s*\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\])?(?:\s*\|\s*grid:(true|false))?(?:\s*\|\s*axis:(true|false))?$/gm
const CHEM_PATTERN = /\\ce\{([^}]+)\}/g

// Code Block Component with copy button
function CodeBlock({ code, language }: { code: string; language: string }) {
    const [copied, setCopied] = useState(false)

    const highlighted = useMemo(() => {
        const lang = Prism.languages[language] || Prism.languages.javascript
        return Prism.highlight(code.trim(), lang, language)
    }, [code, language])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code.trim())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="code-block-container">
            <div className="code-block-header">
                <span className="code-block-lang">{language || 'code'}</span>
                <button onClick={handleCopy} className="code-block-copy">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'コピーしました' : 'コピー'}
                </button>
            </div>
            <pre className="code-block">
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
        </div>
    )
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

// Graph Component
function Graph({ fn, xMin = -10, xMax = 10, yMin, yMax, showGrid = true, showAxis = true }: {
    fn: string;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    showGrid?: boolean;
    showAxis?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [resetKey, setResetKey] = useState(0)

    useEffect(() => {
        if (!containerRef.current) return
        if (!fn || !fn.trim()) {
            containerRef.current.innerHTML = ''
            return
        }

        try {
            // Clear previous graph
            containerRef.current.innerHTML = ''

            // Apply no-axis class if needed
            if (!showAxis) {
                containerRef.current.classList.add('no-axis')
            } else {
                containerRef.current.classList.remove('no-axis')
            }

            functionPlot({
                target: containerRef.current,
                width: 280,
                height: 200,
                xAxis: { domain: [xMin, xMax] },
                yAxis: { domain: yMin !== undefined && yMax !== undefined ? [yMin, yMax] : undefined },
                grid: showGrid,
                data: [{
                    fn: fn,
                    color: '#06C755'
                }]
            })

            // Add arrow marker
            addArrowMarker(containerRef.current)
        } catch (e) {
            containerRef.current.innerHTML = `<div class="graph-error">グラフエラー: ${fn}</div>`
        }
    }, [fn, xMin, xMax, yMin, yMax, showGrid, showAxis, resetKey])

    return (
        <div className="graph-container group relative">
            <div className="graph-header justify-between">
                <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} />
                    <span>y = {fn}</span>
                </div>
                <button
                    onClick={() => setResetKey(prev => prev + 1)}
                    className="text-gray-400 hover:text-green-600 transition-colors p-1 rounded hover:bg-green-50"
                    title="原点に戻す"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
            <div ref={containerRef} className="graph-plot" />
        </div>
    )
}

export function RichText({ text, className = '' }: RichTextProps) {
    const [elements, setElements] = useState<React.ReactNode[]>([])

    useEffect(() => {
        if (!text) {
            setElements([])
            return
        }

        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let match
        let input = text.trim()
        let partKey = 0

        // Process code blocks first
        const codeBlocks: { start: number; end: number; element: React.ReactNode }[] = []
        CODE_BLOCK.lastIndex = 0
        while ((match = CODE_BLOCK.exec(input)) !== null) {
            codeBlocks.push({
                start: match.index,
                end: match.index + match[0].length,
                element: <CodeBlock key={`code-${partKey++}`} code={match[2]} language={match[1] || 'javascript'} />
            })
        }

        // Process graphs
        const graphs: { start: number; end: number; element: React.ReactNode }[] = []
        GRAPH_PATTERN.lastIndex = 0
        while ((match = GRAPH_PATTERN.exec(input)) !== null) {
            graphs.push({
                start: match.index,
                end: match.index + match[0].length,
                element: <Graph
                    key={`graph-${partKey++}`}
                    fn={match[1]}
                    xMin={match[2] ? parseFloat(match[2]) : -10}
                    xMax={match[3] ? parseFloat(match[3]) : 10}
                    yMin={match[4] ? parseFloat(match[4]) : undefined}
                    yMax={match[5] ? parseFloat(match[5]) : undefined}
                    showGrid={match[6] ? match[6] === 'true' : true}
                    showAxis={match[7] ? match[7] === 'true' : true}
                />
            })
        }

        // Combine all special elements and sort by position
        const allSpecial = [...codeBlocks, ...graphs].sort((a, b) => a.start - b.start)

        // Build parts array
        for (const special of allSpecial) {
            if (special.start > lastIndex) {
                const textPart = input.slice(lastIndex, special.start)
                parts.push(<TextWithMath key={`text-${partKey++}`} text={textPart} />)
            }
            parts.push(special.element)
            lastIndex = special.end
        }

        // Remaining text
        if (lastIndex < input.length) {
            parts.push(<TextWithMath key={`text-${partKey++}`} text={input.slice(lastIndex)} />)
        }

        setElements(parts.length > 0 ? parts : [<TextWithMath key="text-0" text={input} />])
    }, [text])

    return <div className={className}>{elements}</div>
}

// Text with math and chemistry
function TextWithMath({ text }: { text: string }) {
    const rendered = useMemo(() => {
        if (!text) return ''

        let result = text

        // Render chemistry formulas (\ce{...})
        result = result.replace(CHEM_PATTERN, (_, formula) => {
            try {
                // Convert chemical notation to LaTeX
                const chemLatex = formula
                    .replace(/(\d+)/g, '_{$1}')  // Subscripts for numbers
                    .replace(/->/g, '\\rightarrow ')
                    .replace(/<->/g, '\\leftrightarrow ')
                    .replace(/\^(\d*[+-])/g, '^{$1}')  // Superscripts for charges

                return katex.renderToString(chemLatex, {
                    displayMode: false,
                    throwOnError: false,
                    trust: true
                })
            } catch (e) {
                return `<span class="chem-formula">${formula}</span>`
            }
        })

        // Render display math ($$...$$)
        result = result.replace(DISPLAY_MATH, (_, math) => {
            try {
                return `<div class="math-display">${katex.renderToString(math.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    trust: true
                })}</div>`
            } catch (e) {
                return `<span class="math-error">$$${math}$$</span>`
            }
        })

        // Render inline math ($...$)
        result = result.replace(INLINE_MATH, (_, math) => {
            try {
                return katex.renderToString(math.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    trust: true
                })
            } catch (e) {
                return `<span class="math-error">$${math}$</span>`
            }
        })

        return result.trim()
    }, [text])

    const hasSpecial = text && (text.includes('$') || text.includes('\\ce{'))

    if (!hasSpecial) {
        return <span>{text}</span>
    }

    return <span dangerouslySetInnerHTML={{ __html: rendered }} />
}

// Legacy export for compatibility
export { RichText as MathText }
