const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /students
router.get('/', (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY class_name, name').all();
  res.render('students/index', { students, success: req.flash('success'), error: req.flash('error') });
});

// GET /students/new
router.get('/new', (req, res) => {
  res.render('students/form', { student: null, error: req.flash('error') });
});

// POST /students
router.post('/', (req, res) => {
  const { student_id, name, class_name, year } = req.body;
  if (!student_id || !name || !class_name || !year) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/students/new');
  }
  try {
    db.prepare('INSERT INTO students (student_id, name, class_name, year) VALUES (?, ?, ?, ?)')
      .run(student_id.trim(), name.trim(), class_name.trim(), parseInt(year));
    req.flash('success', 'Student added successfully.');
    res.redirect('/students');
  } catch (err) {
    req.flash('error', 'Student ID already exists.');
    res.redirect('/students/new');
  }
});

// GET /students/:id/edit
router.get('/:id/edit', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) { req.flash('error', 'Student not found.'); return res.redirect('/students'); }
  res.render('students/form', { student, error: req.flash('error') });
});

// PUT /students/:id
router.put('/:id', (req, res) => {
  const { student_id, name, class_name, year } = req.body;
  if (!student_id || !name || !class_name || !year) {
    req.flash('error', 'All fields are required.');
    return res.redirect(`/students/${req.params.id}/edit`);
  }
  try {
    db.prepare('UPDATE students SET student_id = ?, name = ?, class_name = ?, year = ? WHERE id = ?')
      .run(student_id.trim(), name.trim(), class_name.trim(), parseInt(year), req.params.id);
    req.flash('success', 'Student updated successfully.');
    res.redirect('/students');
  } catch (err) {
    req.flash('error', 'Student ID already exists.');
    res.redirect(`/students/${req.params.id}/edit`);
  }
});

// DELETE /students/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grades WHERE student_id = ?').run(req.params.id);
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  req.flash('success', 'Student deleted successfully.');
  res.redirect('/students');
});

module.exports = router;
