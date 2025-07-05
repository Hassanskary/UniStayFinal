# 🚀 دليل النشر - ESH Housing System

## 📋 المتطلبات الأساسية

### للخادم
- **نظام التشغيل**: Windows Server 2019+ أو Linux (Ubuntu 20.04+)
- **المعالج**: 2+ cores
- **الذاكرة**: 4GB+ RAM
- **التخزين**: 50GB+ مساحة خالية
- **الشبكة**: اتصال إنترنت مستقر

### البرامج المطلوبة
- **.NET 8 Runtime**
- **Node.js 18+**
- **SQL Server 2019+** أو **PostgreSQL 13+**
- **IIS** (Windows) أو **Nginx** (Linux)
- **Git**

## 🏗️ إعداد البيئة

### 1. تثبيت البرامج الأساسية

#### Windows Server
```powershell
# تثبيت .NET 8
winget install Microsoft.DotNet.Runtime.8

# تثبيت Node.js
winget install OpenJS.NodeJS

# تثبيت SQL Server
# قم بتحميل وتثبيت SQL Server من الموقع الرسمي
```

#### Ubuntu Server
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت .NET 8
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

### 2. إعداد قاعدة البيانات

#### SQL Server
```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE ESH_Database;
GO

-- إنشاء مستخدم للوصول
CREATE LOGIN ESH_User WITH PASSWORD = 'StrongPassword123!';
GO

USE ESH_Database;
GO

CREATE USER ESH_User FOR LOGIN ESH_User;
GO

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE::ESH_Database TO ESH_User;
GO
```

#### PostgreSQL
```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE esh_database;

-- إنشاء مستخدم
CREATE USER esh_user WITH PASSWORD 'StrongPassword123!';

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE esh_database TO esh_user;
```

## 📦 نشر المشروع

### 1. استنساخ المشروع
```bash
git clone https://github.com/your-username/ESH-Housing-System.git
cd ESH-Housing-System/FinalGP
```

### 2. إعداد متغيرات البيئة

#### إنشاء ملف appsettings.Production.json
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

### 3. بناء المشروع

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

### 4. إعداد قاعدة البيانات
```bash
cd FinalGP.Server
dotnet ef database update
```

## 🌐 إعداد الخادم

### Windows Server (IIS)

#### 1. تثبيت IIS
```powershell
# تثبيت IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# تثبيت ASP.NET Core Hosting Bundle
# قم بتحميل وتثبيت ASP.NET Core Hosting Bundle من Microsoft
```

#### 2. إنشاء موقع في IIS
```powershell
# إنشاء مجلد التطبيق
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\esh"

# نسخ الملفات المنشورة
Copy-Item -Path ".\FinalGP.Server\publish\*" -Destination "C:\inetpub\wwwroot\esh" -Recurse

# إنشاء موقع في IIS
New-WebSite -Name "ESH-Housing" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\esh"
```

#### 3. إعداد Application Pool
```powershell
# إنشاء Application Pool
New-WebAppPool -Name "ESH-AppPool"

# تعيين .NET CLR Version
Set-ItemProperty -Path "IIS:\AppPools\ESH-AppPool" -Name "managedRuntimeVersion" -Value ""

# تعيين Application Pool للموقع
Set-ItemProperty -Path "IIS:\Sites\ESH-Housing" -Name "applicationPool" -Value "ESH-AppPool"
```

### Linux Server (Nginx)

#### 1. تثبيت Nginx
```bash
sudo apt-get install -y nginx
```

#### 2. إنشاء خدمة systemd
```bash
# إنشاء ملف الخدمة
sudo nano /etc/systemd/system/esh.service
```

محتوى ملف الخدمة:
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

#### 3. إعداد Nginx
```bash
# إنشاء مجلد التطبيق
sudo mkdir -p /var/www/esh

# نسخ الملفات المنشورة
sudo cp -r ./FinalGP.Server/publish/* /var/www/esh/

# إنشاء ملف تكوين Nginx
sudo nano /etc/nginx/sites-available/esh
```

محتوى ملف تكوين Nginx:
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

#### 4. تفعيل الموقع
```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/esh /etc/nginx/sites-enabled/

# اختبار تكوين Nginx
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# تفعيل خدمة التطبيق
sudo systemctl enable esh
sudo systemctl start esh
```

## 🔒 إعداد SSL/HTTPS

### باستخدام Let's Encrypt (Linux)
```bash
# تثبيت Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com

# تجديد تلقائي
sudo crontab -e
# أضف السطر التالي:
0 12 * * * /usr/bin/certbot renew --quiet
```

### باستخدام Windows Server
```powershell
# تثبيت Windows Admin Center أو استخدام شهادة من CA
# إعداد SSL في IIS Manager
```

## 📊 المراقبة والصيانة

### 1. مراقبة السجلات
```bash
# سجلات التطبيق
sudo journalctl -u esh -f

# سجلات Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. النسخ الاحتياطي
```bash
# نسخ احتياطي لقاعدة البيانات
pg_dump esh_database > backup_$(date +%Y%m%d_%H%M%S).sql

# نسخ احتياطي للملفات
tar -czf files_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/esh/wwwroot/
```

### 3. التحديثات
```bash
# سحب التحديثات
git pull origin main

# إعادة بناء المشروع
npm run build
dotnet publish -c Release -o ./publish

# إعادة تشغيل الخدمة
sudo systemctl restart esh
```

## 🚨 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ في الاتصال بقاعدة البيانات
```bash
# التحقق من حالة PostgreSQL
sudo systemctl status postgresql

# التحقق من الاتصال
psql -h localhost -U esh_user -d esh_database
```

#### 2. خطأ في الصلاحيات
```bash
# إعطاء صلاحيات للمجلدات
sudo chown -R www-data:www-data /var/www/esh
sudo chmod -R 755 /var/www/esh
```

#### 3. خطأ في المنفذ
```bash
# التحقق من المنافذ المستخدمة
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
```

## 📞 الدعم

للحصول على المساعدة في النشر:
- راجع التوثيق الرسمي
- افتح issue في GitHub
- تواصل مع فريق الدعم

---

**نشر سعيد!** 🎉 