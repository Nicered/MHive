# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 언어 규칙

- **모든 대화와 문서는 한글로 작성**
- **코드(변수명, 함수명, 주석 등)는 영어로 작성**

## Project Overview

MHive UI는 미제사건, 사건사고, 자연재해, 미스터리 정보를 그래프 기반으로 탐색할 수 있는 시각화 웹 애플리케이션입니다. GitHub Pages에 배포되며, Google Drive에서 데이터를 fetch합니다.

**데이터 수집/처리는 별도 레포에서 관리:** [mhive-pipeline](../mhive-pipeline/)

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드 (out/ 폴더로 static export)
npm run lint     # ESLint 검사
```

## Architecture

### Data Loading
```
[Google Drive] ──fetch──► [lib/data.ts] ──► [UI Components]
                               │
                               ▼
                    index.json (목록/그래프)
                               +
                    {id}.json (상세정보, lazy load)
```

### Directory Structure
```
mhive/
├── app/
│   └── page.tsx           # 메인 페이지 (그래프 + 상세정보)
├── components/
│   ├── incident-graph.tsx # vis-network 그래프 시각화
│   ├── incident-detail.tsx# 사건 상세 패널
│   ├── filter-sidebar.tsx # 카테고리/시대 필터
│   └── ui/                # shadcn/ui 컴포넌트
├── lib/
│   ├── data.ts            # 데이터 fetch 로직
│   ├── types.ts           # TypeScript 타입 정의
│   └── utils.ts           # 유틸리티
└── public/                # 정적 파일
```

### Data Types

**카테고리 (MECE 구조):**
- crime/ (coldcase, serial, terrorism)
- accident/ (aviation, maritime, railway, industrial)
- disaster/ (natural/, manmade/)
- mystery/ (unexplained, disappearance, conspiracy)

**시대:** ancient, modern, contemporary

## Conventions

### Documentation
모든 문서는 `docs/` 폴더에 저장

### Git Commits
형식: `[태그] 제목` + bullet 4줄 이내
Claude Code 서명 제외

### Environment Variables
- `NEXT_PUBLIC_DRIVE_DATA_URL`: Google Drive index.json URL
- `NEXT_PUBLIC_GOOGLE_API_KEY`: Google API Key (읽기용)

## Related Repository
- [mhive-pipeline](../mhive-pipeline/) - 데이터 수집/처리 파이프라인 (Python)
