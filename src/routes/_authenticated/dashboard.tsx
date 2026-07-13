import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users, GraduationCap, Building2, Wallet, BookOpen, Library, TrendingUp, CalendarCheck, Megaphone, CalendarDays, ClipboardList, ArrowRight, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Nexus ERP" }] }),
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon: any; trend?: string }) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold">{value}</div>
          {trend && <div className="mt-1 inline-flex items-center gap-1 text-xs text-[color:var(--success)]"><TrendingUp className="h-3 w-3" /> {trend}</div>}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-2xl" />
    </div>
  );
}

function Dashboard() {
  const { user, role } = useAuth();
  const greeting = role === "admin" ? "Campus overview" : role === "faculty" ? "Today's teaching" : role === "librarian" ? "Library operations" : "Your campus";

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [s, f, d, sub, b, fee, att, ev, ex] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("faculty").select("*", { count: "exact", head: true }),
        supabase.from("departments").select("*", { count: "exact", head: true }),
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("fees").select("amount,status"),
        supabase.from("attendance").select("status"),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("start_at", new Date().toISOString()),
        supabase.from("exams").select("*", { count: "exact", head: true }).gte("exam_date", new Date().toISOString().slice(0,10)),
      ]);
      const pending = (fee.data ?? []).filter((r) => r.status === "pending").reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
      const collected = (fee.data ?? []).filter((r) => r.status === "paid").reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
      const attRows = att.data ?? [];
      const presentPct = attRows.length === 0 ? 0 : Math.round((attRows.filter(r => r.status === "present").length / attRows.length) * 100);
      return {
        students: s.count ?? 0,
        faculty: f.count ?? 0,
        departments: d.count ?? 0,
        subjects: sub.count ?? 0,
        books: b.count ?? 0,
        pendingFees: pending,
        collectedFees: collected,
        attendancePct: presentPct,
        upcomingEvents: ev.count ?? 0,
        upcomingExams: ex.count ?? 0,
      };
    },
  });

  const announcements = useQuery({
    queryKey: ["dash-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(4)).data ?? [],
  });
  const upcomingEvents = useQuery({
    queryKey: ["dash-events"],
    queryFn: async () => (await supabase.from("events").select("*").gte("start_at", new Date().toISOString()).order("start_at").limit(4)).data ?? [],
  });
  const upcomingExams = useQuery({
    queryKey: ["dash-exams"],
    queryFn: async () => (await supabase.from("exams").select("*, subjects(code,name)").gte("exam_date", new Date().toISOString().slice(0,10)).order("exam_date").limit(5)).data ?? [],
  });
  const facultyByDept = useQuery({
    queryKey: ["dash-fac-dept"],
    queryFn: async () => {
      const { data: depts } = await supabase.from("departments").select("id,code");
      const { data: fac } = await supabase.from("faculty").select("department_id");
      return (depts ?? []).map((d) => ({ code: d.code, count: (fac ?? []).filter(f => f.department_id === d.id).length }));
    },
  });

  const deptDist = useQuery({
    queryKey: ["dept-distribution"],
    queryFn: async () => {
      const { data: depts } = await supabase.from("departments").select("id,code,name");
      const { data: studs } = await supabase.from("students").select("department_id");
      return (depts ?? []).map((d) => ({
        name: d.code,
        fullName: d.name,
        value: (studs ?? []).filter((s) => s.department_id === d.id).length,
      }));
    },
  });

  const enrollmentTrend = Array.from({ length: 12 }).map((_, i) => ({
    month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
    students: 200 + Math.round(Math.sin(i / 2) * 80 + i * 25),
  }));

  const colors = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];

  const priorityStyles: Record<string, string> = {
    urgent: "border-destructive/40 bg-destructive/10 text-destructive",
    high: "border-[oklch(0.78_0.16_75)]/40 bg-[oklch(0.78_0.16_75)]/10 text-[oklch(0.88_0.16_75)]",
    normal: "border-primary/40 bg-primary/10 text-primary",
    low: "border-white/10 bg-white/5 text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back, {user?.email?.split("@")[0]}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{greeting}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={counts.data?.students ?? "—"} icon={Users} trend="+12% this term" />
        <Stat label="Faculty" value={counts.data?.faculty ?? "—"} icon={GraduationCap} />
        <Stat label="Departments" value={counts.data?.departments ?? "—"} icon={Building2} />
        <Stat label="Pending fees" value={counts.data ? `₹${counts.data.pendingFees.toLocaleString()}` : "—"} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Enrollment trend</h3>
              <p className="text-xs text-muted-foreground">Active students over the last 12 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="students" stroke="#a78bfa" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold">Students by department</h3>
          <p className="mb-2 text-xs text-muted-foreground">Distribution across departments</p>
          <div className="h-64">
            {(deptDist.data?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Add departments and students to see distribution.
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deptDist.data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={78} paddingAngle={3}>
                    {(deptDist.data ?? []).map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    formatter={(v: any, _n: any, p: any) => [`${v} students`, p?.payload?.fullName ?? p?.payload?.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Subjects" value={counts.data?.subjects ?? "—"} icon={BookOpen} />
        <Stat label="Library books" value={counts.data?.books ?? "—"} icon={Library} />
        <Stat label="Upcoming exams" value={counts.data?.upcomingExams ?? "—"} icon={ClipboardList} />
        <Stat label="Attendance avg" value={counts.data ? `${counts.data.attendancePct}%` : "—"} icon={CalendarCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Announcements</h3>
              <p className="text-xs text-muted-foreground">Latest notices across campus</p>
            </div>
            <Link to="/announcements" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-3">
            {(announcements.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No announcements yet.</p> : (announcements.data ?? []).map((a: any) => (
              <div key={a.id} className={`flex gap-3 rounded-xl border p-3 ${priorityStyles[a.priority] ?? priorityStyles.normal}`}>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/20">
                  {a.priority === "urgent" ? <AlertTriangle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><h4 className="truncate text-sm font-semibold text-foreground">{a.title}</h4><span className="text-[10px] uppercase tracking-wider">{a.priority}</span></div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Upcoming exams</h3>
            <Link to="/exams" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2">
            {(upcomingExams.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled.</p> : (upcomingExams.data ?? []).map((e: any) => {
              const d = new Date(e.exam_date);
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20">
                    <div className="text-center">
                      <div className="text-[9px] uppercase text-muted-foreground">{d.toLocaleString(undefined,{month:"short"})}</div>
                      <div className="font-display text-sm font-bold leading-none">{d.getDate()}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.subjects?.code} · {e.exam_type}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.subjects?.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Faculty by department</h3>
              <p className="text-xs text-muted-foreground">Teaching strength across departments</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={facultyByDept.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="code" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="count" fill="#22d3ee" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Upcoming events</h3>
            <Link to="/events" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2">
            {(upcomingEvents.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing coming up.</p> : (upcomingEvents.data ?? []).map((ev: any) => {
              const d = new Date(ev.start_at);
              return (
                <div key={ev.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ev.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{d.toLocaleString(undefined,{ month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"})} · {ev.location ?? "TBA"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}