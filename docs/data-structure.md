# 데이터 구조 설계

## 개요

MHive는 사건/사고 중심의 지식 그래프입니다. **그래프 탐색(Traversal)**에 최적화된 구조로, 어떤 노드에서 시작하든 연관된 정보를 자연스럽게 탐색할 수 있습니다.

### 설계 원칙

1. **양방향 탐색**: 모든 관계는 양방향으로 탐색 가능
2. **인접 리스트**: 각 노드에 연결된 엣지 목록 유지
3. **카테고리 트리**: 계층적 분류로 드릴다운 탐색 지원
4. **경량 인덱스**: 상세 정보는 별도 파일, 탐색용 데이터는 인덱스에
5. **시계열 내장**: 각 사건의 진행 과정을 Timeline으로 표현

### 그래프 구조

```
                         ┌────────────┐
                         │  Category  │
                         │  (분류트리) │
                         └─────┬──────┘
                               │ BELONGS_TO
                               ▼
┌──────────┐  OCCURRED_AT  ┌──────────┐  CAUSED_BY   ┌────────────┐
│ Location │◄──────────────│ Incident │─────────────►│ Phenomenon │
│  (위치)   │               │  (사건)   │              │ (자연현상)  │
└────┬─────┘               └────┬─────┘              └────────────┘
     │                          │
     │ LOCATED_IN          TRIGGERED / RELATED_TO
     ▼                          │
┌──────────┐                    ▼
│ Location │              ┌──────────┐
│ (상위위치) │              │ Incident │
└──────────┘              └────┬─────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌──────────┐     ┌────────────┐   ┌──────────┐
       │  Person  │     │Organization│   │Equipment │
       │(범죄자/수배)│     │  (조직)     │   │  (장비)   │
       └──────────┘     └────────────┘   └──────────┘
```

---

## 노드 타입 요약

| 타입 | 접두어 | 특성 | 예상 수량 |
|------|--------|------|----------|
| **Category** | `cat-` | 정적, 트리 구조 | ~50 |
| **Incident** | `inc-` | 동적, 대량 | ~300,000 |
| **Person** | `per-` | 동적 | ~3,500 |
| **Location** | `loc-` | 준정적, 트리 구조 | ~5,000 |
| **Phenomenon** | `phe-` | 동적 | ~1,000 |
| **Organization** | `org-` | 준정적 | ~500 |
| **Equipment** | `equ-` | 동적 | ~2,000 |

---

## 노드 타입 상세

### 1. Category (분류) - 트리 구조

사건을 계층적으로 분류. 탐색의 진입점 역할.

```typescript
interface Category {
  id: string;                    // "cat-disaster-natural-earthquake"
  type: "category";

  name: string;                  // "지진"
  nameEn: string;                // "Earthquake"

  level: 1 | 2 | 3;              // 1=대분류, 2=중분류, 3=소분류
  path: string;                  // "disaster/natural/earthquake"

  description?: string;
  icon?: string;                 // 아이콘 식별자
  color?: string;                // 테마 색상

  // 트리 탐색용
  parentId?: string;             // 상위 카테고리 ID
  childIds: string[];            // 하위 카테고리 ID 목록

  // 통계
  incidentCount: number;         // 소속 사건 수
}
```

#### 카테고리 트리

```
root
├── disaster (재난)
│   ├── natural (자연재해)
│   │   ├── earthquake (지진)
│   │   ├── tsunami (쓰나미)
│   │   ├── volcano (화산)
│   │   ├── hurricane (허리케인/태풍)
│   │   ├── tornado (토네이도)
│   │   ├── flood (홍수)
│   │   └── wildfire (산불)
│   └── manmade (인적재난)
│       ├── fire (화재)
│       ├── explosion (폭발)
│       └── collapse (붕괴)
│
├── accident (사고)
│   ├── transportation (교통)
│   │   ├── aviation (항공)
│   │   ├── maritime (해양)
│   │   ├── railway (철도)
│   │   └── road (도로)
│   └── industrial (산업)
│       ├── mining (광산)
│       ├── construction (건설)
│       └── chemical (화학)
│
├── crime (범죄)
│   ├── violent (강력범죄)
│   │   ├── murder (살인)
│   │   ├── serial (연쇄범죄)
│   │   └── shooting (총기난사)
│   ├── terrorism (테러)
│   └── wanted (수배)
│
└── mystery (미스터리)
    ├── disappearance (실종)
    ├── unexplained (미확인)
    └── coldcase (미제사건)
```

