// MHive - 메인 애플리케이션 모듈 (Bootstrap 5 버전)

document.addEventListener('DOMContentLoaded', () => {
    // 그래프 초기화
    graph = new IncidentGraph('network');
    graph.init();

    // UI 이벤트 리스너 설정
    setupUIEventListeners();
});

function setupUIEventListeners() {
    // 검색 기능 - 데스크탑 & 모바일
    const searchInputDesktop = document.getElementById('searchInputDesktop');
    const searchInputMobile = document.getElementById('searchInputMobile');
    let searchTimeout;

    const handleSearch = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            graph.updateSearch(e.target.value);
            // 두 입력창 동기화
            if (searchInputDesktop) searchInputDesktop.value = e.target.value;
            if (searchInputMobile) searchInputMobile.value = e.target.value;
        }, 300);
    };

    if (searchInputDesktop) searchInputDesktop.addEventListener('input', handleSearch);
    if (searchInputMobile) searchInputMobile.addEventListener('input', handleSearch);

    // 카테고리 필터
    const categoryIds = ['catMystery', 'catCrime', 'catAccident', 'catUnsolved', 'catConspiracy'];
    categoryIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', updateFilters);
        }
    });

    // 시대 필터
    const eraIds = ['eraAncient', 'eraModern', 'eraContemporary'];
    eraIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', updateFilters);
        }
    });

    // 줌 리셋 버튼
    const resetZoomBtn = document.getElementById('resetZoom');
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            graph.resetZoom();
        });
    }

    // 물리 효과 토글 버튼
    const physicsBtn = document.getElementById('togglePhysics');
    if (physicsBtn) {
        physicsBtn.addEventListener('click', () => {
            const enabled = graph.togglePhysics();
            physicsBtn.innerHTML = enabled
                ? '<i class="bi bi-lightning"></i> 물리 효과 끄기'
                : '<i class="bi bi-lightning-fill"></i> 물리 효과 켜기';
        });
    }

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        // ESC: 패널 닫기
        if (e.key === 'Escape') {
            const detailPanel = bootstrap.Offcanvas.getInstance(document.getElementById('detailPanel'));
            if (detailPanel) detailPanel.hide();
        }

        // Ctrl/Cmd + F: 검색 포커스
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInputDesktop) searchInputDesktop.focus();
        }
    });
}

// 필터 업데이트 함수
function updateFilters() {
    const categories = [];
    const eras = [];

    // 카테고리 수집
    const categoryMap = {
        'catMystery': 'mystery',
        'catCrime': 'crime',
        'catAccident': 'accident',
        'catUnsolved': 'unsolved',
        'catConspiracy': 'conspiracy'
    };

    Object.entries(categoryMap).forEach(([id, value]) => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            categories.push(value);
        }
    });

    // 시대 수집
    const eraMap = {
        'eraAncient': 'ancient',
        'eraModern': 'modern',
        'eraContemporary': 'contemporary'
    };

    Object.entries(eraMap).forEach(([id, value]) => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            eras.push(value);
        }
    });

    graph.updateFilters(categories, eras);
}

// 외부에서 사건 상세 보기
function showIncident(id) {
    graph.showIncidentDetail(id);
    graph.focusNode(id);
}

// URL 해시로 특정 사건 표시
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#incident-')) {
        const incidentId = parseInt(hash.replace('#incident-', ''));
        if (!isNaN(incidentId)) {
            setTimeout(() => {
                showIncident(incidentId);
            }, 500);
        }
    }
});
