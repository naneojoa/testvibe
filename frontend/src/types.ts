export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  nickname: string;
  role: Role;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorNickname: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorNickname: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  children: Comment[];
}

export interface PageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageResponse<T> {
  items: T[];
  page: PageMeta;
}