---

### 2. Incident (사건) - 핵심 노드

모든 탐색의 중심점. Timeline을 내장하여 사건의 진행 과정 표현.

```typescript
interface Incident {
  // === 식별 ===
  id: string;                    // "inc-usgs-us7000re2g"
  type: "incident";
  originalId: string;            // 소스 시스템의 원본 ID
  categoryId: string;            // 소속 카테고리 ID

  // === 기본 정보 ===
  title: string;
  summary: string;               // 200자 이내
  description: string;           // 마크다운, 3000자 이내

  // === 시간 ===
  date: string;                  // ISO 8601 (YYYY-MM-DD 또는 datetime)
  endDate?: string;              // 종료일 (장기 사건)

  // === 위치 ===
  location: string;              // 표시용 텍스트
  coordinates?: { lat: number; lng: number };

  // === 분류 ===
  severity: Severity;
  status: IncidentStatus;
  era: Era;

  // === 피해 ===
  casualties?: {
    deaths?: number;
    injuries?: number;
    missing?: number;
  };

  // === 시계열 (사건 진행) ===
  timeline: TimelineEntry[];

  // === 그래프 탐색용 (인접 리스트) ===
  edges: EdgeRef[];

  // === 메타데이터 ===
  tags: string[];
  sources: Source[];
  images?: string[];
}
```

#### Timeline (시계열)

사건의 진행 과정을 시간순으로 기록.

```typescript
interface TimelineEntry {
  id: string;                    // "tl-001"
  timestamp: string;             // ISO 8601 (2011-03-11T14:46:00+09:00)
  precision: TimePrecision;      // 시간 정밀도

  title: string;                 // "본진 발생 (M9.0)"
  description?: string;          // 상세 설명

  eventType: TimelineEventType;  // 이벤트 유형
  importance: 1 | 2 | 3;         // 1=핵심, 2=중요, 3=부가

  location?: string;             // 이벤트 발생 위치 (본 사건과 다른 경우)
  source?: string;               // 정보 출처
}

type TimePrecision = "datetime" | "date" | "month" | "year";

type TimelineEventType =
  // 공통
  | "occurred"       // 발생
  | "detected"       // 감지/발견
  | "reported"       // 보고/신고

  // 재난/사고
  | "escalated"      // 확대/악화
  | "response"       // 대응
  | "rescue"         // 구조
  | "contained"      // 진압/통제
  | "resolved"       // 종료

  // 범죄/수사
  | "investigation"  // 수사
  | "evidence"       // 증거 발견
  | "suspect"        // 용의자 지목
  | "arrest"         // 체포
  | "trial"          // 재판
  | "verdict"        // 판결

  // 미제
  | "clue"           // 단서
  | "theory"         // 가설
  | "cold"           // 미제 전환
  | "reopened";      // 재수사
```

#### severity (심각도)

| 값 | 기준 |
|----|------|
| minor | 사망 0, 경미한 피해 |
| moderate | 사망 1-10 |
| major | 사망 11-100 |
| catastrophic | 사망 100+ 또는 대규모 피해 |

#### status (상태)

| 값 | 설명 |
|----|------|
| ongoing | 진행 중 |
| resolved | 종결 |
| cold | 미제 |
| unknown | 불명 |

#### era (시대)

| 값 | 범위 |
|----|------|
| ancient | ~ 500 AD |
| medieval | 500 ~ 1500 |
| earlyModern | 1500 ~ 1800 |
| modern | 1800 ~ 1945 |
| contemporary | 1945 ~ |

---

### 3. Person (인물)

**포함 대상**: 공식적으로 신상공개된 유죄확정자, 수배자, 연쇄범죄자

