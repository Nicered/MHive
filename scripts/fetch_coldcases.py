#!/usr/bin/env python3
"""
Harvard LIL Cold Cases 데이터 수집 스크립트
미국 법원 형사 사건 데이터를 수집합니다.
"""

import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from tqdm import tqdm

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sources')

# 주요 형사 사건 키워드
CRIME_KEYWORDS = [
    'murder', 'homicide', 'killing', 'manslaughter',
    'kidnapping', 'abduction', 'missing',
    'serial', 'massacre', 'genocide',
    'terrorism', 'terrorist', 'bombing',
    'assault', 'robbery', 'burglary',
    'rape', 'sexual assault',
    'arson', 'fraud', 'conspiracy',
]


def extract_crime_type(text: str) -> tuple:
    """텍스트에서 범죄 유형을 추출합니다."""
    text_lower = text.lower()

    crime_map = {
        ('murder', 'homicide', 'killing', 'manslaughter'): ('crime', '살인'),
        ('kidnapping', 'abduction'): ('crime', '납치'),
        ('terrorism', 'terrorist', 'bombing'): ('terrorism', '테러'),
        ('massacre', 'genocide'): ('crime', '학살'),
        ('serial',): ('crime', '연쇄범죄'),
        ('rape', 'sexual assault'): ('crime', '성범죄'),
        ('robbery', 'burglary'): ('crime', '강도'),
        ('arson',): ('crime', '방화'),
        ('fraud',): ('crime', '사기'),
        ('assault',): ('crime', '폭행'),
    }

    for keywords, (category, tag) in crime_map.items():
        for kw in keywords:
            if kw in text_lower:
                return category, tag

    return 'crime', '범죄'


def is_significant_case(item: Dict) -> bool:
    """중요한 형사 사건인지 확인합니다."""
    # 인용 횟수가 높은 사건
    citation_count = item.get('citation_count', 0)
    if citation_count >= 50:
        return True

    # 형사 법원인 경우
    court_name = (item.get('court_full_name') or '').lower()
    if 'criminal' in court_name:
        return True

    # 중요 키워드가 포함된 경우
    case_name = (item.get('case_name_full') or item.get('case_name') or '').lower()
    opinions = item.get('opinions', [])
    opinion_text = ' '.join([op.get('opinion_text', '')[:1000] for op in opinions]).lower()

    full_text = case_name + ' ' + opinion_text
    for kw in CRIME_KEYWORDS:
        if kw in full_text:
            return True

    return False


