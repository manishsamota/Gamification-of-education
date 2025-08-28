import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import { XPProvider } from './contexts/XPContext';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/Common/LoadingSpinner';
import AuthPage from './components/Auth/AuthPage';
import AuthSuccess from './components/Auth/AuthSuccess';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';


let lastToast = '';
let lastToastTime = 0;
let toastInterceptorSetup = false;

// Toast deduplication once
if (!toastInterceptorSetup) {
  const originalSuccess = toast.success;
  toast.success = (message, options) => {
    const now = Date.now();
    if (message === lastToast && now - lastToastTime < 2000) {
      console.log('Blocking duplicate toast:', message);
      return;
    }
    lastToast = message;
    lastToastTime = now;
    return originalSuccess(message, options);
  };
  
  toastInterceptorSetup = true;
  console.log('Toast deduplication setup complete');
}

// Inner app component that uses auth context
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Auth routes */}
          <Route
            path="/auth"
            element={!user ? <AuthPage /> : <Navigate to="/dashboard" />}
          />
          
          {/* Google OAuth success route */}
          <Route path="/auth/success" element={<AuthSuccess />} />
          
          {/* FIXED: Dashboard routes - simplified without nested XPProvider */}
          <Route
            path="/dashboard/*"
            element={user ? <Dashboard /> : <Navigate to="/auth" />}
          />
          
          {/* Root route */}
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/auth"} />}
          />
        </Routes>

        {/* Toast Container for notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="mt-16"
          limit={1}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    //XPProvider at top level to prevent recreation
    <AuthProvider>
      <XPProvider>
        <AppContent />
      </XPProvider>
    </AuthProvider>
  );
}

export default App;