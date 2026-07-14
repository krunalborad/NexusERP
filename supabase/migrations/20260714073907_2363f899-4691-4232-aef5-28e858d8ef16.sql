
-- Open write access to any authenticated user for demo/interview purposes
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY['students','faculty','departments','subjects','fees','attendance','grades','exams','timetable','books','announcements','events'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins/Faculty manage %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin/Faculty manage %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins/Librarians manage %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated manage %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Authenticated manage %1$s" ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;