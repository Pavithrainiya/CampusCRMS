import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from api.views import ResourceReviewViewSet
from api.models import User, Resource

admin = User.objects.filter(role='Admin').first()
student = User.objects.filter(role='Student').first() or admin
resource = Resource.objects.first()

print("User:", student)
print("Resource:", resource, "ID:", resource.id if resource else None)

if student and resource:
    factory = APIRequestFactory()
    data = {
        "resource": resource.id,
        "rating": 5,
        "comment": "Test review from scratch script"
    }
    request = factory.post('/api/reviews', data, format='json')
    force_authenticate(request, user=student)
    
    view = ResourceReviewViewSet.as_view({'post': 'create'})
    response = view(request)
    print("Response status:", response.status_code)
    print("Response data:", response.data)
