# 데이터 구조 설계

## 개요

MHive는 사건/사고 중심의 지식 그래프입니다. 사건(Incident)을 노드로, 사건 간의 관계를 엣지로 표현합니다.

```
[Incident] ── similar ──► [Incident]
    │
    │ caused
    ▼
[Incident] ── related ──► [Incident]
```

---

## 파일 구조

```
public/data/
├── index.json              # 통합 인덱스 (목록/검색/그래프용)
├── relations.json          # 사건 간 연결 관계
└── incidents/
    ├── crime/
    │   ├── coldcase/
    │   │   └── {id}.json
    │   ├── serial/
    │   └── terrorism/
    ├── accident/
    │   ├── aviation/
    │   ├── maritime/
    │   ├── railway/
    │   └── industrial/
    ├── disaster/
    │   ├── natural/
    │   │   ├── earthquake/
    │   │   ├── tsunami/
    │   │   ├── storm/
    │   │   └── volcanic/
    │   └── manmade/
    │       ├── fire/
    │       └── collapse/
    └── mystery/
        ├── unexplained/
        ├── disappearance/
        └── conspiracy/
```

---

## index.json (가벼운 메타데이터)

초기 로딩용. 그래프 렌더링, 목록, 검색, 필터링에 필요한 최소 정보만 포함.

