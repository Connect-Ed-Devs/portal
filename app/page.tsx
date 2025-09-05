'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/home');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // The useEffect will handle redirection after user state updates
    } catch {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in, they will be redirected by useEffect
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-black/[.08] dark:border-white/[.145] p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Sign In</h1>
            <p className="text-foreground/60">Enter your credentials to continue</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-black/[.08] dark:border-white/[.145] rounded-md text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-black/[.08] dark:border-white/[.145] rounded-md text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-2 px-4 rounded-md font-medium hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
