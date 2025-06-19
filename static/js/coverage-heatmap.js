/**
 * Coverage Heatmap Visualization for CodePulse
 * Handles file coverage visualization, line-by-line coverage display, and interactive heatmaps
 */

class CoverageHeatmap {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showLineNumbers: true,
            highlightUncovered: true,
            colorScheme: 'default',
            interactiveLines: true,
            ...options
        };
        
        this.coverageData = null;
        this.currentFile = null;
        this.lineHeight = 20;
        
        this.init();
    }

    init() {
        if (!this.container) return;
        
        this.setupContainer();
        this.bindEvents();
        this.loadCoverageData();
    }

    setupContainer() {
        this.container.className += ' coverage-heatmap-container';
        this.container.innerHTML = `
            <div class="heatmap-toolbar">
                <div class="heatmap-controls">
                    <button class="btn btn-sm btn-outline-secondary" id="toggleLineNumbers">
                        <i class="fas fa-list-ol"></i> Line Numbers
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" id="toggleUncovered">
                        <i class="fas fa-eye"></i> Highlight Uncovered
                    </button>
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="colorScheme" id="colorDefault" value="default" checked>
                        <label class="btn btn-outline-secondary" for="colorDefault">Default</label>
                        
                        <input type="radio" class="btn-check" name="colorScheme" id="colorHighContrast" value="high-contrast">
                        <label class="btn btn-outline-secondary" for="colorHighContrast">High Contrast</label>
                    </div>
                </div>
                <div class="heatmap-stats">
                    <span class="coverage-stat">
                        <span class="stat-label">Coverage:</span>
                        <span class="stat-value" id="currentCoverage">0%</span>
                    </span>
                    <span class="coverage-stat">
                        <span class="stat-label">Lines:</span>
                        <span class="stat-value" id="coveredLines">0</span>/<span class="stat-value" id="totalLines">0</span>
                    </span>
                </div>
            </div>
            <div class="heatmap-content">
                <div class="file-selector">
                    <select class="form-select form-select-sm" id="fileSelector">
                        <option value="">Select a file...</option>
                    </select>
                </div>
                <div class="code-container" id="codeContainer">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Loading coverage data...
                    </div>
                </div>
            </div>
            <div class="heatmap-legend">
                <div class="legend-item">
                    <span class="legend-color covered"></span>
                    <span class="legend-label">Covered</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color uncovered"></span>
                    <span class="legend-label">Uncovered</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color partial"></span>
                    <span class="legend-label">Partial</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color not-executable"></span>
                    <span class="legend-label">Not Executable</span>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Toolbar controls
        const toggleLineNumbers = document.getElementById('toggleLineNumbers');
        const toggleUncovered = document.getElementById('toggleUncovered');
        const colorSchemeInputs = document.querySelectorAll('input[name="colorScheme"]');
        const fileSelector = document.getElementById('fileSelector');

        if (toggleLineNumbers) {
            toggleLineNumbers.addEventListener('click', () => {
                this.options.showLineNumbers = !this.options.showLineNumbers;
                toggleLineNumbers.classList.toggle('active');
                this.renderCurrentFile();
            });
        }

        if (toggleUncovered) {
            toggleUncovered.addEventListener('click', () => {
                this.options.highlightUncovered = !this.options.highlightUncovered;
                toggleUncovered.classList.toggle('active');
                this.renderCurrentFile();
            });
        }

        colorSchemeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.options.colorScheme = input.value;
                this.updateColorScheme();
                this.renderCurrentFile();
            });
        });

        if (fileSelector) {
            fileSelector.addEventListener('change', (e) => {
                this.loadFile(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        this.showSearchDialog();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.showGoToLineDialog();
                        break;
                }
            }
        });
    }

    loadCoverageData() {
        // In a real implementation, this would fetch data from the server
        // For now, we'll use sample data
        const sampleData = this.generateSampleCoverageData();
        this.setCoverageData(sampleData);
    }

    setCoverageData(data) {
        this.coverageData = data;
        this.populateFileSelector();
        
        if (data.files && data.files.length > 0) {
            this.loadFile(data.files[0].path);
        }
    }

    populateFileSelector() {
        const fileSelector = document.getElementById('fileSelector');
        if (!fileSelector || !this.coverageData) return;

        fileSelector.innerHTML = '<option value="">Select a file...</option>';
        
        this.coverageData.files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.path;
            option.textContent = file.path;
            option.dataset.coverage = file.coverage_percentage;
            fileSelector.appendChild(option);
        });
    }

    loadFile(filePath) {
        if (!filePath || !this.coverageData) return;

        const fileData = this.coverageData.files.find(f => f.path === filePath);
        if (!fileData) return;

        this.currentFile = fileData;
        this.renderFile(fileData);
        this.updateStats(fileData);
        
        // Update file selector
        const fileSelector = document.getElementById('fileSelector');
        if (fileSelector) {
            fileSelector.value = filePath;
        }
    }

    renderFile(fileData) {
        const codeContainer = document.getElementById('codeContainer');
        if (!codeContainer) return;

        codeContainer.innerHTML = '';
        
        const codeElement = document.createElement('div');
        codeElement.className = 'code-display';
        
        if (fileData.source_code) {
            this.renderSourceCode(codeElement, fileData);
        } else {
            this.renderCoverageSummary(codeElement, fileData);
        }
        
        codeContainer.appendChild(codeElement);
    }

    renderSourceCode(container, fileData) {
        const lines = fileData.source_code.split('\n');
        const lineCoverageData = fileData.line_coverage || {};
        
        const table = document.createElement('table');
        table.className = 'code-table';
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const coverage = lineCoverageData[lineNumber];
            
            const row = document.createElement('tr');
            row.className = this.getLineClassName(coverage);
            row.dataset.lineNumber = lineNumber;
            
            if (this.options.interactiveLines) {
                row.addEventListener('click', () => this.handleLineClick(lineNumber, coverage));
                row.addEventListener('mouseover', () => this.showLineTooltip(row, lineNumber, coverage));
            }
            
            // Line number column
            if (this.options.showLineNumbers) {
                const lineNumberCell = document.createElement('td');
                lineNumberCell.className = 'line-number';
                lineNumberCell.textContent = lineNumber;
                row.appendChild(lineNumberCell);
            }
            
            // Coverage indicator column
            const coverageCell = document.createElement('td');
            coverageCell.className = 'coverage-indicator';
            coverageCell.innerHTML = this.getCoverageIcon(coverage);
            row.appendChild(coverageCell);
            
            // Code content column
            const codeCell = document.createElement('td');
            codeCell.className = 'code-content';
            codeCell.innerHTML = this.highlightSyntax(line);
            row.appendChild(codeCell);
            
            table.appendChild(row);
        });
        
        container.appendChild(table);
    }

    renderCoverageSummary(container, fileData) {
        // Render coverage summary when source code is not available
        const summary = document.createElement('div');
        summary.className = 'coverage-summary';
        summary.innerHTML = `
            <div class="summary-header">
                <h6><i class="fas fa-file-code"></i> ${fileData.path}</h6>
                <div class="coverage-percentage ${this.getCoverageClass(fileData.coverage_percentage)}">
                    ${fileData.coverage_percentage.toFixed(1)}%
                </div>
            </div>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-label">Lines Covered:</span>
                    <span class="stat-value">${fileData.lines_covered}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Lines:</span>
                    <span class="stat-value">${fileData.lines_total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Uncovered Lines:</span>
                    <span class="stat-value">${fileData.lines_total - fileData.lines_covered}</span>
                </div>
            </div>
            <div class="coverage-progress">
                <div class="progress">
                    <div class="progress-bar bg-${this.getCoverageClass(fileData.coverage_percentage)}" 
                         style="width: ${fileData.coverage_percentage}%"></div>
                </div>
            </div>
        `;
        
        container.appendChild(summary);
    }

    getLineClassName(coverage) {
        if (coverage === undefined || coverage === null) {
            return 'line not-executable';
        }
        
        if (coverage === true || coverage > 0) {
            return 'line covered';
        } else if (coverage === false || coverage === 0) {
            return 'line uncovered';
        } else {
            return 'line partial';
        }
    }

    getCoverageIcon(coverage) {
        if (coverage === undefined || coverage === null) {
            return '<i class="fas fa-minus text-muted"></i>';
        }
        
        if (coverage === true || coverage > 0) {
            return '<i class="fas fa-circle text-success"></i>';
        } else if (coverage === false || coverage === 0) {
            return '<i class="fas fa-circle text-danger"></i>';
        } else {
            return '<i class="fas fa-circle text-warning"></i>';
        }
    }

    getCoverageClass(percentage) {
        if (percentage >= 90) return 'success';
        if (percentage >= 80) return 'success';
        if (percentage >= 70) return 'warning';
        if (percentage >= 60) return 'warning';
        return 'danger';
    }

    highlightSyntax(code) {
        // Basic syntax highlighting - in a real app, you'd use a proper syntax highlighter
        return code
            .replace(/\b(function|var|let|const|if|else|for|while|return|class|import|export)\b/g, '<span class="keyword">$1</span>')
            .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
            .replace(/(".*?")|('.*?')/g, '<span class="string">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    }

    handleLineClick(lineNumber, coverage) {
        console.log(`Line ${lineNumber} clicked - Coverage:`, coverage);
        
        // Show line details in a modal or sidebar
        this.showLineDetails(lineNumber, coverage);
    }

    showLineTooltip(row, lineNumber, coverage) {
        // Remove existing tooltips
        const existingTooltip = document.querySelector('.line-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'line-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>Line ${lineNumber}</strong><br>
                ${this.getTooltipContent(coverage)}
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = row.getBoundingClientRect();
        tooltip.style.left = (rect.right + 10) + 'px';
        tooltip.style.top = rect.top + 'px';
        
        // Remove tooltip on mouse leave
        row.addEventListener('mouseleave', () => {
            tooltip.remove();
        }, { once: true });
    }

    getTooltipContent(coverage) {
        if (coverage === undefined || coverage === null) {
            return 'Not executable';
        }
        
        if (coverage === true || coverage > 0) {
            if (typeof coverage === 'number') {
                return `Executed ${coverage} time${coverage === 1 ? '' : 's'}`;
            }
            return 'Covered';
        } else {
            return 'Not covered';
        }
    }

    showLineDetails(lineNumber, coverage) {
        // Implementation for showing detailed line information
        console.log('Show line details for line', lineNumber);
    }

    updateStats(fileData) {
        const currentCoverage = document.getElementById('currentCoverage');
        const coveredLines = document.getElementById('coveredLines');
        const totalLines = document.getElementById('totalLines');
        
        if (currentCoverage) {
            currentCoverage.textContent = fileData.coverage_percentage.toFixed(1) + '%';
            currentCoverage.className = 'stat-value text-' + this.getCoverageClass(fileData.coverage_percentage);
        }
        
        if (coveredLines) {
            coveredLines.textContent = fileData.lines_covered;
        }
        
        if (totalLines) {
            totalLines.textContent = fileData.lines_total;
        }
    }

    updateColorScheme() {
        const container = this.container;
        container.className = container.className.replace(/\bcolor-scheme-\w+\b/g, '');
        container.classList.add(`color-scheme-${this.options.colorScheme}`);
    }

    renderCurrentFile() {
        if (this.currentFile) {
            this.renderFile(this.currentFile);
        }
    }

    showSearchDialog() {
        // Implementation for search functionality
        const search = prompt('Search in file:');
        if (search) {
            this.searchInFile(search);
        }
    }

    showGoToLineDialog() {
        // Implementation for go-to-line functionality
        const lineNumber = prompt('Go to line:');
        if (lineNumber && !isNaN(lineNumber)) {
            this.goToLine(parseInt(lineNumber));
        }
    }

    searchInFile(searchTerm) {
        const codeLines = document.querySelectorAll('.code-content');
        let found = false;
        
        codeLines.forEach((line, index) => {
            const content = line.textContent;
            if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                line.classList.add('search-highlight');
                if (!found) {
                    line.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    found = true;
                }
            } else {
                line.classList.remove('search-highlight');
            }
        });
        
        if (!found) {
            alert('Search term not found');
        }
    }

    goToLine(lineNumber) {
        const line = document.querySelector(`[data-line-number="${lineNumber}"]`);
        if (line) {
            line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            line.classList.add('highlight-line');
            setTimeout(() => {
                line.classList.remove('highlight-line');
            }, 2000);
        } else {
            alert(`Line ${lineNumber} not found`);
        }
    }

    generateSampleCoverageData() {
        // Sample data for demonstration
        return {
            overall: {
                coverage_percentage: 85.7,
                lines_covered: 342,
                lines_total: 399
            },
            files: [
                {
                    path: 'src/main.js',
                    coverage_percentage: 92.3,
                    lines_covered: 120,
                    lines_total: 130,
                    line_coverage: this.generateSampleLineCoverage(130),
                    source_code: this.generateSampleSourceCode()
                },
                {
                    path: 'src/utils.js',
                    coverage_percentage: 78.5,
                    lines_covered: 89,
                    lines_total: 113,
                    line_coverage: this.generateSampleLineCoverage(113)
                },
                {
                    path: 'src/config.js',
                    coverage_percentage: 95.0,
                    lines_covered: 38,
                    lines_total: 40,
                    line_coverage: this.generateSampleLineCoverage(40)
                }
            ]
        };
    }

    generateSampleLineCoverage(totalLines) {
        const coverage = {};
        for (let i = 1; i <= totalLines; i++) {
            // Randomly assign coverage - 80% covered, 15% uncovered, 5% not executable
            const rand = Math.random();
            if (rand < 0.8) {
                coverage[i] = Math.floor(Math.random() * 10) + 1; // 1-10 executions
            } else if (rand < 0.95) {
                coverage[i] = 0; // Uncovered
            }
            // else: not executable (undefined)
        }
        return coverage;
    }

    generateSampleSourceCode() {
        return `// Sample JavaScript file
function calculateCoverage(data) {
    if (!data) {
        return 0;
    }
    
    const total = data.lines_total;
    const covered = data.lines_covered;
    
    if (total === 0) {
        return 100;
    }
    
    return (covered / total) * 100;
}

function formatPercentage(value) {
    return value.toFixed(1) + '%';
}

class CoverageReport {
    constructor(projectName) {
        this.projectName = projectName;
        this.files = [];
        this.overall = {
            lines_total: 0,
            lines_covered: 0
        };
    }
    
    addFile(fileData) {
        this.files.push(fileData);
        this.updateOverall();
    }
    
    updateOverall() {
        this.overall.lines_total = this.files.reduce((sum, file) => sum + file.lines_total, 0);
        this.overall.lines_covered = this.files.reduce((sum, file) => sum + file.lines_covered, 0);
    }
    
    getCoveragePercentage() {
        return calculateCoverage(this.overall);
    }
}

export { CoverageReport, calculateCoverage, formatPercentage };`;
    }

    destroy() {
        // Cleanup event listeners and DOM elements
        this.container.innerHTML = '';
    }
}

// CSS styles for the heatmap (injected dynamically)
const heatmapStyles = `
.coverage-heatmap-container {
    border: 1px solid #374151;
    border-radius: 8px;
    overflow: hidden;
    background-color: #1f2937;
}

.heatmap-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #374151;
    border-bottom: 1px solid #4b5563;
}

.heatmap-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.heatmap-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
}

