import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, ErrorState, LoadingState } from '../components/ui';
import { CommentSection } from '../features/comments/CommentSection';
import { deletePost, getPost, likePost } from '../features/posts/api';
import { errorMessage, formatDate } from '../lib/format';
import { useAuthStore, useUiStore } from '../stores/ui-store';

export function PostDetailPage() {
  const { postId } = useParams();
  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId!),
  });
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const postLike = useMutation({
    mutationFn: () => likePost(postId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      showToast('좋아요를 반영했습니다.');
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const postDelete = useMutation({
    mutationFn: () => deletePost(postId!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      showToast('게시글을 삭제했습니다.');
      navigate('/');
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const requireLogin = () => {
    if (user) return true;
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  };

  if (postQuery.isPending) return <LoadingState />;
  if (postQuery.isError || !postQuery.data) {
    return (
      <ErrorState message={errorMessage(postQuery.error)} onRetry={() => postQuery.refetch()} />
    );
  }
  const post = postQuery.data;
  const canManage = user?.id === post.authorId || user?.role === 'ADMIN';

  return (
    <article className="article-card">
      <header>
        <h1>{post.title}</h1>
        <p className="meta">
          {post.authorNickname} · {formatDate(post.createdAt)} · 조회{' '}
          {post.viewCount.toLocaleString()}
        </p>
      </header>
      <div className="article-content">{post.content}</div>
      <div className="article-actions">
        <div>
          {canManage ? (
            <>
              <Link className="button button-plain" to={`/posts/${post.id}/edit`}>
                수정
              </Link>
              <button
                className="button button-danger-outline"
                onClick={() => setConfirmDelete(true)}
              >
                삭제
              </button>
            </>
          ) : null}
        </div>
        <button
          onClick={() => {
            if (requireLogin()) postLike.mutate();
          }}
          disabled={postLike.isPending}
        >
          ♥ 좋아요 {post.likeCount.toLocaleString()}
        </button>
      </div>
      <CommentSection
        postId={post.id}
        currentUserId={user?.id}
        isAdmin={user?.role === 'ADMIN'}
        onRequireLogin={requireLogin}
      />
      {confirmDelete ? (
        <ConfirmDialog
          title="게시글을 삭제할까요?"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => postDelete.mutate()}
          pending={postDelete.isPending}
        >
          삭제한 게시글과 관련 댓글은 복구할 수 없습니다.
        </ConfirmDialog>
      ) : null}
    </article>
  );
}
