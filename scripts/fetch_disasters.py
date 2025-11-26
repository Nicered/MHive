#!/usr/bin/env python3
"""
MHive 데이터 수집 스크립트
Wikipedia 카테고리에서 재난/사건사고 정보를 자동으로 수집합니다.
"""

import json
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, asdict
from tqdm import tqdm
import re
import os
import time

# 기본 설정
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
WIKI_API = "https://ko.wikipedia.org/w/api.php"
WIKI_EN_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {
    'User-Agent': 'MHive/1.0 (https://github.com/Nicered/MHive; Data Collection Bot)'
}

# 수집할 카테고리 정의 (영어 Wikipedia)
CATEGORIES_CONFIG = {
    "disaster": {
        "categories": [
            "Category:Natural_disasters_by_year",
            "Category:21st-century_earthquakes",
            "Category:20th-century_earthquakes",
            "Category:Tsunamis",
            "Category:Floods",
            "Category:Volcanic_eruptions",
            "Category:Hurricanes",
            "Category:Typhoons",
        ],
        "max_depth": 2,
        "max_items": 100,
    },
    "accident": {
        "categories": [
            "Category:Aviation_accidents_and_incidents_by_year",
            "Category:Maritime_disasters",
            "Category:Nuclear_and_radiation_accidents_and_incidents",
            "Category:Bridge_disasters",
            "Category:Building_collapses",
            "Category:Industrial_disasters",
            "Category:Rail_accidents_and_incidents",
        ],
        "max_depth": 2,
        "max_items": 100,
    },
    "terrorism": {
        "categories": [
            "Category:Terrorist_incidents_by_year",
            "Category:Bombings",
            "Category:Mass_shootings",
        ],
        "max_depth": 2,
        "max_items": 60,
    },
    "crime": {
        "categories": [
            "Category:Massacres",
            "Category:Genocides",
            "Category:Serial_killers",
        ],
        "max_depth": 2,
        "max_items": 50,
    },
    "mystery": {
        "categories": [
            "Category:Unsolved_deaths",
            "Category:Unexplained_disappearances",
            "Category:Conspiracy_theories",
        ],
        "max_depth": 2,
        "max_items": 40,
    },
}


@dataclass
class Incident:
    id: int
    title: str
    category: str
    era: str
    date: str
    location: str
    summary: str
    description: str
    timeline: List[Dict[str, str]]
    theories: List[str]
    tags: List[str]
    sources: List[Dict[str, str]]
    relatedIncidents: List[int]
    images: List[str] = None
    casualties: Dict[str, int] = None
    coordinates: Dict[str, float] = None
    status: str = None
    originalTitle: str = None  # 영어 원제목

    def __post_init__(self):
        if self.images is None:
            self.images = []
        if self.casualties is None:
            self.casualties = {}


def get_category_members(category: str, lang: str = "en", cmtype: str = "page|subcat") -> List[Dict]:
    """카테고리의 멤버(문서/하위카테고리)를 가져옵니다."""
    api = WIKI_EN_API if lang == "en" else WIKI_API
    members = []
    cmcontinue = None

    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmlimit": "500",
            "cmtype": cmtype,
            "format": "json",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue

        try:
            response = requests.get(api, params=params, headers=HEADERS, timeout=15)
            data = response.json()
            members.extend(data.get("query", {}).get("categorymembers", []))

            if "continue" in data:
                cmcontinue = data["continue"].get("cmcontinue")
            else:
                break
        except Exception as e:
            print(f"Error fetching category {category}: {e}")
            break

    return members


def collect_pages_from_category(category: str, max_depth: int = 2, max_items: int = 100) -> Set[str]:
    """카테고리에서 재귀적으로 문서를 수집합니다."""
    pages = set()
    visited_cats = set()

    def recurse(cat: str, depth: int):
        if depth > max_depth or cat in visited_cats or len(pages) >= max_items:
            return
        visited_cats.add(cat)

        members = get_category_members(cat)
        for m in members:
            if len(pages) >= max_items:
                break
            if m.get("ns") == 0:  # 일반 문서
                pages.add(m["title"])
            elif m.get("ns") == 14 and depth < max_depth:  # 카테고리
                recurse(m["title"], depth + 1)

    recurse(category, 0)
    return pages


