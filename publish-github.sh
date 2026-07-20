#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-caixq1996}"
OLD_REPO="${OLD_REPO:-jkrs}"
NEW_REPO="${NEW_REPO:-Pin2Patch}"

command -v gh >/dev/null || { echo "Install GitHub CLI first: https://cli.github.com" >&2; exit 1; }
command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
gh auth status >/dev/null

if gh repo view "$OWNER/$NEW_REPO" >/dev/null 2>&1; then
  echo "Repository $OWNER/$NEW_REPO already exists."
elif gh repo view "$OWNER/$OLD_REPO" >/dev/null 2>&1; then
  echo "Renaming $OWNER/$OLD_REPO to $NEW_REPO..."
  gh repo rename "$NEW_REPO" --repo "$OWNER/$OLD_REPO" --yes
else
  echo "Neither $OWNER/$NEW_REPO nor $OWNER/$OLD_REPO exists." >&2
  exit 1
fi

# Do not publish generated local state or dependencies.
rm -rf node_modules .pin2patch pin2patch
find assets/demo-video-human -type f \( -name '*.wav' -o -name '*.raw.wav' -o -name '*.mp4' \) -delete 2>/dev/null || true
find assets/demo-video -type f \( -name '*.wav' -o -name '*.mp4' \) -delete 2>/dev/null || true

git init -b main >/dev/null 2>&1 || true
git config user.name "${GIT_AUTHOR_NAME:-Xin-Qiang Cai}"
git config user.email "${GIT_AUTHOR_EMAIL:-584533658@qq.com}"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$OWNER/$NEW_REPO.git"
git add -A
if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  git commit -m "Publish complete Pin2Patch MVP"
fi
git branch -M main
git push -u origin main --force

gh repo edit "$OWNER/$NEW_REPO" \
  --description "Turn Figma comment pins into agent-ready tasks and tested code patches from the terminal." \
  --homepage "https://devpost.com/software/pin2patch" \
  --visibility public

echo "Published: https://github.com/$OWNER/$NEW_REPO"
