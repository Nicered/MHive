# 데이터 구조 설계

## 개요

MHive는 사건/사고 중심의 지식 그래프입니다. 사건(Incident)을 핵심 노드로, 위치/자연현상/단체/인물 등의 엔티티와 연결합니다.

```
[Person] ──────┐
               │ PERPETRATOR_OF
               ▼
[Location] ◄── OCCURRED_AT ── [Incident] ── CAUSED_BY ──► [Phenomenon]
    │                              │                           │
    │ LOCATED_IN                   │ RELATED_TO                │ TRIGGERED
    ▼                              ▼                           ▼
[Location]                    [Incident]                  [Incident]
                                   ▲
                                   │ RESPONDED_TO
                                   │
                            [Organization]
```

---

## 노드 타입

### 1. Incident (사건) - 핵심 노드

```json
{
  "id": "incident-earthquake-2011-001",
  "type": "incident",
  "title": "2011 동일본 대지진",
  "category": "disaster",
  "subCategory": "earthquake",
  "era": "contemporary",
  "date": "2011-03-11",
  "endDate": "2011-03-11",
  "location": "Tohoku, Japan",
  "coordinates": { "lat": 38.322, "lng": 142.369 },
  "summary": "M9.0 규모의 대지진으로 쓰나미와 후쿠시마 원전 사고 유발",
  "description": "## 사건 개요\n\n...",
  "severity": "catastrophic",
  "status": "resolved",
  "tags": ["지진", "쓰나미", "원전사고", "일본"],
  "casualties": {
    "deaths": 15899,
    "injuries": 6157,
    "missing": 2526
  },
  "timeline": [
    { "date": "2011-03-11T14:46:00", "event": "M9.0 지진 발생" },
    { "date": "2011-03-11T15:30:00", "event": "쓰나미 도달" }
  ],
  "sources": [
    { "name": "USGS", "url": "https://..." }
  ],
  "relatedEntities": {
    "locations": ["location-japan-tohoku"],
    "phenomena": ["phenomenon-earthquake-2011-tohoku"],
    "organizations": ["org-tepco", "org-jma"],
    "persons": []
  }
}
```

#### 카테고리 체계

| category | subCategory | 설명 | 데이터소스 |
|----------|-------------|------|-----------|
| disaster | earthquake | 지진 | USGS |
| disaster | tsunami | 쓰나미 | NOAA |
| disaster | volcano | 화산 | NOAA |
| disaster | wildfire | 산불 | NIFC |
| disaster | hurricane | 허리케인/태풍 | FEMA |
| disaster | flood | 홍수 | FEMA |
| disaster | tornado | 토네이도 | FEMA |
| accident | aviation | 항공사고 | NTSB |
| accident | maritime | 해양사고 | - |
| accident | industrial | 산업재해 | - |
| crime | murder | 살인 | Cold Cases |
| crime | serial | 연쇄범죄 | Cold Cases |
| crime | terrorism | 테러 | - |
| mystery | ufo | UFO/UAP | NUFORC |
| mystery | disappearance | 실종 | - |

#### severity (심각도)

| 값 | 설명 |
|----|------|
| minor | 경미 (사망 0, 부상 소수) |
| moderate | 보통 (사망 1-10) |
| major | 심각 (사망 11-100) |
| catastrophic | 대재앙 (사망 100+) |

---

### 2. Location (위치)

```json
{
  "id": "location-japan-tohoku",
  "type": "location",
  "name": "Tohoku Region",
  "nameLocal": "東北地方",
  "locationType": "region",
  "country": "Japan",
  "countryCode": "JP",
  "state": null,
  "city": null,
  "coordinates": { "lat": 39.0, "lng": 140.0 },
  "elevation": null,
  "population": 8900000,
  "riskZones": ["earthquake", "tsunami"],
  "parentLocation": "location-japan"
}
```

#### locationType

| 값 | 설명 |
|----|------|
| country | 국가 |
| state | 주/도/광역시 |
| city | 도시 |
| region | 지역 |
| ocean | 해양 |
| mountain | 산/산맥 |
| fault_line | 단층선 |
| volcano_site | 화산 |
| airport | 공항 |
| building | 건물 |

