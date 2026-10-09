import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type ProfileStatus = 'pending' | 'approved' | 'rejected' | null;
type ProfileRole = 'employee' | 'admin' | null;

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  status: ProfileStatus;
  role: ProfileRole;
  avatarUrl: string | null;
  closingTime: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  status: null,
  role: null,
  avatarUrl: null,
  closingTime: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [role, setRole] = useState<ProfileRole>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [closingTime, setClosingTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setStatus(null);
      setRole(null);
      setAvatarUrl(null);
      setClosingTime(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('status, role, avatar_url, closing_time')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setStatus(null);
      setRole(null);
      setAvatarUrl(null);
      setClosingTime(null);
    } else if (data) {
      setStatus(data.status as ProfileStatus);
      setRole(data.role as ProfileRole);
      setAvatarUrl(data.avatar_url as string | null);
      setClosingTime(data.closing_time ? (data.closing_time as string).slice(0, 5) : null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ session, user, status, role, avatarUrl, closingTime, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
