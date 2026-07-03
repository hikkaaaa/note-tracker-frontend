import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { Dashboard } from './pages/Dashboard'
import { ProfilePage } from './pages/ProfilePage'
import { FolderDetailPage } from './pages/FolderDetailPage'
import { NoteEditorPage } from './pages/NoteEditorPage'
import { ThemeProvider } from './lib/theme'
import { ProfileProvider } from './lib/profileProvider'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/folders/:folderId', element: <FolderDetailPage /> },
  { path: '/notes/:noteId', element: <NoteEditorPage /> },
])

function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <RouterProvider router={router} />
      </ProfileProvider>
    </ThemeProvider>
  )
}

export default App
