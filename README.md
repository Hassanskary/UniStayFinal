# 🏠 ESH - Student Housing Management System

## 📋 Project Description

**ESH** is a comprehensive student housing rental management system that provides an easy-to-use platform connecting property owners with students seeking suitable accommodation. The system supports complete property and booking management with a modern, interactive user interface.

## ✨ Key Features

### 👥 For Students (Users)
- **Search & Filter**: Find houses and rooms by location, price, and amenities
- **Compare Properties**: Save and compare multiple properties
- **Booking & Payment**: Book rooms with multiple payment methods (Stripe + Cash)
- **Communication**: Direct messaging system with property owners
- **Reviews & Comments**: Rate properties and leave reviews
- **Report Issues**: Report suspicious properties
- **Profile Management**: Manage personal information and password

### 🏘️ For Property Owners
- **Property Management**: Add, edit, and delete houses and rooms
- **Booking Management**: View and manage all bookings
- **Amenity Management**: Add and modify property amenities
- **Tenant Communication**: Direct messaging with students
- **Statistics Dashboard**: Detailed statistics about properties and bookings

### 👨‍💼 For Administrators
- **Property Approval**: Review and approve new properties
- **User Management**: Manage all users and property owners
- **Report Management**: Review and handle incoming reports
- **Amenity Management**: Add and modify available amenities
- **Ban Management**: Ban violating users

## 🛠️ Technologies Used

### Frontend
- **React 19** - User interface library
- **Vite** - Fast build tool
- **React Router DOM** - Navigation management
- **Axios** - HTTP requests
- **React Google Maps API** - Interactive maps
- **Stripe React** - Payment processing
- **SignalR** - Real-time communication
- **React Toastify** - User notifications
- **SweetAlert2** - Beautiful popups
- **Lottie React** - Animations
- **Lucide React** - Icons

### Backend
- **ASP.NET Core 8** - Backend framework
- **Entity Framework Core** - Database ORM
- **SQL Server** - Database
- **JWT Authentication** - Authentication
- **SignalR** - Real-time communication
- **Stripe.NET** - Payment processing
- **Google Authentication** - Google login
- **Swagger** - API documentation

### Advanced Features
- **Real-time Chat** - Live messaging
- **File Upload** - Image and file uploads
- **Geolocation** - Location mapping
- **Payment Integration** - Payment processing
- **Push Notifications** - Instant notifications
- **Responsive Design** - Mobile-friendly design

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- .NET 8 SDK
- SQL Server
- Visual Studio 2022 or VS Code

### Installation and Setup

1. **Clone the Repository**
```bash
git clone https://github.com/your-username/ESH-Housing-System.git
cd ESH-Housing-System/FinalGP
```

2. **Install Frontend Dependencies**
```bash
cd finalgp.client
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../FinalGP.Server
dotnet restore
```

4. **Setup Database**
```bash
dotnet ef database update
```

5. **Run the Project**
```bash
# Run Backend
dotnet run

# In another terminal, run Frontend
cd finalgp.client
npm run dev
```

6. **Open the Application**
- Frontend: `http://localhost:55559`
- Backend API: `http://localhost:5000`
- Swagger Documentation: `http://localhost:5000/swagger`

## 📁 Project Structure

```
FinalGP/
├── finalgp.client/          # React Frontend
│   ├── src/
│   │   ├── components/      # Shared components
│   │   ├── UserPages/       # User pages
│   │   ├── Owner-pages/     # Property owner pages
│   │   ├── Admin-pages/     # Admin pages
│   │   └── ...
│   └── public/
├── FinalGP.Server/          # ASP.NET Core Backend
│   ├── Controllers/         # API controllers
│   ├── Models/             # Data models
│   ├── DTO/                # Data transfer objects
│   ├── RepositoryLayer/    # Data access layer
│   ├── ServiceLayer/       # Business logic layer
│   └── wwwroot/            # Static files
└── ...
```

## 🔐 Security

- **JWT Authentication** - Secure authentication
- **Role-based Authorization** - Role-based permissions
- **Input Validation** - Input sanitization
- **File Upload Security** - Secure file uploads
- **SQL Injection Protection** - Database security

## 📱 Interactive Features

- **Real-time Notifications** - Instant notifications
- **Live Chat** - Real-time messaging
- **Interactive Maps** - Location mapping
- **Image Gallery** - Photo galleries
- **Responsive UI** - Mobile-friendly interface

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the project
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions, please:
- Open a new Issue
- Contact us via email
- Check the Swagger documentation

## 🙏 Acknowledgments

Special thanks to all contributors and developers who helped develop this project.

---

**Developed by the ESH Team** 🚀 