import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog, ErrorState, LoadingState, PageTitle } from '../components/ui';
import { changeRole, deleteUser, getUsers } from '../features/admin/api';
import { errorMessage } from '../lib/format';
import { useAuthStore, useUiStore } from '../stores/ui-store';
import type { User } from '../types';

export function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const usersQuery = useQuery({ queryKey: ['admin-users', page], queryFn: () => getUsers(page) });
  const [target, setTarget] = useState<{ user: User; action: 'role' | 'delete' }>();
  const currentUser = useAuthStore((state) => state.user)!;
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (target!.action === 'delete') await deleteUser(target!.user.id);
      else await changeRole(target!.user.id, target!.user.role === 'ADMIN' ? 'USER' : 'ADMIN');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('회원 정보를 변경했습니다.');
      setTarget(undefined);
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  return (
    <>
      <PageTitle eyebrow="ADMIN ONLY" title="회원 관리">
        역할 변경과 삭제는 신중하게 처리해 주세요.
      </PageTitle>
      {usersQuery.isPending ? (
        <LoadingState />
      ) : usersQuery.isError ? (
        <ErrorState message={errorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} />
      ) : (
        <>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>회원</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.nickname}
                      {user.id === currentUser.id ? <small>내 계정</small> : null}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge">{user.role}</span>
                    </td>
                    <td>
                      {user.id === currentUser.id ? (
                        <span>내 계정은 변경할 수 없습니다.</span>
                      ) : (
                        <>
                          <button
                            className="button button-plain"
                            onClick={() => setTarget({ user, action: 'role' })}
                          >
                            역할 변경
                          </button>
                          <button
                            className="button button-danger-outline"
                            onClick={() => setTarget({ user, action: 'delete' })}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              이전
            </button>
            <span>
              {page + 1} / {Math.max(1, usersQuery.data.page.totalPages)}
            </span>
            <button
              disabled={page >= usersQuery.data.page.totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              다음
            </button>
          </div>
        </>
      )}
      {target ? (
        <ConfirmDialog
          title={target.action === 'delete' ? '회원을 삭제할까요?' : '회원 역할을 변경할까요?'}
          onCancel={() => setTarget(undefined)}
          onConfirm={() => mutation.mutate()}
          pending={mutation.isPending}
        >
          {target.action === 'delete'
            ? `${target.user.nickname} 님의 계정을 삭제합니다. 게시글·댓글이 있으면 서버 정책에 따라 삭제가 거부될 수 있습니다.`
            : `${target.user.nickname} 님의 역할을 ${target.user.role === 'ADMIN' ? 'USER' : 'ADMIN'}으로 변경합니다.`}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
