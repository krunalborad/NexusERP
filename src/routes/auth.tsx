import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · Nexus ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(fd.get("name")) },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Signing you in…");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    toast.error(error.message);
  }
};

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" className="z-10 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">Nexus ERP</span>
        </Link>
        <div className="relative z-10">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Run your campus<br /><span className="text-gradient">at the speed of thought.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Sign in to access dashboards for students, faculty, departments, attendance, fees and library.
          </p>
        </div>
        <div className="relative z-10 text-xs text-muted-foreground">
          The first account becomes the campus Admin.
        </div>
      </div>

      {/* Form panel */}
      <div className="relative z-10 flex items-center justify-center p-6 sm:p-12">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-elegant">
          <Link to="/" className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">Nexus ERP</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create your campus account.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@college.edu" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required placeholder="Ada Lovelace" />
                </div>
                <div>
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" name="password" type="password" required minLength={8} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button onClick={handleGoogle} variant="outline" className="w-full glass border-white/10">
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}