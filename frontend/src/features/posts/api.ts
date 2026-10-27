import { apiRequest, jsonRequest } from '../../lib/api';
import type { PageResponse, Post } from '../../types';

export type PostSort = 'latest' | 'views' | 'likes';
export interface PostValues {
  title: string;
  content: string;
}

export function getPosts({
  q = '',
  sort = 'latest',
  page = 0,
  size = 20,
}: {
  q?: string;
  sort?: PostSort;
  page?: number;
  size?: number;
}) {
  const search = new URLSearchParams({ sort, page: String(page), size: String(size) });
  if (q) search.set('q', q);
  return apiRequest<PageResponse<Post>>(`/api/posts?${search}`);
}
export const getPost = (id: string) => apiRequest<Post>(`/api/posts/${id}`);
export const createPost = (values: PostValues) =>
  apiRequest<Post>('/api/posts', jsonRequest('POST', values));
export const updatePost = (id: string, values: PostValues) =>
  apiRequest<Post>(`/api/posts/${id}`, jsonRequest('PATCH', values));
export const deletePost = (id: string) =>
  apiRequest<void>(`/api/posts/${id}`, { method: 'DELETE' });
export const likePost = (id: string) =>
  apiRequest<void>(`/api/posts/${id}/like`, { method: 'PUT' });
