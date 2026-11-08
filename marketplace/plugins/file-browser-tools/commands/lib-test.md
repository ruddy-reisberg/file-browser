---
description: Close the test gap on one export of a src/lib module, then run the check
argument-hint: <module> <export>   e.g. filter countFiles
allowed-tools: Bash(git status:*), Bash(npx vitest run:*), Bash(grep:*), Bash(echo:*), Bash(tail:*), Edit, Write
---

Target: export `$1` of `src/lib/$0.ts`. Act as a senior web developer.

## Live context (ran before you read this)

Uncommitted changes under `src/lib`:
!`git status --short src/lib`

Existing tests that mention `$1`:
!`grep -n "$1" src/lib/__tests__/$0.test.ts || echo "NONE: $1 is not covered in $0.test.ts"`

Current result of this module's test file:
!`npx vitest run src/lib/__tests__/$0.test.ts --reporter=dot 2>&1 | tail -12`

## Source and its tests

Module under test: @src/lib/$0.ts

Existing test file (reuse its fixtures and helpers, do not duplicate them): @src/lib/__tests__/$0.test.ts

## Task

1. Decide, from the source above, which behaviors of `$1` are not yet pinned by a test: nominal case, edge cases (empty, nested, special characters), and the contract stated in its doc comment (for example "returns the same node", "does not mutate its argument").
2. Add those tests to `src/lib/__tests__/$0.test.ts`, in the existing `describe` structure. Follow `src/lib/CLAUDE.md`: pure, no React, `File` fixtures built in memory, no `skip`/`only`/`any`.
3. Do not change `src/lib/$0.ts`. If a test reveals a real bug, stop and report it instead of patching the source.
4. Run `npm run check`; it must stay green. Report the added tests and the check result. Do not commit.
