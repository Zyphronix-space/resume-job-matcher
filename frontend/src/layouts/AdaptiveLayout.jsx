import { useAuth } from '../context/AuthContext.jsx'
import AppLayout from './AppLayout.jsx'
import PublicLayout from './PublicLayout.jsx'

// For pages that are public but also part of the signed-in workspace (the
// job index): visitors get the public site chrome, signed-in users stay
// inside the app shell with its sidebar.
export default function AdaptiveLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <AppLayout /> : <PublicLayout />
}
