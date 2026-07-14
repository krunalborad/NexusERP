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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Book, Trash2, ArrowLeftRight, Library as LibIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · Nexus ERP" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const canManage = !!role;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const books = useQuery({
    queryKey: ["books"],
    queryFn: async () => (await supabase.from("books").select("*").order("title")).data ?? [],
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    (books.data ?? []).forEach((b: any) => b.category && s.add(b.category));
    return Array.from(s).sort();
  }, [books.data]);

  const filtered = useMemo(() => (books.data ?? []).filter((b: any) => {
    if (category !== "all" && b.category !== category) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn ?? "").toLowerCase().includes(q);
  }), [books.data, search, category]);

  const stats = useMemo(() => {
    const all = books.data ?? [];
    const total = all.reduce((a: number, b: any) => a + b.total_copies, 0);
    const available = all.reduce((a: number, b: any) => a + b.available_copies, 0);
    return { titles: all.length, total, available, issued: total - available };
  }, [books.data]);

  const create = useMutation({
    mutationFn: async (form: any) => {
      const total = Number(form.total_copies);
      const { error } = await supabase.from("books").insert({
        title: form.title, author: form.author, isbn: form.isbn || null,
        category: form.category || null, total_copies: total, available_copies: total,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Book added"); qc.invalidateQueries({ queryKey: ["books"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const adjust = useMutation({
    mutationFn: async ({ id, delta, available }: { id: string; delta: number; available: number }) => {
      const next = available + delta;
      if (next < 0) throw new Error("No copies available");
      const { error } = await supabase.from("books").update({ available_copies: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => { toast.success(vars.delta > 0 ? "Returned" : "Issued"); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("books").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle="Catalogue, issue and return books."
        action={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add book</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg border-white/10">
              <DialogHeader><DialogTitle>New book</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Title</Label><Input name="title" required /></div>
                <div><Label>Author</Label><Input name="author" required /></div>
                <div><Label>ISBN</Label><Input name="isbn" /></div>
                <div><Label>Category</Label><Input name="category" placeholder="e.g. Computer Science" /></div>
                <div><Label>Total copies</Label><Input name="total_copies" type="number" defaultValue={1} min={1} /></div>
                <DialogFooter className="col-span-2"><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Titles" value={stats.titles} icon={LibIcon} />
        <Stat label="Total copies" value={stats.total} icon={Book} />
        <Stat label="Available" value={stats.available} icon={CheckCircle2} />
        <Stat label="Issued" value={stats.issued} icon={ArrowLeftRight} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="glass relative flex flex-1 items-center rounded-xl">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, author or ISBN…" className="h-10 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategory("all")} className={chip(category === "all")}>All</button>
          {categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>{c}</button>)}
        </div>
      </div>

      {books.isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> :
        filtered.length === 0 ? <EmptyState title="No books" description={canManage ? "Add your first book to the catalogue." : "Nothing in the catalogue yet."} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((b: any) => {
              const ratio = b.total_copies === 0 ? 0 : (b.available_copies / b.total_copies);
              return (
                <div key={b.id} className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:shadow-glow">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="grid h-12 w-9 shrink-0 place-items-center rounded bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow"><Book className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author}</div>
                    </div>
                  </div>
                  {b.category && <Badge variant="secondary" className="rounded-full mb-3">{b.category}</Badge>}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Available</span><span className="font-mono">{b.available_copies} / {b.total_copies}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${ratio * 100}%` }} />
                    </div>
                  </div>
                  {b.isbn && <div className="mb-3 font-mono text-[10px] text-muted-foreground">ISBN {b.isbn}</div>}
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" disabled={b.available_copies === 0} onClick={() => adjust.mutate({ id: b.id, delta: -1, available: b.available_copies })}>Issue</Button>
                      <Button size="sm" variant="secondary" className="flex-1" disabled={b.available_copies >= b.total_copies} onClick={() => adjust.mutate({ id: b.id, delta: 1, available: b.available_copies })}>Return</Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("Delete book?") && del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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

function chip(active: boolean) {
  return `rounded-full px-4 h-10 text-xs font-medium transition flex items-center ${active ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "border border-white/10 text-muted-foreground hover:bg-white/5"}`;
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold">{value}</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20"><Icon className="h-5 w-5 text-accent" /></div>
      </div>
    </div>
  );
}