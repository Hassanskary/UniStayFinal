# 🚀 Deployment Guide - ESH Housing System

## 📋 Prerequisites

### Server Requirements
- **Operating System**: Windows Server 2019+ or Linux (Ubuntu 20.04+)
- **Processor**: 2+ cores
- **Memory**: 4GB+ RAM
- **Storage**: 50GB+ free space
- **Network**: Stable internet connection

### Required Software
- **.NET 8 Runtime**
- **Node.js 18+**
- **SQL Server 2019+** or **PostgreSQL 13+**
- **IIS** (Windows) or **Nginx** (Linux)
- **Git**

## 🏗️ Environment Setup

### 1. Install Basic Software

#### Windows Server
```powershell
# Install .NET 8
winget install Microsoft.DotNet.Runtime.8

# Install Node.js
winget install OpenJS.NodeJS

# Install SQL Server
# Download and install SQL Server from official website
```

#### Ubuntu Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install .NET 8
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

### 2. Database Setup

#### SQL Server
```sql
-- Create database
CREATE DATABASE ESH_Database;
GO

-- Create user for access
CREATE LOGIN ESH_User WITH PASSWORD = 'StrongPassword123!';
GO

USE ESH_Database;
GO

CREATE USER ESH_User FOR LOGIN ESH_User;
GO

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE::ESH_Database TO ESH_User;
GO
```

#### PostgreSQL
```sql
-- Create database
CREATE DATABASE esh_database;

-- Create user
CREATE USER esh_user WITH PASSWORD 'StrongPassword123!';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE esh_database TO esh_user;
```

## 📦 Project Deployment

### 1. Clone Repository
```bash
git clone https://github.com/your-username/ESH-Housing-System.git
cd ESH-Housing-System/FinalGP
```

### 2. Environment Variables Setup

#### Create appsettings.Production.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=ESH_Database;User Id=ESH_User;Password=StrongPassword123!;TrustServerCertificate=true;"
  },
  "JWT": {
    "Secret": "YourSuperSecretKeyHere12345678901234567890",
    "Issuer": "ESH-Housing-System",
    "Audience": "ESH-Users",
    "ExpiryInMinutes": 60
  },
  "Stripe": {
    "SecretKey": "sk_test_your_stripe_secret_key",
    "PublishableKey": "pk_test_your_stripe_publishable_key"
  },
  "Google": {
    "ClientId": "your_google_client_id",
    "ClientSecret": "your_google_client_secret"
  },
  "FileStorage": {
    "Path": "/var/www/esh/files"
  }
}
```

### 3. Build Project

#### Frontend
```bash
cd finalgp.client
npm install
npm run build
```

#### Backend
```bash
cd ../FinalGP.Server
dotnet restore
dotnet publish -c Release -o ./publish
```

### 4. Database Setup
```bash
cd FinalGP.Server
dotnet ef database update
```

## 🌐 Server Configuration

### Windows Server (IIS)

#### 1. Install IIS
```powershell
# Install IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install ASP.NET Core Hosting Bundle
# Download and install ASP.NET Core Hosting Bundle from Microsoft
```

#### 2. Create Website in IIS
```powershell
# Create application folder
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\esh"

# Copy published files
Copy-Item -Path ".\FinalGP.Server\publish\*" -Destination "C:\inetpub\wwwroot\esh" -Recurse

# Create website in IIS
New-WebSite -Name "ESH-Housing" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\esh"
```

#### 3. Configure Application Pool
```powershell
# Create Application Pool
New-WebAppPool -Name "ESH-AppPool"

# Set .NET CLR Version
Set-ItemProperty -Path "IIS:\AppPools\ESH-AppPool" -Name "managedRuntimeVersion" -Value ""

# Set Application Pool for website
Set-ItemProperty -Path "IIS:\Sites\ESH-Housing" -Name "applicationPool" -Value "ESH-AppPool"
```

### Linux Server (Nginx)

#### 1. Install Nginx
```bash
sudo apt-get install -y nginx
```

#### 2. Create systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/esh.service
```

Service file content:
```ini
[Unit]
Description=ESH Housing System
After=network.target

[Service]
WorkingDirectory=/var/www/esh
ExecStart=/usr/bin/dotnet /var/www/esh/FinalGP.Server.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=esh
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

#### 3. Configure Nginx
```bash
# Create application folder
sudo mkdir -p /var/www/esh

# Copy published files
sudo cp -r ./FinalGP.Server/publish/* /var/www/esh/

# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/esh
```

Nginx configuration content:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/esh/wwwroot/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 4. Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/esh /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable application service
sudo systemctl enable esh
sudo systemctl start esh
```

## 🔒 SSL/HTTPS Setup

### Using Let's Encrypt (Linux)
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Windows Server
```powershell
# Install Windows Admin Center or use certificate from CA
# Configure SSL in IIS Manager
```

## 📊 Monitoring and Maintenance

### 1. Log Monitoring
```bash
# Application logs
sudo journalctl -u esh -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Backup
```bash
# Database backup
pg_dump esh_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Files backup
tar -czf files_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/esh/wwwroot/
```

### 3. Updates
```bash
# Pull updates
git pull origin main

# Rebuild project
npm run build
dotnet publish -c Release -o ./publish

# Restart service
sudo systemctl restart esh
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U esh_user -d esh_database
```

#### 2. Permission Error
```bash
# Set folder permissions
sudo chown -R www-data:www-data /var/www/esh
sudo chmod -R 755 /var/www/esh
```

#### 3. Port Error
```bash
# Check used ports
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
```

## 📞 Support

For deployment assistance:
- Check official documentation
- Open issue on GitHub
- Contact support team

---

**Happy Deploying!** 🎉 