---

### 3. Phenomenon (자연현상)

지진, 화산 분화, 폭풍 등 사건의 원인이 되는 자연현상.

```json
{
  "id": "phenomenon-earthquake-2011-tohoku",
  "type": "phenomenon",
  "phenomenonType": "earthquake",
  "name": "2011 Tohoku Earthquake",
  "nameLocal": "東北地方太平洋沖地震",
  "date": "2011-03-11",
  "magnitude": 9.0,
  "scale": "M9.0",
  "depth": 29,
  "duration": "6 minutes",
  "affectedAreaKm2": 500000,
  "epicenter": { "lat": 38.322, "lng": 142.369 },
  "description": "일본 관측 사상 최대 규모의 지진",
  "triggeredEvents": [
    "incident-tsunami-2011-001",
    "incident-nuclear-2011-fukushima"
  ]
}
```

#### phenomenonType

| 값 | 측정 단위 |
|----|----------|
| earthquake | Magnitude (M) |
| eruption | VEI (0-8) |
| hurricane | Category (1-5) |
| tornado | EF Scale (0-5) |
| flood | - |
| drought | - |
| heatwave | - |

---

### 4. Organization (단체/조직)

```json
{
  "id": "org-fema",
  "type": "organization",
  "name": "Federal Emergency Management Agency",
  "nameShort": "FEMA",
  "orgType": "government",
  "jurisdiction": "USA",
  "country": "USA",
  "foundedDate": "1979-04-01",
  "description": "미국 연방재난관리청",
  "website": "https://www.fema.gov"
}
```

#### orgType

| 값 | 설명 | 예시 |
|----|------|------|
| government | 정부기관 | FEMA, USGS, 경찰청 |
| emergency | 응급/구조 | 소방서, 적십자 |
| scientific | 연구기관 | NOAA, NASA |
| criminal | 범죄조직 | 마피아, 카르텔 |
| terrorist | 테러조직 | 알카에다, ISIS |
| corporate | 기업 | 도쿄전력 |
| ngo | NGO | 국경없는의사회 |

---

### 5. Person (인물) - 신상공개 범죄자만

**주의: 공식적으로 신상공개된 유죄확정자/수배자만 포함**

```json
{
  "id": "person-zodiac-killer",
  "type": "person",
  "name": "Zodiac Killer",
  "aliases": ["조디악", "The Zodiac"],
  "personType": "suspect",
  "crimes": ["serial_murder"],
  "status": "unknown",
  "nationality": "USA",
  "birthDate": null,
  "deathDate": null,
  "convictionDate": null,
  "sentence": null,
  "description": "1960년대 후반 샌프란시스코 지역 연쇄살인범",
  "publicDisclosure": {
    "date": "1969-08-01",
    "authority": "San Francisco Police Department",
    "reason": "수배"
  },
  "sources": [
    { "name": "FBI", "url": "https://..." }
  ]
}
```

#### personType (신상공개 대상만)

| 값 | 설명 | 포함 기준 |
|----|------|----------|
| convicted | 유죄확정자 | 법원 판결 확정 |
| suspect | 공개 피의자 | 공식 신상공개 |
| wanted | 수배자 | 공개 수배 |

#### 제외 대상
- 수사 중인 미공개 피의자
- 피해자
- 목격자
- 수사관/경찰

---

### 6. Equipment (장비) - 사고용

항공기, 선박, 차량 등 사고에 관련된 장비.

```json
{
  "id": "equipment-aircraft-mh370",
  "type": "equipment",
  "equipmentType": "aircraft",
  "name": "Malaysia Airlines Flight 370",
  "model": "Boeing 777-200ER",
  "manufacturer": "Boeing",
  "registration": "9M-MRO",
  "operator": "org-malaysia-airlines",
  "capacity": 239,
  "yearBuilt": 2002,
  "status": "missing"
}
```

#### equipmentType

| 값 | 설명 |
|----|------|
| aircraft | 항공기 |
| vessel | 선박 |
| vehicle | 차량 |
| train | 열차 |
| building | 건물 |
| facility | 시설 |

