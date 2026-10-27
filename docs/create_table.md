# 테이블·함수·트리거 SQL 참고 자료

게시판 DB 구조를 SQL로 읽어 보기 위한 문서다. 컬럼과 업무 규칙 설명은 [데이터베이스 설계서](database-schema-spec.md)를 참고한다.

실제 DB 변경은 `backend/src/main/resources/db/migration/`의 새 Flyway 마이그레이션으로 적용한다. 이 문서 전체를 기존 DB에 직접 실행하는 용도로 사용하지 않는다.

```sql
-- UUID 생성 함수 제공
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. 회원
-- =========================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname      VARCHAR(50)  NOT NULL UNIQUE,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
        CHECK (role IN ('USER', 'ADMIN'))
);

-- =========================================================
-- 2. 게시글
-- =========================================================
CREATE TABLE posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID         NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL,
    view_count  BIGINT       NOT NULL DEFAULT 0,
    like_count  BIGINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_posts_author
        FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_posts_title_not_blank
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT chk_posts_content_not_blank
        CHECK (BTRIM(content) <> ''),

    CONSTRAINT chk_posts_view_count
        CHECK (view_count >= 0),

    CONSTRAINT chk_posts_like_count
        CHECK (like_count >= 0)
);

-- 게시글 목록 및 작성자별 목록 조회용
CREATE INDEX idx_posts_created_at_id
    ON posts (created_at DESC, id DESC);

CREATE INDEX idx_posts_author_id_created_at
    ON posts (author_id, created_at DESC, id DESC);

-- =========================================================
-- 3. 댓글 및 무제한 대댓글
-- =========================================================
CREATE TABLE comments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           UUID        NOT NULL,
    author_id         UUID        NOT NULL,
    parent_comment_id UUID        NULL,
    content           TEXT        NOT NULL,
    like_count        BIGINT      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_post
        FOREIGN KEY (post_id) REFERENCES posts (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_author
        FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT,

    -- 부모 댓글을 먼저 삭제하면 오류 발생.
    -- 자식 대댓글을 모두 삭제한 뒤에만 부모 댓글을 삭제할 수 있음.
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_comment_id) REFERENCES comments (id)
        ON DELETE NO ACTION,

    CONSTRAINT chk_comments_not_self_parent
        CHECK (parent_comment_id IS NULL OR parent_comment_id <> id),

    CONSTRAINT chk_comments_content_not_blank
        CHECK (BTRIM(content) <> ''),

    CONSTRAINT chk_comments_like_count
        CHECK (like_count >= 0)
);

CREATE INDEX idx_comments_post_id_created_at
    ON comments (post_id, created_at, id);

CREATE INDEX idx_comments_parent_comment_id
    ON comments (parent_comment_id, created_at, id);

-- 부모 댓글과 대댓글이 반드시 같은 게시글에 속하도록 검증
CREATE OR REPLACE FUNCTION validate_comment_parent_post()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_comment_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM comments parent
           WHERE parent.id = NEW.parent_comment_id
             AND parent.post_id = NEW.post_id
       )
    THEN
        RAISE EXCEPTION
            '부모 댓글은 동일한 게시글의 댓글이어야 합니다.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_comment_parent_post
BEFORE INSERT OR UPDATE OF post_id, parent_comment_id ON comments
FOR EACH ROW
EXECUTE FUNCTION validate_comment_parent_post();

-- =========================================================
-- 4. 게시글 좋아요: 회원당 게시글 하나에 한 번만 가능
-- =========================================================
CREATE TABLE post_likes (
    post_id    UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (post_id, user_id),

    CONSTRAINT fk_post_likes_post
        FOREIGN KEY (post_id) REFERENCES posts (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_post_likes_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
);

-- =========================================================
-- 5. 댓글 좋아요: 회원당 댓글 하나에 한 번만 가능
-- =========================================================
CREATE TABLE comment_likes (
    comment_id UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (comment_id, user_id),

    CONSTRAINT fk_comment_likes_comment
        FOREIGN KEY (comment_id) REFERENCES comments (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_likes_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
);

-- =========================================================
-- 6. 조회 이력
-- 로그인 회원: user_id
-- 비회원: viewer_key에 HMAC-SHA-256으로 만든 IP 해시 저장
-- =========================================================
CREATE TABLE post_views (
    post_id         UUID        NOT NULL,
    user_id         UUID        NULL,
    viewer_key      VARCHAR(64) NULL,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_counted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_post_views_post
        FOREIGN KEY (post_id) REFERENCES posts (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_post_views_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE,

    -- 로그인 회원 또는 비회원 IP 해시 중 정확히 하나만 저장
    CONSTRAINT chk_post_views_identity
        CHECK (
            (user_id IS NOT NULL AND viewer_key IS NULL)
            OR
            (user_id IS NULL AND viewer_key IS NOT NULL)
        ),

    CONSTRAINT chk_post_views_viewer_key_format
        CHECK (
            viewer_key IS NULL
            OR viewer_key ~ '^[0-9a-f]{64}$'
        )
);

-- 로그인 회원: 게시글별 마지막 집계 시각 하나만 보관
CREATE UNIQUE INDEX uk_post_views_post_user
    ON post_views (post_id, user_id)
    WHERE user_id IS NOT NULL;

-- 비회원: 게시글별 IP 해시 마지막 집계 시각 하나만 보관
CREATE UNIQUE INDEX uk_post_views_post_viewer_key
    ON post_views (post_id, viewer_key)
    WHERE viewer_key IS NOT NULL;

-- =========================================================
-- 7. 좋아요 수 자동 집계 트리거
-- =========================================================
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts
        SET like_count = like_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.post_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();


CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments
        SET like_count = like_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.comment_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- =========================================================
-- 8. 수정 시간 자동 갱신
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =========================================================
-- 9. 조회 수 기록 함수
-- 반환값: true면 이번 요청으로 view_count 증가, false면 24시간 내 중복 조회
-- p_user_id: 로그인 회원이면 회원 UUID
-- p_viewer_key: 비회원이면 IP HMAC-SHA-256 해시
-- =========================================================
CREATE OR REPLACE FUNCTION record_post_view(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_viewer_key VARCHAR(64) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_counted BOOLEAN;
BEGIN
    IF (p_user_id IS NULL) = (p_viewer_key IS NULL) THEN
        RAISE EXCEPTION
            '로그인 회원 ID 또는 비회원 IP 해시 중 하나만 전달해야 합니다.';
    END IF;

    IF p_user_id IS NOT NULL THEN
        WITH counted_view AS (
            INSERT INTO post_views (
                post_id,
                user_id,
                last_counted_at
            )
            VALUES (
                p_post_id,
                p_user_id,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (post_id, user_id)
            WHERE user_id IS NOT NULL
            DO UPDATE
            SET last_counted_at = EXCLUDED.last_counted_at
            WHERE post_views.last_counted_at
                < EXCLUDED.last_counted_at - INTERVAL '24 hours'
            RETURNING post_id
        ),
        incremented AS (
            UPDATE posts
            SET view_count = view_count + 1
            WHERE id IN (SELECT post_id FROM counted_view)
            RETURNING id
        )
        SELECT EXISTS (SELECT 1 FROM incremented)
        INTO v_counted;

    ELSE
        WITH counted_view AS (
            INSERT INTO post_views (
                post_id,
                viewer_key,
                last_counted_at
            )
            VALUES (
                p_post_id,
                p_viewer_key,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (post_id, viewer_key)
            WHERE viewer_key IS NOT NULL
            DO UPDATE
            SET last_counted_at = EXCLUDED.last_counted_at
            WHERE post_views.last_counted_at
                < EXCLUDED.last_counted_at - INTERVAL '24 hours'
            RETURNING post_id
        ),
        incremented AS (
            UPDATE posts
            SET view_count = view_count + 1
            WHERE id IN (SELECT post_id FROM counted_view)
            RETURNING id
        )
        SELECT EXISTS (SELECT 1 FROM incremented)
        INTO v_counted;
    END IF;

    RETURN v_counted;
END;
$$ LANGUAGE plpgsql;
```
