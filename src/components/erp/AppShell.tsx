import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, GraduationCap, Building2, BookOpen,
  CalendarCheck, Wallet, Library, Bell, LogOut, Menu, X, Search,
  Megaphone, CalendarDays, ClipboardList, CalendarRange
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: any; roles: AppRole[] };

const NAV: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","faculty","student","librarian"] },
  { to: "/students", label: "Students", icon: Users, roles: ["admin","faculty"] },
  { to: "/faculty", label: "Faculty", icon: GraduationCap, roles: ["admin"] },
  { to: "/departments", label: "Departments", icon: Building2, roles: ["admin"] },
  { to: "/subjects", label: "Subjects", icon: BookOpen, roles: ["admin","faculty","student"] },
  { to: "/timetable", label: "Timetable", icon: CalendarRange, roles: ["admin","faculty","student"] },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["admin","faculty","student"] },
  { to: "/exams", label: "Exams & Grades", icon: ClipboardList, roles: ["admin","faculty","student"] },
  { to: "/fees", label: "Fees", icon: Wallet, roles: ["admin","student"] },
  { to: "/library", label: "Library", icon: Library, roles: ["admin","librarian","student","faculty"] },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["admin","faculty","student","librarian"] },
  { to: "/events", label: "Events", icon: CalendarDays, roles: ["admin","faculty","student","librarian"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((i) => !role || i.roles.includes(role));
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid pointer-events-none fixed inset-0 opacity-20" />

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Nexus ERP</span>
          </Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-accent")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.email}</div>
              <div className="text-xs capitalize text-muted-foreground">{role ?? "—"}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-background/60 px-4 backdrop-blur-xl sm:px-8">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search students, faculty, departments…"
              className="h-10 w-full max-w-md rounded-xl border border-white/5 bg-white/5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:bg-white/[0.07]"
            />
          </div>
          <Button size="icon" variant="ghost"><Bell className="h-4 w-4" /></Button>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}