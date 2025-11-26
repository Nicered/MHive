#!/usr/bin/env python3
"""
MHive 데이터 수집 스크립트
Wikipedia 및 공개 데이터에서 재난/사건사고 정보를 수집합니다.
"""

import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from tqdm import tqdm
import re
import os

# 기본 설정
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
WIKI_API = "https://ko.wikipedia.org/w/api.php"
WIKI_EN_API = "https://en.wikipedia.org/w/api.php"


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

    def __post_init__(self):
        if self.images is None:
            self.images = []
        if self.casualties is None:
            self.casualties = {}


def get_wikipedia_page(title: str, lang: str = "ko") -> Optional[Dict]:
    """Wikipedia API에서 페이지 내용을 가져옵니다."""
    api = WIKI_API if lang == "ko" else WIKI_EN_API

    params = {
        "action": "query",
        "titles": title,
        "prop": "extracts|categories|coordinates|pageimages",
        "exintro": False,
        "explaintext": True,
        "format": "json",
        "piprop": "original",
    }

    try:
        response = requests.get(api, params=params, timeout=10)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})

        for page_id, page_data in pages.items():
            if page_id != "-1":
                return page_data
    except Exception as e:
        print(f"Error fetching {title}: {e}")

    return None


def parse_date(date_str: str) -> str:
    """다양한 날짜 형식을 YYYY-MM-DD로 변환합니다."""
    if not date_str:
        return ""

    # 이미 올바른 형식인 경우
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str

    # 연도만 있는 경우
    if re.match(r'^\d{4}$', date_str):
        return f"{date_str}-01-01"

    # 연도-월 형식
    if re.match(r'^\d{4}-\d{2}$', date_str):
        return f"{date_str}-01"

    return date_str


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


def determine_category(text: str, title: str) -> str:
    """텍스트를 분석하여 카테고리를 결정합니다."""
    text_lower = (text + " " + title).lower()

    # 카테고리 키워드
    keywords = {
        "terrorism": ["테러", "폭탄", "자살폭탄", "isis", "알카에다", "폭발물", "terrorism", "terrorist"],
        "disaster": ["재난", "재해", "지진", "쓰나미", "태풍", "홍수", "화산", "산사태", "가뭄", "earthquake", "tsunami", "flood"],
        "accident": ["사고", "충돌", "추락", "침몰", "폭발", "붕괴", "전복", "accident", "crash", "sinking"],
        "crime": ["살인", "연쇄살인", "학살", "범죄", "납치", "murder", "massacre", "crime"],
        "mystery": ["미스터리", "의문", "불가사의", "mystery", "unexplained"],
        "conspiracy": ["음모", "은폐", "의혹", "conspiracy"],
        "unsolved": ["미제", "미해결", "unsolved"],
    }

    for category, kws in keywords.items():
        if any(kw in text_lower for kw in kws):
            return category

    return "accident"  # 기본값


def extract_casualties(text: str) -> Dict[str, int]:
    """텍스트에서 사상자 정보를 추출합니다."""
    casualties = {}

    patterns = {
        "deaths": [
            r'(\d{1,6})\s*명?\s*(이상\s*)?(사망|숨지|죽)',
            r'사망\s*(\d{1,6})',
            r'(\d{1,6})\s*deaths?',
        ],
        "injuries": [
            r'(\d{1,6})\s*명?\s*(이상\s*)?(부상|다쳐|다치)',
            r'부상\s*(\d{1,6})',
            r'(\d{1,6})\s*injur',
        ],
        "missing": [
            r'(\d{1,6})\s*명?\s*(이상\s*)?(실종)',
            r'실종\s*(\d{1,6})',
            r'(\d{1,6})\s*missing',
        ],
    }

    for key, pattern_list in patterns.items():
        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    casualties[key] = int(match.group(1))
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
        "terrorism": ["테러", "폭력"],
        "accident": ["사고"],
        "crime": ["범죄"],
        "mystery": ["미스터리"],
        "conspiracy": ["음모론"],
        "unsolved": ["미제사건"],
    }
    tags.extend(category_tags.get(category, []))

    # 키워드 태그
    keyword_tags = {
        "지진": "지진",
        "해일": "해일",
        "쓰나미": "쓰나미",
        "태풍": "태풍",
        "홍수": "홍수",
        "화재": "화재",
        "폭발": "폭발",
        "항공": "항공사고",
        "선박": "해상사고",
        "열차": "철도사고",
        "원전": "원전사고",
        "핵": "핵",
        "전쟁": "전쟁",
        "학살": "학살",
    }

    for keyword, tag in keyword_tags.items():
        if keyword in text:
            tags.append(tag)

    return list(set(tags))


