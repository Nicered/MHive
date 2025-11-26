// MHive - 그래프 시각화 모듈

class IncidentGraph {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.physicsEnabled = true;
        this.selectedFilters = {
            categories: ['mystery', 'crime', 'accident', 'unsolved', 'conspiracy'],
            eras: ['ancient', 'modern', 'contemporary']
        };
        this.searchQuery = '';
    }

    // 그래프 초기화
    init() {
        this.createDataSets();
        this.createNetwork();
        this.setupEventListeners();
        this.updateStats();
    }

    // 데이터셋 생성
    createDataSets() {
        const filteredIncidents = this.getFilteredIncidents();
        const filteredIds = new Set(filteredIncidents.map(i => i.id));

        // 노드 생성
        const nodesArray = filteredIncidents.map(incident => ({
            id: incident.id,
            label: this.truncateLabel(incident.title),
            title: this.createTooltip(incident),
            color: {
                background: categoryColors[incident.category],
                border: this.lightenColor(categoryColors[incident.category], 20),
                highlight: {
                    background: this.lightenColor(categoryColors[incident.category], 30),
                    border: '#ffffff'
                },
                hover: {
                    background: this.lightenColor(categoryColors[incident.category], 20),
                    border: '#ffffff'
                }
            },
            font: {
                color: '#ffffff',
                size: 14,
                face: 'Noto Sans KR, sans-serif'
            },
            size: this.calculateNodeSize(incident),
            shape: 'dot',
            shadow: {
                enabled: true,
                color: categoryColors[incident.category],
                size: 10,
                x: 0,
                y: 0
            }
        }));

        // 엣지 생성 (필터링된 노드만 연결)
        const edgesArray = incidentsData.relations
            .filter(rel => filteredIds.has(rel.from) && filteredIds.has(rel.to))
            .map((rel, index) => ({
                id: index,
                from: rel.from,
                to: rel.to,
                label: rel.relation,
                color: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    highlight: 'rgba(255, 255, 255, 0.8)',
                    hover: 'rgba(255, 255, 255, 0.5)'
                },
                font: {
                    color: '#888',
                    size: 10,
                    strokeWidth: 0,
                    align: 'middle'
                },
                width: 1,
                smooth: {
                    type: 'continuous',
                    roundness: 0.5
                },
                arrows: {
                    to: {
                        enabled: false
                    }
                }
            }));

        this.nodes = new vis.DataSet(nodesArray);
        this.edges = new vis.DataSet(edgesArray);
    }

    // 필터링된 사건 목록 반환
    getFilteredIncidents() {
        return incidentsData.incidents.filter(incident => {
            const categoryMatch = this.selectedFilters.categories.includes(incident.category);
            const eraMatch = this.selectedFilters.eras.includes(incident.era);
            const searchMatch = this.searchQuery === '' ||
                incident.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                incident.summary.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                incident.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase()));

            return categoryMatch && eraMatch && searchMatch;
        });
    }

    // 네트워크 생성
    createNetwork() {
        const data = {
            nodes: this.nodes,
            edges: this.edges
        };

        const options = {
            physics: {
                enabled: this.physicsEnabled,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 200,
                    springConstant: 0.08,
                    damping: 0.4
                },
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    updateInterval: 25
                }
            },
            interaction: {
                hover: true,
                hoverConnectedEdges: true,
                selectConnectedEdges: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true
            },
            nodes: {
                borderWidth: 2,
                borderWidthSelected: 4
            },
            edges: {
                selectionWidth: 2,
                hoverWidth: 2
            }
        };

        this.network = new vis.Network(this.container, data, options);
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 노드 클릭 이벤트
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                this.showIncidentDetail(nodeId);
            }
        });

        // 노드 더블클릭 - 연결된 노드 하이라이트
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                this.highlightConnections(nodeId);
            }
        });

        // 배경 클릭 - 선택 해제
        this.network.on('click', (params) => {
            if (params.nodes.length === 0 && params.edges.length === 0) {
                this.resetHighlight();
            }
        });
    }

    // 사건 상세 정보 표시
    showIncidentDetail(incidentId) {
        const incident = incidentsData.incidents.find(i => i.id === incidentId);
        if (!incident) return;

        const detailPanel = document.getElementById('detailPanel');
        const detailContent = document.getElementById('detailContent');

        // 관련 사건 찾기
        const relatedIncidents = this.getRelatedIncidents(incidentId);

        detailContent.innerHTML = `
            <div class="incident-detail">
                <span class="incident-category ${incident.category}">${categoryNames[incident.category]}</span>
                <h5 class="incident-title mt-2">${incident.title}</h5>
                <div class="incident-meta mb-3">
                    <span><i class="bi bi-calendar"></i> ${this.formatDate(incident.date)}</span>
                    <span><i class="bi bi-geo-alt"></i> ${incident.location}</span>
                </div>

                <div class="incident-section">
                    <h6>개요</h6>
                    <p>${incident.summary}</p>
                </div>

                <div class="incident-section">
                    <h6>상세 설명</h6>
                    <p>${incident.description}</p>
                </div>

                <div class="incident-section">
                    <h6>타임라인</h6>
                    <div class="timeline">
                        ${incident.timeline.map(item => `
                            <div class="timeline-item">
                                <div class="timeline-date">${item.date}</div>
                                <div class="timeline-content">${item.event}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="incident-section">
                    <h6>주요 가설</h6>
                    <div>
                        ${incident.theories.map(theory => `<span class="tag">${theory}</span>`).join('')}
                    </div>
                </div>

                <div class="incident-section">
                    <h6>태그</h6>
                    <div>
                        ${incident.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                </div>

                ${relatedIncidents.length > 0 ? `
                    <div class="incident-section">
                        <h6>관련 사건</h6>
                        <ul class="related-list">
                            ${relatedIncidents.map(rel => `
                                <li onclick="graph.showIncidentDetail(${rel.incident.id}); graph.focusNode(${rel.incident.id});">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span>${rel.incident.title}</span>
                                        <span class="relation-type">${rel.relation}</span>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${incident.sources.length > 0 ? `
                    <div class="incident-section">
                        <h6>참고 자료</h6>
                        ${incident.sources.map(source => `
                            <div class="mb-2">
                                <a href="${source.url}" target="_blank" class="source-link">
                                    <i class="bi bi-link-45deg"></i> ${source.name}
                                </a>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Bootstrap Offcanvas로 열기
        const bsOffcanvas = new bootstrap.Offcanvas(detailPanel);
        bsOffcanvas.show();
    }

    // 관련 사건 찾기
    getRelatedIncidents(incidentId) {
        const related = [];

        incidentsData.relations.forEach(rel => {
            if (rel.from === incidentId) {
                const incident = incidentsData.incidents.find(i => i.id === rel.to);
                if (incident) {
                    related.push({ incident, relation: rel.relation });
                }
            } else if (rel.to === incidentId) {
                const incident = incidentsData.incidents.find(i => i.id === rel.from);
                if (incident) {
                    related.push({ incident, relation: rel.relation });
                }
            }
        });

        return related;
    }

    // 연결 하이라이트
    highlightConnections(nodeId) {
        const connectedNodes = this.network.getConnectedNodes(nodeId);
        const allNodes = this.nodes.get();
        const updates = [];

        allNodes.forEach(node => {
            if (node.id === nodeId || connectedNodes.includes(node.id)) {
                updates.push({
                    id: node.id,
                    opacity: 1
                });
            } else {
                updates.push({
                    id: node.id,
                    opacity: 0.2
                });
            }
        });

        this.nodes.update(updates);
    }

    // 하이라이트 리셋
    resetHighlight() {
        const allNodes = this.nodes.get();
        const updates = allNodes.map(node => ({
            id: node.id,
            opacity: 1
        }));
        this.nodes.update(updates);
    }

    // 특정 노드로 포커스
    focusNode(nodeId) {
        this.network.focus(nodeId, {
            scale: 1.5,
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
        this.network.selectNodes([nodeId]);
    }

    // 필터 업데이트
    updateFilters(categories, eras) {
        this.selectedFilters.categories = categories;
        this.selectedFilters.eras = eras;
        this.refresh();
    }

    // 검색 업데이트
    updateSearch(query) {
        this.searchQuery = query;
        this.refresh();
    }

    // 그래프 새로고침
    refresh() {
        this.createDataSets();
        this.network.setData({
            nodes: this.nodes,
            edges: this.edges
        });
        this.updateStats();
    }

    // 줌 리셋
    resetZoom() {
        this.network.fit({
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
    }

    // 물리 효과 토글
    togglePhysics() {
        this.physicsEnabled = !this.physicsEnabled;
        this.network.setOptions({
            physics: {
                enabled: this.physicsEnabled
            }
        });
        return this.physicsEnabled;
    }

    // 통계 업데이트
    updateStats() {
        const incidentCount = this.nodes.length;
        const connectionCount = this.edges.length;

        // 사이드바 통계
        const totalIncidents = document.getElementById('totalIncidents');
        const totalConnections = document.getElementById('totalConnections');
        if (totalIncidents) totalIncidents.textContent = incidentCount;
        if (totalConnections) totalConnections.textContent = connectionCount;

        // 네비게이션 바 통계
        const totalIncidentsNav = document.getElementById('totalIncidentsNav');
        const totalConnectionsNav = document.getElementById('totalConnectionsNav');
        if (totalIncidentsNav) totalIncidentsNav.textContent = incidentCount;
        if (totalConnectionsNav) totalConnectionsNav.textContent = connectionCount;
    }

    // 유틸리티: 라벨 자르기
    truncateLabel(text, maxLength = 15) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // 유틸리티: 툴팁 생성
    createTooltip(incident) {
        return `<div style="max-width: 250px; padding: 10px;">
            <strong>${incident.title}</strong><br>
            <small>${categoryNames[incident.category]} | ${incident.location}</small><br>
            <p style="margin-top: 5px;">${incident.summary}</p>
        </div>`;
    }

    // 유틸리티: 노드 크기 계산 (연결 수 기반)
    calculateNodeSize(incident) {
        const connections = incidentsData.relations.filter(
            r => r.from === incident.id || r.to === incident.id
        ).length;
        return 20 + (connections * 5);
    }

    // 유틸리티: 색상 밝게
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }

    // 유틸리티: 날짜 포맷
    formatDate(dateStr) {
        if (dateStr.startsWith('-')) {
            const year = Math.abs(parseInt(dateStr.split('-')[1]));
            return `BC ${year}년`;
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// 전역 그래프 인스턴스
let graph = null;
