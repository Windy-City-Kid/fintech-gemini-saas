import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // STABILIZE AUTH GUARD: Check loading state FIRST to prevent redirects during initialization
  // This prevents 'Database Error' during signup when AuthContext is still loading
  // Fast Refresh compatibility: Don't redirect until auth state is fully loaded
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Only redirect if loading is complete AND user is not authenticated
  // This ensures we don't redirect prematurely during signup flow
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // If loading is complete and user exists, render children
  // If loading is true, we already returned loading state above
  return <>{children}</>;
}