---

## 관계(Edge) 타입

### 관계 목록

| 관계 | From | To | 설명 |
|------|------|-----|------|
| `OCCURRED_AT` | Incident | Location | 사건 발생 장소 |
| `CAUSED_BY` | Incident | Phenomenon | 자연현상이 사건 유발 |
| `TRIGGERED` | Phenomenon/Incident | Incident | 연쇄 사건 |
| `RELATED_TO` | Incident | Incident | 연관 사건 |
| `PERPETRATOR_OF` | Person | Incident | 범인-사건 연결 |
| `RESPONDED_TO` | Organization | Incident | 대응 기관 |
| `OPERATED_BY` | Equipment | Organization | 장비 운영 주체 |
| `MEMBER_OF` | Person | Organization | 소속 |
| `LOCATED_IN` | Location | Location | 위치 포함관계 |
| `AFFECTED` | Incident | Location | 피해 지역 |

### Edge 스키마

```json
{
  "id": "edge-001",
  "source": "incident-earthquake-2011-001",
  "target": "incident-tsunami-2011-001",
  "relationType": "TRIGGERED",
  "role": "cause",
  "confidence": 1.0,
  "description": "M9.0 지진으로 대형 쓰나미 발생",
  "startDate": "2011-03-11",
  "source": "USGS"
}
```

---

## 파일 구조

```
data/
├── output/
│   ├── index.json              # 전체 인덱스 (탐색/검색용 경량 데이터)
│   ├── relations.json          # 모든 관계 데이터
│   ├── incidents/              # 개별 사건 파일
│   │   ├── incident-earthquake-2011-001.json
│   │   ├── incident-tsunami-2011-001.json
│   │   └── ...
│   ├── locations/              # 개별 위치 파일
│   │   ├── location-japan-tohoku.json
│   │   └── ...
│   └── persons/                # 개별 인물 파일
│       ├── person-zodiac-killer.json
│       └── ...
├── sources/                     # 소스별 원본 데이터
│   ├── usgs_earthquakes.json
│   ├── noaa_tsunamis.json
│   ├── noaa_volcanoes.json
│   ├── fema_disasters.json
│   ├── nifc_wildfires.json
│   └── coldcases_crimes.json
└── entities/                    # 정규화된 엔티티 (Phase 2+)
    ├── locations.json
    ├── phenomena.json
    ├── organizations.json
    └── persons.json
```

---

## 인덱스 파일 (index.json)

탐색/검색을 위한 경량 인덱스. 지도 마커와 목록 표시에 필요한 최소 정보만 포함.

```json
{
  "version": "2.0",
  "generated_at": "2024-11-27T12:00:00Z",
  "stats": {
    "total_incidents": 50000,
    "total_relations": 5000,
    "total_locations": 1000,
    "total_persons": 100,
    "categories": {
      "disaster": 45000,
      "crime": 3000,
      "accident": 1500,
      "mystery": 500
    }
  },
  "incidents": [
    {
      "id": "incident-earthquake-2011-001",
      "title": "2011 동일본 대지진",
      "category": "disaster",
      "subCategory": "earthquake",
      "date": "2011-03-11",
      "coordinates": { "lat": 38.322, "lng": 142.369 },
      "severity": "catastrophic"
    }
  ],
  "locations": [
    {
      "id": "location-japan-tohoku",
      "name": "Tohoku Region",
      "coordinates": { "lat": 39.0, "lng": 140.0 },
      "incident_count": 5
    }
  ],
  "persons": [
    {
      "id": "person-zodiac-killer",
      "name": "Zodiac Killer",
      "personType": "suspect",
      "incident_count": 7
    }
  ]
}
```

---

## 관계 파일 (relations.json)

모든 엔티티 간의 관계 데이터.

