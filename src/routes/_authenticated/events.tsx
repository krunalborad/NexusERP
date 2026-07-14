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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Clock, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events · Nexus ERP" }] }),
  component: EventsPage,
});

const catColors: Record<string, string> = {
  academic: "from-primary/30 to-accent/20 text-accent",
  cultural: "from-[oklch(0.7_0.2_340)]/30 to-[oklch(0.7_0.2_340)]/10 text-[oklch(0.85_0.2_340)]",
  sports:   "from-[oklch(0.72_0.17_155)]/30 to-[oklch(0.72_0.17_155)]/10 text-[oklch(0.85_0.17_155)]",
  workshop: "from-[oklch(0.78_0.16_75)]/30 to-[oklch(0.78_0.16_75)]/10 text-[oklch(0.88_0.16_75)]",
  holiday:  "from-white/10 to-white/5 text-muted-foreground",
  general:  "from-primary/30 to-accent/20 text-accent",
};

function EventsPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const canManage = !!role;
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("academic");

  const list = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("events").select("*").order("start_at", { ascending: true })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await supabase.from("events").insert({
        title: f.title, description: f.description, location: f.location,
        category, start_at: new Date(f.start_at).toISOString(),
        end_at: f.end_at ? new Date(f.end_at).toISOString() : null, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event created"); qc.invalidateQueries({ queryKey: ["events"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Upcoming academic, cultural and campus events."
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> New event</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Title</Label><Input name="title" required /></div>
                <div className="col-span-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
                <div><Label>Location</Label><Input name="location" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Starts</Label><Input name="start_at" type="datetime-local" required /></div>
                <div><Label>Ends</Label><Input name="end_at" type="datetime-local" /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {list.isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> :
        (list.data ?? []).length === 0 ? <EmptyState title="No events" description="Nothing scheduled yet." /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((e: any) => {
              const start = new Date(e.start_at);
              const past = start.getTime() < Date.now();
              return (
                <div key={e.id} className={`glass group relative overflow-hidden rounded-2xl p-5 transition hover:shadow-glow ${past ? "opacity-60" : ""}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br ${catColors[e.category] ?? catColors.general}`}>
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wider">{start.toLocaleString(undefined,{month:"short"})}</div>
                        <div className="font-display text-xl font-bold leading-none">{start.getDate()}</div>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider capitalize text-muted-foreground">{e.category}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold">{e.title}</h3>
                  {e.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {start.toLocaleString(undefined,{ weekday:"short", hour:"2-digit", minute:"2-digit" })}</div>
                    {e.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {e.location}</div>}
                  </div>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100" onClick={() => confirm("Delete?") && del.mutate(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}