import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import MyCourses from "./pages/MyCourses";
import LectureView from "./pages/LectureView";
import Quiz from "./pages/Quiz";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminStats from "./pages/admin/AdminStats";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminExams from "./pages/admin/AdminExams";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminPayments from "./pages/admin/AdminPayments";
import Offers from "./pages/Offers";
import CourseDetails from "./pages/CourseDetails";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PageTransition from "./components/layout/PageTransition";

import LoadingScreen from "./components/common/LoadingScreen";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><PageTransition><Courses /></PageTransition></ProtectedRoute>} />
        <Route path="/courses/:id" element={<ProtectedRoute><PageTransition><CourseDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute><PageTransition><Offers /></PageTransition></ProtectedRoute>} />
        <Route path="/my-courses" element={<ProtectedRoute><PageTransition><MyCourses /></PageTransition></ProtectedRoute>} />
        <Route path="/lecture/:sessionId" element={<ProtectedRoute><PageTransition><LectureView /></PageTransition></ProtectedRoute>} />
        <Route path="/quiz/:courseId" element={<ProtectedRoute><PageTransition><Quiz /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><PageTransition><ChangePassword /></PageTransition></ProtectedRoute>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        
        <Route path="/admin" element={<ProtectedRoute adminOnly><PageTransition><AdminDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute adminOnly><PageTransition><AdminCourses /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute adminOnly><PageTransition><AdminNotifications /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><PageTransition><AdminUsers /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/batches" element={<ProtectedRoute adminOnly><PageTransition><AdminBatches /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute adminOnly><PageTransition><AdminAttendance /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/offers" element={<ProtectedRoute adminOnly><PageTransition><AdminOffers /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/exams" element={<ProtectedRoute adminOnly><PageTransition><AdminExams /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/courses/:courseId/lessons" element={<ProtectedRoute adminOnly><PageTransition><AdminLessons /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/stats" element={<ProtectedRoute adminOnly><PageTransition><AdminStats /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/payment-settings" element={<ProtectedRoute adminOnly><PageTransition><AdminPaymentSettings /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute adminOnly><PageTransition><AdminPayments /></PageTransition></ProtectedRoute>} />
        
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="learnhub-theme">
      <LanguageProvider>
        <TooltipProvider>

          <Toaster />
          <Sonner />
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </HashRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
