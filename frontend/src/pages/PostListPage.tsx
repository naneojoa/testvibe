import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui';
import { errorMessage, formatDate } from '../lib/format';
import { validateSearchQuery } from '../lib/validation';
import { getPosts, type PostSort } from '../features/posts/api';

const sorts: { value: PostSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'views', label: '조회순' },
  { value: 'likes', label: '좋아요순' },
];

export function PostListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = validSort(params.get('sort'));
  const page = parsePage(params.get('page'));
  const [keyword, setKeyword] = useState(q);
  const postsQuery = useQuery({
    queryKey: ['posts', { q, sort, page }],
    queryFn: () => getPosts({ q, sort, page }),
  });
  const popularQuery = useQuery({
    queryKey: ['posts', 'popular'],
    queryFn: () => getPosts({ sort: 'views', size: 3 }),
  });

  useEffect(() => setKeyword(q), [q]);

  function update(next: Record<string, string | number | undefined>) {
    const nextParams = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 0) nextParams.delete(key);
      else nextParams.set(key, String(value));
    });
    setParams(nextParams);
  }

  return (
    <>
      <PageTitle eyebrow="HOME / POSTS" title="모든 이야기">
        찾고 싶은 이야기를 검색하고, 새 이야기에 참여해 보세요.
      </PageTitle>
      <form
        className="list-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          if (Object.keys(validateSearchQuery(keyword)).length === 0) {
            update({ q: keyword.trim(), page: 0 });
          }
        }}
      >
        <input
          aria-label="게시글 검색"
          value={keyword}
          maxLength={200}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="제목, 내용, 작성자 검색"
        />
        <button type="submit">검색</button>
        <Link className="button" to="/posts/new">
          + 새 글 작성
        </Link>
      </form>

      {popularQuery.data?.items.length ? (
        <section className="popular-section" aria-labelledby="popular-title">
          <div className="section-heading">
            <h2 id="popular-title">조회 많은 글</h2>
            <small>누적 조회 수 기준</small>
          </div>
          <div className="popular-grid">
            {popularQuery.data.items.map((post) => (
              <Link className="popular-card" key={post.id} to={`/posts/${post.id}`}>
                <strong>{post.title}</strong>
                <span>
                  조회 {post.viewCount.toLocaleString()} · 좋아요 {post.likeCount.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="sort-tabs" aria-label="게시글 정렬">
        {sorts.map((item) => (
          <button
            className={sort === item.value ? 'active' : ''}
            key={item.value}
            onClick={() => update({ sort: item.value, page: 0 })}
          >
            {item.label}
          </button>
        ))}
      </div>
      {postsQuery.isPending ? (
        <LoadingState />
      ) : postsQuery.isError ? (
        <ErrorState message={errorMessage(postsQuery.error)} onRetry={() => postsQuery.refetch()} />
      ) : postsQuery.data.items.length === 0 ? (
        <EmptyState>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</EmptyState>
      ) : (
        <>
          <section className="post-list">
            {postsQuery.data.items.map((post) => (
              <Link className="post-row" key={post.id} to={`/posts/${post.id}`}>
                <strong>{post.title}</strong>
                <span>
                  {post.authorNickname} · {formatDate(post.createdAt)} · 조회{' '}
                  {post.viewCount.toLocaleString()} · 좋아요 {post.likeCount.toLocaleString()}
                </span>
              </Link>
            ))}
          </section>
          <Pagination
            page={postsQuery.data.page.number}
            totalPages={postsQuery.data.page.totalPages}
            onChange={(nextPage) => update({ page: nextPage })}
          />
        </>
      )}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>
        이전
      </button>
      {visiblePages(page, totalPages).map((value) => (
        <button
          aria-current={value === page ? 'page' : undefined}
          className={value === page ? 'active' : ''}
          key={value}
          onClick={() => onChange(value)}
        >
          {value + 1}
        </button>
      ))}
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        다음
      </button>
    </nav>
  );
}

export function visiblePages(page: number, totalPages: number) {
  const count = Math.min(5, Math.max(0, totalPages));
  const start = Math.max(0, Math.min(page - 2, totalPages - count));
  return Array.from({ length: count }, (_, index) => start + index);
}

function validSort(value: string | null): PostSort {
  return value === 'views' || value === 'likes' ? value : 'latest';
}

export function parsePage(value: string | null): number {
  const parsed = Number(value ?? '0');
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
