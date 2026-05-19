#!/usr/bin/env bash

set -euo pipefail

# =========================================================
# Config
# =========================================================

LOG_FILE=".claude/hooks/update-claude.log"

AUTO_COMMIT_MESSAGE="chore: update CLAUDE.md"

# only update on these branches
ALLOWED_BRANCHES=("main" "master" "develop")

# minimum changed files required
MIN_CHANGED_FILES=3

# =========================================================
# Logging
# =========================================================

mkdir -p .claude/hooks

exec >>"$LOG_FILE" 2>&1

echo ""
echo "========================================================="
echo "$(date)"
echo "Hook triggered"

# =========================================================
# Prevent recursion
# =========================================================

if [ "${CLAUDE_CODE_SKIP_UPDATE_CLAUDE_MD:-}" = "1" ]; then
  echo "Skip: recursion guard"
  exit 0
fi

# =========================================================
# Read Hook Input
# =========================================================

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

case "$COMMAND" in
  git\ commit*)
    echo "Detected git commit"
    ;;
  *)
    echo "Skip: not git commit"
    exit 0
    ;;
esac

# =========================================================
# Ensure commit success
# =========================================================

EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_result.exit_code // "0"')

if [ "$EXIT_CODE" != "0" ]; then
  echo "Skip: commit failed"
  exit 0
fi

# =========================================================
# Prevent commit recursion
# =========================================================

LAST_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "")

case "$LAST_MSG" in
  "$AUTO_COMMIT_MESSAGE"*)
    echo "Skip: auto commit detected"
    exit 0
    ;;
esac

# =========================================================
# Branch Filter
# =========================================================

BRANCH=$(git branch --show-current)

ALLOWED=false

for b in "${ALLOWED_BRANCHES[@]}"; do
  if [ "$BRANCH" = "$b" ]; then
    ALLOWED=true
  fi
done

if [ "$ALLOWED" != true ]; then
  echo "Skip: branch not allowed ($BRANCH)"
  exit 0
fi

# =========================================================
# Changed files filter
# =========================================================

CHANGED_COUNT=$(git diff --name-only HEAD~1 HEAD | wc -l | tr -d ' ')

echo "Changed files: $CHANGED_COUNT"

if [ "$CHANGED_COUNT" -lt "$MIN_CHANGED_FILES" ]; then
  echo "Skip: not enough changes"
  exit 0
fi

# =========================================================
# Timeout Support
# =========================================================

TIMEOUT_CMD=""

if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout 120s"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout 120s"
fi

# =========================================================
# Update CLAUDE.md
# =========================================================

echo "Running Claude /init..."

if command -v claude >/dev/null 2>&1; then

  echo "/init" | \
    CLAUDE_CODE_SKIP_UPDATE_CLAUDE_MD=1 \
    $TIMEOUT_CMD \
    claude \
      --print \
      --permission-mode bypassPermissions \
      --no-session-persistence \
      || true

else
  echo "Claude command not found"
fi

# =========================================================
# Detect changes
# =========================================================

if [ -n "$(git status --porcelain -- CLAUDE.md .claude/ 2>/dev/null)" ]; then

  echo "Changes detected"

  git add CLAUDE.md .claude/ || true

  if ! git diff --cached --quiet; then

    echo "Creating auto commit"

    CLAUDE_CODE_SKIP_UPDATE_CLAUDE_MD=1 \
      git commit -m "$AUTO_COMMIT_MESSAGE" \
      || true
  fi

else
  echo "No changes detected"
fi

echo "Hook completed"
