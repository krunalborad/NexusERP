import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Save, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance · Nexus ERP" }] }),
  component: AttendancePage,
});

type Status = "present" | "absent" | "late";

function AttendancePage() {
  const { role } = useAuth();
  const canMark = !!role;
  return canMark ? <MarkAttendance /> : <StudentAttendance />;
}

function MarkAttendance() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});

  const subjects = useQuery({
    queryKey: ["subjects-min"],
    queryFn: async () => (await supabase.from("subjects").select("id,code,name,semester,department_id").order("code")).data ?? [],
  });

  const subject = useMemo(() => (subjects.data ?? []).find((s) => s.id === subjectId), [subjects.data, subjectId]);

  const students = useQuery({
    queryKey: ["students-for-subject", subject?.department_id, subject?.semester],
    enabled: !!subject,
    queryFn: async () => {
      let q = supabase.from("students").select("id,full_name,roll_no").order("roll_no");
      if (subject?.department_id) q = q.eq("department_id", subject.department_id);
      if (subject?.semester) q = q.eq("semester", subject.semester);
      return (await q).data ?? [];
    },
  });

  const existing = useQuery({
    queryKey: ["attendance", subjectId, date],
    enabled: !!subjectId && !!date,
    queryFn: async () => (await supabase.from("attendance").select("student_id,status").eq("subject_id", subjectId).eq("date", date)).data ?? [],
  });

  useEffect(() => {
    if (!existing.data) return;
    const m: Record<string, Status> = {};
    existing.data.forEach((r: any) => { m[r.student_id] = r.status as Status; });
    setMarks(m);
  }, [existing.data]);

  const setAll = (s: Status) => {
    const m: Record<string, Status> = {};
    (students.data ?? []).forEach((st) => { m[st.id] = s; });
    setMarks(m);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Pick a subject");
      const rows = (students.data ?? []).map((st) => ({
        student_id: st.id, subject_id: subjectId, date, status: marks[st.id] ?? "absent",
      }));
      // delete + insert to upsert without unique constraint
      const { error: delErr } = await supabase.from("attendance").delete().eq("subject_id", subjectId).eq("date", date);
      if (delErr) throw delErr;
      const { error } = await supabase.from("attendance").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attendance saved"); qc.invalidateQueries({ queryKey: ["attendance"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const present = Object.values(marks).filter((s) => s === "present").length;
  const absent = Object.values(marks).filter((s) => s === "absent").length;
  const late = Object.values(marks).filter((s) => s === "late").length;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark and review classroom attendance." />

      <div className="glass mb-4 grid gap-3 rounded-2xl p-4 md:grid-cols-4">
        <div>
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <Button variant="secondary" onClick={() => setAll("present")}>All present</Button>
          <Button variant="secondary" onClick={() => setAll("absent")}>All absent</Button>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-[color:var(--success)]/20 text-[color:var(--success)] border-0">Present {present}</Badge>
            <Badge className="bg-destructive/20 text-destructive border-0">Absent {absent}</Badge>
            <Badge className="bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-0">Late {late}</Badge>
          </div>
        </div>
      </div>

      {!subjectId ? (
        <EmptyState title="Pick a subject" description="Choose a subject and date to begin marking." />
      ) : (students.data?.length ?? 0) === 0 ? (
        <EmptyState title="No students" description="No students enrolled in this subject's semester / department." />
      ) : (
        <>
          <div className="glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead>Roll</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(students.data ?? []).map((s) => {
                  const v = marks[s.id] ?? "absent";
                  return (
                    <TableRow key={s.id} className="border-white/5">
                      <TableCell className="font-mono text-xs">{s.roll_no}</TableCell>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <StatusBtn active={v === "present"} onClick={() => setMarks({ ...marks, [s.id]: "present" })} tone="success"><CheckCircle2 className="h-4 w-4" /></StatusBtn>
                          <StatusBtn active={v === "late"} onClick={() => setMarks({ ...marks, [s.id]: "late" })} tone="warning"><Clock className="h-4 w-4" /></StatusBtn>
                          <StatusBtn active={v === "absent"} onClick={() => setMarks({ ...marks, [s.id]: "absent" })} tone="destructive"><XCircle className="h-4 w-4" /></StatusBtn>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Save className="mr-2 h-4 w-4" /> Save attendance
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBtn({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone: "success" | "warning" | "destructive" }) {
  const colors: Record<string, string> = {
    success: "bg-[color:var(--success)]/30 text-[color:var(--success)]",
    warning: "bg-[color:var(--warning)]/30 text-[color:var(--warning)]",
    destructive: "bg-destructive/30 text-destructive",
  };
  return (
    <button onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-lg border transition ${active ? colors[tone] + " border-transparent" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}>
      {children}
    </button>
  );
}

function StudentAttendance() {
  const { user } = useAuth();
  const me = useQuery({
    queryKey: ["me-student", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("students").select("id,full_name,roll_no").eq("user_id", user!.id).maybeSingle()).data,
  });

  const rows = useQuery({
    queryKey: ["my-attendance", me.data?.id],
    enabled: !!me.data?.id,
    queryFn: async () => (await supabase.from("attendance").select("status,date,subjects(name,code)").eq("student_id", me.data!.id).order("date", { ascending: false })).data ?? [],
  });

  const stats = useMemo(() => {
    const list = rows.data ?? [];
    const total = list.length;
    const present = list.filter((r: any) => r.status === "present").length;
    const late = list.filter((r: any) => r.status === "late").length;
    const pct = total === 0 ? 0 : Math.round(((present + late * 0.5) / total) * 100);
    return { total, present, late, pct };
  }, [rows.data]);

  if (!me.data) return <EmptyState title="No student record" description="Ask admin to link your account to a student profile." />;

  return (
    <div>
      <PageHeader title="My attendance" subtitle={`${me.data.full_name} · ${me.data.roll_no}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Overall</div>
          <div className="mt-2 font-display text-4xl font-bold text-gradient">{stats.pct}%</div>
        </div>
        <Stat label="Classes" value={stats.total} icon={CalendarCheck} />
        <Stat label="Present" value={stats.present} icon={CheckCircle2} />
        <Stat label="Late" value={stats.late} icon={Clock} />
      </div>
      {stats.total === 0 ? <EmptyState title="No records yet" description="Once faculty marks attendance you'll see it here." /> : (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader><TableRow className="border-white/5"><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(rows.data ?? []).map((r: any, i: number) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell>{r.subjects?.code} — {r.subjects?.name}</TableCell>
                  <TableCell><StatusBadge s={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold">{value}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20"><Icon className="h-5 w-5 text-accent" /></div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === "present") return <Badge className="bg-[color:var(--success)]/20 text-[color:var(--success)] border-0">Present</Badge>;
  if (s === "late") return <Badge className="bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-0">Late</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-0">Absent</Badge>;
}