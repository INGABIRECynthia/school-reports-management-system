from django.urls import path

from . import views

app_name = 'reports'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('students/', views.student_list, name='student_list'),
    path('students/<int:pk>/', views.student_detail, name='student_detail'),
    path(
        'students/<int:student_pk>/term/<int:term_pk>/',
        views.term_report,
        name='term_report',
    ),
    path(
        'students/<int:student_pk>/year/<int:year_pk>/',
        views.year_report,
        name='year_report',
    ),
]
