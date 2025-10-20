#!/bin/bash
# Validation script for AGENTS.md compliance (Rule 12)
# Enforces line count ≤200 and structure requirements

set -e

AGENTS_FILE="AGENTS.md"
MAX_LINES=200

echo "=== AGENTS.md Validation ==="

# 1. Line count check
LINE_COUNT=$(wc -l < "$AGENTS_FILE")
echo "Line count: $LINE_COUNT / $MAX_LINES"

if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
  echo "❌ FAIL: AGENTS.md exceeds $MAX_LINES lines (current: $LINE_COUNT)"
  exit 27  # Exit code from HALT Conditions table
fi
echo "✓ Line count OK"

# 2. Required sections check
REQUIRED_SECTIONS=(
  "## Metadata"
  "## Critical Rules"
  "## Evidence Directory"
  "## Evidence Checklist"
  "## Error Handling"
  "## Validation Snippets"
  "## Anti-Patterns"
  "## PR Template"
  "## References"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -q "^${section}" "$AGENTS_FILE"; then
    echo "❌ FAIL: Missing required section: $section"
    exit 1
  fi
done
echo "✓ All required sections present"

# 3. Check for phase-specific content (should be zero)
PHASE_REFS=$(grep -ci 'phase \(19\|20\|22\)' "$AGENTS_FILE" || echo "0")
if [ "$PHASE_REFS" -gt 0 ]; then
  echo "❌ FAIL: Found $PHASE_REFS phase-specific references (should be 0)"
  echo "Phase-specific content should be in Recent_Status.md, not AGENTS.md"
  exit 1
fi
echo "✓ No phase-specific content"

# 4. Validate referenced scripts exist
REFERENCED_SCRIPTS=(
  "scripts/metrics.js"
  "scripts/smoke.js"
)

for script in "${REFERENCED_SCRIPTS[@]}"; do
  if [ ! -f "$script" ]; then
    echo "⚠ WARNING: Referenced script not found: $script"
  fi
done

# 5. Check anti-pattern regexes are valid
echo "✓ Anti-pattern regexes (manual verification required)"

# 6. Summary
echo ""
echo "=== Validation Summary ==="
echo "✓ AGENTS.md is valid and ready for enforcement"
echo "  - Line count: $LINE_COUNT/$MAX_LINES"
echo "  - Sections: complete"
echo "  - Phase content: clean"
echo ""
echo "Next: Commit with message '[TASK:AGENTS-V3] Update AGENTS.md to contract format with enterprise enforcement'"
