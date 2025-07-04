import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SelectUserType from './RegisterComponents/SelectUserType';
import RegisterUser from './RegisterComponents/RegisterUser';
import RegisterOwner from './RegisterComponents/RegisterOwner';
import Login from './Logincomponents/login';

import AddFacility from "./Admin-pages/Facility/AddFacility";
import AdminPendingHomes from "./Admin-pages/HomeManager/AdminPendingHomes";
import NewHome from "./Owner-pages/Add/NewHome";
import AddRoom from './Owner-pages/Add/AddRoom';
import HomeFacility from './Owner-pages/Add/HomeFacility';
import ShowFacilities from './Owner-pages/Show/ShowFacilities';
import OwnerHomes from './Owner-pages/Show/AllHomes';
import RoomsList from "./Owner-pages/Show/AllRooms";
import UpdateHome from "./Owner-pages/Update/UpdateHome";
import HomeDetails from "./Owner-pages/Show/HomeDetails";
import HomeFacilities from "./Owner-pages/Update/HomeFacilities";
import UpdateRoom from "./Owner-pages/Update/UpdateRoom";
import RoomDetails from "./Owner-pages/Show/RoomDetails";
import Profile from "./UserPages/Profile/Profile";
import EditProfile from "./UserPages/Profile/EditProfile";
import ChangePassword from "./UserPages/Profile/ChangePassword";
import RegisterAdmin from "./RegisterComponents/RegisterAdmin";
import HomePage from "./UserPages/MainHome/Userhome";
import HomeReportsDetails from "./Admin-pages/ReportManager/HomeReportsDetails";
import ReportedHomesList from "./Admin-pages/ReportManager/ReportedHomesList";
import CompareHomes from "./UserPages/Saves/CompareHomes";
import HeroSection from "./UserPages/MainHome/HeroSection";
import ChatRoom from "./components/Chats/ChatRoom";
import DetailsH from "./UserPages/HomeUser/detailsH";
import ChatList from './components/Chats/ChatList';
import FilterPage from "./UserPages/Filter/FilterPage";
import Chat from './components/Chats/Chat';
import StripePayment from './UserPages/Payment/StripePayment';
import PaymentSelection from './UserPages/Payment/PaymentSelection';
import BookingConfirmation from './UserPages/UserBooking/BookingConfirmation';
import ConfirmCash from './UserPages/Payment/ConfirmCash';
import UserBookings from './UserPages/UserBooking/UserBookings'
import ManageBookings from './Owner-pages/ManageBook/ManageBookings'
import AllPhotosPage from './UserPages/HomeUser/AllPhotosPage';


function App() {
    return (
        <Routes>
            <Route path="/SelectUserType" element={<SelectUserType />} />
            <Route path="/RegisterUser" element={<RegisterUser />} />
            <Route path="/RegisterOwner" element={<RegisterOwner />} />
            <Route path="/Login" element={<Login />} />
            
            <Route path="/AddFacility" element={<AddFacility />} />
            <Route path="/AdminPendingHomes" element={<AdminPendingHomes />} />
            <Route path="/Newhome" element={<NewHome />} />
            <Route path="/AddRoom" element={<AddRoom />} />
            <Route path="/AddRoom/:homeId" element={<AddRoom />} />
            <Route path="/HomeFacility/:homeId" element={<HomeFacility />} />
            <Route path="/OwnerHomes/:ownerId" element={<OwnerHomes />} />
            <Route path="/AllRooms/:homeId" element={<RoomsList />} />
            <Route path="/update-home/:id" element={<UpdateHome />} />
            <Route path="/home-details/:id" element={<HomeDetails />} />
            <Route path="/home-facilities/:homeId" element={<HomeFacilities />} />
            <Route path="/ShowFacilities/:homeId" element={<ShowFacilities />} />
            <Route path="/update-room/:roomId" element={<UpdateRoom />} />
            <Route path="/RoomDetails/:id" element={<RoomDetails />} />
            <Route path="/Profile/:id" element={<Profile />} />
            <Route path="/EditProfile/:id" element={<EditProfile />} />
            <Route path="/ChangePassword/:id" element={<ChangePassword />} />
            <Route path="/RegisterAdmin" element={<RegisterAdmin />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/ReportedHomes" element={<ReportedHomesList />} />
            <Route path="/HomeReports/:homeId" element={<HomeReportsDetails />} />
            <Route path="/compare-homes" element={<CompareHomes />} />
            <Route path="/HeroSection" element={<HeroSection />} />
            <Route path="/detailsH/:homeId" element={<DetailsH />} />
            <Route path="/filter-results" element={<FilterPage />} />
            <Route path="/Chat" element={<Chat />} /> {/* Route ÌÏíÏ ÈÏæä userId */}
            <Route path="/Chat/:userId" element={<Chat />} />
            <Route path="/payment-selection/:roomId" element={<PaymentSelection />} />
            <Route path="/stripe-payment/:roomId" element={<StripePayment />} />
            
            <Route path="/booking-confirmation/:roomId" element={<BookingConfirmation />} />
            <Route path="/confirm-cash/:roomId" element={<ConfirmCash />} />
            <Route path="/user-bookings/:userId" element={<UserBookings />} />
            <Route path="/manage-bookings/:userId" element={<ManageBookings />} />
            <Route path="/all-photos/:homeId" element={<AllPhotosPage />} />

        </Routes>
    );
}

export default App;