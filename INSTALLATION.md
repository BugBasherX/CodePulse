# Quick Local Installation Guide

## 1. Install Prerequisites

### Windows
```cmd
# Download and install Python 3.11+ from python.org
# Download and install PostgreSQL from postgresql.org
# Download and install Git from git-scm.com
```

### macOS
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 postgresql git
brew services start postgresql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev postgresql postgresql-contrib git
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. Setup Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE codepulse;
CREATE USER codepulse_user WITH PASSWORD 'secure_password123';
GRANT ALL PRIVILEGES ON DATABASE codepulse TO codepulse_user;
\q
```

## 3. Download and Setup Project

```bash
# Clone or download the project
git clone <repository-url>
cd codepulse

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 4. Create Environment File

Create `.env` file in project root:

```env
DATABASE_URL=postgresql://codepulse_user:secure_password123@localhost:5432/codepulse
SESSION_SECRET=your_very_secure_random_secret_key_here_make_it_long
FLASK_ENV=development
FLASK_DEBUG=True
```

## 5. Run Application

```bash
# Start the application
python main.py
```

Visit `http://localhost:5000` in your browser.

## 6. First Time Setup

1. The application will automatically create database tables
2. You can create an account or use the demo features
3. Generate an API token in settings for CLI uploads
4. Create your first project and upload coverage reports

## Troubleshooting

### Database Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Reset database if needed
dropdb codepulse
createdb codepulse
```

### Python Issues
```bash
# Ensure correct Python version
python --version

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Port Issues
```bash
# Check what's using port 5000
netstat -tulpn | grep 5000  # Linux
lsof -i :5000  # macOS

# Use different port
python main.py --port 8000
```

## Mobile Testing

1. Find your local IP address:
   ```bash
   # Windows
   ipconfig
   # macOS/Linux  
   ifconfig
   ```

2. Run with external access:
   ```bash
   python main.py --host 0.0.0.0
   ```

3. Access from mobile: `http://YOUR_IP:5000`

## Production Deployment

For production deployment, see the main README.md file for detailed instructions including Docker, cloud platforms, and server configurations.