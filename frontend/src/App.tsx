import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AppShell } from './components/layout';
import { ErrorState, LoadingState } from './components/ui';
import { getMe } from './features/auth/api';
import { ApiError, setUnauthorizedHandler } from './lib/api';
import { useAuthStore } from './stores/ui-store';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { LoginPage, SignUpPage } from './pages/AuthPages';
import { MePage } from './pages/MePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { PostEditorPage } from './pages/PostEditorPage';
import { PostListPage } from './pages/PostListPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionBoundary />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function SessionBoundary() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const setReady = useAuthStore((state) => state.setReady);
  const setSessionError = useAuthStore((state) => state.setSessionError);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
    if (meQuery.isError) {
      if (meQuery.error instanceof ApiError && meQuery.error.status === 401) setUser();
      else setSessionError();
    }
    if (meQuery.isSuccess) setReady();
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isError,
    meQuery.isSuccess,
    setReady,
    setSessionError,
    setUser,
  ]);
  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        setUser();
        queryClient.removeQueries({ queryKey: ['me'] });
        navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      }),
    [location.pathname, location.search, navigate, setUser],
  );
  return null;
}

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PostListPage />} />
        <Route path="/posts/:postId" element={<PostDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/posts/new" element={<PostEditorPage />} />
          <Route path="/posts/:postId/edit" element={<PostEditorPage />} />
          <Route path="/me" element={<MePage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') {
    return (
      <ErrorState
        message="로그인 상태를 확인하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['me'] })}
      />
    );
  }
  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}

function AdminRoute() {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'ADMIN' ? (
    <Outlet />
  ) : (
    <ErrorState message="관리자만 접근할 수 있습니다." />
  );
}
