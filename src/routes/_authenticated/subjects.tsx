import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({ meta: [{ title: "Subjects · Nexus ERP" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const canManage = !!role;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [sem, setSem] = useState("all");

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("id,name,code").order("name")).data ?? [],
  });

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*, departments(name,code)").order("semester").order("code")).data ?? [],
  });

  const filtered = useMemo(() => (subjects.data ?? []).filter((s: any) => {
    if (dept !== "all" && s.department_id !== dept) return false;
    if (sem !== "all" && String(s.semester) !== sem) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  }), [subjects.data, search, dept, sem]);

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("subjects").insert({
        code: form.code, name: form.name,
        department_id: form.department_id || null,
        semester: Number(form.semester), credits: Number(form.credits),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subject added"); qc.invalidateQueries({ queryKey: ["subjects"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("subjects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalCredits = filtered.reduce((acc: number, s: any) => acc + (s.credits || 0), 0);

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle={`${filtered.length} subjects · ${totalCredits} credits`}
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add subject</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input name="code" required placeholder="CS301" /></div>
                <div><Label>Credits</Label><Input name="credits" type="number" defaultValue={4} min={1} max={10} /></div>
                <div className="col-span-2"><Label>Name</Label><Input name="name" required placeholder="Operating Systems" /></div>
                <div>
                  <Label>Department</Label>
                  <Select name="department_id">
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {(departments.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Semester</Label><Input name="semester" type="number" min={1} max={12} defaultValue={1} /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="glass relative flex flex-1 items-center rounded-xl">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or name…" className="h-10 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sem} onValueChange={setSem}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {Array.from({ length: 8 }).map((_, i) => <SelectItem key={i + 1} value={String(i + 1)}>Semester {i + 1}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {subjects.isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> :
        filtered.length === 0 ? (
          <EmptyState title="No subjects" description={canManage ? "Add your first subject above." : "No subjects match your filters."} />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Credits</TableHead>
                  {canManage && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any) => (
                  <TableRow key={s.id} className="border-white/5">
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20"><BookOpen className="h-4 w-4 text-accent" /></div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.departments?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full">Sem {s.semester}</Badge></TableCell>
                    <TableCell><span className="text-accent">{s.credits}</span></TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => confirm("Delete subject?") && del.mutate(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      }
    </div>
  );
}