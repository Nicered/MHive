#!/usr/bin/env python3
"""
OpenFEMA 데이터 수집 스크립트
미국 재난 선언 데이터를 수집합니다.
"""

import json
import requests
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from tqdm import tqdm
import os
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sources')
FEMA_API = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"

# 미국 주 코드 -> 이름 매핑
US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington D.C.', 'PR': 'Puerto Rico',
    'VI': 'U.S. Virgin Islands', 'GU': 'Guam', 'AS': 'American Samoa',
}

# 재난 유형 매핑
INCIDENT_TYPE_MAP = {
    'Fire': ('disaster', '화재'),
    'Flood': ('disaster', '홍수'),
    'Hurricane': ('disaster', '허리케인'),
    'Severe Storm': ('disaster', '폭풍'),
    'Tornado': ('disaster', '토네이도'),
    'Earthquake': ('disaster', '지진'),
    'Snow': ('disaster', '폭설'),
    'Severe Ice Storm': ('disaster', '빙설'),
    'Typhoon': ('disaster', '태풍'),
    'Volcanic Eruption': ('disaster', '화산폭발'),
    'Tsunami': ('disaster', '쓰나미'),
    'Coastal Storm': ('disaster', '해안폭풍'),
    'Dam/Levee Break': ('accident', '댐붕괴'),
    'Mud/Landslide': ('disaster', '산사태'),
    'Terrorist': ('terrorism', '테러'),
    'Toxic Substances': ('accident', '유해물질'),
    'Biological': ('disaster', '생물재해'),
    'Chemical': ('accident', '화학사고'),
    'Human Cause': ('accident', '인재'),
    'Other': ('disaster', '기타'),
    'Freezing': ('disaster', '한파'),
    'Drought': ('disaster', '가뭄'),
}


def fetch_fema_data(skip: int = 0, top: int = 1000) -> List[Dict]:
    """OpenFEMA API에서 데이터를 가져옵니다."""
    params = {
        '$skip': skip,
        '$top': top,
        '$orderby': 'declarationDate desc',
        '$format': 'json',
    }

    try:
        response = requests.get(FEMA_API, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get('DisasterDeclarationsSummaries', [])
    except Exception as e:
        print(f"Error fetching FEMA data: {e}")
        return []


def parse_date(date_str: Optional[str]) -> str:
    """ISO 날짜 문자열을 YYYY-MM-DD 형식으로 변환합니다."""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d')
    except:
        return date_str[:10] if date_str else ""


def determine_era(date_str: str) -> str:
    """날짜를 기반으로 시대를 결정합니다."""
    try:
        year = int(date_str.split("-")[0])
        if year < 1900:
            return "modern"
        else:
            return "contemporary"
    except:
        return "contemporary"


def transform_to_incident(item: Dict, incident_id: int) -> Dict:
    """FEMA 데이터를 MHive Incident 형식으로 변환합니다."""
    incident_type = item.get('incidentType', 'Other')
    category, tag = INCIDENT_TYPE_MAP.get(incident_type, ('disaster', '기타'))

    state_code = item.get('state', '')
    state_name = US_STATES.get(state_code, state_code)
    designated_area = item.get('designatedArea', '')
    location = f"{designated_area}, {state_name}, USA" if designated_area else f"{state_name}, USA"

    declaration_date = parse_date(item.get('declarationDate'))
    incident_begin = parse_date(item.get('incidentBeginDate'))
    incident_end = parse_date(item.get('incidentEndDate'))

    date = incident_begin or declaration_date

    title = item.get('declarationTitle', f"{incident_type} in {state_name}")

    # 요약 및 설명 생성
    summary = f"{item.get('fyDeclared', '')}년 {state_name}에서 발생한 {incident_type} 재난. "
    summary += f"FEMA 재난 번호: {item.get('disasterNumber', 'N/A')}. "
    summary += f"재난 선언일: {declaration_date}."

    description = f"## 개요\n\n{title}\n\n"
    description += f"**재난 유형**: {incident_type}\n"
    description += f"**위치**: {location}\n"
    description += f"**재난 시작일**: {incident_begin or 'N/A'}\n"
    if incident_end:
        description += f"**재난 종료일**: {incident_end}\n"
    description += f"\n## FEMA 정보\n\n"
    description += f"- 재난 번호: {item.get('disasterNumber', 'N/A')}\n"
    description += f"- 선언 유형: {item.get('declarationType', 'N/A')}\n"
    description += f"- FEMA 선언 문자열: {item.get('femaDeclarationString', 'N/A')}\n"

    # 태그
    tags = ['재난', '미국', tag]
    if item.get('declarationType') == 'DR':
        tags.append('대형재난')
    elif item.get('declarationType') == 'EM':
        tags.append('비상사태')

    return {
        'id': incident_id,
        'title': title,
        'category': category,
        'era': determine_era(date),
        'date': date,
        'location': location,
        'summary': summary[:400],
        'description': description[:3000],
        'timeline': [],
        'theories': [],
        'tags': list(set(tags)),
        'sources': [{
            'name': 'OpenFEMA',
            'url': f"https://www.fema.gov/disaster/{item.get('disasterNumber', '')}"
        }],
        'relatedIncidents': [],
        'images': [],
        'casualties': None,
        'coordinates': None,
        'status': 'resolved' if incident_end else 'ongoing',
        'originalId': item.get('id'),
        'femaDisasterNumber': item.get('disasterNumber'),
    }


def main():
    """메인 함수"""
    print("🏛️ OpenFEMA 데이터 수집 시작...")

    all_items = []
    skip = 0
    batch_size = 1000
    max_items = 5000  # 최대 5000개 수집

    with tqdm(total=max_items, desc="FEMA 데이터 수집") as pbar:
        while len(all_items) < max_items:
            items = fetch_fema_data(skip=skip, top=batch_size)
            if not items:
                break
            all_items.extend(items)
            pbar.update(len(items))
            skip += batch_size

            if len(items) < batch_size:
                break

    print(f"\n📊 총 {len(all_items)}개 원본 데이터 수집")

    # 중복 제거 (disasterNumber 기준)
    seen = set()
    unique_items = []
    for item in all_items:
        disaster_num = item.get('disasterNumber')
        if disaster_num and disaster_num not in seen:
            seen.add(disaster_num)
            unique_items.append(item)

    print(f"   중복 제거 후: {len(unique_items)}개")

    # MHive 형식으로 변환
    incidents = []
    for i, item in enumerate(tqdm(unique_items, desc="데이터 변환")):
        incident = transform_to_incident(item, i + 1)
        incidents.append(incident)

    # 결과 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_file = os.path.join(OUTPUT_DIR, "fema_disasters.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            'source': 'OpenFEMA',
            'collected_at': datetime.now().isoformat(),
            'total_count': len(incidents),
            'incidents': incidents
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")

    # 통계
    type_stats = {}
    for inc in incidents:
        cat = inc['category']
        type_stats[cat] = type_stats.get(cat, 0) + 1

    print("\n📈 카테고리별 분포:")
    for cat, count in sorted(type_stats.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}개")


if __name__ == "__main__":
    main()
