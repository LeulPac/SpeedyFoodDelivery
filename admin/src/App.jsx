import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import PlatformAdminLogin from './pages/PlatformAdminLogin';
import Layout from './pages/Layout';
import ActiveOrders from './pages/ActiveOrders';
import AddMenuItem from './pages/AddMenuItem';
import CurrentMenu from './pages/CurrentMenu';
import DriverManagement from './pages/DriverManagement';
import BusinessSubscription from './pages/BusinessSubscription';
import BusinessProfile from './pages/BusinessProfile';
import PlatformOverview from './pages/PlatformOverview';
import AdminBusinesses from './pages/AdminBusinesses';
import AdminSubscriptionPlans from './pages/AdminSubscriptionPlans';
import AdminDriverFees from './pages/AdminDriverFees';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center text-[var(--text-muted)] text-sm">
        Loading console...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner' && user.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
};

const DashboardHome = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <PlatformOverview />;
  }
  return <ActiveOrders />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Business Owner Login */}
            <Route path="/login" element={<Login />} />
            
            {/* Separate, Protected Route for Super Admin / Platform Owner */}
            <Route path="/admin/login" element={<PlatformAdminLogin />} />
            <Route path="/super-admin" element={<PlatformAdminLogin />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Home switches depending on role */}
                      <Route path="/" element={<DashboardHome />} />
                      
                      {/* Owner routes */}
                      <Route path="/orders" element={<ActiveOrders />} />
                      <Route path="/menu/add" element={<AddMenuItem />} />
                      <Route path="/menu/current" element={<CurrentMenu />} />
                      <Route path="/drivers" element={<DriverManagement />} />
                      <Route path="/subscription" element={<BusinessSubscription />} />
                      <Route path="/profile" element={<BusinessProfile />} />

                      {/* Admin routes */}
                      <Route path="/admin/overview" element={<PlatformOverview />} />
                      <Route path="/admin/businesses" element={<AdminBusinesses />} />
                      <Route path="/admin/plans" element={<AdminSubscriptionPlans />} />
                      <Route path="/admin/driver-fees" element={<AdminDriverFees />} />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