# 주요 재난/사건 목록 (수동 정의 - Wikipedia에서 수집할 항목들)
MAJOR_INCIDENTS = [
    # 자연재해
    {"title": "2011년 동일본 대지진", "category": "disaster", "date": "2011-03-11", "location": "일본 도호쿠"},
    {"title": "2004년 인도양 지진 해일", "category": "disaster", "date": "2004-12-26", "location": "인도양"},
    {"title": "2010년 아이티 지진", "category": "disaster", "date": "2010-01-12", "location": "아이티"},
    {"title": "1976년 탕산 대지진", "category": "disaster", "date": "1976-07-28", "location": "중국 탕산"},
    {"title": "2005년 허리케인 카트리나", "category": "disaster", "date": "2005-08-29", "location": "미국 뉴올리언스"},
    {"title": "1970년 볼라 사이클론", "category": "disaster", "date": "1970-11-12", "location": "방글라데시"},
    {"title": "2008년 쓰촨성 대지진", "category": "disaster", "date": "2008-05-12", "location": "중국 쓰촨성"},
    {"title": "2023년 튀르키예-시리아 지진", "category": "disaster", "date": "2023-02-06", "location": "튀르키예, 시리아"},
    {"title": "1931년 중국 대홍수", "category": "disaster", "date": "1931-07-01", "location": "중국"},
    {"title": "1815년 탐보라 화산 폭발", "category": "disaster", "date": "1815-04-10", "location": "인도네시아"},

    # 인재/사고
    {"title": "타이타닉 침몰 사고", "category": "accident", "date": "1912-04-15", "location": "북대서양"},
    {"title": "체르노빌 원자력 발전소 사고", "category": "accident", "date": "1986-04-26", "location": "우크라이나"},
    {"title": "후쿠시마 제1 원자력 발전소 사고", "category": "accident", "date": "2011-03-11", "location": "일본 후쿠시마"},
    {"title": "보팔 참사", "category": "accident", "date": "1984-12-03", "location": "인도 보팔"},
    {"title": "힌덴부르크 참사", "category": "accident", "date": "1937-05-06", "location": "미국 뉴저지"},
    {"title": "MH370편 실종 사건", "category": "accident", "date": "2014-03-08", "location": "인도양"},
    {"title": "세월호 침몰 사고", "category": "accident", "date": "2014-04-16", "location": "대한민국 진도"},
    {"title": "대한항공 007편 격추 사건", "category": "accident", "date": "1983-09-01", "location": "사할린"},
    {"title": "삼풍백화점 붕괴 사고", "category": "accident", "date": "1995-06-29", "location": "대한민국 서울"},
    {"title": "성수대교 붕괴 사고", "category": "accident", "date": "1994-10-21", "location": "대한민국 서울"},
    {"title": "대구 지하철 화재 참사", "category": "accident", "date": "2003-02-18", "location": "대한민국 대구"},
    {"title": "이태원 압사 사고", "category": "accident", "date": "2022-10-29", "location": "대한민국 서울"},
    {"title": "우크라이나 국제항공 752편 격추 사건", "category": "accident", "date": "2020-01-08", "location": "이란 테헤란"},
    {"title": "에어프랑스 447편 추락 사고", "category": "accident", "date": "2009-06-01", "location": "대서양"},
    {"title": "저먼윙스 9525편 추락 사고", "category": "accident", "date": "2015-03-24", "location": "프랑스 알프스"},

    # 테러
    {"title": "9·11 테러", "category": "terrorism", "date": "2001-09-11", "location": "미국 뉴욕, 워싱턴"},
    {"title": "2015년 11월 파리 테러", "category": "terrorism", "date": "2015-11-13", "location": "프랑스 파리"},
    {"title": "2004년 마드리드 열차 폭탄 테러", "category": "terrorism", "date": "2004-03-11", "location": "스페인 마드리드"},
    {"title": "2005년 런던 폭탄 테러", "category": "terrorism", "date": "2005-07-07", "location": "영국 런던"},
    {"title": "도쿄 지하철 사린 사건", "category": "terrorism", "date": "1995-03-20", "location": "일본 도쿄"},
    {"title": "오클라호마시티 폭탄 테러", "category": "terrorism", "date": "1995-04-19", "location": "미국 오클라호마"},
    {"title": "뭄바이 테러", "category": "terrorism", "date": "2008-11-26", "location": "인도 뭄바이"},
    {"title": "베이루트 항구 폭발 사고", "category": "disaster", "date": "2020-08-04", "location": "레바논 베이루트"},
    {"title": "2016년 니스 트럭 테러", "category": "terrorism", "date": "2016-07-14", "location": "프랑스 니스"},
    {"title": "2019년 스리랑카 부활절 폭탄 테러", "category": "terrorism", "date": "2019-04-21", "location": "스리랑카"},

    # 범죄/학살
    {"title": "화성 연쇄살인 사건", "category": "crime", "date": "1986-09-15", "location": "대한민국 화성"},
    {"title": "잭 더 리퍼", "category": "crime", "date": "1888-08-31", "location": "영국 런던"},
    {"title": "조디악 킬러", "category": "unsolved", "date": "1968-12-20", "location": "미국 캘리포니아"},
    {"title": "르완다 집단학살", "category": "crime", "date": "1994-04-07", "location": "르완다"},
    {"title": "캄보디아 킬링필드", "category": "crime", "date": "1975-04-17", "location": "캄보디아"},
    {"title": "난징 대학살", "category": "crime", "date": "1937-12-13", "location": "중국 난징"},
    {"title": "홀로코스트", "category": "crime", "date": "1941-01-01", "location": "유럽"},
    {"title": "스레브레니차 학살", "category": "crime", "date": "1995-07-11", "location": "보스니아"},

    # 미스터리
    {"title": "다이아틀로프 고개 사건", "category": "mystery", "date": "1959-02-02", "location": "러시아 우랄산맥"},
    {"title": "버뮤다 삼각지대", "category": "mystery", "date": "1945-12-05", "location": "대서양"},
    {"title": "나스카 라인", "category": "mystery", "date": "0500-01-01", "location": "페루"},
    {"title": "이집트 피라미드", "category": "mystery", "date": "-2560-01-01", "location": "이집트 기자"},
    {"title": "로즈웰 UFO 추락 사건", "category": "conspiracy", "date": "1947-07-08", "location": "미국 뉴멕시코"},
    {"title": "51구역", "category": "conspiracy", "date": "1955-01-01", "location": "미국 네바다"},
    {"title": "존 F. 케네디 암살", "category": "conspiracy", "date": "1963-11-22", "location": "미국 댈러스"},
    {"title": "마리 셀레스트호", "category": "mystery", "date": "1872-12-04", "location": "대서양"},
    {"title": "엘리사 램 사건", "category": "mystery", "date": "2013-01-31", "location": "미국 로스앤젤레스"},
]


