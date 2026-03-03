import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (username: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    // Set up auth listener FIRST (prevents missing events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        // Do not call Supabase inside the callback synchronously
        setTimeout(() => {
          void checkAdminRole(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    // Then fetch current session to set initial state
    // (onAuthStateChange above already handles checkAdminRole — no need to call it again here)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session?.user) setIsAdmin(false);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });
      if (error) throw error;
      setIsAdmin(Boolean(data));
    } catch {
      setIsAdmin(false);
    }
  };

  const toFakeEmail = (username: string) =>
    `${username.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}@hellas.local`;

  const signUp = async (username: string, password: string) => {
    const fakeEmail = toFakeEmail(username);
    const { error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: {
        data: { display_name: username },
      },
    });
    return { error };
  };

  const signIn = async (username: string, password: string) => {
    const fakeEmail = toFakeEmail(username);
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
