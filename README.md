# CodePulse - Professional Code Coverage Monitoring Platform

CodePulse is a comprehensive code coverage monitoring platform that provides real-time analytics, project management, and coverage tracking for development teams. It's a full alternative to Codecov that can be self-hosted and works seamlessly on both desktop and mobile devices.

## Features

- **Multi-format Coverage Support**: XML, LCOV, Cobertura, JaCoCo
- **Interactive Dashboards**: Real-time coverage trends and analytics
- **Project Management**: GitHub integration and team collaboration
- **Mobile-First Design**: Fully responsive for Android and iOS
- **API Integration**: REST API for CI/CD pipeline integration
- **User Management**: Comprehensive profile and preference management
- **PWA Support**: Install as a native app on mobile devices

## Local Installation

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 12 or higher
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd codepulse
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup

#### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (with Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

#### Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE codepulse;
CREATE USER codepulse_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE codepulse TO codepulse_user;
\q
```

### 4. Environment Configuration

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://codepulse_user:your_secure_password@localhost:5432/codepulse
PGHOST=localhost
PGPORT=5432
PGUSER=codepulse_user
PGPASSWORD=your_secure_password
PGDATABASE=codepulse

# Session Configuration
SESSION_SECRET=your_very_secure_session_secret_key_here

# Application Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# Replit Auth (Optional - for Replit integration)
REPL_ID=your_repl_id_if_using_replit_auth
ISSUER_URL=https://replit.com/oidc
```

### 5. Install Dependencies

Create `requirements.txt` if not present:

```txt
Flask==2.3.3
Flask-SQLAlchemy==3.0.5
Flask-Login==0.6.3
Flask-Dance==7.0.0
psycopg2-binary==2.9.7
PyJWT==2.8.0
gunicorn==21.2.0
oauthlib==3.2.2
email-validator==2.0.0
```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 6. Database Initialization

The application will automatically create tables on first run. You can also manually initialize:

```bash
python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully!')
"
```

### 7. Run the Application

#### Development Mode

```bash
python main.py
```

The application will be available at `http://localhost:5000`

#### Production Mode

```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 main:app
```

## Alternative Authentication Setup

If you don't want to use Replit authentication, you can implement basic authentication:

### 1. Create a Simple Auth Module

Create `simple_auth.py`:

```python
from flask import request, redirect, url_for, session, flash
from flask_login import LoginManager, login_user, logout_user, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
from app import app
from models import User

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function
```

### 2. Update User Model

Add password field to the User model in `models.py`:

```python
# Add this field to User class
password_hash = db.Column(db.String(256))

def set_password(self, password):
    self.password_hash = generate_password_hash(password)

def check_password(self, password):
    return check_password_hash(self.password_hash, password)
```

### 3. Create Login Routes

Add to `routes.py`:

```python
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Invalid credentials')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists')
            return render_template('register.html')
        
        user = User(email=email, first_name=name)
        user.set_password(password)
        user.id = str(uuid.uuid4())
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')
```

## API Usage

### Upload Coverage Report

```bash
# Generate API token in settings first, then:
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@coverage.xml" \
  -F "project_slug=your-project-slug"
```

### Supported Coverage Formats

- **Cobertura XML**: `coverage.xml`
- **LCOV**: `lcov.info`
- **JaCoCo XML**: `jacoco.xml`
- **Generic XML**: Standard coverage XML formats

## Mobile Access

The application is fully responsive and works on:

- **iOS Safari** (iPhone/iPad)
- **Android Chrome**
- **Mobile browsers** with PWA support

### Install as PWA

1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option
3. Install for native app experience

## Deployment Options

### 1. Docker (Recommended for Production)

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "main:app"]
```

### 2. Cloud Platforms

- **Heroku**: Add `Procfile` with `web: gunicorn main:app`
- **Railway**: Connect GitHub repo directly
- **DigitalOcean App Platform**: Use Python buildpack
- **AWS/GCP/Azure**: Use container deployment

### 3. VPS/Dedicated Server

```bash
# Install nginx
sudo apt install nginx

# Configure nginx (example)
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Use systemd for process management
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SESSION_SECRET` | Flask session secret key | Required |
| `FLASK_ENV` | Environment mode | `production` |
| `FLASK_DEBUG` | Debug mode | `False` |
| `REPL_ID` | Replit integration ID | Optional |

### Database Migrations

If you make model changes:

```bash
# Install Flask-Migrate
pip install Flask-Migrate

# Initialize migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify connection string in `.env`
   - Ensure user has proper permissions

2. **Port Already in Use**
   ```bash
   # Find process using port 5000
   lsof -i :5000
   # Kill process
   kill -9 <PID>
   ```

3. **Module Import Errors**
   - Ensure virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt`

4. **Permission Errors**
   - Check file permissions
   - Ensure PostgreSQL user has database access

### Development Tips

- Use `flask run` for development with auto-reload
- Enable debug mode for detailed error messages
- Check application logs for troubleshooting
- Use browser developer tools for frontend issues

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature-name`
5. Submit pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review application logs
- Submit GitHub issues with detailed information

---

**CodePulse** - Professional code coverage monitoring made simple.