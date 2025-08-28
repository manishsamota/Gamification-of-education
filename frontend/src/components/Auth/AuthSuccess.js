import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleAuthSuccess } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      console.log('AuthSuccess: Received token:', token);
      
      if (token) {
        const result = await handleAuthSuccess(token);
        if (result.success) {
          navigate('/dashboard');
        } else {
          navigate('/auth?error=auth_failed');
        }
      } else {
        navigate('/auth?error=no_token');
      }
    };

    handleAuth();
  }, [searchParams, handleAuthSuccess, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthSuccess;