from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from models import CoverageReport, FileCoverage, Project
from app import db

class CoverageAnalyzer:
    """Analyze coverage trends and generate insights"""
    
    def __init__(self):
        pass
    
    def get_coverage_trend(self, project: Project, days: int = 30) -> Dict[str, Any]:
        """Get coverage trend for a project over specified days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        reports = CoverageReport.query.filter(
            CoverageReport.project_id == project.id,
            CoverageReport.created_at >= start_date,
            CoverageReport.created_at <= end_date
        ).order_by(CoverageReport.created_at).all()
        
        trend_data = []
        for report in reports:
            trend_data.append({
                'date': report.created_at.strftime('%Y-%m-%d'),
                'coverage': report.coverage_percentage,
                'commit': report.commit_sha[:8] if report.commit_sha else '',
                'branch': report.branch
            })
        
        # Calculate trend direction
        trend_direction = 'stable'
        if len(trend_data) >= 2:
            first_coverage = trend_data[0]['coverage']
            last_coverage = trend_data[-1]['coverage']
            
            if last_coverage > first_coverage + 1:
                trend_direction = 'increasing'
            elif last_coverage < first_coverage - 1:
                trend_direction = 'decreasing'
        
        return {
            'trend_data': trend_data,
            'trend_direction': trend_direction,
            'period_days': days
        }
    
    def get_coverage_summary(self, project: Project) -> Dict[str, Any]:
        """Get comprehensive coverage summary for a project"""
        latest_report = CoverageReport.query.filter_by(
            project_id=project.id
        ).order_by(CoverageReport.created_at.desc()).first()
        
        if not latest_report:
            return {
                'has_coverage': False,
                'message': 'No coverage reports available'
            }
        
        # Get file-level coverage statistics
        file_coverages = FileCoverage.query.filter_by(report_id=latest_report.id).all()
        
        coverage_distribution = {
            'excellent': 0,  # >= 90%
            'good': 0,       # 80-89%
            'fair': 0,       # 60-79%
            'poor': 0        # < 60%
        }
        
        for file_cov in file_coverages:
            if file_cov.coverage_percentage >= 90:
                coverage_distribution['excellent'] += 1
            elif file_cov.coverage_percentage >= 80:
                coverage_distribution['good'] += 1
            elif file_cov.coverage_percentage >= 60:
                coverage_distribution['fair'] += 1
            else:
                coverage_distribution['poor'] += 1
        
        # Calculate trend (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_reports = CoverageReport.query.filter(
            CoverageReport.project_id == project.id,
            CoverageReport.created_at >= week_ago
        ).order_by(CoverageReport.created_at).all()
        
        coverage_change = 0
        if len(recent_reports) >= 2:
            coverage_change = recent_reports[-1].coverage_percentage - recent_reports[0].coverage_percentage
        
        return {
            'has_coverage': True,
            'latest_report': {
                'coverage_percentage': latest_report.coverage_percentage,
                'lines_covered': latest_report.lines_covered,
                'lines_total': latest_report.lines_total,
                'commit_sha': latest_report.commit_sha,
                'branch': latest_report.branch,
                'created_at': latest_report.created_at.strftime('%Y-%m-%d %H:%M')
            },
            'file_count': len(file_coverages),
            'coverage_distribution': coverage_distribution,
            'coverage_change': round(coverage_change, 2),
            'total_reports': CoverageReport.query.filter_by(project_id=project.id).count()
        }
    
    def get_file_coverage_details(self, report: CoverageReport, file_path: str) -> Optional[Dict[str, Any]]:
        """Get detailed coverage information for a specific file"""
        file_coverage = FileCoverage.query.filter_by(
            report_id=report.id,
            file_path=file_path
        ).first()
        
        if not file_coverage:
            return None
        
        line_coverage = file_coverage.line_coverage or {}
        
        # Analyze line coverage patterns
        covered_lines = []
        uncovered_lines = []
        
        for line_num_str, is_covered in line_coverage.items():
            line_num = int(line_num_str)
            if is_covered:
                covered_lines.append(line_num)
            else:
                uncovered_lines.append(line_num)
        
        # Find coverage gaps (consecutive uncovered lines)
        coverage_gaps = []
        if uncovered_lines:
            uncovered_lines.sort()
            gap_start = uncovered_lines[0]
            gap_end = uncovered_lines[0]
            
            for line_num in uncovered_lines[1:]:
                if line_num == gap_end + 1:
                    gap_end = line_num
                else:
                    coverage_gaps.append({'start': gap_start, 'end': gap_end})
                    gap_start = line_num
                    gap_end = line_num
            
            coverage_gaps.append({'start': gap_start, 'end': gap_end})
        
        return {
            'file_path': file_path,
            'coverage_percentage': file_coverage.coverage_percentage,
            'lines_covered': file_coverage.lines_covered,
            'lines_total': file_coverage.lines_total,
            'line_coverage': line_coverage,
            'covered_lines': covered_lines,
            'uncovered_lines': uncovered_lines,
            'coverage_gaps': coverage_gaps
        }
    
    def compare_coverage_reports(self, report1: CoverageReport, report2: CoverageReport) -> Dict[str, Any]:
        """Compare two coverage reports and highlight differences"""
        comparison = {
            'overall_change': {
                'coverage_percentage': report2.coverage_percentage - report1.coverage_percentage,
                'lines_covered': report2.lines_covered - report1.lines_covered,
                'lines_total': report2.lines_total - report1.lines_total
            },
            'file_changes': []
        }
        
        # Get file coverages for both reports
        files1 = {fc.file_path: fc for fc in FileCoverage.query.filter_by(report_id=report1.id).all()}
        files2 = {fc.file_path: fc for fc in FileCoverage.query.filter_by(report_id=report2.id).all()}
        
        all_files = set(files1.keys()) | set(files2.keys())
        
        for file_path in all_files:
            file_change = {'file_path': file_path}
            
            if file_path in files1 and file_path in files2:
                # File exists in both reports
                f1, f2 = files1[file_path], files2[file_path]
                file_change.update({
                    'status': 'modified',
                    'coverage_change': f2.coverage_percentage - f1.coverage_percentage,
                    'lines_change': f2.lines_covered - f1.lines_covered,
                    'old_coverage': f1.coverage_percentage,
                    'new_coverage': f2.coverage_percentage
                })
            elif file_path in files2:
                # New file
                f2 = files2[file_path]
                file_change.update({
                    'status': 'added',
                    'coverage_change': f2.coverage_percentage,
                    'lines_change': f2.lines_covered,
                    'old_coverage': 0,
                    'new_coverage': f2.coverage_percentage
                })
            else:
                # Removed file
                f1 = files1[file_path]
                file_change.update({
                    'status': 'removed',
                    'coverage_change': -f1.coverage_percentage,
                    'lines_change': -f1.lines_covered,
                    'old_coverage': f1.coverage_percentage,
                    'new_coverage': 0
                })
            
            comparison['file_changes'].append(file_change)
        
        # Sort by coverage change (largest changes first)
        comparison['file_changes'].sort(key=lambda x: abs(x['coverage_change']), reverse=True)
        
        return comparison
