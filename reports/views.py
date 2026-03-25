from decimal import Decimal

from django.db.models import Avg, Sum
from django.shortcuts import get_object_or_404, render

from .models import AcademicYear, Course, Grade, Student, Term


def dashboard(request):
    context = {
        'student_count': Student.objects.count(),
        'course_count': Course.objects.count(),
        'academic_years': AcademicYear.objects.all(),
    }
    return render(request, 'reports/dashboard.html', context)


def student_list(request):
    students = Student.objects.all()
    return render(request, 'reports/student_list.html', {'students': students})


def student_detail(request, pk):
    student = get_object_or_404(Student, pk=pk)
    academic_years = AcademicYear.objects.all()
    return render(
        request,
        'reports/student_detail.html',
        {'student': student, 'academic_years': academic_years},
    )


def term_report(request, student_pk, term_pk):
    """Generate a report card for a student for a specific term."""
    student = get_object_or_404(Student, pk=student_pk)
    term = get_object_or_404(Term, pk=term_pk)
    grades = Grade.objects.filter(student=student, term=term).select_related('course')

    total_score = sum(g.score for g in grades)
    total_max = sum(g.course.max_score for g in grades)
    overall_pct = round((total_score / total_max) * 100, 2) if total_max else Decimal('0')

    context = {
        'student': student,
        'term': term,
        'grades': grades,
        'total_score': total_score,
        'total_max': total_max,
        'overall_pct': overall_pct,
    }
    return render(request, 'reports/term_report.html', context)


def year_report(request, student_pk, year_pk):
    """Generate a full-year report card aggregating all three terms."""
    student = get_object_or_404(Student, pk=student_pk)
    academic_year = get_object_or_404(AcademicYear, pk=year_pk)
    terms = Term.objects.filter(academic_year=academic_year).order_by('term_number')
    courses = Course.objects.all()

    # Build a matrix: course -> {term_number: grade, 'avg': average}
    report_rows = []
    for course in courses:
        row = {'course': course, 'grades': {}, 'total': Decimal('0'), 'count': 0}
        for term in terms:
            try:
                grade = Grade.objects.get(student=student, course=course, term=term)
                row['grades'][term.term_number] = grade
                row['total'] += grade.score
                row['count'] += 1
            except Grade.DoesNotExist:
                row['grades'][term.term_number] = None

        if row['count']:
            row['average'] = round(row['total'] / row['count'], 2)
            row['average_pct'] = round(
                (row['average'] / course.max_score) * 100, 2
            )
        else:
            row['average'] = None
            row['average_pct'] = None

        if any(v is not None for v in row['grades'].values()):
            report_rows.append(row)

    context = {
        'student': student,
        'academic_year': academic_year,
        'terms': terms,
        'report_rows': report_rows,
    }
    return render(request, 'reports/year_report.html', context)