.coverage-stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.stat-label {
    color: #9ca3af;
}

.stat-value {
    font-weight: 600;
}

.heatmap-content {
    position: relative;
}

.file-selector {
    padding: 0.75rem 1rem;
    background-color: #374151;
    border-bottom: 1px solid #4b5563;
}

.code-container {
    max-height: 600px;
    overflow: auto;
    background-color: #111827;
}

.code-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    line-height: 1.4;
}

.code-table tr {
    transition: background-color 0.2s ease;
}

.code-table tr:hover {
    background-color: rgba(59, 130, 246, 0.1);
}

.line-number {
    padding: 0.25rem 0.75rem;
    text-align: right;
    color: #6b7280;
    background-color: #374151;
    border-right: 1px solid #4b5563;
    user-select: none;
    min-width: 3rem;
}

.coverage-indicator {
    padding: 0.25rem 0.5rem;
    text-align: center;
    width: 2rem;
}

.code-content {
    padding: 0.25rem 0.75rem;
    color: #e5e7eb;
    white-space: pre;
    font-family: inherit;
}

.line.covered {
    background-color: rgba(16, 185, 129, 0.1);
    border-left: 3px solid #10b981;
}

.line.uncovered {
    background-color: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
}

.line.partial {
    background-color: rgba(245, 158, 11, 0.1);
    border-left: 3px solid #f59e0b;
}

