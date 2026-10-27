import { apiRequest, jsonRequest } from '../../lib/api';
import type { User } from '../../types';

export const updateProfile = (nickname: string) =>
  apiRequest<User>('/api/users/me', jsonRequest('PATCH', { nickname }));
