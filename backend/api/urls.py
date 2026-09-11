from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, RegisterView,
    UserViewSet, ResourceViewSet, BookingViewSet, NotificationViewSet, ResourceReviewViewSet,
    StatsView, AnalyticsView
)
from .ai_views import (
    AIAssistantView, AIRecommendView, AIOffPeakOptimizerView
)

# Use trailing_slash=False to match the exact requirements of the endpoints
router = DefaultRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='user')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ResourceReviewViewSet, basename='review')

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('register', RegisterView.as_view(), name='register'),
    path('admin/stats', StatsView.as_view(), name='admin-stats'),
    path('analytics/dashboard', AnalyticsView.as_view(), name='analytics-dashboard'),
    path('ai/chat', AIAssistantView.as_view(), name='ai-chat'),
    path('ai/recommendations', AIRecommendView.as_view(), name='ai-recommendations'),
    path('ai/offpeak', AIOffPeakOptimizerView.as_view(), name='ai-offpeak'),
    path('', include(router.urls)),
]
