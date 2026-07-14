import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ClipboardList, Trash2, Award } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams · Nexus ERP" }] }),
  component: ExamsPage,
});

const typeColor: Record<string, string> = {
  quiz: "bg-primary/15 text-primary border-primary/30",
  midterm: "bg-[oklch(0.78_0.16_75)]/15 text-[oklch(0.88_0.16_75)] border-[oklch(0.78_0.16_75)]/30",
  final: "bg-destructive/20 text-destructive border-destructive/30",
  assignment: "bg-[oklch(0.72_0.17_155)]/15 text-[oklch(0.85_0.17_155)] border-[oklch(0.72_0.17_155)]/30",
};

function ExamsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const canManage = !!role;
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState("midterm");

  const exams = useQuery({
    queryKey: ["exams"],
    queryFn: async () => (await supabase.from("exams").select("*, subjects(code,name)").order("exam_date")).data ?? [],
  });
  const subjects = useQuery({
    queryKey: ["subjects-mini"],
    queryFn: async () => (await supabase.from("subjects").select("id,code,name").order("code")).data ?? [],
  });
  const grades = useQuery({
    queryKey: ["grades"],
    queryFn: async () => (await supabase.from("grades").select("*, exams(title,subjects(code,name)), students(roll_no,full_name)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await supabase.from("exams").insert({
        subject_id: subjectId, title: f.title, exam_type: type,
        exam_date: f.exam_date, start_time: f.start_time || null,
        duration_minutes: Number(f.duration_minutes), max_marks: Number(f.max_marks), room: f.room || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Exam scheduled"); qc.invalidateQueries({ queryKey: ["exams"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("exams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["exams"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const upcoming = useMemo(() => (exams.data ?? []).filter((e: any) => new Date(e.exam_date) >= new Date(new Date().toDateString())), [exams.data]);
  const past = useMemo(() => (exams.data ?? []).filter((e: any) => new Date(e.exam_date) < new Date(new Date().toDateString())), [exams.data]);

  return (
    <div>
      <PageHeader
        title="Exams & Grades"
        subtitle="Schedule assessments and publish results."
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Schedule exam</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>Schedule exam</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Title</Label><Input name="title" required /></div>
                <div className="col-span-2">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                    <SelectContent>{(subjects.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Room</Label><Input name="room" /></div>
                <div><Label>Date</Label><Input name="exam_date" type="date" required /></div>
                <div><Label>Start time</Label><Input name="start_time" type="time" /></div>
                <div><Label>Duration (min)</Label><Input name="duration_minutes" type="number" defaultValue={120} /></div>
                <div><Label>Max marks</Label><Input name="max_marks" type="number" defaultValue={100} /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending || !subjectId}>Schedule</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <Tabs defaultValue="upcoming">
        <TabsList className="glass mb-4">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <ExamGrid list={upcoming} canManage={canManage} onDelete={(id) => del.mutate(id)} />
        </TabsContent>
        <TabsContent value="past">
          <ExamGrid list={past} canManage={canManage} onDelete={(id) => del.mutate(id)} />
        </TabsContent>
        <TabsContent value="grades">
          {(grades.data ?? []).length === 0 ? <EmptyState title="No grades yet" description="Grades will appear as they're published." /> : (
            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 bg-white/[0.02] text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-3">Student</th><th className="p-3">Subject</th><th className="p-3">Exam</th><th className="p-3 text-right">Marks</th><th className="p-3">Grade</th></tr>
                </thead>
                <tbody>
                  {(grades.data ?? []).map((g: any) => (
                    <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3"><div className="font-medium">{g.students?.full_name}</div><div className="font-mono text-[10px] text-muted-foreground">{g.students?.roll_no}</div></td>
                      <td className="p-3">{g.exams?.subjects?.code} — {g.exams?.subjects?.name}</td>
                      <td className="p-3 text-muted-foreground">{g.exams?.title}</td>
                      <td className="p-3 text-right font-mono">{g.marks}</td>
                      <td className="p-3"><Badge className="rounded-full">{g.grade ?? "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExamGrid({ list, canManage, onDelete }: { list: any[]; canManage: boolean; onDelete: (id: string) => void }) {
  if (list.length === 0) return <EmptyState title="Nothing here" description="No exams to show." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => (
        <div key={e.id} className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:shadow-glow">
          <div className="mb-2 flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
              {e.exam_type === "assignment" ? <Award className="h-5 w-5 text-accent" /> : <ClipboardList className="h-5 w-5 text-accent" />}
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider capitalize ${typeColor[e.exam_type] ?? typeColor.midterm}`}>{e.exam_type}</span>
          </div>
          <h3 className="font-display text-base font-semibold">{e.title}</h3>
          <div className="mt-1 text-xs text-muted-foreground">{e.subjects?.code} — {e.subjects?.name}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Date</div><div className="font-medium">{new Date(e.exam_date).toLocaleDateString()}</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Time</div><div className="font-medium">{(e.start_time as string | null)?.slice(0,5) ?? "—"}</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Duration</div><div className="font-medium">{e.duration_minutes} min</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Room</div><div className="font-medium">{e.room ?? "TBA"}</div></div>
          </div>
          {canManage && (
            <Button size="icon" variant="ghost" className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100" onClick={() => confirm("Delete?") && onDelete(e.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}