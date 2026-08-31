import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './pages/Layout';
import ActiveOrders from './pages/ActiveOrders';
import AddMenuItem from './pages/AddMenuItem';
import CurrentMenu from './pages/CurrentMenu';
import DriverManagement from './pages/DriverManagement';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<ActiveOrders />} />
                    <Route path="/menu/add" element={<AddMenuItem />} />
                    <Route path="/menu/current" element={<CurrentMenu />} />
                    <Route path="/drivers" element={<DriverManagement />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
