import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, signIn as supabaseSignIn, signOut as supabaseSignOut } from '@/lib/supabase';
import type { AuthState } from '@/types';
import { useLocation } from 'wouter';

// Create auth context
const AuthContext = createContext<{
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
}>({
  authState: { user: null, session: null, loading: true, isAuthenticated: false },
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

// Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        // Get session from Supabase
        const { data } = await supabase.auth.getSession();
        const { session } = data;
        
        if (session) {
          setAuthState({
            user: session.user,
            session,
            loading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
          
          // If not logged in and not on login page, redirect to login
          if (location !== '/login') {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        setAuthState({
          user: null,
          session: null,
          loading: false,
          isAuthenticated: false,
        });
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setAuthState({
            user: session.user,
            session,
            loading: false,
            isAuthenticated: true,
          });
          navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
          navigate('/login');
        }
      }
    );

    // Cleanup subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, location]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseSignIn(email, password);

      if (error) {
        return { error };
      }

      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        isAuthenticated: true,
      });

      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabaseSignOut();
      setAuthState({
        user: null,
        session: null,
        loading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        authState, 
        signIn, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};