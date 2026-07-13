
-- ============ NEW TABLES ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all', -- all|students|faculty|admin
  priority TEXT NOT NULL DEFAULT 'normal', -- low|normal|high|urgent
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Faculty manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- academic|cultural|sports|workshop|holiday
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Faculty manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'midterm', -- quiz|midterm|final|assignment
  exam_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INT NOT NULL DEFAULT 120,
  max_marks INT NOT NULL DEFAULT 100,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Faculty manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks NUMERIC(6,2) NOT NULL,
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read grades" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Faculty manage grades" ON public.grades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  semester INT NOT NULL DEFAULT 1,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable TO authenticated;
GRANT ALL ON public.timetable TO service_role;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read timetable" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Faculty manage timetable" ON public.timetable FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- Indexes
CREATE INDEX idx_students_dept ON public.students(department_id);
CREATE INDEX idx_students_semester ON public.students(semester);
CREATE INDEX idx_faculty_dept ON public.faculty(department_id);
CREATE INDEX idx_subjects_dept ON public.subjects(department_id, semester);
CREATE INDEX idx_attendance_student ON public.attendance(student_id, date);
CREATE INDEX idx_fees_student ON public.fees(student_id, status);
CREATE INDEX idx_timetable_day ON public.timetable(day_of_week, semester);
CREATE INDEX idx_events_start ON public.events(start_at);

-- ============ DEMO DATA ============
INSERT INTO public.departments (name, code, description) VALUES
  ('Computer Science & Engineering','CSE','Software, systems, AI/ML and cybersecurity'),
  ('Electronics & Communication','ECE','Signals, embedded systems and communication'),
  ('Mechanical Engineering','MECH','Design, thermodynamics and manufacturing'),
  ('Electrical Engineering','EEE','Power systems, machines and control'),
  ('Civil Engineering','CIVIL','Structures, geotech and transportation'),
  ('Business Administration','MBA','Management, finance and marketing');

-- Subjects (CSE-focused, plus one row per other dept)
WITH d AS (SELECT id, code FROM public.departments)
INSERT INTO public.subjects (code, name, department_id, semester, credits)
SELECT * FROM (VALUES
  ('CS101','Introduction to Programming', (SELECT id FROM d WHERE code='CSE'), 1, 4),
  ('CS102','Discrete Mathematics',        (SELECT id FROM d WHERE code='CSE'), 1, 3),
  ('CS201','Data Structures',             (SELECT id FROM d WHERE code='CSE'), 2, 4),
  ('CS202','Digital Logic Design',        (SELECT id FROM d WHERE code='CSE'), 2, 3),
  ('CS301','Algorithms',                  (SELECT id FROM d WHERE code='CSE'), 3, 4),
  ('CS302','Operating Systems',           (SELECT id FROM d WHERE code='CSE'), 3, 4),
  ('CS303','Database Management Systems', (SELECT id FROM d WHERE code='CSE'), 3, 3),
  ('CS401','Computer Networks',           (SELECT id FROM d WHERE code='CSE'), 4, 4),
  ('CS402','Software Engineering',        (SELECT id FROM d WHERE code='CSE'), 4, 3),
  ('CS403','Web Technologies',            (SELECT id FROM d WHERE code='CSE'), 4, 3),
  ('CS501','Machine Learning',            (SELECT id FROM d WHERE code='CSE'), 5, 4),
  ('CS502','Cloud Computing',             (SELECT id FROM d WHERE code='CSE'), 5, 3),
  ('CS503','Cybersecurity',               (SELECT id FROM d WHERE code='CSE'), 5, 3),
  ('CS601','Deep Learning',               (SELECT id FROM d WHERE code='CSE'), 6, 4),
  ('CS602','Compiler Design',             (SELECT id FROM d WHERE code='CSE'), 6, 3),
  ('EC101','Circuit Theory',              (SELECT id FROM d WHERE code='ECE'), 1, 4),
  ('EC201','Signals & Systems',           (SELECT id FROM d WHERE code='ECE'), 2, 4),
  ('EC301','Analog Electronics',          (SELECT id FROM d WHERE code='ECE'), 3, 3),
  ('EC401','Microprocessors',             (SELECT id FROM d WHERE code='ECE'), 4, 4),
  ('EC501','VLSI Design',                 (SELECT id FROM d WHERE code='ECE'), 5, 3),
  ('ME101','Engineering Mechanics',       (SELECT id FROM d WHERE code='MECH'), 1, 4),
  ('ME201','Thermodynamics',              (SELECT id FROM d WHERE code='MECH'), 2, 4),
  ('ME301','Fluid Mechanics',             (SELECT id FROM d WHERE code='MECH'), 3, 3),
  ('ME401','Machine Design',              (SELECT id FROM d WHERE code='MECH'), 4, 4),
  ('EE101','Basic Electrical Engineering',(SELECT id FROM d WHERE code='EEE'), 1, 4),
  ('EE201','Electrical Machines',         (SELECT id FROM d WHERE code='EEE'), 2, 4),
  ('EE301','Power Systems',               (SELECT id FROM d WHERE code='EEE'), 3, 3),
  ('CE101','Structural Analysis',         (SELECT id FROM d WHERE code='CIVIL'), 1, 4),
  ('CE201','Concrete Technology',         (SELECT id FROM d WHERE code='CIVIL'), 2, 3),
  ('CE301','Transportation Engineering',  (SELECT id FROM d WHERE code='CIVIL'), 3, 3),
  ('MB101','Principles of Management',    (SELECT id FROM d WHERE code='MBA'), 1, 3),
  ('MB201','Financial Accounting',        (SELECT id FROM d WHERE code='MBA'), 2, 3),
  ('MB301','Marketing Management',        (SELECT id FROM d WHERE code='MBA'), 3, 3),
  ('MB401','Organizational Behavior',     (SELECT id FROM d WHERE code='MBA'), 4, 3)
) AS v(code,name,dept,semester,credits);