```typescript
interface Person {
  // === 식별 ===
  id: string;                    // "per-fbi-xxx"
  type: "person";
  originalId: string;

  // === 신원 ===
  name: string;
  aliases: string[];
  nationality?: string;
  birthDate?: string;
  deathDate?: string;

  // === 분류 ===
  personType: PersonType;
  crimes: string[];

  // === 상태 ===
  status: PersonStatus;

  // === 신상공개 근거 ===
  publicDisclosure?: {
    date: string;
    authority: string;           // "FBI", "Europol"
    reason: string;              // "수배", "유죄판결"
  };

  // === 신체 정보 (수배용) ===
  physical?: {
    gender?: string;
    hair?: string;
    eyes?: string;
    height?: string;
    weight?: string;
    scars_and_marks?: string;
  };

  // === 그래프 탐색용 ===
  edges: EdgeRef[];

  // === 메타데이터 ===
  description?: string;
  sources: Source[];
  images?: string[];
}

type PersonType = "convicted" | "suspect" | "wanted";
type PersonStatus = "at_large" | "captured" | "deceased" | "unknown";
```

---

### 4. Location (위치)

위치의 계층 구조 표현. 국가 → 지역 → 도시.

```typescript
interface Location {
  // === 식별 ===
  id: string;                    // "loc-jp-tohoku"
  type: "location";

  // === 정보 ===
  name: string;
  nameLocal?: string;            // 현지어 표기
  locationType: LocationType;

  // === 행정구역 ===
  country?: string;
  countryCode?: string;          // ISO 3166-1 alpha-2
  state?: string;
  city?: string;

  // === 좌표 ===
  coordinates?: { lat: number; lng: number };
  boundingBox?: {
    minLat: number; maxLat: number;
    minLng: number; maxLng: number;
  };

  // === 특성 ===
  population?: number;
  riskZones?: string[];          // ["earthquake", "tsunami"]

  // === 트리 탐색용 ===
  parentId?: string;             // 상위 위치 ID
  childIds?: string[];           // 하위 위치 ID 목록

  // === 그래프 탐색용 ===
  edges: EdgeRef[];
}

type LocationType =
  | "country" | "state" | "city" | "region"
  | "ocean" | "airport" | "building";
```

---

### 5. Phenomenon (자연현상)

지진, 화산, 태풍 등 사건의 원인이 되는 자연현상.

```typescript
interface Phenomenon {
  // === 식별 ===
  id: string;                    // "phe-earthquake-2011-tohoku"
  type: "phenomenon";

  // === 정보 ===
  phenomenonType: PhenomenonType;
  name: string;
  nameLocal?: string;

  // === 발생 정보 ===
  date: string;
  duration?: string;
  epicenter?: { lat: number; lng: number };

  // === 규모 ===
  magnitude?: number;
  scale?: string;                // "M9.0", "Category 5", "VEI 6"
  depth?: number;                // km (지진)
  affectedAreaKm2?: number;

  // === 그래프 탐색용 ===
  edges: EdgeRef[];
}

type PhenomenonType =
  | "earthquake" | "tsunami" | "eruption"
  | "hurricane" | "tornado" | "flood";
```

---

### 6. Organization (조직)

정부기관, 범죄조직, 테러단체, 기업 등.

```typescript
interface Organization {
  // === 식별 ===
  id: string;                    // "org-fema"
  type: "organization";

  // === 정보 ===
  name: string;
  nameShort?: string;            // "FEMA"
  orgType: OrgType;

  // === 활동 범위 ===
  country?: string;
  jurisdiction?: string;

  // === 상태 ===
  foundedDate?: string;
  dissolvedDate?: string;
  isActive: boolean;

  // === 그래프 탐색용 ===
  edges: EdgeRef[];

  // === 메타데이터 ===
  description?: string;
  website?: string;
}

type OrgType =
  | "government" | "emergency" | "terrorist"
  | "criminal" | "corporate" | "ngo";
```

---

### 7. Equipment (장비)

항공기, 선박, 열차 등 사고에 관련된 장비.

```typescript
interface Equipment {
  // === 식별 ===
  id: string;                    // "equ-aircraft-mh370"
  type: "equipment";

  // === 정보 ===
  equipmentType: EquipmentType;
  name: string;
  model?: string;
  manufacturer?: string;

  // === 등록 정보 ===
  registration?: string;
  operator?: string;             // Organization ID

  // === 스펙 ===
  capacity?: number;
  yearBuilt?: number;

  // === 상태 ===
  status: EquipmentStatus;

  // === 그래프 탐색용 ===
  edges: EdgeRef[];
}

type EquipmentType = "aircraft" | "vessel" | "train" | "vehicle";
type EquipmentStatus = "active" | "destroyed" | "missing" | "decommissioned";
```

---

## 엣지 (관계)

### 엣지 구조

