import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For development, set a mock user
    setUser({
      id: 'Hettie',
      email: 'hettie@example.com',
      name: 'Hettie'
    });
    setLoading(false);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user
  };
}

export default useAuth; 