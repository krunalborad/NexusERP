import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CalendarPlus, AlertTriangle, LayoutGrid, User, DoorOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable · Nexus ERP" }] }),
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["09:00","10:00","11:15","12:15","13:00","14:00","15:00","16:00","17:00"];

const chipColors = [
  "from-primary/40 to-accent/25 border-primary/30",
  "from-[oklch(0.72_0.17_155)]/40 to-[oklch(0.72_0.17_155)]/15 border-[oklch(0.72_0.17_155)]/30",
  "from-[oklch(0.78_0.16_75)]/40 to-[oklch(0.78_0.16_75)]/15 border-[oklch(0.78_0.16_75)]/30",
  "from-[oklch(0.7_0.2_340)]/40 to-[oklch(0.7_0.2_340)]/15 border-[oklch(0.7_0.2_340)]/30",
  "from-accent/40 to-primary/20 border-accent/30",
];

type Mode = "class" | "faculty" | "room";

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function buildICS(rows: any[]) {
  // Build recurring weekly events starting from the coming Monday of this week
  const now = new Date();
  const monday = new Date(now);
  const dow = (now.getDay() + 6) % 7; // 0 = Mon
  monday.setDate(now.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexus ERP//Timetable//EN", "CALSCALE:GREGORIAN"];
  rows.forEach((r, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + (r.day_of_week - 1));
    const [sh, sm] = (r.start_time as string).slice(0,5).split(":").map(Number);
    const [eh, em] = (r.end_time as string).slice(0,5).split(":").map(Number);
    const s = new Date(day); s.setHours(sh, sm, 0, 0);
    const e = new Date(day); e.setHours(eh, em, 0, 0);
    const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:nexus-${r.id ?? i}@erp`,
      `DTSTART:${fmt(s)}`,
      `DTEND:${fmt(e)}`,
      `RRULE:FREQ=WEEKLY;COUNT=16`,
      `SUMMARY:${(r.subjects?.code ?? "Class")} — ${(r.subjects?.name ?? "")}`,
      `LOCATION:${r.room ?? ""}`,
      `DESCRIPTION:Faculty: ${r.faculty?.full_name ?? "TBA"}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function TimetablePage() {
  const [semester, setSemester] = useState<string>("3");
  const [mode, setMode] = useState<Mode>("class");
  const [facultyId, setFacultyId] = useState<string>("");
  const [room, setRoom] = useState<string>("");

  const departments = useQuery({
    queryKey: ["departments-mini"],
    queryFn: async () => (await supabase.from("departments").select("id,code,name").order("code")).data ?? [],
  });
  const [dept, setDept] = useState<string>("");

  const facultyList = useQuery({
    queryKey: ["faculty-mini"],
    queryFn: async () => (await supabase.from("faculty").select("id,full_name,department_id").order("full_name")).data ?? [],
  });

  const slots = useQuery({
    queryKey: ["timetable", dept, semester, mode, facultyId, room],
    queryFn: async () => {
      let q = supabase.from("timetable").select("*, subjects(code,name), faculty(full_name), departments(code)");
      if (mode === "class") {
        q = q.eq("semester", Number(semester));
        if (dept) q = q.eq("department_id", dept);
      } else if (mode === "faculty") {
        if (facultyId) q = q.eq("faculty_id", facultyId);
      } else if (mode === "room") {
        if (room) q = q.eq("room", room);
      }
      return (await q.order("day_of_week").order("start_time")).data ?? [];
    },
  });

  const rooms = useQuery({
    queryKey: ["rooms-list"],
    queryFn: async () => {
      const { data } = await supabase.from("timetable").select("room");
      return Array.from(new Set((data ?? []).map((r: any) => r.room))).sort();
    },
  });

  // Detect clashes across the whole visible set (same room OR same faculty, same day+time)
  const clashes = useMemo(() => {
    const map = new Map<string, string[]>();
    (slots.data ?? []).forEach((s: any) => {
      const t = (s.start_time as string).slice(0,5);
      const roomKey = `r|${s.day_of_week}|${t}|${s.room}`;
      const facKey = `f|${s.day_of_week}|${t}|${s.faculty_id}`;
      [roomKey, facKey].forEach(k => {
        const arr = map.get(k) ?? [];
        arr.push(s.id);
        map.set(k, arr);
      });
    });
    const bad = new Set<string>();
    map.forEach(ids => { if (ids.length > 1) ids.forEach(id => bad.add(id)); });
    return bad;
  }, [slots.data]);

  const grid = useMemo(() => {
    const m: Record<string, any[]> = {};
    (slots.data ?? []).forEach((s: any) => {
      const key = `${s.day_of_week}-${(s.start_time as string).slice(0,5)}`;
      (m[key] ??= []).push(s);
    });
    return m;
  }, [slots.data]);

  const colorFor = (code: string) => {
    const codes = Array.from(new Set((slots.data ?? []).map((s: any) => s.subjects?.code)));
    return chipColors[Math.max(0, codes.indexOf(code)) % chipColors.length];
  };

  // Today highlight (Mon..Sat -> 1..6)
  const todayIdx = ((new Date().getDay() + 6) % 7) + 1; // Mon=1..Sun=7
  const nowHHMM = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const currentHour = HOURS.find((h, i) => {
    const next = HOURS[i + 1] ?? "23:59";
    return h <= nowHHMM && nowHHMM < next;
  });

  const downloadICS = () => {
    const ics = buildICS(slots.data ?? []);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-timetable-${mode}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clashCount = clashes.size;
  const totalClasses = (slots.data ?? []).length;

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Weekly schedule — switch between class, faculty, or room views." />

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="glass inline-flex rounded-xl p-1">
          {([
            { k: "class", label: "Class", Icon: LayoutGrid },
            { k: "faculty", label: "Faculty", Icon: User },
            { k: "room", label: "Room", Icon: DoorOpen },
          ] as const).map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${mode === k ? "bg-primary/25 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {mode === "class" && (
          <>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {mode === "faculty" && (
          <Select value={facultyId} onValueChange={setFacultyId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Choose faculty" /></SelectTrigger>
            <SelectContent>
              {(facultyList.data ?? []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {mode === "room" && (
          <Select value={room} onValueChange={setRoom}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Choose room" /></SelectTrigger>
            <SelectContent>
              {(rooms.data ?? []).map((r: string) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="rounded-lg">{totalClasses} classes</Badge>
          {clashCount > 0 && (
            <Badge className="rounded-lg border-destructive/40 bg-destructive/10 text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" /> {clashCount} clash{clashCount === 1 ? "" : "es"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={downloadICS} disabled={totalClasses === 0}>
            <CalendarPlus className="mr-1 h-4 w-4" /> .ics
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {slots.isLoading ? <div className="glass h-96 animate-pulse rounded-2xl" /> :
        totalClasses === 0 ? <EmptyState title="No classes" description={mode === "faculty" ? "Pick a faculty member." : mode === "room" ? "Pick a room." : "Pick a department and semester with scheduled classes."} /> : (
          <div className="glass overflow-x-auto rounded-2xl p-3">
            <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, minmax(0, 1fr))` }}>
              <div />
              {DAYS.map((d, di) => (
                <div key={d} className={`p-3 text-center text-xs font-semibold uppercase tracking-wider ${di + 1 === todayIdx ? "text-accent" : "text-muted-foreground"}`}>
                  {d}{di + 1 === todayIdx && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
                </div>
              ))}
              {HOURS.map(h => (
                <>
                  <div key={h} className={`border-t border-white/5 py-3 pr-2 text-right font-mono text-[10px] ${h === currentHour ? "text-accent" : "text-muted-foreground"}`}>{h}</div>
                  {DAYS.map((_, di) => {
                    const cell = grid[`${di + 1}-${h}`] ?? [];
                    const slot = cell[0];
                    const extra = cell.length - 1;
                    const isToday = di + 1 === todayIdx;
                    const isNow = isToday && h === currentHour;
                    return (
                      <div key={`${di}-${h}`} className={`border-t border-l border-white/5 p-1 ${isToday ? "bg-primary/[0.04]" : ""} ${isNow ? "ring-1 ring-accent/40" : ""}`}>
                        {slot ? (
                          <div className={`relative h-full rounded-lg border bg-gradient-to-br p-2 ${clashes.has(slot.id) ? "border-destructive/60 ring-1 ring-destructive/50" : colorFor(slot.subjects?.code)}`}>
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-[10px] opacity-70">{slot.subjects?.code}{mode !== "class" && slot.departments?.code ? ` · ${slot.departments.code}·S${slot.semester}` : ""}</div>
                              {clashes.has(slot.id) && <AlertTriangle className="h-3 w-3 text-destructive" />}
                            </div>
                            <div className="truncate text-xs font-semibold">{slot.subjects?.name}</div>
                            <div className="mt-1 truncate text-[10px] text-muted-foreground">{mode === "faculty" ? slot.room : slot.faculty?.full_name ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{mode === "faculty" ? "" : slot.room}</div>
                            {extra > 0 && <div className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">+{extra}</div>}
                          </div>
                        ) : <div className="h-14" />}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )
      }
    </div>
  );
}