-- Faculty
WITH d AS (SELECT id, code FROM public.departments)
INSERT INTO public.faculty (employee_id, full_name, email, phone, department_id, designation, joining_date) VALUES
  ('FAC001','Dr. Ananya Sharma','ananya.sharma@nexus.edu','+91-9876500001',(SELECT id FROM d WHERE code='CSE'),'Professor','2015-07-10'),
  ('FAC002','Dr. Rohan Verma','rohan.verma@nexus.edu','+91-9876500002',(SELECT id FROM d WHERE code='CSE'),'Associate Professor','2017-08-01'),
  ('FAC003','Prof. Meera Iyer','meera.iyer@nexus.edu','+91-9876500003',(SELECT id FROM d WHERE code='CSE'),'Assistant Professor','2019-01-15'),
  ('FAC004','Dr. Karthik Reddy','karthik.reddy@nexus.edu','+91-9876500004',(SELECT id FROM d WHERE code='CSE'),'Professor','2012-06-20'),
  ('FAC005','Prof. Neha Kapoor','neha.kapoor@nexus.edu','+91-9876500005',(SELECT id FROM d WHERE code='CSE'),'Lecturer','2021-09-01'),
  ('FAC006','Dr. Vikram Singh','vikram.singh@nexus.edu','+91-9876500006',(SELECT id FROM d WHERE code='ECE'),'Professor','2013-05-11'),
  ('FAC007','Prof. Sunita Rao','sunita.rao@nexus.edu','+91-9876500007',(SELECT id FROM d WHERE code='ECE'),'Associate Professor','2016-03-14'),
  ('FAC008','Dr. Abhishek Menon','abhishek.menon@nexus.edu','+91-9876500008',(SELECT id FROM d WHERE code='ECE'),'Assistant Professor','2020-07-22'),
  ('FAC009','Dr. Priya Nair','priya.nair@nexus.edu','+91-9876500009',(SELECT id FROM d WHERE code='MECH'),'Professor','2011-01-05'),
  ('FAC010','Prof. Rajesh Khanna','rajesh.khanna@nexus.edu','+91-9876500010',(SELECT id FROM d WHERE code='MECH'),'Associate Professor','2015-11-10'),
  ('FAC011','Dr. Sanjay Patel','sanjay.patel@nexus.edu','+91-9876500011',(SELECT id FROM d WHERE code='MECH'),'Lecturer','2022-02-01'),
  ('FAC012','Dr. Lakshmi Krishnan','lakshmi.k@nexus.edu','+91-9876500012',(SELECT id FROM d WHERE code='EEE'),'Professor','2014-04-18'),
  ('FAC013','Prof. Arjun Malhotra','arjun.m@nexus.edu','+91-9876500013',(SELECT id FROM d WHERE code='EEE'),'Assistant Professor','2018-08-25'),
  ('FAC014','Dr. Divya Bhat','divya.bhat@nexus.edu','+91-9876500014',(SELECT id FROM d WHERE code='CIVIL'),'Professor','2010-09-09'),
  ('FAC015','Prof. Manoj Deshmukh','manoj.d@nexus.edu','+91-9876500015',(SELECT id FROM d WHERE code='CIVIL'),'Associate Professor','2017-12-03'),
  ('FAC016','Dr. Kavya Menon','kavya.m@nexus.edu','+91-9876500016',(SELECT id FROM d WHERE code='CIVIL'),'Lecturer','2023-01-20'),
  ('FAC017','Dr. Nikhil Joshi','nikhil.j@nexus.edu','+91-9876500017',(SELECT id FROM d WHERE code='MBA'),'Professor','2009-06-15'),
  ('FAC018','Prof. Riya Chatterjee','riya.c@nexus.edu','+91-9876500018',(SELECT id FROM d WHERE code='MBA'),'Associate Professor','2016-10-05'),
  ('FAC019','Dr. Aditya Bansal','aditya.b@nexus.edu','+91-9876500019',(SELECT id FROM d WHERE code='CSE'),'Assistant Professor','2020-11-12'),
  ('FAC020','Prof. Isha Grover','isha.g@nexus.edu','+91-9876500020',(SELECT id FROM d WHERE code='ECE'),'Lecturer','2023-08-01'),
  ('FAC021','Dr. Suresh Pillai','suresh.p@nexus.edu','+91-9876500021',(SELECT id FROM d WHERE code='MECH'),'Assistant Professor','2019-04-16'),
  ('FAC022','Prof. Anjali Rao','anjali.rao@nexus.edu','+91-9876500022',(SELECT id FROM d WHERE code='EEE'),'Lecturer','2022-07-30'),
  ('FAC023','Dr. Ramesh Gupta','ramesh.g@nexus.edu','+91-9876500023',(SELECT id FROM d WHERE code='CIVIL'),'Professor','2012-02-14'),
  ('FAC024','Prof. Tanvi Shah','tanvi.s@nexus.edu','+91-9876500024',(SELECT id FROM d WHERE code='MBA'),'Assistant Professor','2019-09-19'),
  ('FAC025','Dr. Farhan Ali','farhan.ali@nexus.edu','+91-9876500025',(SELECT id FROM d WHERE code='CSE'),'Associate Professor','2016-11-22');

