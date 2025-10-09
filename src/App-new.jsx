import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserApp } from './pages/UserApp';
import { Button } from '@/components/ui/button';
import { Shield, Users } from 'lucide-react';
import './App.css';

function AppContent() {
  const { admin, loading } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If admin is logged in, show dashboard
  if (admin) {
    return <AdminDashboard />;
  }

  // If admin mode is selected but not logged in, show login
  if (isAdminMode) {
    return (
      <div className="relative">
        <AdminLogin />
        <Button
          onClick={() => setIsAdminMode(false)}
          variant="ghost"
          className="absolute top-4 left-4 z-50"
        >
          <Users className="w-4 h-4 mr-2" />
          وضع المستخدم
        </Button>
      </div>
    );
  }

  // Default: show user app with admin mode toggle
  return (
    <div className="relative">
      <UserApp />
      <Button
        onClick={() => setIsAdminMode(true)}
        variant="ghost"
        className="fixed top-4 left-4 z-50 glass-effect"
      >
        <Shield className="w-4 h-4 mr-2" />
        وضع الإدارة
      </Button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
