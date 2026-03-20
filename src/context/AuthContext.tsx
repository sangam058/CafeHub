import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';

interface User {
  id: string; // From Supabase Auth UUID
  name: string;
  email: string;
  role: string;
  loyalty_points: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession?.user) {
        // Fetch from our new professional 'users' table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
          
        if (userData) {
          const isAdmin = userData.email === 'aman@gmail.com';
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: isAdmin ? 'admin' : (userData.role || 'customer'),
            loyalty_points: userData.loyalty_points || 0
          });
        } else {
          // AUTO-CREATE record if missing (Resolves cart_user_id_fkey once and for all)
          const isAdmin = currentSession.user.email === 'aman@gmail.com';
          const newProfile = {
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.full_name || 'Customer',
            email: currentSession.user.email || '',
            role: isAdmin ? 'admin' : 'customer',
            loyalty_points: 0
          };
          
          // Silently try to create the record in the background
          supabase.from('users').upsert(newProfile).then(({ error }) => {
            if (error) console.error('Auto-profile creation failed:', error);
          });

          setUser(newProfile);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth refresh error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        refreshUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. If you "aman@gmail.com", please ensure you have created this user in Supabase Auth dashboard.');
        }
        throw error;
      }
      await refreshUser();
    } catch (err) {
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;
    
    // Create user record in 'users' table if it doesn't exist (depends on trigger usually, but let's be safe)
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email: email,
        name: name,
        role: 'customer',
        loyalty_points: 0
      });
    }
    
    await refreshUser();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, token: session?.access_token || null, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
