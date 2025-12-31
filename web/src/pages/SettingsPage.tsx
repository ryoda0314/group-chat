import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { ChevronLeft, User, Trash2, Info } from 'lucide-react'

export function SettingsPage() {
    const navigate = useNavigate()
    const { displayName, setDisplayName, clearHistory, deviceId } = useAppStore()

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <header className="bg-line-green text-white px-4 py-3 flex items-center gap-3 shadow-sm">
                <button onClick={() => navigate('/home')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-semibold text-lg">設定</h1>
            </header>

            {/* Settings List */}
            <main className="flex-1 overflow-y-auto">
                {/* Profile Section */}
                <div className="bg-white mt-3 px-4">
                    <div className="flex items-center gap-4 py-4 border-b border-gray-100">
                        <div className="avatar w-14 h-14 text-xl">
                            {displayName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <input
                                value={displayName || ''}
                                onChange={e => setDisplayName(e.target.value)}
                                className="w-full text-lg font-semibold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-line-green transition-colors"
                                placeholder="名前を入力"
                            />
                            <p className="text-sm text-gray-400 mt-1">表示名をタップして編集</p>
                        </div>
                    </div>
                </div>

                {/* Device Info */}
                <div className="bg-white mt-3 px-4">
                    <div className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User size={20} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-500">デバイスID</p>
                            <p className="text-xs text-gray-400 font-mono truncate">{deviceId}</p>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white mt-3 px-4">
                    <button
                        onClick={() => {
                            if (confirm('トーク履歴をすべて削除しますか？')) {
                                clearHistory()
                                alert('履歴を削除しました')
                            }
                        }}
                        className="w-full flex items-center gap-4 py-4 text-red-500"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 size={20} />
                        </div>
                        <span className="font-medium">トーク履歴を削除</span>
                    </button>
                </div>

                {/* About */}
                <div className="bg-white mt-3 px-4">
                    <div className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Info size={20} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-700">バージョン</p>
                            <p className="text-sm text-gray-400">1.0.0</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 text-center text-xs text-gray-400 bg-gray-100">
                <p>データはローカルと一時サーバーに保存されます</p>
                <p>ルームは30日後に自動削除されます</p>
            </footer>
        </div>
    )
}
