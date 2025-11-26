#!/usr/bin/env python3
"""
마스터 데이터 통합 스크립트
여러 소스에서 수집한 데이터를 하나의 마스터 데이터로 통합합니다.
"""

import json
import os
from typing import List, Dict, Set, Tuple
from datetime import datetime
from tqdm import tqdm
import hashlib

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPTS_DIR, '..', 'data')
SOURCES_DIR = os.path.join(DATA_DIR, 'sources')
OUTPUT_DIR = os.path.join(DATA_DIR, 'master')

# 데이터 소스 설정
DATA_SOURCES = [
    {
        'file': 'fema_disasters.json',
        'name': 'OpenFEMA',
        'priority': 1,  # 우선순위 (낮을수록 높음)
    },
    {
        'file': 'usgs_earthquakes.json',
        'name': 'USGS',
        'priority': 2,
    },
    {
        'file': 'noaa_tsunamis.json',
        'name': 'NOAA',
        'priority': 3,
    },
    {
        'file': 'coldcases_crimes.json',
        'name': 'Harvard-LIL',
        'priority': 4,
    },
]


def load_source_data(filename: str) -> List[Dict]:
    """소스 파일에서 데이터를 로드합니다."""
    filepath = os.path.join(SOURCES_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  ⚠️  파일 없음: {filename}")
        return []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('incidents', [])
    except Exception as e:
        print(f"  ❌ 로드 실패: {filename} - {e}")
        return []


def generate_dedup_key(incident: Dict) -> str:
    """중복 검사를 위한 키를 생성합니다."""
    # 날짜 + 위치 + 카테고리 기반 키
    date = (incident.get('date') or '')[:10]  # YYYY-MM-DD
    location = (incident.get('location') or '').lower()[:30]
    category = incident.get('category') or ''

    # 좌표 기반 추가 (있는 경우)
    coords = incident.get('coordinates')
    if coords:
        lat = round(coords.get('lat', 0), 1)
        lng = round(coords.get('lng', 0), 1)
        coord_str = f"{lat},{lng}"
    else:
        coord_str = ""

    key_str = f"{date}|{location}|{category}|{coord_str}"
    return hashlib.md5(key_str.encode()).hexdigest()[:16]


def normalize_incident(incident: Dict, source_name: str) -> Dict:
    """인시던트 데이터를 정규화합니다."""
    # 필수 필드 확인 및 기본값 설정
    normalized = {
        'id': 0,  # 나중에 재할당
        'title': incident.get('title', 'Unknown Incident'),
        'category': incident.get('category', 'disaster'),
        'era': incident.get('era', 'contemporary'),
        'date': incident.get('date', ''),
        'location': incident.get('location', 'Unknown'),
        'summary': incident.get('summary', '')[:400],
        'description': incident.get('description', '')[:3000],
        'timeline': incident.get('timeline', []),
        'theories': incident.get('theories', []),
        'tags': incident.get('tags', []),
        'sources': incident.get('sources', []),
        'relatedIncidents': [],  # 나중에 계산
        'images': incident.get('images', []),
        'casualties': incident.get('casualties'),
        'coordinates': incident.get('coordinates'),
        'status': incident.get('status', 'resolved'),
    }

    # 소스 정보 추가
    normalized['_source'] = source_name
    normalized['_originalId'] = incident.get('originalId', incident.get('id'))

    # 추가 메타데이터 (있는 경우)
    for key in ['magnitude', 'depth', 'maxWaveHeight', 'femaDisasterNumber']:
        if key in incident:
            normalized[key] = incident[key]

    return normalized


def merge_duplicates(incidents: List[Dict]) -> List[Dict]:
    """중복 데이터를 병합합니다."""
    dedup_map = {}  # key -> list of incidents

    for inc in incidents:
        key = generate_dedup_key(inc)
        if key not in dedup_map:
            dedup_map[key] = []
        dedup_map[key].append(inc)

    merged = []
    for key, group in dedup_map.items():
        if len(group) == 1:
            merged.append(group[0])
        else:
            # 가장 정보가 풍부한 것을 선택
            best = max(group, key=lambda x: (
                len(x.get('description', '')),
                len(x.get('tags', [])),
                1 if x.get('coordinates') else 0,
                1 if x.get('casualties') else 0,
            ))

            # 다른 소스 정보 병합
            all_sources = []
            all_tags = set(best.get('tags', []))
            for inc in group:
                all_sources.extend(inc.get('sources', []))
                all_tags.update(inc.get('tags', []))

            # 중복 소스 제거
            seen_urls = set()
            unique_sources = []
            for src in all_sources:
                url = src.get('url', '')
                if url not in seen_urls:
                    seen_urls.add(url)
                    unique_sources.append(src)

            best['sources'] = unique_sources
            best['tags'] = list(all_tags)[:15]  # 최대 15개 태그

            merged.append(best)

    return merged


def calculate_relations(incidents: List[Dict], max_relations: int = 5) -> List[Dict]:
    """인시던트 간의 관계를 계산합니다."""
    relations = []

    # 인덱스 생성
    by_category = {}
    by_year = {}
    by_tag = {}

    for inc in incidents:
        inc_id = inc['id']
        cat = inc.get('category', '')
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(inc_id)

        try:
            year = int(inc.get('date', '2000')[:4])
            if year not in by_year:
                by_year[year] = []
            by_year[year].append(inc_id)
        except:
            pass

        for tag in inc.get('tags', []):
            if tag not in by_tag:
                by_tag[tag] = []
            by_tag[tag].append(inc_id)

    # 관계 계산
    for inc in tqdm(incidents, desc="관계 계산"):
        inc_id = inc['id']
        scores = {}  # other_id -> score

        cat = inc.get('category', '')
        try:
            year = int(inc.get('date', '2000')[:4])
        except:
            year = 2000

        # 같은 카테고리 (+2)
        for other_id in by_category.get(cat, []):
            if other_id != inc_id:
                scores[other_id] = scores.get(other_id, 0) + 2

        # 비슷한 시기 (+1~3)
        for y in range(year - 2, year + 3):
            weight = 3 if y == year else (2 if abs(y - year) == 1 else 1)
            for other_id in by_year.get(y, []):
                if other_id != inc_id:
                    scores[other_id] = scores.get(other_id, 0) + weight

        # 공통 태그 (+1 per tag)
        for tag in inc.get('tags', []):
            for other_id in by_tag.get(tag, []):
                if other_id != inc_id:
                    scores[other_id] = scores.get(other_id, 0) + 1

        # 상위 관계만 선택
        top_relations = sorted(scores.items(), key=lambda x: -x[1])[:max_relations]
        inc['relatedIncidents'] = [r[0] for r in top_relations if r[1] >= 3]

        # 관계 데이터 생성
        for other_id, score in top_relations:
            if score >= 3 and inc_id < other_id:  # 중복 방지
                relation_type = "관련 사건"
                if cat == incidents[other_id - 1].get('category'):
                    relation_type = f"동일 유형 ({cat})"
                relations.append({
                    'from': inc_id,
                    'to': other_id,
                    'relation': relation_type,
                    'score': score,
                })

    return relations


def main():
    """메인 함수"""
    print("🔄 마스터 데이터 통합 시작...")
    print("=" * 60)

    all_incidents = []

    # 각 소스에서 데이터 로드
    for source in DATA_SOURCES:
        print(f"\n📂 {source['name']} 데이터 로드 중...")
        incidents = load_source_data(source['file'])
        print(f"   로드됨: {len(incidents)}개")

        # 정규화
        for inc in incidents:
            normalized = normalize_incident(inc, source['name'])
            all_incidents.append(normalized)

    print(f"\n📊 총 로드된 데이터: {len(all_incidents)}개")

    # 중복 제거 및 병합
    print("\n🔍 중복 데이터 병합 중...")
    merged = merge_duplicates(all_incidents)
    print(f"   병합 후: {len(merged)}개")

    # 날짜순 정렬 (최신순)
    merged.sort(key=lambda x: x.get('date', ''), reverse=True)

    # ID 재할당
    for i, inc in enumerate(merged):
        inc['id'] = i + 1

    # 관계 계산
    print("\n🔗 관계 계산 중...")
    relations = calculate_relations(merged)
    print(f"   생성된 관계: {len(relations)}개")

    # 결과 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 마스터 데이터 저장
    master_file = os.path.join(OUTPUT_DIR, "master_incidents.json")
    with open(master_file, "w", encoding="utf-8") as f:
        json.dump({
            'metadata': {
                'version': '1.0',
                'created_at': datetime.now().isoformat(),
                'total_incidents': len(merged),
                'total_relations': len(relations),
                'sources': [s['name'] for s in DATA_SOURCES],
            },
            'incidents': merged,
            'relations': relations,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 마스터 데이터 저장: {master_file}")

    # TypeScript 데이터 파일 생성
    ts_output = os.path.join(SCRIPTS_DIR, '..', 'lib', 'data.ts')

    # _source, _originalId 등 내부 필드 제거
    clean_incidents = []
    for inc in merged:
        clean = {k: v for k, v in inc.items() if not k.startswith('_')}
        clean_incidents.append(clean)

    ts_content = f'''// Auto-generated by merge_master_data.py
// Generated at: {datetime.now().isoformat()}
// Total incidents: {len(clean_incidents)}
// Total relations: {len(relations)}

import {{ IncidentsData }} from "./types";

export const incidentsData: IncidentsData = {json.dumps({
    'incidents': clean_incidents,
    'relations': relations,
}, ensure_ascii=False, indent=2)};
'''

    with open(ts_output, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print(f"✅ TypeScript 데이터 저장: {ts_output}")

    # 통계 출력
    print("\n" + "=" * 60)
    print("📈 최종 통계")
    print("=" * 60)

    # 소스별 통계
    source_stats = {}
    for inc in merged:
        src = inc.get('_source', 'Unknown')
        source_stats[src] = source_stats.get(src, 0) + 1

    print("\n소스별 분포:")
    for src, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        print(f"   - {src}: {count}개")

    # 카테고리별 통계
    cat_stats = {}
    for inc in merged:
        cat = inc.get('category', 'unknown')
        cat_stats[cat] = cat_stats.get(cat, 0) + 1

    print("\n카테고리별 분포:")
    for cat, count in sorted(cat_stats.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}개")

    # 연도별 통계
    year_stats = {}
    for inc in merged:
        try:
            year = int(inc.get('date', '2000')[:4])
            decade = f"{(year // 10) * 10}s"
            year_stats[decade] = year_stats.get(decade, 0) + 1
        except:
            pass

    print("\n연대별 분포 (상위 10개):")
    for decade, count in sorted(year_stats.items(), key=lambda x: -x[1])[:10]:
        print(f"   - {decade}: {count}개")


if __name__ == "__main__":
    main()
