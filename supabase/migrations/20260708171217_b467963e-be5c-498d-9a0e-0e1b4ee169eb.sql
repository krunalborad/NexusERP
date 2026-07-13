
-- Seed sem 7 & 8 subjects for each department (skip if already exist)
DO $$
DECLARE
  d RECORD;
  sem INT;
  i INT;
  subj_titles TEXT[];
  code_prefix TEXT;
BEGIN
  FOR d IN SELECT id, code FROM public.departments LOOP
    -- Choose curriculum per department
    IF d.code = 'CSE' THEN
      subj_titles := ARRAY['Machine Learning','Cloud Computing','Cyber Security','Blockchain','Distributed Systems','Deep Learning','Compiler Design','Big Data Analytics'];
    ELSIF d.code = 'ECE' THEN
      subj_titles := ARRAY['VLSI Design','Embedded Systems','Wireless Communication','Digital Image Processing','Satellite Communication','IoT Systems','RF Engineering','Optical Networks'];
    ELSIF d.code = 'EEE' THEN
      subj_titles := ARRAY['Power Electronics','Smart Grids','Renewable Energy','Electric Drives','HVDC Transmission','Industrial Automation','Power System Protection','Energy Auditing'];
    ELSIF d.code = 'MECH' THEN
      subj_titles := ARRAY['Robotics','Finite Element Analysis','CAD/CAM','Mechatronics','Automobile Engineering','Refrigeration & AC','Composite Materials','Industrial Engineering'];
    ELSIF d.code = 'CIVIL' THEN
      subj_titles := ARRAY['Structural Design','Transportation Engineering','Environmental Engineering','Earthquake Engineering','Estimation & Costing','Bridge Engineering','Smart Cities','Construction Management'];
    ELSIF d.code = 'MBA' THEN
      subj_titles := ARRAY['Strategic Management','Business Analytics','International Business','Entrepreneurship','Project Management','Digital Marketing','Corporate Governance','Leadership'];
    ELSE
      subj_titles := ARRAY['Elective A','Elective B','Elective C','Elective D','Elective E','Elective F','Elective G','Elective H'];
    END IF;

    FOR sem IN 7..8 LOOP
      FOR i IN 1..3 LOOP
        code_prefix := d.code || sem::text || i::text;
        IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE code = code_prefix) THEN
          INSERT INTO public.subjects (code, name, department_id, semester, credits)
          VALUES (code_prefix, subj_titles[((sem-7)*3 + i)], d.id, sem, 4);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Rebuild timetable for all (dept, semester) with subjects
DELETE FROM public.timetable;

DO $$
DECLARE
  ds RECORD;
  subj RECORD;
  fac_id UUID;
  slots TEXT[][] := ARRAY[
    ARRAY['09:00','10:00'],
    ARRAY['10:00','11:00'],
    ARRAY['11:15','12:15'],
    ARRAY['14:00','15:00'],
    ARRAY['15:00','16:00']
  ];
  rooms TEXT[] := ARRAY['A-101','A-102','B-201','B-202','C-301','C-302','LAB-1','LAB-2'];
  day_idx INT;
  slot_idx INT;
  i INT := 0;
BEGIN
  FOR ds IN
    SELECT DISTINCT s.department_id, s.semester
    FROM public.subjects s
    ORDER BY s.department_id, s.semester
  LOOP
    i := 0;
    FOR subj IN
      SELECT id, code FROM public.subjects
      WHERE department_id = ds.department_id AND semester = ds.semester
    LOOP
      -- schedule this subject 3 times a week
      FOR day_idx IN 1..3 LOOP
        SELECT id INTO fac_id FROM public.faculty
          WHERE department_id = ds.department_id
          ORDER BY random() LIMIT 1;

        slot_idx := ((i * 3 + day_idx - 1) % 5) + 1;
        INSERT INTO public.timetable (department_id, semester, subject_id, faculty_id, day_of_week, start_time, end_time, room)
        VALUES (
          ds.department_id,
          ds.semester,
          subj.id,
          fac_id,
          ((i + day_idx - 1) % 5) + 1, -- Mon..Fri
          slots[slot_idx][1]::time,
          slots[slot_idx][2]::time,
          rooms[((i * 3 + day_idx) % array_length(rooms,1)) + 1]
        );
      END LOOP;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;