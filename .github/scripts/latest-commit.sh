#!/usr/bin/env bash
set -euo pipefail
current="$(gh api "repos/$GITHUB_REPOSITORY/commits/$REF_NAME" --jq .sha)"
if [ "$current" = "$HEAD_SHA" ]; then
  echo "latest=true" >> "$GITHUB_OUTPUT"
fi
