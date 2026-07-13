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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, CheckCircle2, AlertTriangle, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({ meta: [{ title: "Fees · Nexus ERP" }] }),
  component: FeesPage,
});

const CATEGORIES = ["tuition", "hostel", "bus", "exam", "library", "misc"];

function FeesPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const students = useQuery({
    queryKey: ["students-min"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("students").select("id,full_name,roll_no").order("roll_no")).data ?? [],
  });

  const myStudent = useQuery({
    queryKey: ["me-student", user?.id],
    enabled: !!user && !isAdmin,
    queryFn: async () => (await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const fees = useQuery({
    queryKey: ["fees", isAdmin, myStudent.data?.id],
    enabled: isAdmin || !!myStudent.data,
    queryFn: async () => {
      let q = supabase.from("fees").select("*, students(full_name,roll_no)").order("due_date", { ascending: true, nullsFirst: false });
      if (!isAdmin && myStudent.data?.id) q = q.eq("student_id", myStudent.data.id);
      return (await q).data ?? [];
    },
  });

  const filtered = useMemo(() => (fees.data ?? []).filter((f: any) => filter === "all" || f.status === filter), [fees.data, filter]);

  const stats = useMemo(() => {
    const all = fees.data ?? [];
    const paid = all.filter((f: any) => f.status === "paid").reduce((a: number, f: any) => a + Number(f.amount), 0);
    const pending = all.filter((f: any) => f.status === "pending").reduce((a: number, f: any) => a + Number(f.amount), 0);
    const overdue = all.filter((f: any) => f.status === "pending" && f.due_date && new Date(f.due_date) < new Date()).reduce((a: number, f: any) => a + Number(f.amount), 0);
    return { paid, pending, overdue, total: paid + pending };
  }, [fees.data]);

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("fees").insert({
        student_id: form.student_id, amount: Number(form.amount), category: form.category, due_date: form.due_date || null, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fee added"); qc.invalidateQueries({ queryKey: ["fees"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("fees").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["fees"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("fees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["fees"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Fees & payments" : "My fees"}
        subtitle={isAdmin ? "Tuition, hostel, bus and exam dues." : "Outstanding dues and payment history."}
        action={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add fee</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>New fee</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Student</Label>
                  <Select name="student_id" required>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {(students.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.roll_no} — {s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select name="category" defaultValue="tuition">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (₹)</Label><Input name="amount" type="number" required min={1} /></div>
                <div className="col-span-2"><Label>Due date</Label><Input name="due_date" type="date" /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total billed" value={`₹${stats.total.toLocaleString()}`} icon={Wallet} tone="primary" />
        <StatCard label="Collected" value={`₹${stats.paid.toLocaleString()}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={`₹${stats.pending.toLocaleString()}`} icon={Receipt} tone="warning" />
        <StatCard label="Overdue" value={`₹${stats.overdue.toLocaleString()}`} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mb-4 flex gap-2">
        {["all", "pending", "paid"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${filter === s ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "border border-white/10 text-muted-foreground hover:bg-white/5"}`}>{s}</button>
        ))}
      </div>

      {fees.isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> :
        filtered.length === 0 ? <EmptyState title="No fees" description={isAdmin ? "Add a fee to get started." : "No pending dues — you're all clear!"} /> : (
          <div className="glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  {isAdmin && <TableHead>Student</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f: any) => {
                  const overdue = f.status === "pending" && f.due_date && new Date(f.due_date) < new Date();
                  return (
                    <TableRow key={f.id} className="border-white/5">
                      {isAdmin && <TableCell><div className="font-medium">{f.students?.full_name}</div><div className="text-xs text-muted-foreground font-mono">{f.students?.roll_no}</div></TableCell>}
                      <TableCell><Badge variant="secondary" className="capitalize rounded-full">{f.category}</Badge></TableCell>
                      <TableCell className="font-display text-base">₹{Number(f.amount).toLocaleString()}</TableCell>
                      <TableCell className={overdue ? "text-destructive" : ""}>{f.due_date ?? "—"}</TableCell>
                      <TableCell>{f.status === "paid" ? <Badge className="bg-[color:var(--success)]/20 text-[color:var(--success)] border-0">Paid</Badge> : overdue ? <Badge className="bg-destructive/20 text-destructive border-0">Overdue</Badge> : <Badge className="bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-0">Pending</Badge>}</TableCell>
                      <TableCell className="text-right">
                        {f.status !== "paid" && (
                          <Button size="sm" variant="secondary" onClick={() => pay.mutate(f.id)}>Pay</Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => confirm("Delete?") && del.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      }
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: "primary" | "success" | "warning" | "destructive" }) {
  const tones: Record<string, string> = {
    primary: "from-primary/30 to-accent/20 text-accent",
    success: "from-[color:var(--success)]/30 to-[color:var(--success)]/10 text-[color:var(--success)]",
    warning: "from-[color:var(--warning)]/30 to-[color:var(--warning)]/10 text-[color:var(--warning)]",
    destructive: "from-destructive/30 to-destructive/10 text-destructive",
  };
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-bold">{value}</div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}