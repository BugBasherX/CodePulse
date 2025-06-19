import os
from flask import request, render_template, redirect, url_for, flash, jsonify, send_file, abort
from flask_login import current_user
from werkzeug.utils import secure_filename
from app import app, db
from models import User, Project, CoverageReport, FileCoverage, ProjectMember
from replit_auth import require_login, make_replit_blueprint
from parsers.coverage_parser import CoverageParser
from utils.coverage_analyzer import CoverageAnalyzer
from utils.badge_generator import BadgeGenerator
from flask import send_from_directory
import uuid
from datetime import datetime, timedelta
from sqlalchemy import desc

app.register_blueprint(make_replit_blueprint(), url_prefix="/auth")

@app.before_request
def make_session_permanent():
    from flask import session
    session.permanent = True

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@require_login
def dashboard():
    user_projects = Project.query.filter_by(owner_id=current_user.id).all()
    recent_reports = CoverageReport.query.join(Project).filter(
        Project.owner_id == current_user.id
    ).order_by(desc(CoverageReport.created_at)).limit(10).all()
    
    return render_template('dashboard.html', 
                         projects=user_projects, 
                         recent_reports=recent_reports)

@app.route('/projects/new', methods=['GET', 'POST'])
@require_login
def new_project():
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        github_repo = request.form.get('github_repo', '')
        is_public = request.form.get('is_public') == 'on'
        
        if not name:
            flash('Project name is required', 'error')
            return render_template('settings.html', action='new_project')
        
        # Generate unique slug
        slug = name.lower().replace(' ', '-').replace('_', '-')
        base_slug = slug
        counter = 1
        while Project.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        project = Project(
            name=name,
            slug=slug,
            description=description,
            github_repo=github_repo,
            is_public=is_public,
            owner_id=current_user.id
        )
        
        db.session.add(project)
        db.session.commit()
        
        flash(f'Project "{name}" created successfully!', 'success')
        return redirect(url_for('project_detail', slug=slug))
    
    return render_template('settings.html', action='new_project')

@app.route('/projects/<slug>')
def project_detail(slug):
    project = Project.query.filter_by(slug=slug).first_or_404()
    
    # Check access permissions
    if not project.is_public and (not current_user.is_authenticated or 
                                  (current_user.id != project.owner_id and 
                                   not ProjectMember.query.filter_by(project_id=project.id, user_id=current_user.id).first())):
        abort(403)
    
    # Get recent coverage reports
    reports = CoverageReport.query.filter_by(project_id=project.id).order_by(desc(CoverageReport.created_at)).limit(20).all()
    
    # Get coverage trend data for chart (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    trend_reports = CoverageReport.query.filter(
        CoverageReport.project_id == project.id,
        CoverageReport.created_at >= thirty_days_ago
    ).order_by(CoverageReport.created_at).all()
    
    return render_template('project_detail.html', 
                         project=project, 
                         reports=reports,
                         trend_reports=trend_reports)

@app.route('/projects/<slug>/upload', methods=['GET', 'POST'])
@require_login
def upload_coverage(slug):
    project = Project.query.filter_by(slug=slug).first_or_404()
    
    # Check permissions
    if current_user.id != project.owner_id and not ProjectMember.query.filter_by(
            project_id=project.id, user_id=current_user.id).first():
        abort(403)
    
    if request.method == 'POST':
        if 'coverage_file' not in request.files:
            flash('No file selected', 'error')
            return redirect(request.url)
        
        file = request.files['coverage_file']
        if file.filename == '':
            flash('No file selected', 'error')
            return redirect(request.url)
        
        commit_sha = request.form.get('commit_sha', '')
        branch = request.form.get('branch', project.default_branch)
        
        try:
            # Parse coverage file
            parser = CoverageParser()
            coverage_data = parser.parse_file(file)
            
            if not coverage_data:
                flash('Failed to parse coverage file. Please check the format.', 'error')
                return redirect(request.url)
            
            # Create coverage report
            report = CoverageReport(
                project_id=project.id,
                commit_sha=commit_sha,
                branch=branch,
                coverage_percentage=coverage_data['overall']['coverage_percentage'],
                lines_covered=coverage_data['overall']['lines_covered'],
                lines_total=coverage_data['overall']['lines_total'],
                functions_covered=coverage_data['overall'].get('functions_covered', 0),
                functions_total=coverage_data['overall'].get('functions_total', 0),
                branches_covered=coverage_data['overall'].get('branches_covered', 0),
                branches_total=coverage_data['overall'].get('branches_total', 0),
                report_data=coverage_data
            )
            
            db.session.add(report)
            db.session.flush()  # Get the ID
            
            # Create file coverage records
            for file_data in coverage_data['files']:
                file_coverage = FileCoverage(
                    report_id=report.id,
                    file_path=file_data['path'],
                    coverage_percentage=file_data['coverage_percentage'],
                    lines_covered=file_data['lines_covered'],
                    lines_total=file_data['lines_total'],
                    line_coverage=file_data.get('line_coverage', {})
                )
                db.session.add(file_coverage)
            
            db.session.commit()
            
            flash('Coverage report uploaded successfully!', 'success')
            return redirect(url_for('project_detail', slug=slug))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error processing coverage file: {str(e)}', 'error')
            return redirect(request.url)
    
    return render_template('upload.html', project=project)

