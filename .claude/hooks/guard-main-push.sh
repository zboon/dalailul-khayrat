#!/usr/bin/env bash
# Ask before anything lands on a protected branch.
#
# Merging to main publishes within the minute to people reciting from the app,
# so a push there is never routine. This runs as a Claude Code PreToolUse hook
# on every Bash call, reads the command off stdin, and returns permissionDecision
# "ask" when the command would push to main or master — which makes the harness
# raise a permission prompt the owner has to approve. It is not a refusal: the
# push still happens once they say yes.
#
# It deliberately errs toward asking. A push whose target it cannot work out is
# treated as protected, because a spurious prompt costs a keystroke and a missed
# one costs a live app.
set -uo pipefail

PROTECTED='main|master'

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

# Not a git push at all (also catches `git push` inside a loop or after &&/;).
printf '%s' "$cmd" | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$|;)' || exit 0

ask() {
  jq -cn --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

# 1. The command names a protected branch anywhere (origin main, HEAD:main, main:main).
if printf '%s' "$cmd" | grep -Eqw "$PROTECTED"; then
  ask "This pushes to a protected branch (main/master). Anything on main is live to reciters within a minute — approve only if you meant to publish."
fi

# 2. A push with no refspec takes the current branch. Resolve it.
#    Strip flags and the remote name; whatever is left is the refspec.
rest=$(printf '%s' "$cmd" | sed -E 's/.*git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push//' )
refspec=$(printf '%s' "$rest" | tr ';&|' '\n' | head -1 \
          | tr ' ' '\n' | grep -v '^-' | grep -v '^$' | sed -n '2p')
if [ -z "$refspec" ]; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ -z "$branch" ]; then
    ask "Cannot tell which branch this push targets, so treating it as protected. Approve only if it is not going to main."
  fi
  if printf '%s' "$branch" | grep -Eqw "$PROTECTED"; then
    ask "Bare 'git push' while on '$branch' — that publishes to a protected branch. Approve only if you meant to publish."
  fi
fi

exit 0
