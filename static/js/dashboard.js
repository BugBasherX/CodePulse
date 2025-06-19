/**
 * Dashboard JavaScript functionality for CodePulse
 * Handles interactive elements, charts, and real-time updates
 */

class Dashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = 30000; // 30 seconds
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.setupRealTimeUpdates();
        this.animateCounters();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleProjectSearch.bind(this));
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', this.handleProjectFilter.bind(this));
        });

        // Sort functionality
        const sortButtons = document.querySelectorAll('[data-sort]');
        sortButtons.forEach(button => {
            button.addEventListener('click', this.handleProjectSort.bind(this));
        });

        // Refresh button
        const refreshButton = document.getElementById('refreshDashboard');
        if (refreshButton) {
            refreshButton.addEventListener('click', this.refreshDashboard.bind(this));
        }

        // Project actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.project-quick-action')) {
                this.handleQuickAction(e);
            }
        });
    }

    handleProjectSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const projectRows = document.querySelectorAll('.project-row');

        projectRows.forEach(row => {
            const projectName = row.querySelector('.project-name')?.textContent.toLowerCase() || '';
            const projectDesc = row.querySelector('.project-description')?.textContent.toLowerCase() || '';
            
            const matches = projectName.includes(searchTerm) || projectDesc.includes(searchTerm);
            row.style.display = matches ? '' : 'none';
        });

        this.updateVisibleProjectsCount();
    }

    handleProjectFilter(event) {
        const filterType = event.target.dataset.filter;
        const projectRows = document.querySelectorAll('.project-row');

        // Remove active state from all filter buttons
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        projectRows.forEach(row => {
            let show = true;
            const coverage = parseFloat(row.dataset.coverage || 0);

            switch (filterType) {
                case 'all':
                    show = true;
                    break;
                case 'high':
                    show = coverage >= 80;
                    break;
                case 'medium':
                    show = coverage >= 60 && coverage < 80;
                    break;
                case 'low':
                    show = coverage < 60;
                    break;
                case 'no-reports':
                    show = coverage === 0;
                    break;
            }

            row.style.display = show ? '' : 'none';
        });

        this.updateVisibleProjectsCount();
    }

    handleProjectSort(event) {
        const sortBy = event.target.dataset.sort;
        const container = document.querySelector('.projects-container tbody');
        const rows = Array.from(container.querySelectorAll('.project-row'));

        // Toggle sort direction
        const currentDirection = event.target.dataset.direction || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        event.target.dataset.direction = newDirection;

        // Sort rows
        rows.sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'name':
                    aVal = a.querySelector('.project-name').textContent.trim();
                    bVal = b.querySelector('.project-name').textContent.trim();
                    break;
                case 'coverage':
                    aVal = parseFloat(a.dataset.coverage || 0);
                    bVal = parseFloat(b.dataset.coverage || 0);
                    break;
                case 'updated':
                    aVal = new Date(a.dataset.updated || 0);
                    bVal = new Date(b.dataset.updated || 0);
                    break;
                default:
                    return 0;
            }

            if (newDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Reorder DOM elements
        rows.forEach(row => container.appendChild(row));

        // Update sort indicators
        this.updateSortIndicators(sortBy, newDirection);
    }

    updateSortIndicators(activeSort, direction) {
        document.querySelectorAll('[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        const activeButton = document.querySelector(`[data-sort="${activeSort}"] i`);
        if (activeButton) {
            activeButton.className = direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }

    updateVisibleProjectsCount() {
        const visibleProjects = document.querySelectorAll('.project-row:not([style*="display: none"])').length;
        const totalProjects = document.querySelectorAll('.project-row').length;
        
        const countElement = document.getElementById('visibleProjectsCount');
        if (countElement) {
            countElement.textContent = `Showing ${visibleProjects} of ${totalProjects} projects`;
        }
    }

    initializeCharts() {
        this.initCoverageOverviewChart();
        this.initTrendChart();
        this.initCoverageDistributionChart();
    }

    initCoverageOverviewChart() {
        const ctx = document.getElementById('coverageOverviewChart');
        if (!ctx) return;

        const projectData = this.getProjectCoverageData();
        
        this.charts.coverageOverview = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent (90%+)', 'Good (80-89%)', 'Fair (60-79%)', 'Poor (<60%)', 'No Reports'],
                datasets: [{
                    data: [
                        projectData.excellent,
                        projectData.good,
                        projectData.fair,
                        projectData.poor,
                        projectData.noReports
                    ],
                    backgroundColor: [
                        '#10b981', // Excellent
                        '#22c55e', // Good
                        '#eab308', // Fair
                        '#ef4444', // Poor
                        '#6b7280'  // No Reports
                    ],
                    borderWidth: 2,
                    borderColor: '#1f2937'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#d1d5db',
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} projects (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initTrendChart() {
        const ctx = document.getElementById('coverageTrendChart');
        if (!ctx) return;

        const trendData = this.getCoverageTrendData();
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Average Coverage',
                    data: trendData.data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        grid: {
                            color: '#374151'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: '#374151'
                        },
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        borderColor: '#374151',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Coverage: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    initCoverageDistributionChart() {
        const ctx = document.getElementById('coverageDistributionChart');
        if (!ctx) return;

        const distributionData = this.getCoverageDistributionData();
        
        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: distributionData.labels,
                datasets: [{
                    label: 'Number of Files',
                    data: distributionData.data,
                    backgroundColor: [
                        '#ef4444', // 0-20%
                        '#f59e0b', // 20-40%
                        '#eab308', // 40-60%
                        '#22c55e', // 60-80%
                        '#10b981'  // 80-100%
                    ],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#374151'
                        },
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        borderColor: '#374151',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    getProjectCoverageData() {
        const projects = document.querySelectorAll('.project-row');
        let excellent = 0, good = 0, fair = 0, poor = 0, noReports = 0;

        projects.forEach(project => {
            const coverage = parseFloat(project.dataset.coverage || 0);
            
            if (coverage === 0) {
                noReports++;
            } else if (coverage >= 90) {
                excellent++;
            } else if (coverage >= 80) {
                good++;
            } else if (coverage >= 60) {
                fair++;
            } else {
                poor++;
            }
        });

        return { excellent, good, fair, poor, noReports };
    }

    getCoverageTrendData() {
        // This would typically come from the server
        // For now, we'll generate sample data based on recent reports
        const last30Days = [];
        const coverageData = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last30Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Generate sample trend data (in real app, this would come from server)
            coverageData.push(Math.random() * 30 + 65); // Random between 65-95%
        }

        return {
            labels: last30Days,
            data: coverageData
        };
    }

    getCoverageDistributionData() {
        // Sample distribution data - in real app, this would come from server
        return {
            labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
            data: [5, 12, 8, 25, 42] // Number of files in each coverage range
        };
    }

    animateCounters() {
        const counters = document.querySelectorAll('.counter');
        
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target || counter.textContent);
            const duration = 1000;
            const step = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                if (current < target) {
                    current += step;
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            // Start animation when element comes into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.unobserve(entry.target);
                    }
                });
            });

            observer.observe(counter);
        });
    }

    setupRealTimeUpdates() {
        // Setup periodic refresh of dashboard data
        setInterval(() => {
            this.refreshDashboardData();
        }, this.refreshInterval);
    }

    refreshDashboard() {
        const refreshButton = document.getElementById('refreshDashboard');
        if (refreshButton) {
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
            refreshButton.disabled = true;
        }

        // Simulate refresh delay
        setTimeout(() => {
            this.refreshDashboardData();
            
            if (refreshButton) {
                refreshButton.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh';
                refreshButton.disabled = false;
            }
        }, 1000);
    }

    refreshDashboardData() {
        // In a real application, this would fetch fresh data from the server
        // For now, we'll update the charts with new data
        if (this.charts.coverageOverview) {
            const newData = this.getProjectCoverageData();
            this.charts.coverageOverview.data.datasets[0].data = [
                newData.excellent, newData.good, newData.fair, newData.poor, newData.noReports
            ];
            this.charts.coverageOverview.update();
        }
    }

    handleQuickAction(event) {
        event.preventDefault();
        
        const action = event.target.closest('.project-quick-action').dataset.action;
        const projectId = event.target.closest('.project-row').dataset.projectId;
        
        switch (action) {
            case 'view':
                this.viewProject(projectId);
                break;
            case 'upload':
                this.uploadCoverage(projectId);
                break;
            case 'badge':
                this.copyBadgeUrl(projectId);
                break;
        }
    }

    viewProject(projectId) {
        const projectRow = document.querySelector(`[data-project-id="${projectId}"]`);
        const projectUrl = projectRow.querySelector('.project-name a').href;
        window.location.href = projectUrl;
    }

    uploadCoverage(projectId) {
        const projectRow = document.querySelector(`[data-project-id="${projectId}"]`);
        const uploadUrl = projectRow.querySelector('[data-action="upload"]').href;
        window.location.href = uploadUrl;
    }

    copyBadgeUrl(projectId) {
        const projectRow = document.querySelector(`[data-project-id="${projectId}"]`);
        const badgeUrl = projectRow.querySelector('[data-action="badge"]').href;
        
        navigator.clipboard.writeText(badgeUrl).then(() => {
            this.showToast('Badge URL copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy badge URL', 'error');
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        const container = document.getElementById('toastContainer') || document.body;
        container.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    destroy() {
        // Cleanup charts and event listeners
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
