import { apiRequest, jsonRequest } from '../../lib/api';
import type { Comment } from '../../types';

export interface CommentValues {
  content: string;
  parentCommentId: string | null;
}

export const getComments = (postId: string) =>
  apiRequest<Comment[]>(`/api/posts/${postId}/comments`);
export const createComment = (postId: string, values: CommentValues) =>
  apiRequest<Comment>(`/api/posts/${postId}/comments`, jsonRequest('POST', values));
export const updateComment = (commentId: string, content: string) =>
  apiRequest<Comment>(
    `/api/comments/${commentId}`,
    jsonRequest('PATCH', { content, parentCommentId: null }),
  );
export const deleteComment = (commentId: string) =>
  apiRequest<void>(`/api/comments/${commentId}`, { method: 'DELETE' });
export const likeComment = (commentId: string) =>
  apiRequest<void>(`/api/comments/${commentId}/like`, { method: 'PUT' });
