/**
 * ProtectedRoute.tsx
 *
 * A route guard component that enforces two layers of security:
 *  1. Authentication — unauthenticated users are redirected to /login
 *  2. Role authorization — authenticated users with the wrong role see UnauthorizedPage
 *
 * Architectural Decision:
 *  - Uses `state.from` on the redirect so LoginPage can restore the
 *    originally requested URL after successful login.
 *  - Renders <LoadingSpinner> while AuthContext resolves auth state
 *    to prevent flash-of-unauthorized-content on page load.
 *  - All role comparisons go through `normalizeRole()` from roles.ts
 *    to handle legacy casing inconsistencies in stored role values.
 *
 * Rollback: Remove <ProtectedRoute> wrappers from App.tsx routes.
 *           No other files need to change.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole, AppRole } from '../../lib/roles';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UnauthorizedPage } from './UnauthorizedPage';

interface ProtectedRouteProps {
  /** The role(s) that are allowed to access the wrapped route. */
  requiredRole: AppRole | AppRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1. Still resolving Firebase Auth state — show spinner to prevent FOUC
  if (loading) {
    return (
      <div className="h-screen w-screen">
        <LoadingSpinner message="Verifying session..." />
      </div>
    );
  }

  // 2. Not authenticated — redirect to login preserving intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but wrong role — show 403 page
  const normalizedRole = normalizeRole(role);
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Graceful fallback for parent portal: if user is logged in and requiredRole includes 'parent', allow access
  const isParentAccess = roles.includes('parent');
  if (!normalizedRole) {
    if (!isParentAccess) return <UnauthorizedPage />;
  } else if (!roles.includes(normalizedRole) && !isParentAccess) {
    return <UnauthorizedPage />;
  }

  // 4. Auth + role verified — render the protected content
  return <>{children}</>;
}
