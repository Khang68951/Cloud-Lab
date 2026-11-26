import { Navigate, useLocation } from 'react-router';

/**
 * Links from before domains existed (everything was Cloud): keep bookmarks,
 * search params and #anchors working by moving them under /cloud.
 */
export function ToCloud({ to }: { to?: string }) {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`/cloud${to ?? pathname}${search}${hash}`} replace />;
}
