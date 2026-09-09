from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, RegisterView,
    UserViewSet, ResourceViewSet, BookingViewSet, NotificationViewSet,
    StatsView
)

# Use trailing_slash=False to match the exact requirements of the endpoints
router = DefaultRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='user')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('register', RegisterView.as_view(), name='register'),
    path('admin/stats', StatsView.as_view(), name='admin-stats'),
    path('', include(router.urls)),
]

