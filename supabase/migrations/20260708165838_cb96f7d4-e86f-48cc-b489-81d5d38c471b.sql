
-- Clear existing sparse mock data and reseed comprehensively
DELETE FROM public.timetable;
DELETE FROM public.attendance;

-- Seed timetable: for every (department, semester) that has subjects,
-- distribute subjects across Mon-Fri time slots.
DO $$
DECLARE
  rec RECORD;
  slots TIME[] := ARRAY['09:00','10:00','11:00','12:00','14:00','15:00','16:00']::TIME[];
  ends  TIME[] := ARRAY['10:00','11:00','12:00','13:00','15:00','16:00','17:00']::TIME[];
  rooms TEXT[] := ARRAY['A-101','A-102','B-201','B-202','C-301','C-302','Lab-1','Lab-2'];
  subj RECORD;
  fac_id UUID;
  slot_idx INT;
  day_idx INT;
  i INT;
BEGIN
  FOR rec IN
    SELECT DISTINCT department_id, semester
    FROM public.subjects
    ORDER BY department_id, semester
  LOOP
    slot_idx := 0;
    day_idx := 1;
    FOR subj IN
      SELECT id FROM public.subjects
      WHERE department_id = rec.department_id AND semester = rec.semester
      ORDER BY code
    LOOP
      -- Each subject gets 3 sessions across the week
      FOR i IN 1..3 LOOP
        SELECT id INTO fac_id FROM public.faculty
        WHERE department_id = rec.department_id
        ORDER BY random() LIMIT 1;

        INSERT INTO public.timetable
          (subject_id, faculty_id, department_id, semester, day_of_week, start_time, end_time, room)
        VALUES (
          subj.id, fac_id, rec.department_id, rec.semester,
          ((day_idx - 1) % 5) + 1,
          slots[(slot_idx % 7) + 1],
          ends[(slot_idx % 7) + 1],
          rooms[((slot_idx + day_idx) % 8) + 1]
        );
        slot_idx := slot_idx + 1;
        day_idx := day_idx + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Seed attendance: for each subject, mark students in matching (dept, semester)
-- for the last 20 weekdays, with realistic distribution.
DO $$
DECLARE
  subj RECORD;
  stud RECORD;
  d DATE;
  status_val TEXT;
  r NUMERIC;
BEGIN
  FOR subj IN
    SELECT id, department_id, semester FROM public.subjects
  LOOP
    FOR stud IN
      SELECT id FROM public.students
      WHERE department_id = subj.department_id AND semester = subj.semester
    LOOP
      FOR i IN 0..29 LOOP
        d := (CURRENT_DATE - i)::DATE;
        -- skip weekends
        CONTINUE WHEN EXTRACT(DOW FROM d) IN (0, 6);
        r := random();
        IF r < 0.82 THEN status_val := 'present';
        ELSIF r < 0.92 THEN status_val := 'late';
        ELSE status_val := 'absent';
        END IF;
        INSERT INTO public.attendance (student_id, subject_id, date, status)
        VALUES (stud.id, subj.id, d, status_val);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;