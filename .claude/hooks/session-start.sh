#!/bin/bash
# Hook chạy khi session bắt đầu

JOURNAL_FILE="$CLAUDE_PROJECT_DIR/journal/work_journal.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

echo ""
echo "==================================="
echo "  QRCode Face Gallery Project"
echo "  Session started: $TIMESTAMP"
echo "==================================="
echo ""