```typescript
interface Edge {
  id: string;                    // "edg-001"
  relationType: RelationType;
  source: string;                // 소스 노드 ID
  target: string;                // 타겟 노드 ID
  sourceType: NodeType;          // 소스 노드 타입
  targetType: NodeType;          // 타겟 노드 타입

  // === 관계 속성 ===
  role?: string;                 // 세부 역할
  confidence: number;            // 0.0 ~ 1.0
  description?: string;

  // === 시간 속성 ===
  startDate?: string;
  endDate?: string;
}
```

### 노드 내 엣지 참조 (인접 리스트)

```typescript
interface EdgeRef {
  edgeId: string;                // Edge ID
  targetId: string;              // 연결된 노드 ID
  targetType: NodeType;          // 연결된 노드 타입
  relationType: RelationType;    // 관계 유형
  direction: "outgoing" | "incoming";
}
```

### 관계 유형

```typescript
type RelationType =
  // === Incident ↔ Category ===
  | "BELONGS_TO"         // 분류 소속

  // === Incident ↔ Incident ===
  | "TRIGGERED"          // A가 B를 유발 (지진→쓰나미)
  | "RELATED_TO"         // 연관 사건 (같은 시기/장소)
  | "SAME_SERIES"        // 동일 연쇄 사건 (연쇄살인)
  | "FOLLOWUP"           // 후속 사건 (여진, 2차 피해)
  | "DUPLICATE"          // 동일 사건 (중복 데이터)

  // === Incident ↔ Location ===
  | "OCCURRED_AT"        // 발생 위치
  | "AFFECTED"           // 피해 지역

  // === Incident ↔ Phenomenon ===
  | "CAUSED_BY"          // 원인 현상

  // === Incident ↔ Person ===
  | "PERPETRATED_BY"     // 범행 주체
  | "VICTIM"             // 피해자
  | "WITNESS"            // 목격자
  | "INVESTIGATOR"       // 수사관

  // === Incident ↔ Organization ===
  | "COMMITTED_BY"       // 범행 조직 (테러)
  | "RESPONDED_BY"       // 대응 기관
  | "OPERATED_BY"        // 운영 주체

  // === Incident ↔ Equipment ===
  | "INVOLVED"           // 관련 장비

  // === Person ↔ Person ===
  | "ALIAS_OF"           // 동일인
  | "ASSOCIATED"         // 연관 (공범)
  | "FAMILY"             // 가족

  // === Person ↔ Organization ===
  | "MEMBER_OF"          // 소속
  | "LEADER_OF"          // 지도자

  // === Location ↔ Location ===
  | "LOCATED_IN"         // 포함 (도시→국가)
  | "ADJACENT"           // 인접

  // === Category ↔ Category ===
  | "PARENT_OF";         // 상위 분류
```

---

## 파일 구조

```
data/
├── schema/                      # 스키마 정의 (정적)
│   ├── categories.json          # 전체 카테고리 트리
│   ├── relations.json           # 관계 타입 정의 및 LLM 분류 기준
│   ├── node-types.json          # 노드 타입 스키마 및 필드 정의
│   ├── timeline-events.json     # 타임라인 이벤트 타입 정의
│   └── enums.json               # 열거형 값 정의
│
├── graph/                       # 그래프 메타데이터
│   ├── index.json               # 경량 인덱스 (지도/목록용)
│   ├── edges.json               # 전체 엣지 (또는 분할)
│   └── stats.json               # 통계
│
├── nodes/                       # 개별 노드 파일
│   ├── incidents/
│   │   ├── by-category/         # 카테고리별 분할
│   │   │   ├── disaster/
│   │   │   │   ├── natural/
│   │   │   │   │   ├── earthquake/
│   │   │   │   │   │   ├── inc-usgs-xxx.json
│   │   │   │   │   │   └── ...
│   │   │   │   │   └── tsunami/
│   │   │   │   └── manmade/
│   │   │   ├── accident/
│   │   │   ├── crime/
│   │   │   └── mystery/
│   │   └── _index.json          # incident ID → 경로 매핑
│   │
│   ├── persons/
│   │   ├── per-fbi-xxx.json
│   │   └── ...
│   │
│   ├── locations/
│   │   ├── countries/           # 국가별 그룹핑
│   │   │   ├── jp/
│   │   │   │   ├── loc-jp.json
│   │   │   │   └── loc-jp-tohoku.json
│   │   │   └── us/
│   │   └── _index.json
│   │
│   ├── phenomena/
│   │   └── ...
│   │
│   ├── organizations/
│   │   └── ...
│   │
│   └── equipment/
│       └── ...
│
├── indexes/                     # 조회용 인덱스
│   ├── by-date.json             # 연도별 incident ID
│   ├── by-location.json         # 지역별 incident ID
│   ├── by-severity.json         # 심각도별
│   └── search.json              # 검색용 (제목, 태그)
│
└── sources/                     # 원본 데이터 (수집기 출력)
    ├── usgs_earthquakes.json
    ├── fbi_wanted.json
    └── ...
```

