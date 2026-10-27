import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog, ErrorState, Field, LoadingState } from '../../components/ui';
import { errorMessage, formatDate, toFieldErrors } from '../../lib/format';
import { clearFieldError, validateComment } from '../../lib/validation';
import { useUiStore } from '../../stores/ui-store';
import type { Comment } from '../../types';
import { createComment, deleteComment, getComments, likeComment, updateComment } from './api';

interface CommentSectionProps {
  postId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onRequireLogin: () => boolean;
}

export function CommentSection({
  postId,
  currentUserId,
  isAdmin,
  onRequireLogin,
}: CommentSectionProps) {
  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
  });
  const [replyTo, setReplyTo] = useState<string | null>(null);

  return (
    <section className="comments-section">
      <h2>댓글 {countComments(commentsQuery.data ?? [])}</h2>
      {commentsQuery.isPending ? (
        <LoadingState />
      ) : commentsQuery.isError ? (
        <ErrorState
          message={errorMessage(commentsQuery.error)}
          onRetry={() => commentsQuery.refetch()}
        />
      ) : (
        <>
          {commentsQuery.data?.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRequireLogin={onRequireLogin}
              onReply={setReplyTo}
            />
          ))}
          <CommentComposer
            postId={postId}
            parentCommentId={replyTo}
            onCancel={() => setReplyTo(null)}
            onRequireLogin={onRequireLogin}
          />
        </>
      )}
    </section>
  );
}

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  postId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onRequireLogin: () => boolean;
  onReply: (id: string) => void;
}

function CommentNode({
  comment,
  depth,
  postId,
  currentUserId,
  isAdmin,
  onRequireLogin,
  onReply,
}: CommentNodeProps) {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [editError, setEditError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mutationDone = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    showToast(message);
  };
  const like = useMutation({
    mutationFn: () => likeComment(comment.id),
    onSuccess: () => mutationDone('좋아요를 반영했습니다.'),
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const update = useMutation({
    mutationFn: () => updateComment(comment.id, content.trim()),
    onSuccess: () => {
      mutationDone('댓글을 수정했습니다.');
      setEditing(false);
    },
    onError: (error) => {
      setEditError(toFieldErrors(error).content);
      showToast(errorMessage(error), 'error');
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => mutationDone('댓글을 삭제했습니다.'),
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const canManage = currentUserId === comment.authorId || isAdmin;
  const submitUpdate = () => {
    const errors = validateComment(content);
    setEditError(errors.content);
    if (!errors.content) update.mutate();
  };

  return (
    <div className="comment" style={{ marginLeft: `${Math.min(depth, 2) * 20}px` }}>
      <div className="comment-head">
        <strong>{comment.authorNickname}</strong>
        <span>{formatDate(comment.createdAt)}</span>
      </div>
      {editing ? (
        <>
          <Field label="댓글 수정" error={editError}>
            <textarea
              value={content}
              maxLength={10000}
              onChange={(event) => {
                setContent(event.target.value);
                setEditError(undefined);
              }}
            />
          </Field>
          <div className="comment-controls">
            <button onClick={submitUpdate} disabled={update.isPending}>
              저장
            </button>
            <button
              className="button-plain"
              onClick={() => {
                setEditing(false);
                setContent(comment.content);
                setEditError(undefined);
              }}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <p className="comment-content">{comment.content}</p>
      )}
      <div className="comment-controls">
        <button
          className="button-plain"
          onClick={() => {
            if (onRequireLogin()) like.mutate();
          }}
          disabled={like.isPending}
        >
          좋아요 {comment.likeCount}
        </button>
        <button
          className="button-plain"
          onClick={() => {
            if (onRequireLogin()) onReply(comment.id);
          }}
        >
          답글
        </button>
        {canManage ? (
          <>
            <button className="button-plain" onClick={() => setEditing(true)}>
              수정
            </button>
            <button className="button-plain danger-text" onClick={() => setConfirmDelete(true)}>
              삭제
            </button>
          </>
        ) : null}
      </div>
      {comment.children.map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          depth={depth + 1}
          postId={postId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRequireLogin={onRequireLogin}
          onReply={onReply}
        />
      ))}
      {confirmDelete ? (
        <ConfirmDialog
          title="댓글을 삭제할까요?"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate()}
          pending={remove.isPending}
        >
          답글이 있으면 먼저 답글을 삭제해야 합니다.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function CommentComposer({
  postId,
  parentCommentId,
  onCancel,
  onRequireLogin,
}: {
  postId: string;
  parentCommentId: string | null;
  onCancel: () => void;
  onRequireLogin: () => boolean;
}) {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () => createComment(postId, { content: content.trim(), parentCommentId }),
    onSuccess: () => {
      setContent('');
      onCancel();
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      showToast('댓글을 등록했습니다.');
    },
    onError: (error) => {
      setErrors(toFieldErrors(error));
      showToast(errorMessage(error), 'error');
    },
  });

  return (
    <form
      className="comment-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!onRequireLogin()) return;
        const nextErrors = validateComment(content);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) mutation.mutate();
      }}
    >
      <Field
        label={parentCommentId ? '답글 작성' : '댓글 작성'}
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
          placeholder={
            parentCommentId ? '선택한 댓글에 답글을 남겨 보세요.' : '생각을 이어 주세요.'
          }
        />
      </Field>
      <div className="form-actions">
        {parentCommentId ? (
          <button className="button button-plain" type="button" onClick={onCancel}>
            답글 취소
          </button>
        ) : null}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? '등록 중…' : '등록하기'}
        </button>
      </div>
    </form>
  );
}

function countComments(comments: Comment[]): number {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.children), 0);
}
