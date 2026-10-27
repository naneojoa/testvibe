import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentSection } from './CommentSection';
import { createComment, getComments } from './api';

vi.mock('./api', () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  getComments: vi.fn(),
  likeComment: vi.fn(),
  updateComment: vi.fn(),
}));

function renderComments(onRequireLogin: () => boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommentSection postId="post-1" isAdmin={false} onRequireLogin={onRequireLogin} />
    </QueryClientProvider>,
  );
}

describe('CommentSection', () => {
  beforeEach(() => {
    vi.mocked(getComments).mockResolvedValue([]);
  });

  it('does not submit a guest comment and asks the page to start login', async () => {
    const onRequireLogin = vi.fn(() => false);
    renderComments(onRequireLogin);

    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'guest comment' } });
    fireEvent.submit(textarea.closest('form')!);

    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(createComment).not.toHaveBeenCalled();
  });
});
