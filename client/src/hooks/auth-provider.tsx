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
        console.log('Initializing auth state, current location:', location);
        
        // Get session from Supabase
        const { data } = await supabase.auth.getSession();
        console.log('Auth session data:', data);
        
        const { session } = data;
        
        if (session) {
          console.log('Found existing session, user:', session.user);
          setAuthState({
            user: session.user,
            session,
            loading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('No session found, setting unauthenticated state');
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
          
          // If not logged in and not on login page, redirect to login
          if (location !== '/login') {
            console.log('Redirecting to login page');
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
    console.log('Setting up auth state change listener');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'Session:', session);
        
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          console.log('User session detected, updating state and redirecting');
          setAuthState({
            user: session.user,
            session,
            loading: false,
            isAuthenticated: true,
          });
          
          if (location !== '/dashboard') {
            console.log('Redirecting to dashboard from', location);
            navigate('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out event detected, clearing state and redirecting');
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
          navigate('/login');
        } else {
          console.log('Other auth event:', event, 'Current location:', location);
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
      console.log('Attempting to sign in with email:', email);
      const { data, error } = await supabaseSignIn(email, password);
      
      console.log('Sign in response:', { data, error });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful, setting auth state with user:', data.user);
      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        isAuthenticated: true,
      });

      return { error: null };
    } catch (error) {
      console.error('Unexpected error signing in:', error);
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