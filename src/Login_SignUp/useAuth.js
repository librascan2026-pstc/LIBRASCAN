import { createContext, useContext } from 'react';

// Split out from AuthContext.jsx so that file can export the AuthProvider
// component ONLY. Vite's React Fast Refresh requires component-only files
// to hot-swap cleanly; mixing a component export with plain function/context
// exports (like the old combined useAuth + AuthProvider) invalidates the
// Fast Refresh boundary whenever a dependency of that file changes (e.g.
// supabaseClient.js). When that happens, the file gets fully re-executed,
// createContext() runs again, and any already-mounted component holding a
// reference to the OLD context object throws "useAuth must be used inside
// <AuthProvider>" even though the JSX nesting is completely correct.
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}