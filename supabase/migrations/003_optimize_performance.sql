-- ============================================================
-- CINEX — Performance Optimization Indexes
-- Add partial composite indexes to speed up feed and activity queries
-- ============================================================

-- 1. Speed up public feed query on home page
create index if not exists idx_shelf_entries_feed
  on public.shelf_entries(is_public, created_at desc)
  where (status != 'want_to_watch');

-- 2. Speed up follow-based activity feed query
create index if not exists idx_shelf_entries_activity
  on public.shelf_entries(user_id, is_public, created_at desc)
  where (status != 'want_to_watch');
