# OpenXdrive dependency advisory remediation — 2026-10-16

## Why there is a narrow `deepmerge-ts` override

`prisma@6.19.3` indirectly pins `deepmerge-ts@7.x` through
`@prisma/config`. Versions prior to 8.0.0 are affected by
GHSA-ggr8-5vv4-36mx, a high-severity recursive-graph stack-exhaustion issue.

We retain Prisma 6 and the existing MySQL migration format instead of
force-upgrading to Prisma 7, which requires deliberate changes to the
database adapter and connection configuration. The override upgrades only
this transitive dependency to `deepmerge-ts@^8.0.2`.

**Compatibility gates:** GitHub Actions runs `npm ci`, Prisma generate and
real MySQL `prisma migrate deploy`, backend compilation, and an isolated
tenant-isolation API integration suite. These are regression checks, not
proof that *all* Prisma CLI code paths are compatible with the forced
transitive major version.

**Threat model:** `@prisma/config` uses the library when merging local
Prisma configuration supplied by the application operator, not an
unauthenticated HTTP request. Nevertheless, the audited dependency should
be updated and not silently ignored.

**Retirement:** Remove this override after a supported Prisma release
includes patched `deepmerge-ts` through `@prisma/config`, and re-run all
CI, migrations and audit gates. Do not use `npm audit fix --force` to make
an unreviewed Prisma major upgrade.

## Further verification before production release

- Real Google OAuth and S3 credentials, file upload, preview and download
  must be tested against separate disposable accounts before public launch.
- CI database records are synthetic and remain isolated from real user data.
- Frontend production dependency audit should remain at zero after the
  compatible lockfile refresh; monitor for new advisories.
