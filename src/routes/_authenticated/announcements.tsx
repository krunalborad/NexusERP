import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/erp/PageHeader";
import { EmptyState } from "@/components/erp/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Megaphone, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements · Nexus ERP" }] }),
  component: AnnouncementsPage,
});

const priorityStyles: Record<string, string> = {
  urgent: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-[oklch(0.78_0.16_75)]/15 text-[oklch(0.85_0.16_75)] border-[oklch(0.78_0.16_75)]/30",
  normal: "bg-primary/15 text-primary border-primary/30",
  low: "bg-white/5 text-muted-foreground border-white/10",
};

function AnnouncementsPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const canManage = !!role;
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [audience, setAudience] = useState("all");

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title, body: form.body, priority, audience, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posted"); qc.invalidateQueries({ queryKey: ["announcements"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Campus-wide notices and updates."
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> New announcement</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>Post announcement</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="space-y-3">
                <div><Label>Title</Label><Input name="title" required /></div>
                <div><Label>Message</Label><Textarea name="body" rows={4} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Audience</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="students">Students</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Publish</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {list.isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> :
        (list.data ?? []).length === 0 ? <EmptyState title="Nothing posted yet" description={canManage ? "Post your first announcement." : "Check back soon."} /> : (
          <div className="space-y-3">
            {(list.data ?? []).map((a: any) => (
              <div key={a.id} className="glass group flex gap-4 rounded-2xl p-5 transition hover:shadow-glow">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
                  {a.priority === "urgent" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Megaphone className="h-5 w-5 text-accent" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${priorityStyles[a.priority] ?? priorityStyles.normal}`}>{a.priority}</span>
                    <Badge variant="secondary" className="rounded-full">{a.audience}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                {canManage && (
                  <Button size="icon" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}