const express = require('express');
const router = express.Router();
const db = require('../models/db');

function getGrade(percentage) {
  if (percentage >= 80) return { grade: 'A', remarks: 'Excellent' };
  if (percentage >= 70) return { grade: 'B', remarks: 'Very Good' };
  if (percentage >= 60) return { grade: 'C', remarks: 'Good' };
  if (percentage >= 50) return { grade: 'D', remarks: 'Pass' };
  return { grade: 'F', remarks: 'Fail' };
}

// GET /reports — filter form
router.get('/', (req, res) => {
  const classes = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all().map(r => r.class_name);
  const years = db.prepare('SELECT DISTINCT year FROM students ORDER BY year DESC').all().map(r => r.year);
  const terms = ['Term 1', 'Term 2', 'Term 3', 'Annual'];
  res.render('reports/index', { classes, years, terms, report: null, filters: {}, success: req.flash('success'), error: req.flash('error') });
});

// GET /reports/generate — show generated report
router.get('/generate', (req, res) => {
  const { class_name, term, year, student_id } = req.query;
  const classes = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all().map(r => r.class_name);
  const years = db.prepare('SELECT DISTINCT year FROM students ORDER BY year DESC').all().map(r => r.year);
  const terms = ['Term 1', 'Term 2', 'Term 3', 'Annual'];

  if (!class_name || !year) {
    req.flash('error', 'Please select a class and year.');
    return res.redirect('/reports');
  }

  const yearInt = parseInt(year);
  let reportData = [];

  if (term === 'Annual') {
    // Annual: average across all 3 terms
    const students = student_id
      ? db.prepare('SELECT * FROM students WHERE id = ? AND class_name = ?').all(parseInt(student_id), class_name)
      : db.prepare('SELECT * FROM students WHERE class_name = ? AND year = ? ORDER BY name').all(class_name, yearInt);

    const courses = db.prepare('SELECT * FROM courses WHERE class_name = ? ORDER BY name').all(class_name);

    reportData = students.map(student => {
      const courseRows = courses.map(course => {
        const termGrades = db.prepare(`
          SELECT marks, max_marks FROM grades
          WHERE student_id = ? AND course_id = ? AND year = ?
        `).all(student.id, course.id, yearInt);

        if (termGrades.length === 0) return null;
        const totalMarks = termGrades.reduce((s, g) => s + g.marks, 0);
        const totalMax = termGrades.reduce((s, g) => s + g.max_marks, 0);
        const pct = (totalMarks / totalMax) * 100;
        return { course, marks: totalMarks.toFixed(1), max_marks: totalMax, percentage: pct.toFixed(1), ...getGrade(pct) };
      }).filter(Boolean);

      if (courseRows.length === 0) return null;
      const overallPct = courseRows.reduce((s, r) => s + parseFloat(r.percentage), 0) / courseRows.length;
      return { student, courseRows, overallPct: overallPct.toFixed(1), ...getGrade(overallPct) };
    }).filter(Boolean);
  } else {
    // Single term report
    const students = student_id
      ? db.prepare('SELECT * FROM students WHERE id = ? AND class_name = ?').all(parseInt(student_id), class_name)
      : db.prepare('SELECT * FROM students WHERE class_name = ? AND year = ? ORDER BY name').all(class_name, yearInt);

    const courses = db.prepare('SELECT * FROM courses WHERE class_name = ? ORDER BY name').all(class_name);

    reportData = students.map(student => {
      const courseRows = courses.map(course => {
        const g = db.prepare('SELECT * FROM grades WHERE student_id = ? AND course_id = ? AND term = ? AND year = ?')
          .get(student.id, course.id, term, yearInt);
        if (!g) return null;
        const pct = (g.marks / g.max_marks) * 100;
        return { course, marks: g.marks, max_marks: g.max_marks, percentage: pct.toFixed(1), ...getGrade(pct) };
      }).filter(Boolean);

      if (courseRows.length === 0) return null;
      const overallPct = courseRows.reduce((s, r) => s + parseFloat(r.percentage), 0) / courseRows.length;
      return { student, courseRows, overallPct: overallPct.toFixed(1), ...getGrade(overallPct) };
    }).filter(Boolean);
  }

  // Add class rank
  const sorted = [...reportData].sort((a, b) => parseFloat(b.overallPct) - parseFloat(a.overallPct));
  reportData = reportData.map(r => ({ ...r, rank: sorted.findIndex(s => s.student.id === r.student.id) + 1 }));

  const students = db.prepare('SELECT id, name, student_id FROM students WHERE class_name = ? AND year = ? ORDER BY name').all(class_name, yearInt);

  res.render('reports/generate', {
    reportData, classes, years, terms, students,
    filters: { class_name, term, year, student_id },
    success: req.flash('success'), error: req.flash('error')
  });
});

module.exports = router;
