import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NamePage } from './pages/NamePage'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { RoomPage } from './pages/RoomPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAppStore } from './stores/useAppStore'

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const displayName = useAppStore(state => state.displayName)
  if (!displayName) {
    return <Navigate to="/name" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <div className="h-[100dvh] bg-gray-50 text-gray-900 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
        {/* Mobile-first container: max-w-md and centered */}
        <Routes>
          <Route path="/name" element={<NamePage />} />
          <Route path="/join" element={<JoinPage />} />

          <Route path="/home" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />

          <Route path="/room/:id" element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
