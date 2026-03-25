import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationsBell from "@/components/NotificationsBell";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Bell,
  BookOpen,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Award,
  Star,
  Users,
  X,
  BarChart3,
  Calendar,
  Gift,
  Library,
  UserCircle,
  Tag,
  Wallet,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "../common/Logo";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t, dir } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const studentNavItems = [
    { icon: Home, label: t.nav.dashboard, path: "/dashboard" },
    { icon: BookOpen, label: t.nav.courses, path: "/courses" },
    { icon: Tag, label: t.nav.offers, path: "/offers" },
    { icon: Library, label: t.nav.myCourses, path: "/my-courses" },
    { icon: UserCircle, label: t.nav.profile, path: "/profile" },
  ];

  const adminNavItems = [
    { icon: Home, label: t.nav.dashboard, path: "/admin" },
    { icon: Users, label: t.nav.users, path: "/admin/users" },
    { icon: BookOpen, label: t.nav.courses, path: "/admin/courses" },
    { icon: GraduationCap, label: t.nav.batches, path: "/admin/batches" },
    { icon: Calendar, label: t.nav.attendance, path: "/admin/attendance" },
    { icon: Tag, label: t.nav.offers, path: "/admin/offers" },
    { icon: Bell, label: t.nav.notifications, path: "/admin/notifications" },
    { icon: Award, label: t.nav.exams, path: "/admin/exams" },
    { icon: BarChart3, label: t.nav.statistics, path: "/admin/stats" },
    { icon: Wallet, label: t.adminPaymentSettings?.title || "Payment Settings", path: "/admin/payment-settings" },
    { icon: Banknote, label: t.adminPayments?.title || "Payment Approvals", path: "/admin/payments" },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex w-full bg-background" dir={dir}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 z-50 w-64 bg-card border-border transform transition-transform duration-300 ease-in-out lg:transform-none",
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r",
          sidebarOpen
            ? "translate-x-0"
            : dir === "rtl"
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center">
                <Logo imageClassName="h-20" />
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden gradient-accent flex items-center justify-center shrink-0">
                <span className="text-accent-foreground font-bold text-sm">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ||
                    user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {profile?.full_name || user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 me-3" />
              {t.common.signOut}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg me-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationsBell />
          <LanguageSwitcher />
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
