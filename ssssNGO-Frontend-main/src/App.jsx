import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Posts = lazy(() => import("./pages/Posts"));
const MembersDirectory = lazy(() => import("./pages/MembersDirectory"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUpload = lazy(() => import("./pages/AdminUpload"));
const AdminEditPost = lazy(() => import("./pages/AdminEditPost"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminMembers = lazy(() => import("./pages/AdminMembers"));
const AdminSangathan = lazy(() => import("./pages/AdminSangathan"));
const AdminRequests = lazy(() => import("./pages/AdminRequests"));
const Sangathan = lazy(() => import("./pages/Sangathan"));
const AdminPostList = lazy(() => import("./pages/AdminPostList"));
const MembershipRequest = lazy(() => import("./pages/MembershipRequest"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotLoginId = lazy(() => import("./pages/ForgotLoginId"));
const Donate = lazy(() => import("./pages/Donate"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminDonations = lazy(() => import("./pages/AdminDonations"));
const AdminAccounts = lazy(() => import("./pages/AdminAccounts"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const VerifyMembership = lazy(() => import("./pages/VerifyMembership"));
const ExamRegistration = lazy(() => import("./pages/ExamRegistration"));
const AdminExamDashboard = lazy(() => import("./pages/AdminExamDashboard"));
const AdminExamRegistrations = lazy(() => import("./pages/AdminExamRegistrations"));
const AdminExamSettings = lazy(() => import("./pages/AdminExamSettings"));
const AdminAdmitCards = lazy(() => import("./pages/AdminAdmitCards"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));

const loadingFallback = (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
    Loading…
  </div>
);

function App() {
  const { user } = useAuth();
  const location = useLocation();
  const verificationMemberId = new URLSearchParams(location.search).get("verify");
  const hasAdminAccess = ["admin", "owner"].includes(user?.role);

  return (
    <Suspense fallback={loadingFallback}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-login-id" element={<ForgotLoginId />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={verificationMemberId ? <VerifyMembership memberIdOverride={verificationMemberId} /> : <Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/sangathan" element={<Sangathan />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/verify/:memberId" element={<VerifyMembership />} />
          <Route path="/exam-registration/:slug" element={<ExamRegistration />} />
          <Route path="/members" element={user?.joined ? <MembersDirectory /> : <Login />} />
          <Route path="/join" element={user ? <MembershipRequest /> : <Login />} />

          <Route path="/admin" element={hasAdminAccess ? <AdminLayout /> : <Navigate to="/login" replace />}>
            <Route index element={<AdminDashboard />} />
            <Route path="posts" element={<AdminPostList />} />
            <Route path="upload" element={<AdminUpload />} />
            <Route path="edit/:id" element={<AdminEditPost />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="sangathan" element={<AdminSangathan />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="donations" element={<AdminDonations />} />
            <Route path="exams" element={<AdminExamDashboard />} />
            <Route path="exams/registrations" element={<AdminExamRegistrations />} />
            <Route path="exams/admit-cards" element={<AdminAdmitCards />} />
            <Route path="exams/settings" element={<AdminExamSettings />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="accounts" element={user?.role === "owner" ? <AdminAccounts /> : <Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
