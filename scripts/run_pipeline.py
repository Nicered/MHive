#!/usr/bin/env python3
"""
MHive 데이터 파이프라인 실행 스크립트
전체 데이터 수집 → 번역 → 관계 생성 → 내보내기 파이프라인을 실행합니다.
"""

import subprocess
import sys
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def run_script(script_name: str) -> bool:
    """Python 스크립트를 실행합니다."""
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    print(f"\n{'='*60}")
    print(f"▶️  {script_name} 실행 중...")
    print('='*60)

    result = subprocess.run([sys.executable, script_path], cwd=SCRIPTS_DIR)
    return result.returncode == 0


def main():
    """메인 함수"""
    print("🚀 MHive 데이터 파이프라인 시작")
    print("="*60)

    steps = [
        ("fetch_disasters.py", "데이터 수집"),
        ("generate_relations.py", "관계 생성"),
        ("export_json.py", "JSON 내보내기"),
    ]

    # 번역은 선택적 (시간이 오래 걸림)
    skip_translation = "--skip-translate" in sys.argv
    if not skip_translation:
        steps.insert(1, ("translate.py", "번역"))

    for script, description in steps:
        print(f"\n📌 단계: {description}")
        if not run_script(script):
            print(f"\n❌ {script} 실행 실패!")
            return 1

    print("\n" + "="*60)
    print("✅ 파이프라인 완료!")
    print("="*60)
    print("\n다음 단계:")
    print("  1. npm run dev 로 개발 서버 시작")
    print("  2. npm run build 로 프로덕션 빌드")

    return 0


if __name__ == "__main__":
    sys.exit(main())
