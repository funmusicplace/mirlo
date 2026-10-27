---
title: Releases
editLink: true
---

# Releases

mirlo.space deploys every change to `main`. Releases are tagged versions of
`main` with a changelog, for self-hosted instances to update to. They're made
with [release-please](https://github.com/googleapis/release-please).

## How it works

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
  commitlint checks them when you commit, and CI checks every commit in a pull
  request.
- The commit type decides the next version: `fix:` bumps the patch number,
  `feat:` the minor number, and `feat!:` (or a `BREAKING CHANGE:` footer) the
  major number. Only `feat`, `fix`, `perf` and `revert` commits appear in the
  changelog.
- On every push to `main`, release-please keeps one release pull request open
  with the next version, the new `CHANGELOG.md` entry and the `package.json`
  version bump.
- Merging that pull request tags `vX.Y.Z` and publishes a GitHub Release with
  the changelog entry as its notes.

Use `!` or a `BREAKING CHANGE:` footer for anything a self-hoster has to act on,
like a new environment variable or a manual step, so it stands out in the
changelog.

## Cutting a release

1. Wait until the changes on `main` have run on mirlo.space for a while
   without problems.
2. Open the release pull request (labelled `autorelease: pending`) and edit its
   description. Write a short summary between the `summary` markers: the
   highlights, and anything self-hosters need to do. A workflow copies it to
   the top of the new entry in `CHANGELOG.md`.
3. Merge the pull request.

Write the summary just before merging. release-please rewrites the release
pull request whenever something new lands on `main`, which drops the summary.