-- Students (60 across departments/semesters)
INSERT INTO public.students (roll_no, full_name, email, phone, department_id, semester, admission_year, status)
SELECT
  'S' || TO_CHAR(g, 'FM0000'),
  (ARRAY['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Rohan','Kabir','Yuvraj','Aryan','Dhruv','Anaya','Aadhya','Kiara','Diya','Saanvi','Aarohi','Ananya','Pari','Myra','Ira','Riya','Sara','Zara','Nisha','Tara'])[1 + (g % 30)] ||
    ' ' ||
    (ARRAY['Sharma','Verma','Patel','Reddy','Iyer','Nair','Menon','Kapoor','Malhotra','Khan','Singh','Gupta','Joshi','Rao','Shah','Bhat','Desai','Pillai','Chopra','Ahuja'])[1 + (g % 20)],
  'student' || g || '@nexus.edu',
  '+91-98765' || LPAD((10000 + g)::TEXT, 5, '0'),
  (SELECT id FROM public.departments ORDER BY code OFFSET (g % 6) LIMIT 1),
  1 + (g % 8),
  2022 + (g % 4),
  CASE WHEN g % 25 = 0 THEN 'inactive' ELSE 'active' END
FROM generate_series(1, 60) g;

-- Fees for each student
INSERT INTO public.fees (student_id, category, amount, due_date, status, paid_at)
SELECT
  s.id,
  (ARRAY['tuition','hostel','library','exam','transport'])[1 + (row_number() OVER (PARTITION BY s.id) - 1)::INT % 5],
  (ARRAY[45000, 22000, 1500, 3500, 8000])[1 + (row_number() OVER (PARTITION BY s.id) - 1)::INT % 5],
  CURRENT_DATE + ((row_number() OVER (PARTITION BY s.id) * 15) || ' days')::INTERVAL,
  CASE WHEN random() < 0.55 THEN 'paid' WHEN random() < 0.85 THEN 'pending' ELSE 'overdue' END,
  CASE WHEN random() < 0.55 THEN now() - (random() * 60 || ' days')::INTERVAL ELSE NULL END
