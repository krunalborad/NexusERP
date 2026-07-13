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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";

export const Route = createFileRoute("/_authenticated/faculty")({
  head: () => ({ meta: [{ title: "Faculty · Nexus ERP" }] }),
  component: FacultyPage,
});

function FacultyPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("id,name").order("name")).data ?? [],
  });

  const faculty = useQuery({
    queryKey: ["faculty"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculty").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deptMap = useMemo(() => Object.fromEntries((departments.data ?? []).map((d) => [d.id, d.name])), [departments.data]);

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("faculty").insert({
        ...form,
        department_id: form.department_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faculty added");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faculty").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canManage = role === "admin";

  return (
    <div>
      <PageHeader
        title="Faculty"
        subtitle={`${faculty.data?.length ?? 0} members`}
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add faculty</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>Add faculty</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                create.mutate(Object.fromEntries(fd));
              }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Full name</Label><Input name="full_name" required /></div>
                <div><Label>Employee ID</Label><Input name="employee_id" required placeholder="FAC0001" /></div>
                <div><Label>Designation</Label><Input name="designation" defaultValue="Lecturer" /></div>
                <div><Label>Email</Label><Input name="email" type="email" /></div>
                <div><Label>Phone</Label><Input name="phone" /></div>
                <div className="col-span-2">
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
                <div><Label>Joining date</Label><Input name="joining_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {faculty.isLoading ? (
        <div className="glass h-40 animate-pulse rounded-2xl" />
      ) : (faculty.data?.length ?? 0) === 0 ? (
        <EmptyState title="No faculty yet" description="Add your first faculty member to get started." />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(faculty.data ?? []).map((f) => (
                <TableRow key={f.id} className="border-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-primary text-xs font-semibold text-primary-foreground">
                        {f.full_name.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{f.full_name}</div>
                        <div className="text-xs text-muted-foreground">{f.email ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{f.employee_id}</TableCell>
                  <TableCell>{f.designation}</TableCell>
                  <TableCell>{f.department_id ? (deptMap[f.department_id] ?? "—") : "—"}</TableCell>
                  <TableCell>{f.joining_date}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => confirm("Remove this faculty?") && del.mutate(f.id)}>
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