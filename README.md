# CodeSeller

Complete source export of https://codeseller-studio.exmashana67.chatgpt.site/.

- `CodeSeller-source.zip`: all 148 tracked files, preserving their directory structure.
- `CodeSeller-history.bundle`: the original Git repository with all 6 source commits.
- Source revision: `4c58d0b218e5022b09b4efca12af379f5e1e3ea2`.

## Restore source and history

```bash
git clone CodeSeller-history.bundle codeseller
cd codeseller
npm ci
npm run dev
```

Alternatively extract `CodeSeller-source.zip`. Requirements: Node.js 22.13 or newer.

The source includes frontend, server API routes, database schema and migrations, smart contract, tests, sample ZIP products, configuration and dependency lockfile. See the original README inside the archive for payment behavior.

Production D1 rows, R2 uploaded products, runtime secrets and hosting are separate from the source repository and are not migrated by these archives. External deployment requires configuring D1 and R2; the starter database ID is a placeholder.

The live website continues to run on its existing hosting. The repository currently stores complete source and history as archives, not an expanded source tree.
