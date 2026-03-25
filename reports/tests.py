from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from .models import AcademicYear, Course, Grade, Student, Term


class ModelStrTests(TestCase):
    def setUp(self):
        self.year = AcademicYear.objects.create(name='2024/2025')
        self.course = Course.objects.create(name='Mathematics', code='MATH', max_score=100)
        self.student = Student.objects.create(
            student_id='S001', first_name='Alice', last_name='Doe', class_level='S1'
        )
        self.term = Term.objects.create(academic_year=self.year, term_number=1)

    def test_academic_year_str(self):
        self.assertEqual(str(self.year), '2024/2025')

    def test_course_str(self):
        self.assertIn('MATH', str(self.course))

    def test_student_str(self):
        self.assertIn('S001', str(self.student))

    def test_student_full_name(self):
        self.assertEqual(self.student.full_name, 'Alice Doe')

    def test_term_str(self):
        self.assertIn('First Term', str(self.term))
        self.assertIn('2024/2025', str(self.term))

    def test_grade_percentage(self):
        grade = Grade.objects.create(
            student=self.student, course=self.course, term=self.term, score=Decimal('75')
        )
        self.assertEqual(grade.percentage(), 75.0)

    def test_grade_letter_A(self):
        grade = Grade.objects.create(
            student=self.student, course=self.course, term=self.term, score=Decimal('85')
        )
        self.assertEqual(grade.letter_grade(), 'A')

    def test_grade_letter_F(self):
        grade = Grade.objects.create(
            student=self.student, course=self.course, term=self.term, score=Decimal('40')
        )
        self.assertEqual(grade.letter_grade(), 'F')


class DashboardViewTests(TestCase):
    def test_dashboard_loads(self):
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'School Reports')

    def test_student_list_loads(self):
        response = self.client.get(reverse('reports:student_list'))
        self.assertEqual(response.status_code, 200)


class TermReportViewTests(TestCase):
    def setUp(self):
        self.year = AcademicYear.objects.create(name='2024/2025')
        self.term1 = Term.objects.create(academic_year=self.year, term_number=1)
        self.term2 = Term.objects.create(academic_year=self.year, term_number=2)
        self.term3 = Term.objects.create(academic_year=self.year, term_number=3)
        self.course = Course.objects.create(name='Science', code='SCI', max_score=100)
        self.student = Student.objects.create(
            student_id='S002', first_name='Bob', last_name='Smith', class_level='S2'
        )
        Grade.objects.create(
            student=self.student, course=self.course, term=self.term1, score=Decimal('72')
        )
        Grade.objects.create(
            student=self.student, course=self.course, term=self.term2, score=Decimal('80')
        )
        Grade.objects.create(
            student=self.student, course=self.course, term=self.term3, score=Decimal('88')
        )

    def test_term_report_first_term(self):
        url = reverse('reports:term_report', args=[self.student.pk, self.term1.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'First Term')
        self.assertContains(response, '72')

    def test_term_report_second_term(self):
        url = reverse('reports:term_report', args=[self.student.pk, self.term2.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Second Term')
        self.assertContains(response, '80')

    def test_term_report_third_term(self):
        url = reverse('reports:term_report', args=[self.student.pk, self.term3.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Third Term')
        self.assertContains(response, '88')

    def test_year_report(self):
        url = reverse('reports:year_report', args=[self.student.pk, self.year.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Year Report Card')
        self.assertContains(response, '2024/2025')
        # Average of 72, 80, 88 = 80
        self.assertContains(response, '80')

    def test_student_detail_shows_report_links(self):
        url = reverse('reports:student_detail', args=[self.student.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Year Report')
        self.assertContains(response, 'First Term')
        self.assertContains(response, 'Second Term')
        self.assertContains(response, 'Third Term')
