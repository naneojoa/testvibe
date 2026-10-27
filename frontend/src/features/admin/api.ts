import { apiRequest, jsonRequest } from '../../lib/api';
import type { PageResponse, Role, User } from '../../types';

export const getUsers = (page: number) =>
  apiRequest<PageResponse<User>>(`/api/admin/users?page=${page}&size=20`);
export const changeRole = (id: string, role: Role) =>
  apiRequest<User>(`/api/admin/users/${id}/role`, jsonRequest('PATCH', { role }));
export const deleteUser = (id: string) =>
  apiRequest<void>(`/api/admin/users/${id}`, { method: 'DELETE' });
