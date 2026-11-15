# TASK-0015: BooksAtlas Reader Phase 3: achievements, shared notes, reading groups (cycle 10)

**Date:** 2026-11-16 · **Status:** built, tested; needs `migrations-2026-11-16a-social-reading.sql` before sharing and groups work in production

From `bookatlascode_ebook_reader.md` Phase 3, which lists:
- Social Reading
- Achievements
- Reading Groups
- Shared Annotations
- Audiobook Synchronization: already there, since the narration highlights each paragraph.
- Enterprise Classroom: deferred. Reading groups are the first step towards it.

## What readers get

- **Achievements and a daily goal** (Notebook → Stats):
  - 13 achievements, worked out each time from the reader's own sessions, progress, marks and groups, so nothing is invented or stored.
  - A daily goal of 10–60 minutes, with today's progress.
- **Shared notes** (Notebook → Share):
  - A highlight or note can be shared with other signed-in readers of the book.
  - It is shown under the first name and last initial (as reviews are).
  - The quoted text is taken from the book on the server, never from the client.
  - Bookmarks stay private.
- **Popular highlights**:
  - An anonymous count; a passage shows only once at least 3 readers have highlighted it.
  - Marked with a 🔥 in the margin and listed in the Readers panel.
- **Visibility:** shared notes and popular passages are only shown on text the viewer may read (the preview, unless they own the book).
- **Reading groups** (Readers panel → Reading groups):
  - Private groups around one book (up to 50 members, 20 run per reader).
  - Joined with a 10-character invite code or the link `/?join=CODE`, which joins the group and opens the book on it.
  - Posts are tagged with a chapter or "whole book". Posts about a chapter the reader has not reached are covered by a spoiler guard.
  - The owner may remove any post.
  - Leaving a group removes the member's posts. When the owner leaves, the group is deleted.
- **Reports**:
  - Shared notes and posts can be reported.
  - Three distinct reports hide the item.
  - Administrators restore or hide items in Publish → "Reported reader notes and group posts".

## Privacy

- The privacy notice has a new "Reading with others" section.
- The data export includes group memberships and posts.
- Account erasure deletes groups the reader owns, their memberships, posts and reports.
- Reader settings are now merged on save, so the daily goal and display settings don't overwrite each other.

## Code

- **API:**
  - `reader/achievements.ts`, `reader/social.ts`, `reader/groups.ts`, and routes in `reader/routes.ts`.
  - Access rules in `auth/policy.ts`.
  - Rate limits on `/api/reader/groups` (60/min) and `/api/reader/reports` (20/min).
- **Database:**
  - `migrations-2026-11-16a-social-reading.sql` adds `shared`, `display_name` and `hidden` to the annotations table.
  - It also creates `bookatlas_reading_groups`, `_group_members`, `_group_posts` and `bookatlas_reader_reports`, with RLS on and service role only.
- **Web:** `reader/ReaderAchievements.tsx`, `reader/ReaderCommunity.tsx`, `ebook/ReaderReportsQueue.tsx`, the reader toolbar (Readers button, margin markers) and the invite link in `App.tsx`.
- **Test:** `tests/e2e/reader-social.test.ts`.
