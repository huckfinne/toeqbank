import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Login from '../components/Login';
import Register from '../components/Register';

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const registrationToken = searchParams.get('token');
  
  // If there's a registration token, start with register form
  const [isLogin, setIsLogin] = useState(!registrationToken);
  
  useEffect(() => {
    // If a token is present, switch to register view
    if (registrationToken) {
      setIsLogin(false);
    }
  }, [registrationToken]);

  return (
    <div className="auth-page">
      {isLogin ? (
        <Login onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
};

export default Auth;