# 🏠 ESH - Student Housing Management System

## 📋 وصف المشروع

**ESH** هو نظام متكامل لإدارة إيجار المنازل والغرف للطلاب، يوفر منصة سهلة الاستخدام لربط أصحاب المنازل بالطلاب الباحثين عن سكن مناسب. النظام يدعم إدارة كاملة للعقارات والحجوزات والمدفوعات مع واجهة مستخدم حديثة وتفاعلية.

## ✨ المميزات الرئيسية

### 👥 للمستخدمين (الطلاب)
- **البحث والتصفية**: البحث عن منازل وغرف حسب الموقع والسعر والمرافق
- **مقارنة المنازل**: إمكانية حفظ ومقارنة عدة منازل
- **الحجز والدفع**: حجز الغرف مع دعم طرق دفع متعددة (Stripe + نقدي)
- **التواصل**: نظام محادثات مباشر مع أصحاب المنازل
- **التقييمات والتعليقات**: تقييم المنازل وترك تعليقات
- **الإبلاغ عن المشاكل**: إمكانية الإبلاغ عن منازل مشبوهة
- **الملف الشخصي**: إدارة المعلومات الشخصية وكلمة المرور

### 🏘️ لأصحاب المنازل
- **إدارة العقارات**: إضافة وتعديل وحذف المنازل والغرف
- **إدارة الحجوزات**: عرض وإدارة جميع الحجوزات
- **إدارة المرافق**: إضافة وتعديل مرافق المنزل
- **التواصل مع المستأجرين**: محادثات مباشرة مع الطلاب
- **عرض الإحصائيات**: إحصائيات مفصلة عن العقارات والحجوزات

### 👨‍💼 للمديرين
- **الموافقة على المنازل**: مراجعة وموافقة على المنازل الجديدة
- **إدارة المستخدمين**: إدارة جميع المستخدمين وأصحاب المنازل
- **إدارة البلاغات**: مراجعة ومعالجة البلاغات الواردة
- **إدارة المرافق**: إضافة وتعديل المرافق المتاحة
- **إدارة الحظر**: حظر المستخدمين المخالفين

## 🛠️ التقنيات المستخدمة

### Frontend
- **React 19** - مكتبة واجهة المستخدم
- **Vite** - أداة البناء السريعة
- **React Router DOM** - إدارة التنقل
- **Axios** - طلبات HTTP
- **React Google Maps API** - خرائط تفاعلية
- **Stripe React** - معالجة المدفوعات
- **SignalR** - التواصل المباشر
- **React Toastify** - إشعارات المستخدم
- **SweetAlert2** - نوافذ منبثقة جميلة
- **Lottie React** - رسوم متحركة
- **Lucide React** - أيقونات

### Backend
- **ASP.NET Core 8** - إطار العمل الخلفي
- **Entity Framework Core** - ORM للقاعدة البيانات
- **SQL Server** - قاعدة البيانات
- **JWT Authentication** - المصادقة
- **SignalR** - التواصل المباشر
- **Stripe.NET** - معالجة المدفوعات
- **Google Authentication** - تسجيل الدخول بـ Google
- **Swagger** - توثيق API

### الميزات المتقدمة
- **Real-time Chat** - محادثات مباشرة
- **File Upload** - رفع الصور والملفات
- **Geolocation** - تحديد المواقع على الخريطة
- **Payment Integration** - دمج المدفوعات
- **Push Notifications** - إشعارات فورية
- **Responsive Design** - تصميم متجاوب

## 🚀 كيفية التشغيل

### المتطلبات الأساسية
- Node.js (v18 أو أحدث)
- .NET 8 SDK
- SQL Server
- Visual Studio 2022 أو VS Code

### تثبيت وتشغيل المشروع

1. **استنساخ المشروع**
```bash
git clone https://github.com/your-username/ESH-Housing-System.git
cd ESH-Housing-System/FinalGP
```

2. **تثبيت حزم Frontend**
```bash
cd finalgp.client
npm install
```

3. **تثبيت حزم Backend**
```bash
cd ../FinalGP.Server
dotnet restore
```

4. **إعداد قاعدة البيانات**
```bash
dotnet ef database update
```

5. **تشغيل المشروع**
```bash
# تشغيل Backend
dotnet run

# في terminal آخر، تشغيل Frontend
cd finalgp.client
npm run dev
```

6. **فتح التطبيق**
- Frontend: `http://localhost:55559`
- Backend API: `http://localhost:5000`
- Swagger Documentation: `http://localhost:5000/swagger`

## 📁 هيكل المشروع

```
FinalGP/
├── finalgp.client/          # React Frontend
│   ├── src/
│   │   ├── components/      # المكونات المشتركة
│   │   ├── UserPages/       # صفحات المستخدمين
│   │   ├── Owner-pages/     # صفحات أصحاب المنازل
│   │   ├── Admin-pages/     # صفحات المديرين
│   │   └── ...
│   └── public/
├── FinalGP.Server/          # ASP.NET Core Backend
│   ├── Controllers/         # وحدات التحكم
│   ├── Models/             # نماذج البيانات
│   ├── DTO/                # كائنات نقل البيانات
│   ├── RepositoryLayer/    # طبقة الوصول للبيانات
│   ├── ServiceLayer/       # طبقة الخدمات
│   └── wwwroot/            # الملفات الثابتة
└── ...
```

## 🔐 الأمان

- **JWT Authentication** - مصادقة آمنة
- **Role-based Authorization** - صلاحيات حسب الدور
- **Input Validation** - التحقق من المدخلات
- **File Upload Security** - أمان رفع الملفات
- **SQL Injection Protection** - حماية من حقن SQL

## 📱 الميزات التفاعلية

- **Real-time Notifications** - إشعارات فورية
- **Live Chat** - محادثات مباشرة
- **Interactive Maps** - خرائط تفاعلية
- **Image Gallery** - معرض الصور
- **Responsive UI** - واجهة متجاوبة

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push إلى Branch (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

إذا واجهت أي مشاكل أو لديك أسئلة، يرجى:
- فتح Issue جديد
- التواصل معنا عبر البريد الإلكتروني
- مراجعة التوثيق في Swagger

## 🙏 الشكر

شكر خاص لجميع المساهمين والمطورين الذين ساعدوا في تطوير هذا المشروع.

---

**تم تطوير هذا المشروع بواسطة فريق ESH** 🚀 