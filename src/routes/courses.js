const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /courses
router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, u.name AS teacher_name
    FROM courses c LEFT JOIN users u ON c.teacher_id = u.id
    ORDER BY c.class_name, c.name
  `).all();
  res.render('courses/index', { courses, success: req.flash('success'), error: req.flash('error') });
});

// GET /courses/new
router.get('/new', (req, res) => {
  const teachers = db.prepare("SELECT id, name FROM users WHERE role IN ('admin','teacher')").all();
  res.render('courses/form', { course: null, teachers, error: req.flash('error') });
});

// POST /courses
router.post('/', (req, res) => {
  const { code, name, class_name, teacher_id } = req.body;
  if (!code || !name || !class_name) {
    req.flash('error', 'Code, name and class are required.');
    return res.redirect('/courses/new');
  }
  try {
    db.prepare('INSERT INTO courses (code, name, class_name, teacher_id) VALUES (?, ?, ?, ?)')
      .run(code.trim().toUpperCase(), name.trim(), class_name.trim(), teacher_id || null);
    req.flash('success', 'Course added successfully.');
    res.redirect('/courses');
  } catch (err) {
    req.flash('error', 'Course code already exists.');
    res.redirect('/courses/new');
  }
});

// GET /courses/:id/edit
router.get('/:id/edit', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) { req.flash('error', 'Course not found.'); return res.redirect('/courses'); }
  const teachers = db.prepare("SELECT id, name FROM users WHERE role IN ('admin','teacher')").all();
  res.render('courses/form', { course, teachers, error: req.flash('error') });
});

// PUT /courses/:id
router.put('/:id', (req, res) => {
  const { code, name, class_name, teacher_id } = req.body;
  if (!code || !name || !class_name) {
    req.flash('error', 'Code, name and class are required.');
    return res.redirect(`/courses/${req.params.id}/edit`);
  }
  try {
    db.prepare('UPDATE courses SET code = ?, name = ?, class_name = ?, teacher_id = ? WHERE id = ?')
      .run(code.trim().toUpperCase(), name.trim(), class_name.trim(), teacher_id || null, req.params.id);
    req.flash('success', 'Course updated successfully.');
    res.redirect('/courses');
  } catch (err) {
    req.flash('error', 'Course code already exists.');
    res.redirect(`/courses/${req.params.id}/edit`);
  }
});

// DELETE /courses/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grades WHERE course_id = ?').run(req.params.id);
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  req.flash('success', 'Course deleted successfully.');
  res.redirect('/courses');
});

module.exports = router;