def transform_to_incident(item: Dict, incident_id: int) -> Dict:
    """법원 데이터를 MHive Incident 형식으로 변환합니다."""
    case_name = item.get('case_name_full') or item.get('case_name') or 'Unknown Case'
    case_name_short = item.get('case_name_short') or item.get('case_name') or 'Unknown'

    date_filed = item.get('date_filed', '')
    jurisdiction = item.get('court_jurisdiction', 'USA')
    court_name = item.get('court_full_name') or item.get('court_short_name') or 'Unknown Court'

    # 범죄 유형 추출
    opinions = item.get('opinions', [])
    opinion_text = ' '.join([op.get('opinion_text', '')[:2000] for op in opinions])
    category, crime_tag = extract_crime_type(case_name + ' ' + opinion_text)

    # 제목
    title = f"{case_name_short} 사건"
    if date_filed:
        year = date_filed[:4]
        title = f"{year}년 {case_name_short} 사건"

    # 위치
    location = f"{jurisdiction}, USA"

    # 요약
    summary = f"미국 {jurisdiction} 법원 판결 사건. "
    summary += f"사건명: {case_name_short}. "
    summary += f"판결일: {date_filed}. "
    summary += f"법원: {court_name}."

    # 상세 설명
    description = f"## 사건 정보\n\n"
    description += f"**사건명**: {case_name}\n"
    description += f"**판결일**: {date_filed}\n"
    description += f"**법원**: {court_name}\n"
    description += f"**관할**: {jurisdiction}\n\n"

    if item.get('judges'):
        description += f"**판사**: {item.get('judges')}\n\n"

    if item.get('attorneys'):
        description += f"## 변호인\n\n{item.get('attorneys')[:500]}\n\n"

    citations = item.get('citations', [])
    if citations:
        description += f"## 인용\n\n"
        for cite in citations[:5]:
            description += f"- {cite}\n"

    # 판결문 요약 (있는 경우)
    if opinions and opinions[0].get('opinion_text'):
        opinion = opinions[0]['opinion_text'][:1500]
        description += f"\n## 판결문 요약\n\n{opinion}..."

    # 태그
    tags = ['범죄', '법원판결', '미국', crime_tag]
    if item.get('precedential_status') == 'Published':
        tags.append('판례')
    if item.get('citation_count', 0) >= 100:
        tags.append('주요판결')

    # 소스
    citations_str = item.get('citations', [''])[0] if item.get('citations') else ''
    source_url = f"https://case.law/search?q={item.get('slug', '')}"

    return {
        'id': incident_id,
        'title': title,
        'category': category,
        'era': 'contemporary',
        'date': date_filed,
        'location': location,
        'summary': summary[:400],
        'description': description[:3000],
        'timeline': [],
        'theories': [],
        'tags': list(set(tags)),
        'sources': [{
            'name': 'Harvard Law - Case Law Access Project',
            'url': source_url
        }],
        'relatedIncidents': [],
        'images': [],
        'casualties': None,
        'coordinates': None,
        'status': 'resolved',
        'originalId': item.get('id'),
        'citationCount': item.get('citation_count', 0),
    }


def main():
    """메인 함수"""
    print("⚖️ Harvard LIL Cold Cases 데이터 수집 시작...")

    try:
        from datasets import load_dataset
    except ImportError:
        print("❌ datasets 라이브러리가 필요합니다: pip install datasets")
        return

    # 스트리밍 모드로 데이터 로드
    print("   데이터셋 로드 중 (스트리밍)...")
    ds = load_dataset('harvard-lil/cold-cases', split='train', streaming=True)

    # 중요 사건만 필터링하며 수집
    significant_cases = []
    total_scanned = 0
    max_scan = 50000  # 최대 스캔 수
    max_collect = 1000  # 최대 수집 수

    print(f"   최대 {max_scan}개 스캔, {max_collect}개 수집 목표")

    with tqdm(total=max_scan, desc="스캔 중") as pbar:
        for item in ds:
            total_scanned += 1
            pbar.update(1)

            if is_significant_case(item):
                significant_cases.append(item)
                pbar.set_postfix({'수집': len(significant_cases)})

            if total_scanned >= max_scan or len(significant_cases) >= max_collect:
                break

    print(f"\n📊 총 스캔: {total_scanned}개, 수집: {len(significant_cases)}개")

    # MHive 형식으로 변환
    incidents = []
    for i, item in enumerate(tqdm(significant_cases, desc="데이터 변환")):
        incident = transform_to_incident(item, i + 1)
        incidents.append(incident)

    # 인용 횟수 순으로 정렬
    incidents.sort(key=lambda x: x.get('citationCount', 0), reverse=True)

    # ID 재할당
    for i, inc in enumerate(incidents):
        inc['id'] = i + 1

    # 결과 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_file = os.path.join(OUTPUT_DIR, "coldcases_crimes.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            'source': 'Harvard LIL Cold Cases',
            'collected_at': datetime.now().isoformat(),
            'total_count': len(incidents),
            'incidents': incidents
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")

    # 통계
    cat_stats = {}
    for inc in incidents:
        cat = inc.get('category', 'unknown')
        cat_stats[cat] = cat_stats.get(cat, 0) + 1

    print("\n📈 카테고리별 분포:")
    for cat, count in sorted(cat_stats.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}개")


if __name__ == "__main__":
    main()