@app.route('/projects/<slug>/files/<int:report_id>')
def file_coverage(slug, report_id):
    project = Project.query.filter_by(slug=slug).first_or_404()
    report = CoverageReport.query.filter_by(id=report_id, project_id=project.id).first_or_404()
    
    # Check access permissions
    if not project.is_public and (not current_user.is_authenticated or 
                                  (current_user.id != project.owner_id and 
                                   not ProjectMember.query.filter_by(project_id=project.id, user_id=current_user.id).first())):
        abort(403)
    
    file_coverages = FileCoverage.query.filter_by(report_id=report.id).all()
    
    return render_template('file_coverage.html', 
                         project=project, 
                         report=report, 
                         file_coverages=file_coverages)

@app.route('/projects/<slug>/badge.svg')
def coverage_badge(slug):
    project = Project.query.filter_by(slug=slug).first_or_404()
    
    # Only show badge for public projects or if user has access
    if not project.is_public and (not current_user.is_authenticated or 
                                  (current_user.id != project.owner_id and 
                                   not ProjectMember.query.filter_by(project_id=project.id, user_id=current_user.id).first())):
        abort(403)
    
    latest_report = project.latest_coverage
    coverage_percentage = latest_report.coverage_percentage if latest_report else 0.0
    
    badge_generator = BadgeGenerator()
    svg_content = badge_generator.generate_coverage_badge(coverage_percentage)
    
    return app.response_class(svg_content, mimetype='image/svg+xml')

@app.route('/settings')
@require_login
def settings():
    # Generate API token if user doesn't have one
    if not current_user.api_token:
        current_user.generate_api_token()
    
    user_projects = Project.query.filter_by(owner_id=current_user.id).all()
    return render_template('settings.html', projects=user_projects)

@app.route('/api/upload', methods=['POST'])
def api_upload():
    # API endpoint for CLI uploads
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    user = User.query.filter_by(api_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid API token'}), 401
    
    project_slug = request.form.get('project')
    if not project_slug:
        return jsonify({'error': 'Project slug is required'}), 400
    
    project = Project.query.filter_by(slug=project_slug).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Check permissions
    if user.id != project.owner_id and not ProjectMember.query.filter_by(
            project_id=project.id, user_id=user.id).first():
        return jsonify({'error': 'Access denied'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    commit_sha = request.form.get('commit', '')
    branch = request.form.get('branch', project.default_branch)
    
    try:
        # Parse coverage file
        parser = CoverageParser()
        coverage_data = parser.parse_file(file)
        
        if not coverage_data:
            return jsonify({'error': 'Failed to parse coverage file'}), 400
        
        # Create coverage report
        report = CoverageReport(
            project_id=project.id,
            commit_sha=commit_sha,
            branch=branch,
            coverage_percentage=coverage_data['overall']['coverage_percentage'],
            lines_covered=coverage_data['overall']['lines_covered'],
            lines_total=coverage_data['overall']['lines_total'],
            functions_covered=coverage_data['overall'].get('functions_covered', 0),
            functions_total=coverage_data['overall'].get('functions_total', 0),
            branches_covered=coverage_data['overall'].get('branches_covered', 0),
            branches_total=coverage_data['overall'].get('branches_total', 0),
            report_data=coverage_data
        )
        
        db.session.add(report)
        db.session.flush()
        
        # Create file coverage records
        for file_data in coverage_data['files']:
            file_coverage = FileCoverage(
                report_id=report.id,
                file_path=file_data['path'],
                coverage_percentage=file_data['coverage_percentage'],
                lines_covered=file_data['lines_covered'],
                lines_total=file_data['lines_total'],
                line_coverage=file_data.get('line_coverage', {})
            )
            db.session.add(file_coverage)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Coverage report uploaded successfully',
            'report_id': report.id,
            'coverage_percentage': report.coverage_percentage
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error processing coverage file: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(error):
    return render_template('403.html', error_message="Page not found"), 404

@app.errorhandler(403)
def forbidden(error):
    return render_template('403.html', error_message="Access denied"), 403

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')
