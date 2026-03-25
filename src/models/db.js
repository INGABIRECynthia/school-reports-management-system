const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/school.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    teacher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    term TEXT NOT NULL,
    year INTEGER NOT NULL,
    marks REAL NOT NULL,
    max_marks REAL NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id, term, year),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );
`);

// Seed default admin user — change the password via the DB or add a profile page in production
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@school.com');
if (!adminExists) {
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashed = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')").run(
    'Administrator', 'admin@school.com', hashed
  );
}

// Seed sample data for demonstration
const studentCount = db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt;
if (studentCount === 0) {
  const insertStudent = db.prepare('INSERT INTO students (student_id, name, class_name, year) VALUES (?, ?, ?, ?)');
  const students = [
    ['S001', 'Alice Johnson', 'Form 1', 2024],
    ['S002', 'Bob Smith', 'Form 1', 2024],
    ['S003', 'Carol White', 'Form 2', 2024],
    ['S004', 'David Brown', 'Form 2', 2024],
    ['S005', 'Eve Davis', 'Form 3', 2024],
  ];
  students.forEach(s => insertStudent.run(...s));

  const insertCourse = db.prepare('INSERT INTO courses (code, name, class_name) VALUES (?, ?, ?)');
  const courses = [
    ['MATH1', 'Mathematics', 'Form 1'],
    ['ENG1', 'English', 'Form 1'],
    ['SCI1', 'Science', 'Form 1'],
    ['MATH2', 'Mathematics', 'Form 2'],
    ['ENG2', 'English', 'Form 2'],
    ['SCI2', 'Science', 'Form 2'],
    ['MATH3', 'Mathematics', 'Form 3'],
    ['ENG3', 'English', 'Form 3'],
    ['SCI3', 'Science', 'Form 3'],
  ];
  courses.forEach(c => insertCourse.run(...c));

  const s1 = db.prepare('SELECT id FROM students WHERE student_id = ?').get('S001').id;
  const s2 = db.prepare('SELECT id FROM students WHERE student_id = ?').get('S002').id;
  const s3 = db.prepare('SELECT id FROM students WHERE student_id = ?').get('S003').id;
  const c1 = db.prepare('SELECT id FROM courses WHERE code = ?').get('MATH1').id;
  const c2 = db.prepare('SELECT id FROM courses WHERE code = ?').get('ENG1').id;
  const c3 = db.prepare('SELECT id FROM courses WHERE code = ?').get('SCI1').id;

  const insertGrade = db.prepare('INSERT OR IGNORE INTO grades (student_id, course_id, term, year, marks) VALUES (?, ?, ?, ?, ?)');
  const grades = [
    [s1, c1, 'Term 1', 2024, 85], [s1, c2, 'Term 1', 2024, 78], [s1, c3, 'Term 1', 2024, 92],
    [s2, c1, 'Term 1', 2024, 72], [s2, c2, 'Term 1', 2024, 65], [s2, c3, 'Term 1', 2024, 80],
    [s3, c1, 'Term 1', 2024, 88], [s3, c2, 'Term 1', 2024, 95], [s3, c3, 'Term 1', 2024, 76],
  ];
  grades.forEach(g => insertGrade.run(...g));
}

module.exports = db;