.line.not-executable {
    background-color: transparent;
    border-left: 3px solid transparent;
}

.heatmap-legend {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background-color: #374151;
    border-top: 1px solid #4b5563;
    font-size: 0.875rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
}

.legend-color.covered {
    background-color: #10b981;
}

.legend-color.uncovered {
    background-color: #ef4444;
}

.legend-color.partial {
    background-color: #f59e0b;
}

.legend-color.not-executable {
    background-color: #6b7280;
}

.keyword {
    color: #8b5cf6;
    font-weight: 600;
}

.comment {
    color: #6b7280;
    font-style: italic;
}

.string {
    color: #10b981;
}

.number {
    color: #f59e0b;
}

.line-tooltip {
    position: absolute;
    z-index: 1000;
    background-color: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    padding: 0.5rem;
    font-size: 0.75rem;
    color: #e5e7eb;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.search-highlight {
    background-color: rgba(245, 158, 11, 0.3) !important;
}

.highlight-line {
    background-color: rgba(59, 130, 246, 0.2) !important;
    animation: highlightFade 2s ease-out;
}

@keyframes highlightFade {
    0% { background-color: rgba(59, 130, 246, 0.4); }
    100% { background-color: rgba(59, 130, 246, 0.2); }
}

.loading-placeholder {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
}

.coverage-summary {
    padding: 1.5rem;
}

.summary-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1rem;
}

.summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.stat {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background-color: #374151;
    border-radius: 6px;
}

/* High contrast color scheme */
.color-scheme-high-contrast .line.covered {
    background-color: rgba(0, 255, 0, 0.2);
    border-left-color: #00ff00;
}

.color-scheme-high-contrast .line.uncovered {
    background-color: rgba(255, 0, 0, 0.2);
    border-left-color: #ff0000;
}

.color-scheme-high-contrast .line.partial {
    background-color: rgba(255, 255, 0, 0.2);
    border-left-color: #ffff00;
}
`;

// Inject styles
if (!document.getElementById('heatmap-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'heatmap-styles';
    styleSheet.textContent = heatmapStyles;
    document.head.appendChild(styleSheet);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverageHeatmap;
}

// Make available globally
window.CoverageHeatmap = CoverageHeatmap;