```json
{
  "metadata": {
    "total": 9,
    "lastUpdated": "2024-11-27T12:00:00Z",
    "version": "2.0"
  },
  "incidents": [
    {
      "id": "crime-coldcase-1986-001",
      "title": "화성 연쇄살인 사건",
      "category": "crime/coldcase",
      "era": "contemporary",
      "date": "1986-09-15",
      "endDate": "1991-04-03",
      "location": "경기도 화성시",
      "coordinates": { "lat": 37.1994, "lng": 126.8313 },
      "summary": "1986년부터 1991년까지 화성에서 발생한 10명의 여성이 피해를 입은 연쇄살인 사건. 2019년 DNA 감정으로 범인이 특정되었으나 공소시효 만료.",
      "tags": ["연쇄살인", "미제", "DNA", "한국"],
      "status": "resolved",
      "relatedIncidents": ["crime-serial-2003-001"],
      "path": "incidents/crime/coldcase/1986-001.json"
    },
    {
      "id": "disaster-natural-earthquake-2011-001",
      "title": "동일본 대지진",
      "category": "disaster/natural/earthquake",
      "era": "contemporary",
      "date": "2011-03-11",
      "location": "일본 도호쿠 지방",
      "coordinates": { "lat": 38.322, "lng": 142.369 },
      "summary": "규모 9.0의 대지진과 쓰나미로 약 2만명이 사망하고 후쿠시마 원전 사고를 유발한 일본 역사상 최대 규모의 자연재해.",
      "tags": ["지진", "쓰나미", "원전사고", "일본"],
      "status": "resolved",
      "relatedIncidents": ["disaster-manmade-fire-2011-001"],
      "path": "incidents/disaster/natural/earthquake/2011-001.json"
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 고유 식별자 (category-subcategory-year-seq) |
| title | string | O | 사건 제목 |
| category | string | O | 카테고리 경로 (crime/coldcase) |
| era | string | O | 시대 (ancient, modern, contemporary) |
| date | string | O | 발생일 (ISO 8601) |
| endDate | string | X | 종료일 (기간이 있는 경우) |
| location | string | O | 발생 장소 |
| coordinates | object | X | 좌표 { lat, lng } |
| summary | string | O | 짧은 요약 (200자 이내) |
| tags | string[] | O | 태그 목록 |
| status | string | X | 상태 (resolved, ongoing, unsolved) |
| relatedIncidents | string[] | X | 관련 사건 ID 목록 |
| path | string | O | 상세 파일 경로 |

---

## relations.json (그래프 연결 관계)

```json
{
  "relations": [
    {
      "from": "crime-coldcase-1986-001",
      "to": "crime-serial-2003-001",
      "type": "similar",
      "description": "한국의 대표적 연쇄살인 사건들"
    },
    {
      "from": "disaster-natural-earthquake-2011-001",
      "to": "disaster-manmade-fire-2011-001",
      "type": "caused",
      "description": "지진으로 인한 원전 냉각 시스템 파괴"
    },
    {
      "from": "mystery-disappearance-1945-001",
      "to": "mystery-unexplained-1964-001",
      "type": "related",
      "description": "버뮤다 삼각지대 전설의 시작"
    },
    {
      "from": "accident-aviation-2014-001",
      "to": "mystery-disappearance-1945-001",
      "type": "similar",
      "description": "원인 불명의 항공기 실종 사건"
    }
  ]
}
```

### 관계 타입

| type | 설명 |
|------|------|
| related | 관련 사건 |
| caused | 원인-결과 |
| similar | 유사 패턴 |
| same_perpetrator | 동일 범인 |
| same_location | 동일 장소 |

---

## 개별 파일 ({id}.json) - 상세 정보

노드 클릭 시 lazy loading. 무거운 정보 포함.

```json
{
  "id": "crime-serial-2003-001",
  "description": "## 사건 개요\n\n유영철 연쇄살인 사건은 2003년 9월부터 2004년 7월까지 서울에서 발생한 연쇄살인 사건이다. 범인 유영철은 총 21명을 살해하여 대한민국 역대 최다 피해자를 낸 연쇄살인범이 되었다.\n\n## 범행 패턴\n\n유영철은 주로 부유층 노인과 성매매 여성을 대상으로 범행을 저질렀다. 그는 망치와 칼 등을 사용했으며, 일부 피해자의 시신을 훼손하기도 했다.\n\n## 검거\n\n2004년 7월, 한 피해자가 탈출에 성공하여 신고함으로써 검거되었다. 재판 결과 사형이 선고되었다.",
  "timeline": [
    { "date": "2003-09-24", "event": "첫 번째 범행 (노인 부부 살해)" },
    { "date": "2003-12", "event": "추가 범행 계속" },
    { "date": "2004-03", "event": "성매매 여성 대상 범행 시작" },
    { "date": "2004-07-15", "event": "피해자 탈출로 검거" },
    { "date": "2005-06-13", "event": "사형 선고" }
  ],
  "theories": [],
  "sources": [
    {
      "name": "위키백과 - 유영철",
      "url": "https://ko.wikipedia.org/wiki/유영철",
      "fetchedAt": "2024-11-27T12:00:00Z"
    }
  ],
  "images": [],
  "casualties": {
    "deaths": 21,
    "injuries": 1,
    "missing": 0
  },
  "metadata": {
    "createdAt": "2024-11-27T12:00:00Z",
    "updatedAt": "2024-11-27T12:00:00Z",
    "sourceIds": ["wikipedia-yoo"]
  }
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | index.json과 동일한 ID |
| description | string | O | 마크다운 형식 상세 설명 |
| timeline | object[] | X | 타임라인 이벤트 배열 |
| theories | string[] | X | 이론/가설 목록 |
| sources | object[] | O | 출처 목록 (필수!) |
| images | string[] | X | 이미지 URL 목록 |
| casualties | object | X | 사상자 정보 |
| metadata | object | O | 메타데이터 (생성일, 소스ID 등) |

---

## 카테고리 체계 (MECE)

### 최상위 카테고리

| category | 한글명 | 색상 |
|----------|--------|------|
| crime | 범죄 | #e74c3c |
| accident | 사고 | #f39c12 |
| disaster | 재난 | #e67e22 |
| mystery | 미스터리 | #9b59b6 |

### 하위 카테고리

| 경로 | 설명 |
|------|------|
| crime/coldcase | 미제사건 |
| crime/serial | 연쇄범죄 |
| crime/terrorism | 테러 |
| accident/aviation | 항공사고 |
| accident/maritime | 해양사고 |
| accident/railway | 철도사고 |
| accident/industrial | 산업재해 |
| disaster/natural/earthquake | 지진 |
| disaster/natural/tsunami | 쓰나미 |
| disaster/natural/storm | 태풍/허리케인 |
| disaster/natural/volcanic | 화산 |
| disaster/manmade/fire | 화재 |
| disaster/manmade/collapse | 붕괴 |
| mystery/unexplained | 미확인 현상 |
| mystery/disappearance | 실종 |
| mystery/conspiracy | 음모론 |

---

## 시대 구분

| era | 한글명 | 기준 |
|-----|--------|------|
| ancient | 고대 | ~1800년 |
| modern | 근대 | 1800~1945년 |
| contemporary | 현대 | 1945년~ |

---

## 상태

| status | 한글명 | 설명 |
|--------|--------|------|
| resolved | 해결됨 | 사건이 종결됨 |
| ongoing | 진행중 | 수사/수습 진행 중 |
| unsolved | 미해결 | 미제 사건 |

---

## ID 체계

```
{category}-{subcategory}-{year}-{sequence}

예시:
- crime-coldcase-1986-001      (화성 연쇄살인 사건)
- crime-serial-2003-001        (유영철 연쇄살인 사건)
- disaster-natural-earthquake-2011-001  (동일본 대지진)
- disaster-manmade-fire-2011-001        (후쿠시마 원전 사고)
- accident-aviation-2014-001   (MH370 실종)
- mystery-unexplained-1964-001 (버뮤다 삼각지대)
```

---

## 로딩 전략

```
1. 앱 시작
   └─ fetch: index.json + relations.json

2. 그래프 렌더링
   └─ index.json의 incidents로 노드 생성
   └─ relations.json으로 엣지 생성

3. 노드 클릭
   └─ fetch: incidents/{category}/{id}.json
   └─ 상세 패널에 표시

4. 캐싱
   └─ localStorage에 최근 본 사건 캐싱
   └─ 7일 후 만료
```

---

## TypeScript 타입 정의

`lib/types.ts` 참조:

```typescript
// 카테고리 경로
type CategoryPath =
  | "crime/coldcase" | "crime/serial" | "crime/terrorism"
  | "accident/aviation" | "accident/maritime" | ...

// 최상위 카테고리
type TopCategory = "crime" | "accident" | "disaster" | "mystery"

// 시대
type Era = "ancient" | "modern" | "contemporary"

// 상태
type IncidentStatus = "resolved" | "ongoing" | "unsolved"

// 관계 타입
type RelationType = "related" | "caused" | "similar" | "same_perpetrator" | "same_location"

// index.json용 메타데이터
interface IncidentMeta { ... }

// 개별 파일 상세 정보
interface IncidentDetail { ... }

// 전체 (Meta + Detail 병합)
interface Incident extends IncidentMeta { ... }
```

---

## 현재 샘플 데이터

개발/테스트용 샘플 데이터 (public/data/)

### 사건 목록 (9건)

| ID | 제목 | 카테고리 | 날짜 |
|----|------|----------|------|
| crime-coldcase-1986-001 | 화성 연쇄살인 사건 | crime/coldcase | 1986-09-15 |
| crime-coldcase-1947-001 | 블랙 달리아 사건 | crime/coldcase | 1947-01-15 |
| crime-serial-2003-001 | 유영철 연쇄살인 사건 | crime/serial | 2003-09-24 |
| disaster-natural-earthquake-2011-001 | 동일본 대지진 | disaster/natural/earthquake | 2011-03-11 |
| disaster-manmade-fire-2011-001 | 후쿠시마 원전 사고 | disaster/manmade/fire | 2011-03-12 |
| accident-aviation-2014-001 | 말레이시아 항공 370편 실종 | accident/aviation | 2014-03-08 |
| accident-maritime-2014-001 | 세월호 침몰 사고 | accident/maritime | 2014-04-16 |
| mystery-disappearance-1945-001 | 버뮤다 삼각지대 비행대 실종 | mystery/disappearance | 1945-12-05 |
| mystery-unexplained-1964-001 | 버뮤다 삼각지대 | mystery/unexplained | 1964-02-01 |

### 관계 목록 (4건)

| from | to | type | 설명 |
|------|-----|------|------|
| crime-coldcase-1986-001 | crime-serial-2003-001 | similar | 한국의 대표적 연쇄살인 사건들 |
| disaster-natural-earthquake-2011-001 | disaster-manmade-fire-2011-001 | caused | 지진으로 인한 원전 냉각 시스템 파괴 |
| mystery-disappearance-1945-001 | mystery-unexplained-1964-001 | related | 버뮤다 삼각지대 전설의 시작 |
| accident-aviation-2014-001 | mystery-disappearance-1945-001 | similar | 원인 불명의 항공기 실종 사건 |
