import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Admin accounts
const ADMIN_ACCOUNTS = {
  fahmy: {
    username: 'fahmy',
    password: 'Fahmy@2025',
    displayName: 'Fahmy'
  },
  ewis: {
    username: 'ewis',
    password: 'Ewis@2025',
    displayName: 'Ewis'
  }
};

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('adminSession');
    if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const account = ADMIN_ACCOUNTS[username.toLowerCase()];
    if (account && account.password === password) {
      const adminData = {
        username: account.username,
        displayName: account.displayName
      };
      setAdmin(adminData);
      localStorage.setItem('adminSession', JSON.stringify(adminData));
      return { success: true };
    }
    return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('adminSession');
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