def get_wikipedia_page(title: str, lang: str = "en") -> Optional[Dict]:
    """Wikipedia API에서 페이지 내용을 가져옵니다."""
    api = WIKI_EN_API if lang == "en" else WIKI_API

    params = {
        "action": "query",
        "titles": title,
        "prop": "extracts|categories|coordinates|pageimages|langlinks",
        "exintro": False,
        "explaintext": True,
        "format": "json",
        "piprop": "original",
        "lllang": "ko" if lang == "en" else "en",
        "lllimit": "1",
    }

    try:
        response = requests.get(api, params=params, headers=HEADERS, timeout=15)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})

        for page_id, page_data in pages.items():
            if page_id != "-1":
                return page_data
    except Exception as e:
        print(f"Error fetching {title}: {e}")

    return None


def extract_date_from_text(text: str, title: str) -> str:
    """텍스트에서 날짜를 추출합니다."""
    # 제목에서 연도 추출 시도
    year_match = re.search(r'(19\d{2}|20\d{2})', title)

    # 텍스트에서 날짜 패턴 찾기
    date_patterns = [
        r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
        r'(\d{4})-(\d{2})-(\d{2})',
    ]

    months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    }

    for pattern in date_patterns:
        match = re.search(pattern, text[:1000])
        if match:
            groups = match.groups()
            if len(groups) == 3:
                if groups[1] in months:
                    return f"{groups[2]}-{months[groups[1]]}-{int(groups[0]):02d}"
                elif groups[0] in months:
                    return f"{groups[2]}-{months[groups[0]]}-{int(groups[1]):02d}"
                else:
                    return f"{groups[0]}-{groups[1]}-{groups[2]}"

    if year_match:
        return f"{year_match.group(1)}-01-01"

    return "2000-01-01"


def extract_location(text: str, title: str) -> str:
    """텍스트에서 위치를 추출합니다."""
    # 일반적인 위치 패턴
    location_patterns = [
        r'(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'(?:occurred|happened|struck|hit)\s+(?:in|at)\s+([A-Z][a-zA-Z\s,]+)',
    ]

    for pattern in location_patterns:
        match = re.search(pattern, text[:500])
        if match:
            return match.group(1).strip()[:50]

    # 제목에서 위치 추출
    location_in_title = re.search(r'(?:in|at)\s+([A-Z][a-zA-Z\s]+)', title)
    if location_in_title:
        return location_in_title.group(1).strip()[:50]

    return "Unknown"


def determine_era(date_str: str) -> str:
    """날짜를 기반으로 시대를 결정합니다."""
    try:
        year = int(date_str.split("-")[0])
        if year < 0:
            return "ancient"
        elif year < 1900:
            return "modern"
        else:
            return "contemporary"
    except:
        return "contemporary"


def extract_casualties(text: str) -> Dict[str, int]:
    """텍스트에서 사상자 정보를 추출합니다."""
    casualties = {}

    patterns = {
        "deaths": [
            r'(\d{1,7})\s*(?:people\s+)?(?:were\s+)?(?:killed|died|dead|death|deaths|fatalities)',
            r'(?:killed|death toll|fatalities)[:\s]+(\d{1,7})',
            r'(\d{1,7})\s+(?:dead|killed)',
        ],
        "injuries": [
            r'(\d{1,7})\s*(?:people\s+)?(?:were\s+)?(?:injured|wounded|hurt)',
            r'(?:injured|wounded)[:\s]+(\d{1,7})',
        ],
        "missing": [
            r'(\d{1,7})\s*(?:people\s+)?(?:were\s+)?(?:missing|disappeared)',
            r'(?:missing)[:\s]+(\d{1,7})',
        ],
    }

    for key, pattern_list in patterns.items():
        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    num = int(match.group(1).replace(",", ""))
                    if num > 0 and num < 10000000:  # 합리적인 범위
                        casualties[key] = num
                        break
                except:
                    pass

    return casualties


def extract_tags(text: str, category: str) -> List[str]:
    """텍스트에서 관련 태그를 추출합니다."""
    tags = []

    # 카테고리 기반 태그
    category_tags = {
        "disaster": ["재난", "자연재해"],
        "terrorism": ["테러"],
        "accident": ["사고"],
        "crime": ["범죄"],
        "mystery": ["미스터리"],
        "conspiracy": ["음모론"],
        "unsolved": ["미제사건"],
    }
    tags.extend(category_tags.get(category, []))

    # 키워드 기반 태그
    keyword_tags = {
        "earthquake": "지진",
        "tsunami": "쓰나미",
        "hurricane": "허리케인",
        "typhoon": "태풍",
        "flood": "홍수",
        "fire": "화재",
        "explosion": "폭발",
        "aircraft": "항공사고",
        "plane": "항공사고",
        "ship": "해상사고",
        "train": "철도사고",
        "nuclear": "핵/원전",
        "bomb": "폭탄",
        "shooting": "총기",
        "massacre": "학살",
        "serial killer": "연쇄살인",
    }

    text_lower = text.lower()
    for keyword, tag in keyword_tags.items():
        if keyword in text_lower:
            tags.append(tag)

    return list(set(tags))[:10]


