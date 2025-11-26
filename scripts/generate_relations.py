#!/usr/bin/env python3
"""
MHive 관계 자동 생성 스크립트
사건들 간의 관계를 자동으로 분석하고 생성합니다.
"""

import json
import os
from typing import Dict, Any, List, Set, Tuple
from datetime import datetime
from collections import defaultdict
import re

# 설정
INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'incidents_translated.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'incidents_with_relations.json')


def parse_year(date_str: str) -> int:
    """날짜 문자열에서 연도를 추출합니다."""
    try:
        if date_str.startswith('-'):
            return -int(date_str.split('-')[1])
        return int(date_str.split('-')[0])
    except:
        return 2000


def get_region(location: str) -> str:
    """위치에서 지역을 추출합니다."""
    regions = {
        "한국": ["한국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "진도", "화성"],
        "일본": ["일본", "도쿄", "오사카", "후쿠시마", "도호쿠"],
        "중국": ["중국", "베이징", "상하이", "난징", "탕산", "쓰촨"],
        "미국": ["미국", "뉴욕", "워싱턴", "캘리포니아", "텍사스", "로스앤젤레스", "뉴저지", "오클라호마", "네바다", "뉴멕시코"],
        "유럽": ["영국", "프랑스", "독일", "스페인", "이탈리아", "런던", "파리", "마드리드", "니스", "보스니아"],
        "동남아": ["인도네시아", "태국", "베트남", "필리핀", "말레이시아", "스리랑카"],
        "중동": ["이란", "이라크", "시리아", "레바논", "튀르키예", "베이루트", "테헤란"],
        "아프리카": ["르완다", "이집트", "남아프리카"],
        "남미": ["브라질", "페루", "칠레", "아이티"],
        "러시아": ["러시아", "소련", "우크라이나", "우랄", "사할린"],
        "인도": ["인도", "뭄바이", "보팔", "방글라데시"],
        "캄보디아": ["캄보디아"],
        "대양": ["대서양", "태평양", "인도양", "북대서양"],
    }

    location_lower = location.lower()
    for region, keywords in regions.items():
        if any(kw.lower() in location_lower for kw in keywords):
            return region
    return "기타"


def calculate_similarity_score(inc1: Dict, inc2: Dict) -> Tuple[float, str]:
    """두 사건 간의 유사도 점수와 관계 유형을 계산합니다."""
    score = 0.0
    relation_types = []

    # 1. 같은 카테고리 (+2점)
    if inc1['category'] == inc2['category']:
        score += 2.0
        category_names = {
            'disaster': '자연재해',
            'accident': '사고',
            'terrorism': '테러',
            'crime': '범죄',
            'mystery': '미스터리',
            'conspiracy': '음모론',
            'unsolved': '미제사건',
        }
        relation_types.append(f"동일 유형: {category_names.get(inc1['category'], inc1['category'])}")

    # 2. 같은 지역 (+3점)
    region1 = get_region(inc1.get('location', ''))
    region2 = get_region(inc2.get('location', ''))
    if region1 == region2 and region1 != "기타":
        score += 3.0
        relation_types.append(f"동일 지역: {region1}")

    # 3. 비슷한 시기 (±5년 내 +1점, ±2년 내 +2점)
    year1 = parse_year(inc1.get('date', ''))
    year2 = parse_year(inc2.get('date', ''))
    year_diff = abs(year1 - year2)

    if year_diff <= 2:
        score += 2.0
        relation_types.append("동시대 사건")
    elif year_diff <= 5:
        score += 1.0
        relation_types.append("유사 시기")

    # 4. 공통 태그 (태그당 +1점)
    tags1 = set(inc1.get('tags', []))
    tags2 = set(inc2.get('tags', []))
    common_tags = tags1 & tags2

    if common_tags:
        score += len(common_tags) * 1.0
        relation_types.append(f"공통 태그: {', '.join(list(common_tags)[:2])}")

    # 5. 유사한 사상자 규모 (+1점)
    cas1 = inc1.get('casualties', {})
    cas2 = inc2.get('casualties', {})
    if cas1 and cas2:
        deaths1 = cas1.get('deaths', 0)
        deaths2 = cas2.get('deaths', 0)
        if deaths1 > 0 and deaths2 > 0:
            ratio = min(deaths1, deaths2) / max(deaths1, deaths2)
            if ratio > 0.3:
                score += 1.0
                relation_types.append("유사 피해 규모")

    # 6. 특수 관계 패턴
    # 원전 사고
    if '원전' in str(inc1.get('tags', [])) and '원전' in str(inc2.get('tags', [])):
        score += 2.0
        relation_types = ["원전 사고"]

    # 항공 사고
    if '항공' in str(inc1.get('tags', [])) and '항공' in str(inc2.get('tags', [])):
        score += 2.0
        relation_types = ["항공 사고"]

    # 해상 사고
    if any(t in str(inc1.get('tags', [])) for t in ['해상', '침몰', '선박']) and \
       any(t in str(inc2.get('tags', [])) for t in ['해상', '침몰', '선박']):
        score += 2.0
        relation_types = ["해상 참사"]

    # 연쇄살인
    if '연쇄살인' in str(inc1.get('title', '') + str(inc1.get('tags', []))) and \
       '연쇄살인' in str(inc2.get('title', '') + str(inc2.get('tags', []))):
        score += 3.0
        relation_types = ["연쇄살인 사건"]

    # 가장 적합한 관계 선택
    if relation_types:
        # 우선순위: 특수 관계 > 카테고리 > 지역 > 태그
        relation = relation_types[-1]  # 마지막 추가된 것이 보통 더 구체적
    else:
        relation = "관련 사건"

    return score, relation


def generate_relations(incidents: List[Dict]) -> List[Dict]:
    """모든 사건 쌍에 대해 관계를 생성합니다."""
    relations = []
    seen_pairs = set()

    print(f"  분석 중: {len(incidents)}개 사건, {len(incidents) * (len(incidents) - 1) // 2}개 쌍")

    for i, inc1 in enumerate(incidents):
        for j, inc2 in enumerate(incidents):
            if i >= j:
                continue

            # 중복 방지
            pair = (min(inc1['id'], inc2['id']), max(inc1['id'], inc2['id']))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            # 유사도 계산
            score, relation = calculate_similarity_score(inc1, inc2)

            # 임계값 이상인 경우만 관계 추가
            if score >= 3.0:
                relations.append({
                    'from': inc1['id'],
                    'to': inc2['id'],
                    'relation': relation,
                    'score': score
                })

    # 점수 높은 순 정렬
    relations.sort(key=lambda x: x['score'], reverse=True)

    # 각 노드당 최대 연결 수 제한 (너무 복잡해지지 않게)
    connection_count = defaultdict(int)
    max_connections = 5
    filtered_relations = []

    for rel in relations:
        if connection_count[rel['from']] < max_connections and \
           connection_count[rel['to']] < max_connections:
            filtered_relations.append({
                'from': rel['from'],
                'to': rel['to'],
                'relation': rel['relation']
            })
            connection_count[rel['from']] += 1
            connection_count[rel['to']] += 1

    return filtered_relations


def update_related_incidents(incidents: List[Dict], relations: List[Dict]) -> List[Dict]:
    """각 사건의 relatedIncidents 필드를 업데이트합니다."""
    related_map = defaultdict(list)

    for rel in relations:
        related_map[rel['from']].append(rel['to'])
        related_map[rel['to']].append(rel['from'])

    for incident in incidents:
        incident['relatedIncidents'] = related_map.get(incident['id'], [])

    return incidents


def main():
    """메인 함수"""
    print("🔗 MHive 관계 생성 시작...")

    # 입력 파일 확인
    input_file = INPUT_FILE
    if not os.path.exists(input_file):
        # 번역되지 않은 원본 파일 시도
        input_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'incidents_raw.json')
        if not os.path.exists(input_file):
            print(f"❌ 입력 파일이 없습니다. 먼저 fetch_disasters.py를 실행하세요.")
            return

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    incidents = data.get('incidents', [])
    print(f"   입력 사건 수: {len(incidents)}개")

    # 관계 생성
    relations = generate_relations(incidents)
    print(f"   생성된 관계: {len(relations)}개")

    # relatedIncidents 업데이트
    incidents = update_related_incidents(incidents, relations)

    # 결과 저장
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    output_data = {
        'incidents': incidents,
        'relations': relations
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 관계 생성 완료!")
    print(f"   출력 파일: {OUTPUT_FILE}")

    # 통계
    categories = defaultdict(int)
    for inc in incidents:
        categories[inc['category']] += 1

    print("\n📊 카테고리별 분포:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}개")


if __name__ == "__main__":
    main()
