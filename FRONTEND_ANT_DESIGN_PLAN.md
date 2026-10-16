# OpenXdrive · Ant Design 6 enterprise frontend

## Source of truth
- Design system: **Ant Design 6** components, tokens, layout, menus, tables, forms, dialogs, drawers, upload progress, and responsive grid.
- Icons: **@ant-design/icons 6**. Do not introduce a separate new visual component framework.
- Preserve existing router, Google OAuth, API contracts, permissions, tenant isolation, uploads, Google Drive/S3 integrations, storage sync, sharing, and persistent state.
- Never replace live service responses with fabricated dashboard metrics or placeholder user data.
- Retain Tailwind utility classes temporarily for untouched business-only page internals while migrating visual components to Ant Design. This is a staged conversion, **not** a claim that every legacy JSX element has been removed.

## UX specification
1. Quiet enterprise aesthetic: white / porcelain workspace, ink text, #1677ff blue primary, precise borders and consistent 8px spacing; no gradients/glass/neon effects.
2. Left navigation with clear hierarchy, compact connected-storage indicator, primary search, high-contrast selected state and responsive mobile drawer.
3. Accessible action buttons, native Ant Design overlay focus management, Ant Table sorting/pagination, bulk selection, keyboard navigation.
4. Error, loading, empty and storage-not-configured states must convey real backend state, not simulated success.
5. Authentication screens retain captcha, password policies, Google OAuth redirects and session storage behavior.
6. Dedicated controls must remain functional across file upload/sync, folder creation, preview/share, bulk actions, per-account routing, filtering and download.

## QA and acceptance
- `npm ci` from committed lockfiles for repeatable builds.
- `npm run build` (TypeScript and Vite); backend build and Prisma unchanged.
- GitHub Actions verifies branding and builds, then smoke-check navigation and responsive layout in a browser before deployment.
- Never merge before passing CI; no feature deletion or DB migration just for cosmetic changes.

## Implementation verification record
- Protected navigation, authentication, file management, cloud quota, settings, public sharing, developer API, activity and recycle-bin screens were migrated to Ant Design 6.
- Sample files were removed from runtime source; React Router pages are code-split to reduce initial load.
- The CI browser workflow checks login/register and uses isolated test-only API mocks to exercise protected file and quota screens on desktop/mobile. It does **not** verify production Google OAuth, S3 credentials, real file permissions, large uploads or the live database.
- Public Google Drive permission creation was corrected to **reader**, preserving view/download without exposing write access; pre-existing provider ACLs need separate inspection.
- Never merge solely on TypeScript/build passing: review screenshots and conduct a real-backend integration test before release.

## Data preservation hardening
- Deleting a virtual folder now unlinks its associated file metadata from the folder and soft-deletes only the virtual folder records; it never calls Google Drive/S3 deletion endpoints. Physical cloud folders remain until separately managed by the owner. This aligns backend behavior with the UI's existing promise that files remain uploaded.
- New API tokens use `oxd_live_` branding; existing tokens remain accepted by hash and are not invalidated.

## Final redesign extension (2026-10-16)
- **Starred and Archive are now real features:** additive Prisma migration adds nullable `starred_at` and `archived_at` columns, with user-scoped indexes. Existing files default to unstarred/unarchived. Individual file toggles are available from Ant Design list/grid and context menu, and dedicated Starred/Archive pages read backend data rather than sample records.
- The file list uses the number of **currently enabled and unexpired public share links** for access badges instead of inventing member avatars or claiming shared files are private.
- New token issues use `oxd_live_` names, while previously issued bearer keys continue to authenticate by hash.
- Folder removal is virtual-only. Cloud storage objects and file metadata remain in place. Child folder records are soft deleted; contained files are detached to workspace root.
- **Real MySQL integration gate**: registers two independent users; exercises session authentication, folder create/list, tenant isolation and deny of cross-tenant mutations, file metadata persistence through folder deletion, favorites/archive operations, and the API key lifecycle. Uses a test-only seeded S3 metadata record; **no live S3 or Google account is accessed**.
- **Chromium E2E gate**: verifies login/register screens plus desktop file list, selection, right-click actions, create-folder modal, mobile drawer, Starred/Archive, Shared, Recycle, Activity, Developer API and Storage views against intentionally isolated, read-only CI API mocks; checks for JS exceptions and captures screenshot artifacts.
- Additive migration: `npm run db:migrate:deploy` under `backend/` or the pre-existing backend deployment entrypoint. **Do not run `docker compose down -v`** on a data-bearing installation.
- Outstanding prelaunch validation: physically connect a real Google OAuth project and S3 account, try login, upload, streaming preview, public sharing and download with real service responses, inspect desktop/mobile screenshots for visual and accessibility compliance, and address nonblocking dependency audit advisories.
