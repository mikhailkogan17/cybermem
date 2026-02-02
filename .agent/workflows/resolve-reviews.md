---
description: Resolve specific review threads by ID using the external script
---

# Resolve Review Threads

This workflow replies to specific review comments using the `gh-reply.sh` script authenticated as the Bot.

1. Ensure Bot Token exists
```bash
ls -l ~/.cybermem/.bot-token
```

2. Run the reply script
```bash
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750711677" "✅ Fixed invalid URL. Using 'raspberrypi' alias."
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750715056" "✅ Removed manual flow. Using e2e.yml logic."
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750719152" "✅ Combined into e2e.yml."
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750720805" "✅ Added Table of Contents and Alerts."
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750722342" "✅ Refactored and consolidated into Section 1.4."
~/.cybermem/scripts/gh-reply.sh "mikhailkogan17" "cybermem" "21" "2750722567" "✅ Acknowledged."
```
