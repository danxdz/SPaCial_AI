import { useEffect, useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import LoginForm from './LoginForm';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
}

const AuthWrapper = ({ children, requireAuth = false, allowedRoles = [] }: AuthWrapperProps) => {
  const { currentUser, validateSession } = useUserStore();
  const [isValidating, setIsValidating] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setIsValidating(true);
      
      if (currentUser) {
        // User is logged in, validate session
        const isValid = await validateSession();
        if (!isValid && requireAuth) {
          setShowLogin(true);
        }
      } else if (requireAuth) {
        // No user and auth is required
        setShowLogin(true);
      }
      
      setIsValidating(false);
    };

    checkAuth();
  }, [currentUser, requireAuth, validateSession]);

  // Listen for auto-logout events
  useEffect(() => {
    const handleAutoLogout = () => {
      setShowLogin(true);
    };

    window.addEventListener('user-logout', handleAutoLogout);
    return () => window.removeEventListener('user-logout', handleAutoLogout);
  }, []);

  // Check role-based access
  const hasRequiredRole = () => {
    if (!currentUser || allowedRoles.length === 0) {
      return true;
    }
    return allowedRoles.includes(currentUser.role);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Validating session...</p>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <LoginForm 
        onSuccess={() => setShowLogin(false)}
        onCancel={requireAuth ? undefined : () => setShowLogin(false)}
        showCancel={!requireAuth}
      />
    );
  }

  if (requireAuth && !hasRequiredRole()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
