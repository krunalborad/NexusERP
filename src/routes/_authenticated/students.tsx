import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students · Nexus ERP" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("id,name,code").order("name")).data ?? [],
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, roll_no, full_name, email, phone, semester, admission_year, status, department_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deptMap = useMemo(() => Object.fromEntries((departments.data ?? []).map((d) => [d.id, d])), [departments.data]);

  const filtered = (students.data ?? []).filter((s) => {
    if (filterDept !== "all" && s.department_id !== filterDept) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("students").insert({
        ...form,
        semester: Number(form.semester),
        admission_year: Number(form.admission_year),
        department_id: form.department_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
      qc.invalidateQueries({ queryKey: ["dept-distribution"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed");
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canManage = !!role;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${students.data?.length ?? 0} on roll`}
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add student</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                create.mutate(Object.fromEntries(fd));
              }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Full name</Label><Input name="full_name" required /></div>
                <div><Label>Roll no.</Label><Input name="roll_no" required placeholder="CS2026001" /></div>
                <div><Label>Email</Label><Input name="email" type="email" /></div>
                <div><Label>Phone</Label><Input name="phone" /></div>
                <div><Label>Date of birth</Label><Input name="dob" type="date" /></div>
                <div>
                  <Label>Department</Label>
                  <Select name="department_id">
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {(departments.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Semester</Label><Input name="semester" type="number" min={1} max={12} defaultValue={1} /></div>
                <div><Label>Admission year</Label><Input name="admission_year" type="number" defaultValue={new Date().getFullYear()} /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="glass relative flex flex-1 items-center rounded-xl">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll no, email…"
            className="h-10 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {students.isLoading ? (
        <div className="glass h-40 animate-pulse rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No students match" description="Try clearing filters or add your first student." />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead>Student</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Sem</TableHead>
                <TableHead>Year</TableHead>
                {canManage && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="border-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground">
                        {s.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.email ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.roll_no}</TableCell>
                  <TableCell>{s.department_id ? (deptMap[s.department_id]?.name ?? "—") : "—"}</TableCell>
                  <TableCell>{s.semester}</TableCell>
                  <TableCell>{s.admission_year}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => confirm("Delete this student?") && del.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}