```json
{
  "version": "2.0",
  "generated_at": "2024-11-27T12:00:00Z",
  "total": 5000,
  "edges": [
    {
      "id": "edge-001",
      "source": "incident-earthquake-2011-001",
      "target": "location-japan-tohoku",
      "relationType": "OCCURRED_AT",
      "confidence": 0.9
    },
    {
      "id": "edge-002",
      "source": "incident-earthquake-2011-001",
      "target": "incident-tsunami-2011-001",
      "relationType": "TRIGGERED",
      "confidence": 1.0
    }
  ]
}
```

---

## 개별 사건 파일 (incidents/{id}.json)

```json
{
  "id": "incident-earthquake-2011-001",
  "type": "incident",
  "title": "2011 동일본 대지진",
  "category": "disaster",
  "subCategory": "earthquake",
  "era": "contemporary",
  "date": "2011-03-11",
  "endDate": "2011-03-11",
  "location": "Tohoku, Japan",
  "coordinates": { "lat": 38.322, "lng": 142.369 },
  "summary": "M9.0 규모의 대지진으로 쓰나미와 후쿠시마 원전 사고 유발",
  "description": "## 사건 개요\n\n...",
  "severity": "catastrophic",
  "status": "resolved",
  "tags": ["지진", "쓰나미", "원전사고", "일본"],
  "casualties": {
    "deaths": 15899,
    "injuries": 6157,
    "missing": 2526
  },
  "sources": [
    { "name": "USGS", "url": "https://..." }
  ],
  "relations": [
    { "type": "OCCURRED_AT", "target": "location-japan-tohoku" },
    { "type": "TRIGGERED", "target": "incident-tsunami-2011-001" }
  ]
}
```

---

## ID 체계

```
{type}-{subtype}-{year}-{sequence}

예시:
- incident-earthquake-2011-001
- incident-tsunami-2011-001
- location-japan-tohoku
- phenomenon-earthquake-2011-tohoku
- org-fema
- person-zodiac-killer
- equipment-aircraft-mh370
```

---

## 데이터소스별 엔티티 매핑

| 소스 | Incident | Location | Phenomenon | Organization | Person | Equipment |
|------|:--------:|:--------:|:----------:|:------------:|:------:|:---------:|
| USGS | ✓ | ✓ | ✓ | - | - | - |
| NOAA Tsunami | ✓ | ✓ | ✓ | - | - | - |
| NOAA Volcano | ✓ | ✓ | ✓ | - | - | - |
| NIFC Wildfire | ✓ | ✓ | - | ✓ | - | - |
| FEMA | ✓ | ✓ | ✓ | ✓ | - | - |
| Cold Cases | ✓ | ✓ | - | - | ✓ | - |
| NTSB | ✓ | ✓ | - | ✓ | ✓ | ✓ |

---

## 구현 로드맵

| Phase | 엔티티 | 설명 |
|-------|--------|------|
| **1 (완료)** | Incident | 사건 수집 및 기본 관계 |
| **2** | Location | 위치 정규화 및 계층 구조 |
| **3** | Phenomenon | 자연현상 추출 (지진/화산/태풍) |
| **4** | Organization | 기관/단체 정규화 |
| **5** | Person, Equipment | 범죄자/장비 (해당 데이터에만) |

---

## 로딩 전략

```
1. 앱 시작
   └─ fetch: index.json (경량 인덱스만)
   └─ 지도 마커 렌더링 (coordinates 사용)
   └─ 목록 표시 (title, category, date)

2. 사건 클릭 (탐색)
   └─ fetch: incidents/{id}.json (상세 정보)
   └─ 사건 상세 페이지 렌더링
   └─ 연관 관계 표시 (relations 필드)

3. 연관 엔티티 클릭
   └─ fetch: locations/{id}.json 또는 persons/{id}.json
   └─ lazy load로 필요할 때만 로드

4. 관계 그래프 보기
   └─ fetch: relations.json (전체 관계)
   └─ 그래프 시각화 렌더링

5. 필터링/검색
   └─ index.json 기반 클라이언트 사이드 필터링
   └─ category, subCategory, date range, severity

6. 캐싱
   └─ IndexedDB에 개별 파일 캐싱
   └─ index.json version 체크 후 갱신
   └─ 개별 파일은 요청 시 캐싱
```
