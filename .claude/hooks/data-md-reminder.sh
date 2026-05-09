#!/bin/bash
# data/ 또는 split 스크립트 수정 시 docs/05_DATA.md 확인 reminder를 띄움.
# Claude Code PostToolUse hook (Edit|Write|MultiEdit).

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))" 2>/dev/null)

# 데이터 관련 경로인지 확인 (docs/05_DATA.md 자체 편집은 제외)
case "$file_path" in
  *docs/05_DATA.md) exit 0 ;;
  */data/*|*scripts/split-restaurants.js)
    cat <<'EOF'
[reminder] 데이터 관련 파일을 수정했습니다.

→ docs/05_DATA.md 와 어긋나는 부분이 없는지 확인하세요.
→ 식당 필드, grade 컷오프, breakdown/flags 구조, 갱신 절차, 한계가 바뀌었다면 같은 작업으로 docs/05_DATA.md 도 함께 업데이트하세요.
EOF
    ;;
esac
exit 0
