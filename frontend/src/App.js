import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// React Fiber error suppression
import { 
  suppressReactFiberErrors, 
  addGlobalErrorHandlers, 
  patchDOMRemoveChild 
} from './utils/reactFiberFix';

// Components
import LoginForm from './components/LoginForm';
import LoginFormClass from './components/LoginFormClass';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import OrderFormClass from './components/OrderFormClass';
import OrderDetail from './components/OrderDetail';
import GanttChart from './components/GanttChart';
import TestOrderForm from './TestOrderForm';
import SimpleOrderForm from './components/SimpleOrderForm';
import ClassOrderForm from './components/ClassOrderForm';

// Apply React Fiber fixes on app initialization
suppressReactFiberErrors();
addGlobalErrorHandlers();
patchDOMRemoveChild();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const fetchUser = async () => {
    let isMounted = true;
    
    try {
      const response = await axios.get(`${API}/auth/me`);
      if (isMounted) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (isMounted) {
        logout();
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка входа'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/" /> : children;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/orders/new" 
              element={
                <ProtectedRoute>
                  <OrderFormClass />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/orders/:id" 
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/gantt" 
              element={
                <ProtectedRoute>
                  <GanttChart />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/test" 
              element={<TestOrderForm />} 
            />
            <Route 
              path="/simple" 
              element={<SimpleOrderForm />} 
            />
            <Route 
              path="/class" 
              element={<ClassOrderForm />} 
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;