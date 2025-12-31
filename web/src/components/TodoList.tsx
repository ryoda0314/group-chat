import { useState, useEffect } from 'react'
import { Check, Trash2, Plus, X, ListTodo } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Type definition
interface Todo {
    id: string
    room_id: string
    text: string
    completed: boolean
    created_at: string
}

interface TodoListProps {
    roomId: string
    onClose: () => void
}

export function TodoList({ roomId, onClose }: TodoListProps) {
    const [todos, setTodos] = useState<Todo[]>([])
    const [newTodo, setNewTodo] = useState('')
    const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete')
    const [loading, setLoading] = useState(true)

    // Fetch todos
    useEffect(() => {
        const fetchTodos = async () => {
            const { data } = await supabase
                .from('room_todos')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })

            if (data) setTodos(data)
            setLoading(false)
        }

        fetchTodos()

        // Realtime subscription
        const channel = supabase
            .channel(`room_todos:${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_todos',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTodos(prev => {
                        if (prev.some(t => t.id === payload.new.id)) return prev
                        return [payload.new as Todo, ...prev]
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setTodos(prev => prev.map(t => t.id === payload.new.id ? payload.new as Todo : t))
                } else if (payload.eventType === 'DELETE') {
                    setTodos(prev => prev.filter(t => t.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTodo.trim()) return

        const id = crypto.randomUUID()
        const text = newTodo.trim()

        // Optimistic update
        const optimisticTodo: Todo = {
            id,
            room_id: roomId,
            text,
            completed: false,
            created_at: new Date().toISOString()
        }

        setTodos(prev => [optimisticTodo, ...prev])
        setNewTodo('')

        const { error } = await supabase.from('room_todos').insert({
            id,
            room_id: roomId,
            text,
            completed: false
        })

        if (error) {
            // Rollback on error
            setTodos(prev => prev.filter(t => t.id !== id))
            console.error('Error adding todo:', error)
            alert('タスクの追加に失敗しました')
        }
    }

    const toggleComplete = async (todo: Todo) => {
        // Optimistic update
        setTodos(prev => prev.map(t =>
            t.id === todo.id ? { ...t, completed: !t.completed } : t
        ))

        const { error } = await supabase
            .from('room_todos')
            .update({ completed: !todo.completed })
            .eq('id', todo.id)

        if (error) {
            // Rollback
            setTodos(prev => prev.map(t =>
                t.id === todo.id ? { ...t, completed: todo.completed } : t
            ))
        }
    }

    const handleDelete = async (id: string) => {
        // Optimistic update
        const backup = todos.find(t => t.id === id)
        setTodos(prev => prev.filter(t => t.id !== id))

        const { error } = await supabase
            .from('room_todos')
            .delete()
            .eq('id', id)

        if (error && backup) {
            // Rollback
            setTodos(prev => [...prev, backup].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ))
        }
    }

    const filteredTodos = todos.filter(t =>
        activeTab === 'incomplete' ? !t.completed : t.completed
    )

    return (
        <div className="h-full flex flex-col bg-gray-50 shadow-2xl border-l">
            {/* Header */}
            <div className="p-4 bg-white border-b flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                    <ListTodo size={20} className="text-line-green" />
                    <span>チェックリスト</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            {/* Input */}
            <form onSubmit={handleAdd} className="p-4 bg-white border-b">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTodo}
                        onChange={e => setNewTodo(e.target.value)}
                        placeholder="新しいタスクを追加..."
                        className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-green-500 bg-gray-50 text-gray-900"
                    />
                    <button
                        type="submit"
                        disabled={!newTodo.trim()}
                        className="bg-line-green text-white p-2 rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </form>

            {/* Tabs */}
            <div className="flex border-b bg-white">
                <button
                    onClick={() => setActiveTab('incomplete')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'incomplete' ? 'text-line-green' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    未完了 ({todos.filter(t => !t.completed).length})
                    {activeTab === 'incomplete' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-line-green" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'completed' ? 'text-line-green' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    完了 ({todos.filter(t => t.completed).length})
                    {activeTab === 'completed' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-line-green" />
                    )}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="text-center text-gray-400 py-8">読み込み中...</div>
                ) : filteredTodos.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                        {activeTab === 'incomplete' ? 'タスクはありません 🎉' : '完了したタスクはありません'}
                    </div>
                ) : (
                    filteredTodos.map(todo => (
                        <div key={todo.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-start gap-3 group animate-enter">
                            <button
                                onClick={() => toggleComplete(todo)}
                                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${todo.completed ? 'bg-line-green border-green-500' : 'border-gray-300 hover:border-green-500'
                                    }`}
                            >
                                {todo.completed && <Check size={14} className="text-white" />}
                            </button>
                            <span className={`flex-1 text-sm leading-relaxed ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {todo.text}
                            </span>
                            <button
                                onClick={() => handleDelete(todo.id)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
