import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { MessageCircle } from 'lucide-react'

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
        <div className="flex flex-col items-center justify-center h-full p-6 bg-white">
            <div className="w-full max-w-sm animate-enter">
                {/* Logo */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-line-green rounded-3xl mb-4 shadow-lg">
                        <MessageCircle className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        グループチャット
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        友達とリアルタイムでつながろう
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ニックネーム
                        </label>
                        <input
                            type="text"
                            placeholder="名前を入力してください"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3.5 outline-none focus:border-line-green focus:ring-2 focus:ring-line-green/20 transition-all text-center text-lg"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-line-green text-white font-bold py-4 rounded-xl transition-all hover:bg-line-green-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        はじめる
                    </button>
                </form>

                {/* Terms */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    開始することで、利用規約とプライバシーポリシーに同意したことになります
                </p>
            </div>
        </div>
    )
}
