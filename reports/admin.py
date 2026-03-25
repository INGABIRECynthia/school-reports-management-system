from django.contrib import admin

from .models import AcademicYear, Course, Grade, Student, Term


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'max_score')
    search_fields = ('code', 'name')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'last_name', 'first_name', 'class_level')
    search_fields = ('student_id', 'first_name', 'last_name')
    list_filter = ('class_level',)


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ('academic_year', 'term_number', 'start_date', 'end_date')
    list_filter = ('academic_year',)


class GradeInline(admin.TabularInline):
    model = Grade
    extra = 0
    fields = ('course', 'term', 'score')


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'term', 'score', 'percentage', 'letter_grade')
    list_filter = ('term__academic_year', 'term', 'course')
    search_fields = ('student__first_name', 'student__last_name', 'student__student_id')

    def percentage(self, obj):
        return f"{obj.percentage()}%"

    def letter_grade(self, obj):
        return obj.letter_grade()
