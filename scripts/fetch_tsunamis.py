#!/usr/bin/env python3
"""
NOAA 쓰나미 데이터 수집 스크립트
전 세계 쓰나미 이벤트 데이터를 수집합니다.
"""

import json
import requests
from typing import List, Dict, Optional
from tqdm import tqdm
import os
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sources')
NOAA_TSUNAMI_API = "https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/events"

# 쓰나미 원인 코드 매핑
CAUSE_CODES = {
    1: '지진 (Earthquake)',
    2: '의심되는 지진 (Questionable Earthquake)',
    3: '지진 및 산사태 (Earthquake and Landslide)',
    4: '화산 및 지진 (Volcano and Earthquake)',
    5: '화산, 지진 및 산사태 (Volcano, Earthquake, and Landslide)',
    6: '화산 (Volcano)',
    7: '화산 및 산사태 (Volcano and Landslide)',
    8: '산사태 (Landslide)',
    9: '기상 (Meteorological)',
    10: '폭발 (Explosion)',
    11: '천문학적 조류 (Astronomical Tide)',
    12: '알 수 없음 (Unknown)',
}

# 유효성 코드 매핑
VALIDITY_CODES = {
    -1: '잘못된 이벤트',
    0: '가능성 낮음',
    1: '의심스러움',
    2: '분석 필요',
    3: '가능성 있음',
    4: '확인됨',
}


