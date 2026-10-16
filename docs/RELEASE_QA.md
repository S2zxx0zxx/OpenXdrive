# OpenXdrive · Release smoke checklist

Automated verification is defined in `.github/workflows/ci.yml`. CI includes two independent jobs:

1. **brand-and-build**: branding guards, clean dependency installation, Prisma client generation, backend/frontend TypeScript production builds, Chromium smoke for login/register and mocked authenticated UI, desktop/mobile screenshot artifacts, advisory dependency audits.
2. **real-api-integration**: ephemeral MySQL 8.4, `prisma migrate deploy`, real HTTP authentication/CRUD/tenant-isolation tests, virtual-folder deletion preservation, starred/archive persistence and API keys.

## Before deploying to real users

Review UI screenshot artifacts from the latest successful workflow; verify actual clipping, labels, empty states, keyboard access and dark/light mode. Then, on a **separate non-production instance with disposable accounts and files**, run:

- Register, login, logout, expired token refresh, Google OAuth sign-in, mobile navigation and settings.
- Connect one Google Drive, then a second account, and an S3-compatible account. Verify correct provider selection and quota refresh.
- Upload zero-byte, small, medium and multiple files; verify routing, upload progress, retry and cancel states. Confirm no files are written to persistent application disk.
- Search, filter, sort, select, create nested folders, rename, move files, star/unstar, archive/restore, and folder-delete preservation of every cloud file.
- Preview a PDF, image and video; download individual files and ZIP batch; test public sharing and revoke/expiry with an unauthenticated browser.
- Check that **Google Drive direct public link is reader-only**; review and revoke any legacy `anyone:writer` permissions created by older code, as this code change does not retroactively revoke provider ACLs.
- Verify a second logged-in user cannot access the first user's files, share links, folder metadata, connected account secrets or API keys.
- Run deployment migration on a test copy of a pre-existing MySQL database and verify existing file, session, account, key and folder rows.
- Review `npm audit --omit=dev` for frontend/backend: advisories currently run as informational and must not be treated as a clean security certification.

## Deployment
Run migrations **before** serving backend code that references new `starred_at` / `archived_at` columns. Keep durable MySQL backups and a tested restoration path. Never delete Docker volumes on a live installation to apply schema upgrades.

## Limitations
Automated tests do **not** make outgoing Google Drive, S3, or production OAuth calls. Passing CI does not certify successful real-provider integration or release-grade security.
