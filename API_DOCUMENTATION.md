# 📚 API Documentation - ESH Housing System

## 🔗 Base URL
```
https://your-domain.com/api
```

## 🔐 Authentication
All requests require JWT Token in Header:
```
Authorization: Bearer <your-jwt-token>
```

## 🏠 Home API

### GET /Home/GetAll
Get all approved properties

### POST /Home/Add
Add new property (requires Owner role)

### PUT /Home/Update/{id}
Update property (requires Owner role)

### DELETE /Home/DeleteHome/{id}
Delete property (requires Owner role)

## 🛏️ Room API

### GET /Room/GetRoomsByHome/{homeId}
Get rooms for specific property

### POST /Room/Add
Add new room

## 💳 Booking API

### POST /Booking/BookRoom/{roomId}
Book a room

### GET /Booking/GetUserBookings/{userId}
Get user bookings

## 💬 Chat API

### GET /Chat/GetChats/{userId}
Get user chats

### POST /Chat/SendMessage
Send message

## 📊 Admin API

### GET /Admin/GetPendingHomes
Get pending properties (requires Admin role)

### PUT /Admin/UpdateHomeStatus/{id}
Update property status (requires Admin role)

---

**For more details, check Swagger Documentation: `/swagger`** 