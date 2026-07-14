import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({ meta: [{ title: "Departments · Nexus ERP" }] }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: { name: string; code: string; description: string }) => {
      const { error } = await supabase.from("departments").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department created");
      qc.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department deleted");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canManage = !!role;

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organize your academic units."
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> New department</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-white/10">
              <DialogHeader><DialogTitle>New department</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                create.mutate({ name: String(fd.get("name")), code: String(fd.get("code")), description: String(fd.get("description") ?? "") });
              }} className="space-y-3">
                <div><Label>Name</Label><Input name="name" required placeholder="Computer Science" /></div>
                <div><Label>Code</Label><Input name="code" required placeholder="CS" /></div>
                <div><Label>Description</Label><Textarea name="description" rows={3} /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {isLoading ? (
        <div className="glass h-40 animate-pulse rounded-2xl" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No departments yet" description="Create your first department to start organizing students, faculty and subjects." />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                {canManage && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id} className="border-white/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20">
                        <Building2 className="h-4 w-4 text-accent" />
                      </div>
                      {d.name}
                    </div>
                  </TableCell>
                  <TableCell><span className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs">{d.code}</span></TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">{d.description ?? "—"}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => confirm("Delete this department?") && del.mutate(d.id)}>
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