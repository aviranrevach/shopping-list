import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup(user?.id);

  if (authLoading || (user && groupLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/lists" element={<div>Lists — Group: {group?.name}</div>} />
      <Route path="/lists/:listId" element={<div>List Detail</div>} />
      <Route path="/lists/:listId/add" element={<div>Rapid Add</div>} />
      <Route path="/lists/:listId/items/:itemId" element={<div>Item Detail</div>} />
      <Route path="*" element={<Navigate to="/lists" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
