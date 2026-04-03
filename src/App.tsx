import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';
import { ListsScreen } from './screens/ListsScreen';
import { ListDetailScreen } from './screens/ListDetailScreen';
import { JoinScreen } from './screens/JoinScreen';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { loading: groupLoading, error: groupError } = useGroup(user?.id);

  if (groupError) {
    console.error('[App] group error:', groupError);
  }

  if (authLoading || (user && groupLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route — invite join page */}
      <Route path="/join/:token" element={<JoinScreen />} />

      {!user ? (
        <>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/lists" element={<ListsScreen />} />
          <Route path="/lists/:listId" element={<ListDetailScreen />} />
          <Route path="*" element={<Navigate to="/lists" replace />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