FROM public.students s, generate_series(1,2);

-- Books
INSERT INTO public.books (isbn, title, author, category, total_copies, available_copies) VALUES
  ('978-0262033848','Introduction to Algorithms','Cormen, Leiserson, Rivest, Stein','Computer Science',8,5),
  ('978-0132350884','Clean Code','Robert C. Martin','Computer Science',6,4),
  ('978-0201633610','Design Patterns','Erich Gamma et al.','Computer Science',5,3),
  ('978-0134685991','Effective Java','Joshua Bloch','Computer Science',5,2),
  ('978-1491950296','Designing Data-Intensive Applications','Martin Kleppmann','Computer Science',7,6),
  ('978-0596007126','Head First Design Patterns','Eric Freeman','Computer Science',4,4),
  ('978-1593279509','Eloquent JavaScript','Marijn Haverbeke','Computer Science',6,5),
  ('978-0135957059','The Pragmatic Programmer','David Thomas','Computer Science',5,3),
  ('978-0134494166','Clean Architecture','Robert C. Martin','Computer Science',4,2),
  ('978-1492077992','Fundamentals of Software Architecture','Mark Richards','Computer Science',3,3),
  ('978-0136042594','Artificial Intelligence: A Modern Approach','Russell & Norvig','Computer Science',6,4),
  ('978-0387310732','Pattern Recognition and Machine Learning','Christopher Bishop','Computer Science',5,3),
  ('978-0262035613','Deep Learning','Ian Goodfellow','Computer Science',7,5),
  ('978-1449355739','Learning Python','Mark Lutz','Computer Science',8,7),
  ('978-1617294945','Grokking Algorithms','Aditya Bhargava','Computer Science',6,4),
  ('978-0136156062','Software Engineering','Ian Sommerville','Computer Science',5,3),
  ('978-0132126953','Computer Networks','Andrew S. Tanenbaum','Computer Science',6,5),
  ('978-0132777223','Operating System Concepts','Silberschatz','Computer Science',7,4),
  ('978-0073523323','Database System Concepts','Silberschatz, Korth','Computer Science',6,3),
  ('978-0201896831','The Art of Computer Programming','Donald Knuth','Computer Science',4,2),
  ('978-0521861533','Signals and Systems','Alan Oppenheim','Electronics',4,3),
  ('978-0470547724','Microelectronic Circuits','Sedra/Smith','Electronics',5,4),
  ('978-0132453370','Digital Design','M. Morris Mano','Electronics',4,3),
  ('978-0470128664','Fundamentals of Electric Circuits','Alexander & Sadiku','Electronics',5,4),
  ('978-0136012443','Communication Systems','Simon Haykin','Electronics',3,2),
  ('978-1259696541','Engineering Mechanics','R.C. Hibbeler','Mechanical',6,5),
  ('978-0073398174','Thermodynamics: An Engineering Approach','Cengel & Boles','Mechanical',5,3),
  ('978-1259696541','Fluid Mechanics','Frank M. White','Mechanical',4,3),
  ('978-0071310079','Shigley''s Mechanical Engineering Design','Budynas & Nisbett','Mechanical',5,4),
  ('978-0132145510','Electric Machinery Fundamentals','Stephen J. Chapman','Electrical',4,3),
  ('978-0073404387','Power System Analysis','John J. Grainger','Electrical',3,2),
  ('978-0134746500','Structural Analysis','R.C. Hibbeler','Civil',5,4),
  ('978-0071086783','Reinforced Concrete Design','George F. Limbrunner','Civil',4,3),
  ('978-0132814171','Principles of Marketing','Kotler & Armstrong','Business',6,5),
  ('978-1259912191','Financial Accounting','Libby, Libby, Hodge','Business',5,4),
  ('978-1305506381','Management','Richard L. Daft','Business',5,3),
  ('978-0596517748','JavaScript: The Good Parts','Douglas Crockford','Computer Science',4,3),
  ('978-1449331818','Learning React','Alex Banks','Computer Science',6,5),
  ('978-1617294136','You Don''t Know JS Yet','Kyle Simpson','Computer Science',5,4),
  ('978-0134757599','Refactoring','Martin Fowler','Computer Science',4,2);

