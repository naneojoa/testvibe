import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../features/auth/api';
import { useAuthStore, useUiStore } from '../stores/ui-store';
import { Button, ToastViewport } from './ui';

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setUser();
      queryClient.clear();
      navigate('/');
    },
    onError: () => showToast('로그아웃하지 못했습니다.', 'error'),
  });

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            잇<span>글</span>
          </Link>
          <nav aria-label="주요 메뉴">
            <NavLink to="/">게시글</NavLink>
            {user ? <NavLink to="/me">내 정보</NavLink> : null}
            {user?.role === 'ADMIN' ? <NavLink to="/admin/users">관리자</NavLink> : null}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-greeting">{user.nickname} 님</span>
                <Button
                  className="button-plain"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  로그아웃
                </Button>
                <Link className="button" to="/posts/new">
                  글쓰기
                </Link>
              </>
            ) : (
              <>
                <Link className="button button-plain" to="/sign-up">
                  회원가입
                </Link>
                <Link className="button" to="/login">
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
      <ToastViewport />
    </>
  );
}
