# 📚 توثيق API - ESH Housing System

## 🔗 Base URL
```
https://your-domain.com/api
```

## 🔐 المصادقة
جميع الطلبات تتطلب JWT Token في Header:
```
Authorization: Bearer <your-jwt-token>
```

## 🏠 Home API

### GET /Home/GetAll
الحصول على جميع المنازل المعتمدة

### POST /Home/Add
إضافة منزل جديد (يتطلب دور Owner)

### PUT /Home/Update/{id}
تحديث منزل (يتطلب دور Owner)

### DELETE /Home/DeleteHome/{id}
حذف منزل (يتطلب دور Owner)

## 🛏️ Room API

### GET /Room/GetRoomsByHome/{homeId}
الحصول على غرف منزل معين

### POST /Room/Add
إضافة غرفة جديدة

## 💳 Booking API

### POST /Booking/BookRoom/{roomId}
حجز غرفة

### GET /Booking/GetUserBookings/{userId}
الحصول على حجوزات المستخدم

## 💬 Chat API

### GET /Chat/GetChats/{userId}
الحصول على المحادثات

### POST /Chat/SendMessage
إرسال رسالة

## 📊 Admin API

### GET /Admin/GetPendingHomes
الحصول على المنازل المعلقة (يتطلب دور Admin)

### PUT /Admin/UpdateHomeStatus/{id}
تحديث حالة المنزل (يتطلب دور Admin)

---

**للمزيد من التفاصيل، راجع Swagger Documentation: `/swagger`** 