-- Timetable: sample slots for CSE semester 3
WITH sub AS (SELECT id, code FROM public.subjects),
     fac AS (SELECT id, employee_id FROM public.faculty),
     dep AS (SELECT id FROM public.departments WHERE code='CSE')
INSERT INTO public.timetable (subject_id, faculty_id, department_id, semester, day_of_week, start_time, end_time, room)
SELECT * FROM (VALUES
  ((SELECT id FROM sub WHERE code='CS301'),(SELECT id FROM fac WHERE employee_id='FAC001'),(SELECT id FROM dep),3,1,'09:00'::time,'10:00'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS302'),(SELECT id FROM fac WHERE employee_id='FAC002'),(SELECT id FROM dep),3,1,'10:15'::time,'11:15'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS303'),(SELECT id FROM fac WHERE employee_id='FAC003'),(SELECT id FROM dep),3,1,'11:30'::time,'12:30'::time,'A-102'),
  ((SELECT id FROM sub WHERE code='CS301'),(SELECT id FROM fac WHERE employee_id='FAC001'),(SELECT id FROM dep),3,2,'09:00'::time,'10:00'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS303'),(SELECT id FROM fac WHERE employee_id='FAC003'),(SELECT id FROM dep),3,2,'10:15'::time,'11:15'::time,'A-102'),
  ((SELECT id FROM sub WHERE code='CS302'),(SELECT id FROM fac WHERE employee_id='FAC002'),(SELECT id FROM dep),3,3,'09:00'::time,'10:00'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS301'),(SELECT id FROM fac WHERE employee_id='FAC001'),(SELECT id FROM dep),3,3,'11:30'::time,'12:30'::time,'A-103'),
  ((SELECT id FROM sub WHERE code='CS303'),(SELECT id FROM fac WHERE employee_id='FAC003'),(SELECT id FROM dep),3,4,'09:00'::time,'10:00'::time,'Lab-1'),
  ((SELECT id FROM sub WHERE code='CS302'),(SELECT id FROM fac WHERE employee_id='FAC002'),(SELECT id FROM dep),3,4,'10:15'::time,'11:15'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS301'),(SELECT id FROM fac WHERE employee_id='FAC001'),(SELECT id FROM dep),3,5,'09:00'::time,'10:00'::time,'A-101'),
  ((SELECT id FROM sub WHERE code='CS302'),(SELECT id FROM fac WHERE employee_id='FAC002'),(SELECT id FROM dep),3,5,'11:30'::time,'12:30'::time,'A-102')
) v;

-- Exams
INSERT INTO public.exams (subject_id, title, exam_type, exam_date, start_time, duration_minutes, max_marks, room)
SELECT s.id, 'Midterm - ' || s.name, 'midterm', CURRENT_DATE + (row_number() OVER () || ' days')::INTERVAL, '10:00'::time, 120, 100, 'Hall-' || (1 + (row_number() OVER () % 4))
FROM public.subjects s LIMIT 12;

INSERT INTO public.exams (subject_id, title, exam_type, exam_date, start_time, duration_minutes, max_marks, room)
SELECT s.id, 'Final - ' || s.name, 'final', CURRENT_DATE + ((30 + row_number() OVER ()) || ' days')::INTERVAL, '14:00'::time, 180, 100, 'Hall-' || (1 + (row_number() OVER () % 4))
FROM public.subjects s LIMIT 8;

-- Announcements
INSERT INTO public.announcements (title, body, audience, priority) VALUES
  ('Welcome to Semester Fall 2026', 'Classes begin from Monday. Please check your timetable and report to your first lecture on time.', 'all', 'high'),
  ('Library Timings Extended', 'The Central Library will remain open until 10 PM on weekdays starting this week.', 'all', 'normal'),
  ('Midterm Examinations Schedule', 'Midterm exams start in 2 weeks. Please prepare and revise thoroughly.', 'students', 'high'),
  ('Faculty Development Program', 'A 3-day FDP on AI in Education will be held in the seminar hall next Monday.', 'faculty', 'normal'),
  ('Fee Payment Reminder', 'Tuition fees for this semester are due by end of the month. Late payments will attract a penalty.', 'students', 'urgent'),
  ('Campus Wi-Fi Maintenance', 'Wi-Fi will be unavailable Saturday 2 AM - 5 AM due to scheduled maintenance.', 'all', 'low'),
  ('Placement Drive: TechCorp', 'On-campus placement drive by TechCorp on Oct 15. Register by Oct 10 with the T&P cell.', 'students', 'high'),
  ('New Books Added to Library', 'Over 40 new titles across CSE, ECE, and Mechanical have been added to the catalogue.', 'all', 'normal');

-- Events
INSERT INTO public.events (title, description, location, category, start_at, end_at) VALUES
  ('Freshers Orientation', 'Welcome ceremony and campus tour for new admissions.', 'Main Auditorium', 'academic', now() + interval '3 days', now() + interval '3 days 4 hours'),
  ('Hackathon 2026', '24-hour coding marathon with prizes worth ₹2 lakh.', 'Innovation Lab', 'workshop', now() + interval '10 days', now() + interval '11 days'),
  ('Annual Sports Meet', 'Inter-department athletic championship.', 'Sports Complex', 'sports', now() + interval '15 days', now() + interval '17 days'),
  ('Cultural Fest - Rhythm', 'Music, dance, drama and food stalls.', 'Open Ground', 'cultural', now() + interval '25 days', now() + interval '27 days'),
  ('Guest Lecture: Dr. Chen', 'Frontiers of Quantum Computing.', 'Seminar Hall B', 'academic', now() + interval '5 days', now() + interval '5 days 2 hours'),
  ('Industry Visit - ISRO', 'Educational tour for Mechanical and ECE students.', 'ISRO Campus', 'academic', now() + interval '20 days', now() + interval '20 days 8 hours'),
  ('Diwali Holiday', 'College closed for Diwali celebrations.', 'Campus', 'holiday', now() + interval '35 days', now() + interval '39 days');

-- Grades: assign for first 5 exams to random students
INSERT INTO public.grades (exam_id, student_id, marks, grade)
SELECT e.id, s.id,
  ROUND((40 + random() * 60)::numeric, 2),
  CASE
    WHEN random() < 0.15 THEN 'A+'
    WHEN random() < 0.35 THEN 'A'
    WHEN random() < 0.65 THEN 'B'
    WHEN random() < 0.85 THEN 'C'
    ELSE 'D'
  END
FROM (SELECT id FROM public.exams LIMIT 5) e
CROSS JOIN (SELECT id FROM public.students LIMIT 20) s;

-- Attendance: last 14 days for first 30 students across a few subjects
INSERT INTO public.attendance (student_id, subject_id, date, status)
SELECT s.id, sub.id, d::date,
  CASE WHEN random() < 0.82 THEN 'present' WHEN random() < 0.92 THEN 'late' ELSE 'absent' END
FROM (SELECT id FROM public.students LIMIT 30) s
CROSS JOIN (SELECT id FROM public.subjects WHERE code IN ('CS301','CS302','CS303') LIMIT 3) sub
CROSS JOIN generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day'::interval) d
ON CONFLICT DO NOTHING;