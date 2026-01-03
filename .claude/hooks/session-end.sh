#!/bin/bash
# Hook chạy khi session kết thúc - ghi vào journal

JOURNAL_FILE="$CLAUDE_PROJECT_DIR/journal/work_journal.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

# Append entry to journal
cat >> "$JOURNAL_FILE" << EOF

## [$TIMESTAMP] - Session End

### Progress saved automatically
- Session ended - check conversation history for details

---
EOF

echo "Progress saved to journal/work_journal.md"