def fetch_tsunamis(min_year: int = 1900, max_year: int = None) -> List[Dict]:
    """NOAA API에서 쓰나미 데이터를 가져옵니다."""
    if max_year is None:
        max_year = datetime.now().year

    all_items = []
    page = 1
    max_results = 500

    while True:
        params = {
            'minYear': min_year,
            'maxYear': max_year,
            'maxResults': max_results,
            'page': page,
        }

        try:
            response = requests.get(NOAA_TSUNAMI_API, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            items = data.get('items', [])
            all_items.extend(items)

            total_pages = data.get('totalPages', 1)
            if page >= total_pages:
                break
            page += 1
        except Exception as e:
            print(f"Error fetching tsunamis (page {page}): {e}")
            break

    return all_items


def format_date(year: int, month: Optional[int], day: Optional[int]) -> str:
    """연도, 월, 일을 YYYY-MM-DD 형식으로 변환합니다."""
    if not year:
        return ""
    month = month or 1
    day = day or 1
    return f"{year:04d}-{month:02d}-{day:02d}"


def format_time(hour: Optional[int], minute: Optional[int]) -> str:
    """시간을 HH:MM 형식으로 변환합니다."""
    if hour is None:
        return ""
    minute = minute or 0
    return f"{hour:02d}:{minute:02d}"


def get_wave_severity(max_height: Optional[float]) -> str:
    """파고에 따른 심각도를 반환합니다."""
    if not max_height:
        return "정보 없음"
    if max_height >= 10:
        return "매우 높음 (10m+)"
    elif max_height >= 5:
        return "높음 (5-10m)"
    elif max_height >= 2:
        return "중간 (2-5m)"
    elif max_height >= 0.5:
        return "낮음 (0.5-2m)"
    else:
        return "매우 낮음 (<0.5m)"


def determine_era(year: int) -> str:
    """연도를 기반으로 시대를 결정합니다."""
    if year < 0:
        return "ancient"
    elif year < 1900:
        return "modern"
    else:
        return "contemporary"


def transform_to_incident(item: Dict, incident_id: int) -> Dict:
    """NOAA 데이터를 MHive Incident 형식으로 변환합니다."""
    year = item.get('year', 0)
    month = item.get('month')
    day = item.get('day')
    hour = item.get('hour')
    minute = item.get('minute')

    date = format_date(year, month, day)
    time_str = format_time(hour, minute)

    country = item.get('country', 'Unknown')
    location_name = item.get('locationName', '')
    location = f"{location_name}, {country}" if location_name else country

    cause_code = item.get('causeCode', 12)
    cause = CAUSE_CODES.get(cause_code, '알 수 없음')

    max_height = item.get('maxWaterHeight')
    wave_severity = get_wave_severity(max_height)

    validity = item.get('eventValidity', 0)
    validity_str = VALIDITY_CODES.get(validity, '알 수 없음')

    # 제목 생성
    title = f"{year}년 {country} 쓰나미"
    if location_name:
        title = f"{year}년 {location_name} 쓰나미"

    # 피해 정보
    deaths = item.get('deaths') or item.get('deathsTotal')
    injuries = item.get('injuries') or item.get('injuriesTotal')
    missing = item.get('missing') or item.get('missingTotal')
    houses_destroyed = item.get('housesDestroyed') or item.get('housesDestroyedTotal')

    # 요약
    summary = f"{year}년 {location}에서 발생한 쓰나미. "
    summary += f"원인: {cause}. "
    if max_height:
        summary += f"최대 파고: {max_height:.1f}m. "
    if deaths:
        summary += f"사망자: {deaths}명."

    # 상세 설명
    description = f"## 쓰나미 정보\n\n"
    description += f"**발생 일시**: {date}"
    if time_str:
        description += f" {time_str} UTC"
    description += f"\n**위치**: {location}\n"
    description += f"**원인**: {cause}\n"
    description += f"**이벤트 유효성**: {validity_str}\n"

    if max_height:
        description += f"\n## 파도 정보\n\n"
        description += f"**최대 파고**: {max_height:.1f}m ({wave_severity})\n"

    num_runups = item.get('numRunups', 0)
    if num_runups:
        description += f"**측정 지점 수**: {num_runups}개\n"

    if deaths or injuries or missing or houses_destroyed:
        description += f"\n## 피해 현황\n\n"
        if deaths:
            description += f"- 사망자: {deaths}명\n"
        if injuries:
            description += f"- 부상자: {injuries}명\n"
        if missing:
            description += f"- 실종자: {missing}명\n"
        if houses_destroyed:
            description += f"- 파괴된 가옥: {houses_destroyed}채\n"

    # 사상자 정보
    casualties = {}
    if deaths:
        casualties['deaths'] = deaths
    if injuries:
        casualties['injuries'] = injuries
    if missing:
        casualties['missing'] = missing

    # 태그
    tags = ['재난', '자연재해', '쓰나미']
    if cause_code in [1, 2, 3]:
        tags.append('지진')
    if cause_code in [4, 5, 6, 7]:
        tags.append('화산')
    if cause_code == 8:
        tags.append('산사태')
    if max_height and max_height >= 5:
        tags.append('대규모')
    if deaths and deaths >= 100:
        tags.append('대형피해')
    if item.get('oceanicTsunami'):
        tags.append('원양쓰나미')

    # 좌표
    lat = item.get('latitude')
    lng = item.get('longitude')
    coordinates = {'lat': lat, 'lng': lng} if lat and lng else None

    return {
        'id': incident_id,
        'title': title,
        'category': 'disaster',
        'era': determine_era(year),
        'date': date,
        'location': location,
        'summary': summary[:400],
        'description': description[:3000],
        'timeline': [],
        'theories': [],
        'tags': list(set(tags)),
        'sources': [{
            'name': 'NOAA NGDC',
            'url': f"https://www.ngdc.noaa.gov/hazel/view/hazards/tsunami/event-more-info/{item.get('id')}"
        }],
        'relatedIncidents': [],
        'images': [],
        'casualties': casualties if casualties else None,
        'coordinates': coordinates,
        'status': 'resolved',
        'originalId': item.get('id'),
        'maxWaveHeight': max_height,
        'causeCode': cause_code,
    }


def main():
    """메인 함수"""
    print("🌊 NOAA 쓰나미 데이터 수집 시작...")

    # 1900년부터 현재까지 데이터 수집
    items = fetch_tsunamis(min_year=1900)

    print(f"\n📊 총 {len(items)}개 원본 데이터 수집")

    # 확인된 이벤트만 필터링 (validity >= 3)
    valid_items = [item for item in items if item.get('eventValidity', 0) >= 3]
    print(f"   확인된 이벤트 (validity >= 3): {len(valid_items)}개")

    # MHive 형식으로 변환
    incidents = []
    for i, item in enumerate(tqdm(valid_items, desc="데이터 변환")):
        incident = transform_to_incident(item, i + 1)
        incidents.append(incident)

    # 날짜 순으로 정렬 (최신순)
    incidents.sort(key=lambda x: x.get('date', ''), reverse=True)

    # ID 재할당
    for i, inc in enumerate(incidents):
        inc['id'] = i + 1

    # 결과 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_file = os.path.join(OUTPUT_DIR, "noaa_tsunamis.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            'source': 'NOAA NGDC Tsunami Database',
            'collected_at': datetime.now().isoformat(),
            'total_count': len(incidents),
            'incidents': incidents
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")

    # 원인별 통계
    cause_stats = {}
    for inc in incidents:
        cause = CAUSE_CODES.get(inc.get('causeCode', 12), '기타')
        cause_stats[cause] = cause_stats.get(cause, 0) + 1

    print("\n📈 원인별 분포:")
    for cause, count in sorted(cause_stats.items(), key=lambda x: -x[1])[:5]:
        print(f"   - {cause}: {count}개")

    # 연대별 통계
    decade_stats = {}
    for inc in incidents:
        try:
            year = int(inc.get('date', '2000')[:4])
            decade = f"{(year // 10) * 10}s"
            decade_stats[decade] = decade_stats.get(decade, 0) + 1
        except:
            pass

    print("\n📅 연대별 분포 (상위 5개):")
    for decade, count in sorted(decade_stats.items(), key=lambda x: -x[1])[:5]:
        print(f"   - {decade}: {count}개")


if __name__ == "__main__":
    main()
