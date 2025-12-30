import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { ArrowLeft } from 'lucide-react'

export function SettingsPage() {
    const navigate = useNavigate()
    const { displayName, setDisplayName, clearHistory, deviceId } = useAppStore()

    return (
        <div className="h-screen flex flex-col p-4 space-y-6">
            <header className="flex items-center space-x-4">
                <button onClick={() => navigate('/home')}><ArrowLeft /></button>
                <h1 className="text-xl font-bold">Settings</h1>
            </header>

            <div className="space-y-4">
                <div>
                    <label className="text-sm text-neutral-500">Display Name</label>
                    <input
                        value={displayName || ''}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full bg-neutral-800 p-3 rounded-xl mt-1"
                    />
                </div>

                <div>
                    <label className="text-sm text-neutral-500">Device ID</label>
                    <div className="text-xs font-mono text-neutral-600 truncate">{deviceId}</div>
                </div>

                <button
                    onClick={() => { clearHistory(); alert('History Cleared') }}
                    className="w-full bg-red-900/30 text-red-500 p-3 rounded-xl text-left"
                >
                    Clear Room History
                </button>
            </div>

            <div className="mt-auto text-center text-xs text-neutral-600">
                <p>Data stored locally & on temporary server.</p>
                <p>Rooms expire in 30 days.</p>
            </div>
        </div>
    )
}
