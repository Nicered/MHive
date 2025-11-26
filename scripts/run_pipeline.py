#!/usr/bin/env python3
"""
MHive 데이터 파이프라인 실행 스크립트
전체 데이터 수집 → 통합 → 내보내기 파이프라인을 실행합니다.
"""

import subprocess
import sys
import os
import argparse

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def run_script(script_name: str, description: str = None) -> bool:
    """Python 스크립트를 실행합니다."""
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    desc = description or script_name

    print(f"\n{'='*60}")
    print(f"▶️  {desc}")
    print('='*60)

    result = subprocess.run([sys.executable, script_path], cwd=SCRIPTS_DIR)
    return result.returncode == 0


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='MHive 데이터 파이프라인')
    parser.add_argument('--skip-fema', action='store_true', help='FEMA 데이터 수집 건너뛰기')
    parser.add_argument('--skip-earthquakes', action='store_true', help='지진 데이터 수집 건너뛰기')
    parser.add_argument('--skip-tsunamis', action='store_true', help='쓰나미 데이터 수집 건너뛰기')
    parser.add_argument('--skip-coldcases', action='store_true', help='Cold Cases 데이터 수집 건너뛰기')
    parser.add_argument('--only-merge', action='store_true', help='데이터 통합만 실행')
    args = parser.parse_args()

    print("🚀 MHive 데이터 파이프라인 시작")
    print("="*60)

    # 데이터 수집 단계
    collection_steps = []

    if not args.only_merge:
        if not args.skip_fema:
            collection_steps.append(("fetch_fema.py", "OpenFEMA 재난 데이터 수집"))
        if not args.skip_earthquakes:
            collection_steps.append(("fetch_earthquakes.py", "USGS 지진 데이터 수집"))
        if not args.skip_tsunamis:
            collection_steps.append(("fetch_tsunamis.py", "NOAA 쓰나미 데이터 수집"))
        if not args.skip_coldcases:
            collection_steps.append(("fetch_coldcases.py", "Harvard Cold Cases 데이터 수집"))

    # 통합 단계
    merge_steps = [
        ("merge_master_data.py", "마스터 데이터 통합"),
    ]

    all_steps = collection_steps + merge_steps

    for script, description in all_steps:
        print(f"\n📌 단계: {description}")
        if not run_script(script, description):
            print(f"\n❌ {script} 실행 실패!")
            return 1

    print("\n" + "="*60)
    print("✅ 파이프라인 완료!")
    print("="*60)

    # 결과 요약
    master_file = os.path.join(SCRIPTS_DIR, '..', 'data', 'master', 'master_incidents.json')
    if os.path.exists(master_file):
        import json
        with open(master_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            metadata = data.get('metadata', {})
            print(f"\n📊 결과 요약:")
            print(f"   - 총 사건 수: {metadata.get('total_incidents', 0)}개")
            print(f"   - 총 관계 수: {metadata.get('total_relations', 0)}개")
            print(f"   - 데이터 소스: {', '.join(metadata.get('sources', []))}")

    print("\n다음 단계:")
    print("  1. npm run dev 로 개발 서버 시작")
    print("  2. npm run build 로 프로덕션 빌드")

    return 0


if __name__ == "__main__":
    sys.exit(main())
