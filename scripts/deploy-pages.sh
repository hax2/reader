#!/usr/bin/env bash
# Build locally and publish the static site to the gh-pages branch.
# GitHub Pages serves that branch directly (Pages source: "Deploy from a branch").
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes; commit or stash them first." >&2
  exit 1
fi

source_sha="$(git rev-parse --short HEAD)"

npm run build

worktree="$(mktemp -d)"
cleanup() { git worktree remove --force "$worktree" >/dev/null 2>&1 || rm -rf "$worktree"; }
trap cleanup EXIT

git fetch -q origin gh-pages
git worktree add -q --detach "$worktree" origin/gh-pages
git -C "$worktree" rm -rqf . >/dev/null

cp -r dist/. "$worktree"/
# Same media/data set the old Actions workflow staged.
cp -r library.json covers texts translations glossary *.mp3 *.m4a *.json *.vtt "$worktree"/ 2>/dev/null || true
rm -f "$worktree"/package.json "$worktree"/package-lock.json "$worktree"/tsconfig.json
touch "$worktree"/.nojekyll

git -C "$worktree" add -A
if git -C "$worktree" diff --cached --quiet; then
  echo "gh-pages already matches $source_sha; nothing to deploy."
  exit 0
fi

git -C "$worktree" commit -qm "Static build of $source_sha"
git -C "$worktree" push -q origin HEAD:gh-pages
echo "Pushed build of $source_sha to gh-pages; Pages will publish it shortly."
