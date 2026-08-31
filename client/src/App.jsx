import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerPortal from './pages/CustomerPortal';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import RoleLogin from './pages/RoleLogin';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Send users to their "home" page instead of forcing "/" (which is customer-only)
    const homeByRole = {
      owner: '/admin',
      driver: '/driver',
      customer: '/',
    };
    return <Navigate to={homeByRole[user.role] || '/login'} replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerPortal />
            </ProtectedRoute>
          } />
          <Route
            path="/admin"
            element={<AdminEntry />}
          />
          <Route
            path="/driver"
            element={<DriverEntry />}
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function AdminEntry() {
  const { user } = useAuth();
  if (!user) {
    return <RoleLogin title="Admin Login" requiredRole="owner" successPath="/admin" showSignUp={false} />;
  }
  if (user.role !== 'owner') return <Navigate to={user.role === 'driver' ? '/driver' : '/'} replace />;
  return <OwnerDashboard />;
}

function DriverEntry() {
  const { user } = useAuth();
  if (!user) {
    return <RoleLogin title="Driver Login" requiredRole="driver" successPath="/driver" showSignUp={false} />;
  }
  if (user.role !== 'driver') return <Navigate to={user.role === 'owner' ? '/admin' : '/'} replace />;
  return <DriverDashboard />;
}

export default App;
