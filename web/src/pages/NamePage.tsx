import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export function NamePage() {
    const [name, setName] = useState('')
    const setDisplayName = useAppStore(state => state.setDisplayName)
    const navigate = useNavigate()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setDisplayName(name.trim())
        navigate('/home')
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 relative overflow-hidden bg-deep text-white">
            {/* Decorative Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md animate-enter z-10">
                <div className="mb-12 text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 mb-4 shadow-2xl backdrop-blur-sm">
                        <ShieldCheck className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
                        Protocol<span className="text-blue-500">.</span>Chat
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm tracking-wide">
                        SECURE • EPHEMERAL • ANONYMOUS
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="group relative">
                        <input
                            type="text"
                            placeholder="codenames_only"
                            className="w-full bg-surface/50 border border-white/10 text-white rounded-2xl px-6 py-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-neutral-700 font-mono text-lg text-center"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full group relative overflow-hidden bg-white text-black font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            INITIALIZE UPLINK <ArrowRight size={18} />
                        </span>
                        <div className="absolute inset-0 bg-blue-100 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out" />
                    </button>

                    <p className="text-center text-xs text-neutral-600">
                        Session ID: {crypto.randomUUID().slice(0, 8)}...
                    </p>
                </form>
            </div>
        </div>
    )
}
