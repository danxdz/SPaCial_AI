import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

const AuthRouter = () => {
  const [currentRoute, setCurrentRoute] = useState('login');

  useEffect(() => {
    // Check URL hash for routing
    const hash = window.location.hash.substring(1);
    if (hash === 'register') {
      setCurrentRoute('register');
    } else {
      setCurrentRoute('login');
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash === 'register') {
        setCurrentRoute('register');
      } else {
        setCurrentRoute('login');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleRouteChange = (route: string) => {
    setCurrentRoute(route);
    window.location.hash = route;
  };

  if (currentRoute === 'register') {
    return (
      <RegistrationForm 
        onSuccess={() => {
          // After successful registration, redirect to login
          handleRouteChange('login');
        }}
        onCancel={() => handleRouteChange('login')}
        showCancel={true}
      />
    );
  }

  return (
    <LoginForm 
      onSuccess={() => {
        // After successful login, redirect to main app
        window.location.hash = '';
        window.location.reload();
      }}
      onCancel={() => {
        // Allow going back to main app without login
        window.location.hash = '';
        window.location.reload();
      }}
      showCancel={true}
    />
  );
};

export default AuthRouter;