---

## 주요 파일 포맷

### schema/categories.json

```json
{
  "version": "1.0",
  "root": {
    "id": "cat-root",
    "children": ["cat-disaster", "cat-accident", "cat-crime", "cat-mystery"]
  },
  "nodes": {
    "cat-disaster": {
      "id": "cat-disaster",
      "name": "재난",
      "nameEn": "Disaster",
      "level": 1,
      "path": "disaster",
      "parentId": "cat-root",
      "childIds": ["cat-disaster-natural", "cat-disaster-manmade"],
      "icon": "flame",
      "color": "#e63946",
      "incidentCount": 50000
    },
    "cat-disaster-natural-earthquake": {
      "id": "cat-disaster-natural-earthquake",
      "name": "지진",
      "nameEn": "Earthquake",
      "level": 3,
      "path": "disaster/natural/earthquake",
      "parentId": "cat-disaster-natural",
      "childIds": [],
      "icon": "activity",
      "color": "#9d4edd",
      "incidentCount": 38679
    }
  }
}
```

### graph/index.json

탐색/검색을 위한 경량 인덱스.

```json
{
  "version": "3.0",
  "generatedAt": "2024-11-28T12:00:00Z",

  "stats": {
    "nodes": {
      "category": 50,
      "incident": 250000,
      "person": 3500,
      "location": 5000,
      "phenomenon": 1000,
      "organization": 500,
      "equipment": 2000
    },
    "edges": 500000
  },

  "incidents": [
    {
      "id": "inc-usgs-xxx",
      "title": "2011 동일본 대지진",
      "categoryId": "cat-disaster-natural-earthquake",
      "date": "2011-03-11",
      "coordinates": [38.322, 142.369],
      "severity": "catastrophic",
      "edgeCount": 15,
      "path": "disaster/natural/earthquake"
    }
  ],

  "persons": [
    {
      "id": "per-zodiac-killer",
      "name": "Zodiac Killer",
      "personType": "suspect",
      "status": "unknown",
      "edgeCount": 7
    }
  ],

  "locations": [
    {
      "id": "loc-jp",
      "name": "Japan",
      "locationType": "country",
      "coordinates": [36.2048, 138.2529],
      "edgeCount": 5000
    }
  ]
}
```

### nodes/incidents/_index.json

ID → 파일 경로 매핑.

```json
{
  "inc-usgs-us7000re2g": "disaster/natural/earthquake/inc-usgs-us7000re2g.json",
  "inc-gtd-201712290031": "crime/terrorism/inc-gtd-201712290031.json",
  "inc-ntsb-20251030201939": "accident/transportation/aviation/inc-ntsb-20251030201939.json"
}
```

### 개별 Incident 파일 예시

`nodes/incidents/by-category/disaster/natural/earthquake/inc-usgs-xxx.json`:

