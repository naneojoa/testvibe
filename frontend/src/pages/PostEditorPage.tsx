import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState, Field, LoadingState, PageTitle } from '../components/ui';
import { createPost, getPost, updatePost } from '../features/posts/api';
import { errorMessage, toFieldErrors } from '../lib/format';
import { clearFieldError, validatePost } from '../lib/validation';
import { useAuthStore, useUiStore } from '../stores/ui-store';

export function PostEditorPage() {
  const { postId } = useParams();
  const editing = Boolean(postId);
  const detailQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId!),
    enabled: editing,
  });
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);

  useEffect(() => {
    if (detailQuery.data) {
      setTitle(detailQuery.data.title);
      setContent(detailQuery.data.content);
    }
  }, [detailQuery.data]);
  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? updatePost(postId!, { title: title.trim(), content: content.trim() })
        : createPost({ title: title.trim(), content: content.trim() }),
    onSuccess: (post) => {
      queryClient.setQueryData(['post', post.id], post);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      showToast(editing ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.');
      navigate(`/posts/${post.id}`);
    },
    onError: (error) => {
      setErrors(toFieldErrors(error));
      showToast(errorMessage(error), 'error');
    },
  });

  if (editing && detailQuery.isPending) return <LoadingState />;
  if (editing && detailQuery.isError)
    return (
      <ErrorState message={errorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} />
    );
  if (
    editing &&
    detailQuery.data &&
    user?.id !== detailQuery.data.authorId &&
    user?.role !== 'ADMIN'
  ) {
    return <ErrorState message="이 게시글을 수정할 권한이 없습니다." />;
  }
  return (
    <>
      <PageTitle
        eyebrow={editing ? 'EDIT POST' : 'CREATE POST'}
        title={editing ? '게시글 수정' : '새 글 작성'}
      >
        다른 사람이 이해하기 쉬운 제목과 내용을 작성해 주세요.
      </PageTitle>
      <form
        className="form-card"
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validatePost(title, content);
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length === 0) mutation.mutate();
        }}
      >
        <Field label="제목" error={errors.title} hint="1~200자">
          <input
            value={title}
            maxLength={200}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((current) => clearFieldError(current, 'title'));
            }}
          />
        </Field>
        <Field
          label="내용"
          error={errors.content}
          hint={`${content.length.toLocaleString()} / 10,000자`}
        >
          <textarea
            value={content}
            maxLength={10000}
            onChange={(event) => {
              setContent(event.target.value);
              setErrors((current) => clearFieldError(current, 'content'));
            }}
          />
        </Field>
        <div className="form-actions">
          <button className="button button-plain" type="button" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? '저장 중…' : editing ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </>
  );
}
