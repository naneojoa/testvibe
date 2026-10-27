CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL UNIQUE, role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE posts (
    id UUID PRIMARY KEY, author_id UUID NOT NULL REFERENCES users(id), title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    content TEXT NOT NULL CHECK (length(trim(content)) > 0), view_count BIGINT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    like_count BIGINT NOT NULL DEFAULT 0 CHECK (like_count >= 0), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE comments (
    id UUID PRIMARY KEY, post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, author_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES comments(id), content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    like_count BIGINT NOT NULL DEFAULT 0 CHECK (like_count >= 0), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE post_likes (post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(post_id, user_id));
CREATE TABLE comment_likes (comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(comment_id, user_id));
CREATE TABLE post_views (post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id), viewer_key VARCHAR(64), first_viewed_at TIMESTAMPTZ NOT NULL, last_counted_at TIMESTAMPTZ NOT NULL, CHECK ((user_id IS NULL) <> (viewer_key IS NULL)));
CREATE UNIQUE INDEX ux_post_views_user ON post_views(post_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX ux_post_views_guest ON post_views(post_id, viewer_key) WHERE viewer_key IS NOT NULL;
CREATE INDEX ix_posts_created ON posts(created_at DESC, id DESC);
CREATE INDEX ix_posts_author_created ON posts(author_id, created_at DESC, id DESC);
CREATE INDEX ix_comments_post_created ON comments(post_id, created_at, id);
CREATE INDEX ix_comments_parent_created ON comments(parent_comment_id, created_at, id);

CREATE FUNCTION update_post_like_count() RETURNS TRIGGER AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id; RETURN NEW;
  ELSE UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id; RETURN OLD; END IF;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER post_like_count_trigger AFTER INSERT OR DELETE ON post_likes FOR EACH ROW EXECUTE FUNCTION update_post_like_count();
CREATE FUNCTION update_comment_like_count() RETURNS TRIGGER AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id; RETURN NEW;
  ELSE UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id; RETURN OLD; END IF;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER comment_like_count_trigger AFTER INSERT OR DELETE ON comment_likes FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

CREATE FUNCTION record_post_view(p_post_id UUID, p_user_id UUID, p_viewer_key VARCHAR) RETURNS VOID AS $$
DECLARE last_counted TIMESTAMPTZ;
BEGIN
  IF (p_user_id IS NULL) = (p_viewer_key IS NULL) THEN RAISE EXCEPTION 'exactly one viewer key is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_post_id::text || coalesce(p_user_id::text, p_viewer_key)));
  IF p_user_id IS NOT NULL THEN SELECT last_counted_at INTO last_counted FROM post_views WHERE post_id = p_post_id AND user_id = p_user_id FOR UPDATE;
  ELSE SELECT last_counted_at INTO last_counted FROM post_views WHERE post_id = p_post_id AND viewer_key = p_viewer_key FOR UPDATE; END IF;
  IF last_counted IS NULL THEN
    INSERT INTO post_views(post_id,user_id,viewer_key,first_viewed_at,last_counted_at) VALUES(p_post_id,p_user_id,p_viewer_key,now(),now());
    UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id;
  ELSIF last_counted <= now() - interval '24 hours' THEN
    IF p_user_id IS NOT NULL THEN UPDATE post_views SET last_counted_at = now() WHERE post_id=p_post_id AND user_id=p_user_id; ELSE UPDATE post_views SET last_counted_at = now() WHERE post_id=p_post_id AND viewer_key=p_viewer_key; END IF;
    UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id;
  END IF;
END; $$ LANGUAGE plpgsql;

INSERT INTO users(id, email, password_hash, nickname, role, created_at, updated_at)
VALUES (gen_random_uuid(), '${admin_email}', '${admin_password_hash}', 'admin', 'ADMIN', now(), now())
ON CONFLICT (email) DO NOTHING;