```json
{
  "id": "inc-usgs-xxx",
  "type": "incident",
  "originalId": "usgs-us7000re2g",
  "categoryId": "cat-disaster-natural-earthquake",

  "title": "2011 동일본 대지진",
  "summary": "M9.0 규모의 대지진으로 쓰나미와 후쿠시마 원전 사고 유발",
  "description": "## 개요\n\n2011년 3월 11일...",

  "date": "2011-03-11T14:46:00+09:00",
  "endDate": "2011-03-11",
  "location": "Tohoku, Japan",
  "coordinates": { "lat": 38.322, "lng": 142.369 },

  "severity": "catastrophic",
  "status": "resolved",
  "era": "contemporary",

  "casualties": {
    "deaths": 15899,
    "injuries": 6157,
    "missing": 2526
  },

  "timeline": [
    {
      "id": "tl-001",
      "timestamp": "2011-03-11T14:46:00+09:00",
      "precision": "datetime",
      "eventType": "occurred",
      "importance": 1,
      "title": "본진 발생 (M9.0)",
      "description": "산리쿠 해역에서 규모 9.0 지진 발생"
    },
    {
      "id": "tl-002",
      "timestamp": "2011-03-11T14:49:00+09:00",
      "precision": "datetime",
      "eventType": "response",
      "importance": 1,
      "title": "쓰나미 경보 발령",
      "source": "JMA"
    },
    {
      "id": "tl-003",
      "timestamp": "2011-03-11T15:27:00+09:00",
      "precision": "datetime",
      "eventType": "escalated",
      "importance": 1,
      "title": "쓰나미 제1파 도달"
    },
    {
      "id": "tl-004",
      "timestamp": "2011-03-11T15:35:00+09:00",
      "precision": "datetime",
      "eventType": "escalated",
      "importance": 1,
      "title": "후쿠시마 제1원전 전원 상실"
    },
    {
      "id": "tl-005",
      "timestamp": "2011-03-11T19:03:00+09:00",
      "precision": "datetime",
      "eventType": "response",
      "importance": 2,
      "title": "원자력 긴급사태 선언"
    }
  ],

  "edges": [
    {
      "edgeId": "edg-001",
      "targetId": "cat-disaster-natural-earthquake",
      "targetType": "category",
      "relationType": "BELONGS_TO",
      "direction": "outgoing"
    },
    {
      "edgeId": "edg-002",
      "targetId": "inc-tsunami-2011-tohoku",
      "targetType": "incident",
      "relationType": "TRIGGERED",
      "direction": "outgoing"
    },
    {
      "edgeId": "edg-003",
      "targetId": "loc-jp-tohoku",
      "targetType": "location",
      "relationType": "OCCURRED_AT",
      "direction": "outgoing"
    },
    {
      "edgeId": "edg-004",
      "targetId": "phe-earthquake-2011-tohoku",
      "targetType": "phenomenon",
      "relationType": "CAUSED_BY",
      "direction": "outgoing"
    }
  ],

  "tags": ["지진", "쓰나미", "원전사고", "일본", "M9.0"],
  "sources": [
    {
      "name": "USGS",
      "url": "https://earthquake.usgs.gov/earthquakes/eventpage/official20110311054624120_30"
    }
  ],
  "images": []
}
```

---

## 그래프 탐색 패턴

### 1. 카테고리 드릴다운

```typescript
// 카테고리 트리 탐색
const categories = await fetch('/data/schema/categories.json');
const disasters = categories.nodes['cat-disaster'];
const earthquakes = categories.nodes['cat-disaster-natural-earthquake'];

// 해당 카테고리의 사건 목록
const index = await fetch('/data/graph/index.json');
const earthquakeIncidents = index.incidents
  .filter(i => i.categoryId === 'cat-disaster-natural-earthquake');
```

### 2. 단일 노드 조회

```typescript
// 경로 조회
const pathIndex = await fetch('/data/nodes/incidents/_index.json');
const filePath = pathIndex['inc-usgs-xxx'];
// → "disaster/natural/earthquake/inc-usgs-xxx.json"

// 노드 로드
const incident = await fetch(`/data/nodes/incidents/by-category/${filePath}`);
```

### 3. 이웃 탐색 (1-hop)

```typescript
const incident = await fetchIncident('inc-usgs-xxx');
const neighbors = incident.edges.map(e => ({
  type: e.targetType,
  id: e.targetId,
  relation: e.relationType,
  direction: e.direction
}));

// 특정 타입만 필터
const relatedIncidents = incident.edges
  .filter(e => e.targetType === 'incident')
  .filter(e => ['TRIGGERED', 'RELATED_TO'].includes(e.relationType));
```

### 4. 경로 탐색 (N-hop BFS)

```typescript
async function traverse(startId: string, maxDepth: number) {
  const visited = new Set([startId]);
  const queue = [{ id: startId, depth: 0 }];
  const result = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    const node = await fetchNode(id);
    result.push(node);

    for (const edge of node.edges) {
      if (!visited.has(edge.targetId)) {
        visited.add(edge.targetId);
        queue.push({ id: edge.targetId, depth: depth + 1 });
      }
    }
  }
  return result;
}
```

### 5. 타임라인 조회

