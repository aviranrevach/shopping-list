import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/lists" element={<div>Lists</div>} />
        <Route path="/lists/:listId" element={<div>List Detail</div>} />
        <Route path="/lists/:listId/add" element={<div>Rapid Add</div>} />
        <Route path="/lists/:listId/items/:itemId" element={<div>Item Detail</div>} />
        <Route path="*" element={<Navigate to="/lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