def fetch_and_process_incident(incident_info: Dict, incident_id: int) -> Optional[Incident]:
    """Wikipedia에서 사건 정보를 가져와 처리합니다."""
    title = incident_info["title"]

    # Wikipedia에서 페이지 가져오기
    page_data = get_wikipedia_page(title)

    if not page_data:
        # 한국어 위키에 없으면 영어 위키 시도
        page_data = get_wikipedia_page(title, "en")

    if not page_data:
        print(f"  ⚠️  페이지를 찾을 수 없음: {title}")
        return None

    extract = page_data.get("extract", "")
    if not extract:
        extract = incident_info.get("summary", title)

    # 요약 (첫 2문장)
    sentences = extract.split(". ")
    summary = ". ".join(sentences[:2]) + "." if sentences else extract[:200]

    # 마크다운 형식의 상세 설명
    paragraphs = extract.split("\n\n")
    description_parts = []

    for i, para in enumerate(paragraphs[:5]):  # 최대 5개 문단
        if para.strip():
            if i == 0:
                description_parts.append(para.strip())
            else:
                description_parts.append(para.strip())

    description = "\n\n".join(description_parts)

    # 이미지 URL
    images = []
    if "original" in page_data.get("pageimage", {}):
        images.append(page_data["original"]["source"])

    # 좌표
    coordinates = None
    if "coordinates" in page_data:
        coord = page_data["coordinates"][0]
        coordinates = {"lat": coord["lat"], "lng": coord["lon"]}

    # 사상자 추출
    casualties = extract_casualties(extract)

    # 태그 추출
    tags = extract_tags(extract, incident_info["category"])

    # 소스
    sources = [
        {"name": "Wikipedia", "url": f"https://ko.wikipedia.org/wiki/{title.replace(' ', '_')}"}
    ]

    return Incident(
        id=incident_id,
        title=title,
        category=incident_info["category"],
        era=determine_era(incident_info["date"]),
        date=incident_info["date"],
        location=incident_info["location"],
        summary=summary[:300],
        description=description,
        timeline=[],
        theories=[],
        tags=tags,
        sources=sources,
        relatedIncidents=[],
        images=images,
        casualties=casualties if casualties else None,
        coordinates=coordinates,
        status="resolved",
    )


def main():
    """메인 함수"""
    print("🔍 MHive 데이터 수집 시작...")
    print(f"   수집 대상: {len(MAJOR_INCIDENTS)}개 사건")

    incidents = []

    for i, incident_info in enumerate(tqdm(MAJOR_INCIDENTS, desc="수집 중")):
        incident = fetch_and_process_incident(incident_info, i + 1)
        if incident:
            incidents.append(asdict(incident))

    # 결과 저장
    output_file = os.path.join(OUTPUT_DIR, "incidents_raw.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({"incidents": incidents}, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")


if __name__ == "__main__":
    main()