```typescript
const incident = await fetchIncident('inc-usgs-xxx');

// 중요 이벤트만
const keyEvents = incident.timeline
  .filter(t => t.importance === 1)
  .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

// 특정 유형만
const responses = incident.timeline
  .filter(t => ['response', 'rescue', 'contained'].includes(t.eventType));
```

---

## 로딩 전략

```
1. 앱 시작
   ├─ fetch: schema/categories.json (카테고리 트리)
   ├─ fetch: graph/index.json (경량 인덱스)
   └─ 지도/목록 렌더링

2. 카테고리 탐색
   └─ categories.json의 트리 구조로 드릴다운
   └─ index.json에서 해당 카테고리 incident 필터링

3. 노드 상세 조회
   ├─ nodes/{type}/_index.json에서 경로 조회
   └─ 해당 경로의 JSON 파일 fetch

4. 그래프 탐색
   └─ 노드의 edges 배열로 연결 노드 탐색
   └─ 필요한 노드만 lazy load

5. 필터링/검색
   └─ indexes/by-*.json 사용
   └─ 클라이언트 사이드 필터링

6. 캐싱
   └─ IndexedDB에 노드 파일 캐싱
   └─ index.json version 체크 후 갱신
```

---

## 데이터소스별 노드 매핑

| 소스 | 데이터 수 | Incident | Person | Location | Phenomenon | Organization | Equipment |
|------|---------|:--------:|:------:|:--------:|:----------:|:------------:|:---------:|
| USGS 지진 | 38,679 | ✓ | - | ✓ | ✓ | - | - |
| NOAA 쓰나미 | 178 | ✓ | - | ✓ | ✓ | - | - |
| NOAA 화산 | ? | ✓ | - | ✓ | ✓ | - | - |
| FEMA | ? | ✓ | - | ✓ | ✓ | ✓ | - |
| GDACS | ? | ✓ | - | ✓ | ✓ | - | - |
| NIFC 산불 | ? | ✓ | - | ✓ | - | - | - |
| GTD 테러 | 115,562 | ✓ | ✓ | ✓ | - | ✓ | - |
| FBI 수배 | 410 | - | ✓ | - | - | - | - |
| Europol/OpenSanctions | 2,687 | - | ✓ | - | - | - | - |
| Serial Killers | 305 | ✓ | ✓ | ✓ | - | - | - |
| Murder Accountability | ? | ✓ | - | ✓ | - | - | - |
| Gun Violence | ? | ✓ | - | ✓ | - | - | - |
| NTSB 항공 | 29,773 | ✓ | - | ✓ | - | ✓ | ✓ |
| FRA 철도 | 50,000 | ✓ | - | ✓ | - | ✓ | ✓ |
| MSHA 광산 | ? | ✓ | - | ✓ | - | - | - |
| Shipwrecks | 109 | ✓ | - | ✓ | - | - | ✓ |

---

## ID 체계

```
{type_prefix}-{source}-{identifier}

타입 접두어:
- cat: Category
- inc: Incident
- per: Person
- loc: Location
- phe: Phenomenon
- org: Organization
- equ: Equipment
- edg: Edge

예시:
- cat-disaster-natural-earthquake   (카테고리)
- inc-usgs-us7000re2g               (USGS 지진)
- inc-gtd-201712290031              (GTD 테러)
- per-fbi-5126982a11c6              (FBI 수배자)
- per-sk-zodiac-killer              (연쇄살인범)
- loc-jp                            (일본)
- loc-jp-tohoku                     (도호쿠)
- phe-earthquake-2011-tohoku        (동일본 지진)
- org-fema                          (FEMA)
- org-terrorist-isis                (테러조직)
- equ-aircraft-mh370                (항공기)
```

---

## 구현 로드맵

| Phase | 내용 | 노드 타입 |
|-------|------|----------|
| **1 (완료)** | 기본 Incident 수집 | Incident |
| **2 (진행중)** | 카테고리 트리, Timeline 구조 적용 | Category, Incident |
| **3** | 관계 추출 및 Edge 생성 | Edge |
| **4** | Person 엔티티 추출 (범죄자/수배자) | Person |
| **5** | Location 정규화 및 계층 구조 | Location |
| **6** | Phenomenon 추출 (지진/화산/태풍) | Phenomenon |
| **7** | Organization, Equipment 추가 | Organization, Equipment |
