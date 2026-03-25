const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE via forms
app.use(methodOverride('_method'));

// Cookie parser (required by csrf-csrf)
app.use(cookieParser());

// Session
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && isProduction) {
  throw new Error('SESSION_SECRET environment variable must be set in production.');
}
app.use(session({
  secret: sessionSecret || 'school-reports-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax'
  }
}));

// Flash messages
app.use(flash());

// CSRF protection
const csrfSecret = process.env.CSRF_SECRET || 'school-reports-csrf-secret-change-me';
const csrfCookieName = isProduction ? '__Host-csrf-token' : 'csrf-token';
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.session.id || req.ip,
  cookieName: csrfCookieName,
  cookieOptions: { secure: isProduction, sameSite: 'lax', path: '/', httpOnly: true },
  size: 64,
  getCsrfTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token'],
});
app.use(doubleCsrfProtection);

// Make user and CSRF token available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    name: req.session.userName,
    role: req.session.userRole
  } : null;
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});

// Rate limiter for auth routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
});

// General rate limiter for authenticated routes
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page.');
    return res.redirect('/auth/login');
  }
  next();
}

// Routes
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/students');
const courseRoutes = require('./src/routes/courses');
const gradeRoutes = require('./src/routes/grades');
const reportRoutes = require('./src/routes/reports');

app.use('/auth', authLimiter, authRoutes);
app.use('/students', requireAuth, generalLimiter, studentRoutes);
app.use('/courses', requireAuth, generalLimiter, courseRoutes);
app.use('/grades', requireAuth, generalLimiter, gradeRoutes);
app.use('/reports', requireAuth, generalLimiter, reportRoutes);

// Home → redirect
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// Dashboard
app.get('/dashboard', requireAuth, generalLimiter, (req, res) => {
  const db = require('./src/models/db');
  const stats = {
    students: db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt,
    courses: db.prepare('SELECT COUNT(*) as cnt FROM courses').get().cnt,
    grades: db.prepare('SELECT COUNT(*) as cnt FROM grades').get().cnt,
    classes: db.prepare('SELECT COUNT(DISTINCT class_name) as cnt FROM students').get().cnt,
  };
  const recentGrades = db.prepare(`
    SELECT s.name AS student_name, c.name AS course_name, g.marks, g.max_marks, g.term, g.year
    FROM grades g
    JOIN students s ON g.student_id = s.id
    JOIN courses c ON g.course_id = c.id
    ORDER BY g.created_at DESC LIMIT 5
  `).all();
  res.render('dashboard', { stats, recentGrades, success: req.flash('success'), error: req.flash('error') });
});

// 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', { message: 'Invalid or missing CSRF token. Please go back and try again.' });
  }
  console.error(err.stack);
  res.status(500).render('error', { message: err.message });
});

app.listen(PORT, () => {
  console.log(`School Reports Management System running at http://localhost:${PORT}`);
  console.log(`Default login: admin@school.com / admin123`);
});

module.exports = app;