def process_page(title: str, incident_id: int, category: str) -> Optional[Incident]:
    """Wikipedia 페이지를 처리하여 Incident 객체를 생성합니다."""
    # 영어 Wikipedia에서 정보 가져오기
    page_data = get_wikipedia_page(title, "en")
    if not page_data:
        return None

    extract = page_data.get("extract", "")
    if not extract or len(extract) < 100:
        return None

    # 한국어 Wikipedia 연결 확인
    langlinks = page_data.get("langlinks", [])
    ko_title = None
    for ll in langlinks:
        if ll.get("lang") == "ko":
            ko_title = ll.get("*")
            break

    # 한국어 페이지가 있으면 한국어 내용 가져오기
    if ko_title:
        ko_page = get_wikipedia_page(ko_title, "ko")
        if ko_page and ko_page.get("extract"):
            display_title = ko_title
            display_extract = ko_page.get("extract", "")
        else:
            display_title = title
            display_extract = extract
    else:
        display_title = title
        display_extract = extract

    # 날짜 추출
    date = extract_date_from_text(extract, title)

    # 위치 추출
    location = extract_location(extract, title)

    # 좌표
    coordinates = None
    if "coordinates" in page_data:
        coord = page_data["coordinates"][0]
        coordinates = {"lat": coord["lat"], "lng": coord["lon"]}

    # 요약 (첫 2-3문장)
    sentences = display_extract.split(". ")
    summary = ". ".join(sentences[:3]) + "." if sentences else display_extract[:300]

    # 상세 설명
    paragraphs = display_extract.split("\n\n")
    description = "\n\n".join(p.strip() for p in paragraphs[:5] if p.strip())

    # 사상자 추출
    casualties = extract_casualties(extract)

    # 태그 추출
    tags = extract_tags(extract, category)

    # 소스
    sources = [{"name": "Wikipedia", "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"}]
    if ko_title:
        sources.append({"name": "Wikipedia (KO)", "url": f"https://ko.wikipedia.org/wiki/{ko_title.replace(' ', '_')}"})

    return Incident(
        id=incident_id,
        title=display_title,
        category=category,
        era=determine_era(date),
        date=date,
        location=location,
        summary=summary[:400],
        description=description[:3000],
        timeline=[],
        theories=[],
        tags=tags,
        sources=sources,
        relatedIncidents=[],
        images=[],
        casualties=casualties if casualties else None,
        coordinates=coordinates,
        status="resolved",
        originalTitle=title if title != display_title else None,
    )


def main():
    """메인 함수"""
    print("🔍 MHive 데이터 수집 시작...")
    print("   Wikipedia 카테고리에서 자동 수집")

    all_pages = {}  # {page_title: category}

    # 각 카테고리에서 페이지 수집
    for category, config in CATEGORIES_CONFIG.items():
        print(f"\n📂 카테고리 수집: {category}")
        category_pages = set()

        for cat in config["categories"]:
            if len(category_pages) >= config["max_items"]:
                break
            pages = collect_pages_from_category(
                cat,
                max_depth=config["max_depth"],
                max_items=config["max_items"] - len(category_pages)
            )
            category_pages.update(pages)
            print(f"   - {cat}: {len(pages)}개 수집")

        # 기존에 수집되지 않은 페이지만 추가
        for page in category_pages:
            if page not in all_pages:
                all_pages[page] = category

        print(f"   총 {len(category_pages)}개 (중복 제거 후)")

    print(f"\n📊 총 수집 대상: {len(all_pages)}개 문서")

    # 각 페이지 처리
    incidents = []
    incident_id = 1

    for title, category in tqdm(all_pages.items(), desc="처리 중"):
        incident = process_page(title, incident_id, category)
        if incident:
            incidents.append(asdict(incident))
            incident_id += 1
        time.sleep(0.1)  # API 요청 제한

    # 결과 저장
    output_file = os.path.join(OUTPUT_DIR, "incidents_raw.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({"incidents": incidents}, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")

    # 카테고리별 통계
    cat_stats = {}
    for inc in incidents:
        cat = inc["category"]
        cat_stats[cat] = cat_stats.get(cat, 0) + 1

    print("\n📈 카테고리별 분포:")
    for cat, count in sorted(cat_stats.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}개")


if __name__ == "__main__":
    main()
