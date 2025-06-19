from datetime import datetime
from app import db
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from flask_login import UserMixin
from sqlalchemy import UniqueConstraint, text
import uuid

# (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=True)
    first_name = db.Column(db.String, nullable=True)
    last_name = db.Column(db.String, nullable=True)
    profile_image_url = db.Column(db.String, nullable=True)
    api_token = db.Column(db.String, unique=True, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    projects = db.relationship('Project', backref='owner', lazy=True)
    
    def generate_api_token(self):
        self.api_token = str(uuid.uuid4())
        db.session.commit()
        return self.api_token
    
    @property
    def display_name(self):
        if self.first_name or self.last_name:
            return f"{self.first_name or ''} {self.last_name or ''}".strip()
        return self.email or self.id

# (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
class OAuth(OAuthConsumerMixin, db.Model):
    user_id = db.Column(db.String, db.ForeignKey(User.id))
    browser_session_key = db.Column(db.String, nullable=False)
    user = db.relationship(User)

    __table_args__ = (UniqueConstraint(
        'user_id',
        'browser_session_key',
        'provider',
        name='uq_user_browser_session_key_provider',
    ),)

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    github_repo = db.Column(db.String(200))  # format: owner/repo
    default_branch = db.Column(db.String(50), default='main')
    owner_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    coverage_reports = db.relationship('CoverageReport', backref='project', lazy=True, cascade='all, delete-orphan')
    
    @property
    def latest_coverage(self):
        return CoverageReport.query.filter_by(project_id=self.id).order_by(CoverageReport.created_at.desc()).first()
    
    @property
    def coverage_percentage(self):
        latest = self.latest_coverage
        return latest.coverage_percentage if latest else 0.0

class CoverageReport(db.Model):
    __tablename__ = 'coverage_reports'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    commit_sha = db.Column(db.String(40))
    branch = db.Column(db.String(100))
    coverage_percentage = db.Column(db.Float, default=0.0)
    lines_covered = db.Column(db.Integer, default=0)
    lines_total = db.Column(db.Integer, default=0)
    functions_covered = db.Column(db.Integer, default=0)
    functions_total = db.Column(db.Integer, default=0)
    branches_covered = db.Column(db.Integer, default=0)
    branches_total = db.Column(db.Integer, default=0)
    report_data = db.Column(db.JSON)  # Store parsed coverage data
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationships
    file_coverages = db.relationship('FileCoverage', backref='report', lazy=True, cascade='all, delete-orphan')
    
    @property
    def coverage_color(self):
        if self.coverage_percentage >= 80:
            return 'success'
        elif self.coverage_percentage >= 60:
            return 'warning'
        else:
            return 'danger'

class FileCoverage(db.Model):
    __tablename__ = 'file_coverages'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('coverage_reports.id'), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    coverage_percentage = db.Column(db.Float, default=0.0)
    lines_covered = db.Column(db.Integer, default=0)
    lines_total = db.Column(db.Integer, default=0)
    line_coverage = db.Column(db.JSON)  # Store line-by-line coverage data
    
    @property
    def coverage_color(self):
        if self.coverage_percentage >= 80:
            return 'success'
        elif self.coverage_percentage >= 60:
            return 'warning'
        else:
            return 'danger'

class ProjectMember(db.Model):
    __tablename__ = 'project_members'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member')  # owner, admin, member
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationships
    project = db.relationship('Project', backref='members')
    user = db.relationship('User', backref='project_memberships')
    
    __table_args__ = (UniqueConstraint('project_id', 'user_id'),)
