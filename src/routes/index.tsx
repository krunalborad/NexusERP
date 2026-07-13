import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BookOpen, BarChart3, Library, Wallet, Shield, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus ERP — One platform for the whole campus" },
      { name: "description", content: "Modern college ERP for admins, faculty, students, and librarians. Students, departments, attendance, exams, fees and library — unified." },
      { property: "og:title", content: "Nexus ERP — One platform for the whole campus" },
      { property: "og:description", content: "Modern college ERP for admins, faculty, students, and librarians." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, title: "Students & Faculty", desc: "Single source of truth for everyone on campus." },
  { icon: BookOpen, title: "Departments & Subjects", desc: "Organize academics across semesters." },
  { icon: BarChart3, title: "Live Analytics", desc: "Realtime dashboards for every role." },
  { icon: Library, title: "Library", desc: "Catalogue, issue & track books." },
  { icon: Wallet, title: "Fees", desc: "Track dues, payments and categories." },
  { icon: Shield, title: "Role-based Access", desc: "Admin, Faculty, Student, Librarian — secured." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">Nexus ERP</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-elegant hover:opacity-90">Get started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Built for modern campuses · 2026
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          One platform for <span className="text-gradient">your entire campus</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Nexus ERP unifies students, faculty, departments, attendance, exams, fees and library into a single, beautifully designed workspace.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-elegant hover:opacity-90">
              Open dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="#features"><Button size="lg" variant="outline" className="glass border-white/10">Explore features</Button></a>
        </div>

        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="glass-strong rounded-3xl p-2 shadow-elegant">
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-background/40 p-6 sm:p-10">
              {[
                { label: "Active students", value: "12,480" },
                { label: "Faculty", value: "642" },
                { label: "Departments", value: "24" },
              ].map((s) => (
                <div key={s.label} className="text-left">
                  <div className="font-display text-3xl font-bold sm:text-5xl text-gradient">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group glass rounded-2xl p-6 transition hover:shadow-glow">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        Nexus ERP · Crafted for modern colleges
      </footer>
    </div>
  );
}