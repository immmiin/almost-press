#!/bin/bash
# ALMOST PRESS overnight runner
# - Keeps the Mac awake while it runs.
# - Restarts Claude Code until DONE.md exists.
# - When the usage limit is hit, the run ends; this script waits 10 minutes and tries again,
#   so work continues by itself once usage is available again.
# - Never uses an API key (that would be billed). It only uses your Claude subscription login.

cd "$(dirname "$0")" || exit 1
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
caffeinate -dimsu -w $$ &

AUTONOMOUS='
AUTONOMOUS OVERNIGHT MODE (this overrides "stop at the end of every phase"):
- I am asleep. Do not stop to ask me anything and do not wait for approval. Make the best decision yourself and write it down.
- Never spend money: no paid services, no sign-ups, no API keys, no payment details, no paid fonts or assets. Only free, open-source packages from npm.
- Never push to GitHub, never publish anything, never touch files outside this folder.
- Keep PROGRESS.md in the project root: current phase, what is done, what is next, every decision you made on my behalf, and anything I must check in the morning. Update it after every meaningful step.
- Commit to git after every finished step with a clear message, so nothing is lost if the run is cut off.
- Never run long-running servers (no npm run dev, no vite preview, no watch mode). Verify with npm run build, type checks and short scripts that exit on their own.
- Go through all phases in order. When every phase is finished and npm run build passes, write DONE.md with a summary and a checklist of what I should look at, then stop.
'

PERMS=(--permission-mode bypassPermissions
  --disallowedTools "Bash(sudo *)" "Bash(git push *)" "Bash(gh *)" "Bash(npm publish *)"
  "Bash(npm login *)" "Bash(rm -rf / *)" "Bash(rm -rf ~ *)" "Bash(rm -rf ~/*)")

for i in $(seq 1 200); do
  [ -f DONE.md ] && { echo "Finished."; break; }
  echo "===== Run $i · $(date) =====" | tee -a overnight.log

  if [ ! -f PROGRESS.md ] && [ -f almost-press-prompt.md ]; then
    PROMPT="$(cat almost-press-prompt.md)
$AUTONOMOUS"
  else
    PROMPT="Read references/almost-press-prompt.md (or almost-press-prompt.md if it has not been moved yet), then PROGRESS.md and git log. Continue exactly where the work stopped. Check git status first and finish or repair any half-done step.
$AUTONOMOUS"
  fi

  claude -p "$PROMPT" "${PERMS[@]}" >> overnight.log 2>&1

  [ -f DONE.md ] && { echo "Finished."; break; }
  echo "Run ended · waiting 10 minutes · $(date)" | tee -a overnight.log
  sleep 600
done
