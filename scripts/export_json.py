#!/usr/bin/env python3
"""
MHive 최종 JSON 내보내기 스크립트
처리된 데이터를 Next.js 앱에서 사용할 형식으로 내보냅니다.
"""

import json
import os
from typing import Dict, Any, List

# 설정
INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'incidents_with_relations.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data.ts')


def generate_typescript(data: Dict[str, Any]) -> str:
    """TypeScript 형식의 데이터 파일을 생성합니다."""

    incidents = data.get('incidents', [])
    relations = data.get('relations', [])

    # 인시던트 JSON 문자열
    incidents_json = json.dumps(incidents, ensure_ascii=False, indent=2)
    relations_json = json.dumps(relations, ensure_ascii=False, indent=2)

    ts_content = f'''import {{ IncidentsData }} from "./types";

export const incidentsData: IncidentsData = {{
  incidents: {incidents_json},
  relations: {relations_json},
}};
'''

    return ts_content


def main():
    """메인 함수"""
    print("📦 MHive JSON 내보내기 시작...")

    # 입력 파일 확인
    if not os.path.exists(INPUT_FILE):
        print(f"❌ 입력 파일이 없습니다: {INPUT_FILE}")
        print("   먼저 generate_relations.py를 실행하세요.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    incidents = data.get('incidents', [])
    relations = data.get('relations', [])

    print(f"   사건 수: {len(incidents)}개")
    print(f"   관계 수: {len(relations)}개")

    # TypeScript 파일 생성
    ts_content = generate_typescript(data)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"\n✅ 내보내기 완료!")
    print(f"   출력 파일: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
