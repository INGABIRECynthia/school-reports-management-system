const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /grades
router.get('/', (req, res) => {
  const { class_name, term, year } = req.query;
  const classes = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all().map(r => r.class_name);
  const years = db.prepare('SELECT DISTINCT year FROM students ORDER BY year DESC').all().map(r => r.year);
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  let grades = [];
  if (class_name && term && year) {
    grades = db.prepare(`
      SELECT g.id, s.name AS student_name, s.student_id, c.name AS course_name, c.code,
             g.marks, g.max_marks, g.term, g.year
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN courses c ON g.course_id = c.id
      WHERE s.class_name = ? AND g.term = ? AND g.year = ?
      ORDER BY s.name, c.name
    `).all(class_name, term, parseInt(year));
  }

  res.render('grades/index', { grades, classes, years, terms, filters: { class_name, term, year }, success: req.flash('success'), error: req.flash('error') });
});

// GET /grades/enter
router.get('/enter', (req, res) => {
  const students = db.prepare('SELECT id, name, student_id, class_name FROM students ORDER BY class_name, name').all();
  const courses = db.prepare('SELECT id, code, name, class_name FROM courses ORDER BY class_name, name').all();
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);
  res.render('grades/form', { students, courses, terms, years, error: req.flash('error') });
});

// POST /grades
router.post('/', (req, res) => {
  const { student_id, course_id, term, year, marks, max_marks } = req.body;
  if (!student_id || !course_id || !term || !year || marks === undefined) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/grades/enter');
  }
  const marksVal = parseFloat(marks);
  const maxVal = parseFloat(max_marks) || 100;
  if (isNaN(marksVal) || marksVal < 0 || marksVal > maxVal) {
    req.flash('error', `Marks must be between 0 and ${maxVal}.`);
    return res.redirect('/grades/enter');
  }
  try {
    db.prepare(`
      INSERT INTO grades (student_id, course_id, term, year, marks, max_marks)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id, term, year) DO UPDATE SET marks = excluded.marks, max_marks = excluded.max_marks
    `).run(parseInt(student_id), parseInt(course_id), term, parseInt(year), marksVal, maxVal);
    req.flash('success', 'Grade saved successfully.');
    res.redirect('/grades');
  } catch (err) {
    req.flash('error', 'Failed to save grade: ' + err.message);
    res.redirect('/grades/enter');
  }
});

// DELETE /grades/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id);
  req.flash('success', 'Grade deleted.');
  res.redirect('back');
});

module.exports = router;
