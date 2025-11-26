// MHive - 메인 애플리케이션 모듈

document.addEventListener('DOMContentLoaded', () => {
    // 그래프 초기화
    graph = new IncidentGraph('network');
    graph.init();

    // UI 이벤트 리스너 설정
    setupUIEventListeners();
});

function setupUIEventListeners() {
    // 검색 기능
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            graph.updateSearch(e.target.value);
        }, 300);
    });

    // 카테고리 필터
    const categoryCheckboxes = document.querySelectorAll('.filters input[value="mystery"], .filters input[value="crime"], .filters input[value="accident"], .filters input[value="unsolved"], .filters input[value="conspiracy"]');

    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateFilters();
        });
    });

    // 시대 필터
    const eraCheckboxes = document.querySelectorAll('.filters input[value="ancient"], .filters input[value="modern"], .filters input[value="contemporary"]');

    eraCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateFilters();
        });
    });

    // 줌 리셋 버튼
    document.getElementById('resetZoom').addEventListener('click', () => {
        graph.resetZoom();
    });

    // 물리 효과 토글 버튼
    const physicsBtn = document.getElementById('togglePhysics');
    physicsBtn.addEventListener('click', () => {
        const enabled = graph.togglePhysics();
        physicsBtn.textContent = enabled ? '물리 효과 끄기' : '물리 효과 켜기';
    });

    // 상세 패널 닫기
    document.getElementById('closeDetail').addEventListener('click', () => {
        document.getElementById('detailPanel').classList.remove('active');
    });

    // ESC 키로 상세 패널 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('detailPanel').classList.remove('active');
        }
    });

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + F: 검색 포커스
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }

        // R: 줌 리셋
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
            graph.resetZoom();
        }

        // P: 물리 토글
        if (e.key === 'p' && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
            const enabled = graph.togglePhysics();
            physicsBtn.textContent = enabled ? '물리 효과 끄기' : '물리 효과 켜기';
        }
    });
}

// 필터 업데이트 함수
function updateFilters() {
    const categories = [];
    const eras = [];

    // 카테고리 수집
    document.querySelectorAll('.filters input[value="mystery"], .filters input[value="crime"], .filters input[value="accident"], .filters input[value="unsolved"], .filters input[value="conspiracy"]').forEach(cb => {
        if (cb.checked) {
            categories.push(cb.value);
        }
    });

    // 시대 수집
    document.querySelectorAll('.filters input[value="ancient"], .filters input[value="modern"], .filters input[value="contemporary"]').forEach(cb => {
        if (cb.checked) {
            eras.push(cb.value);
        }
    });

    graph.updateFilters(categories, eras);
}

// 외부에서 사건 상세 보기 (페이지 링크용)
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

// 해시 변경 감지
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#incident-')) {
        const incidentId = parseInt(hash.replace('#incident-', ''));
        if (!isNaN(incidentId)) {
            showIncident(incidentId);
        }
    }
});
