from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from api.models import Resource, Booking
from api.serializers import UserSerializer, BookingSerializer
import datetime as dt

User = get_user_model()

class CampusRMSTestCase(TestCase):
    def setUp(self):
        # Create standard users
        self.admin = User.objects.create_superuser(
            email='admin@test.com',
            password='AdminPassword@123',
            name='Admin User',
            phone='1111111111'
        )
        self.student = User.objects.create_user(
            email='student@test.com',
            password='StudentPassword@123',
            name='Student User',
            phone='2222222222',
            role='Student'
        )
        
        # Create resources
        self.lab = Resource.objects.create(
            resource_name='Lab A',
            resource_type='Lab',
            capacity=30,
            availability_status=True,
            created_by=self.admin
        )
        self.classroom = Resource.objects.create(
            resource_name='Classroom 101',
            resource_type='Classroom',
            capacity=50,
            availability_status=True,
            created_by=self.admin
        )

    def test_password_strength_validation(self):
        # Weak password (no special char)
        data = {
            'email': 'newuser@test.com',
            'name': 'New User',
            'phone': '3333333333',
            'password': 'WeakPassword123'
        }
        serializer = UserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
        
        # Strong password
        data['password'] = 'StrongPass@1234'
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_booking_past_date_validation(self):
        factory = APIRequestFactory()
        request = factory.post('/api/bookings')
        request.user = self.student

        past_date = dt.date.today() - dt.timedelta(days=1)
        data = {
            'resource': self.lab.id,
            'booking_date': past_date,
            'time_slot': '09:00 AM - 11:00 AM',
            'purpose': 'Study session'
        }
        serializer = BookingSerializer(data=data, context={'request': request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('booking_date', serializer.errors)

    def test_prevent_double_booking_same_resource(self):
        factory = APIRequestFactory()
        request = factory.post('/api/bookings')
        request.user = self.student
        
        booking_date = dt.date.today() + dt.timedelta(days=2)
        time_slot = '01:00 PM - 03:00 PM'
        
        # First booking - Approved
        Booking.objects.create(
            user=self.student,
            resource=self.lab,
            booking_date=booking_date,
            time_slot=time_slot,
            purpose='Lecture',
            status='Approved'
        )
        
        # Second booking for same resource and time slot
        data = {
            'resource': self.lab.id,
            'booking_date': booking_date,
            'time_slot': time_slot,
            'purpose': 'Lab Practice'
        }
        serializer = BookingSerializer(data=data, context={'request': request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('resource', serializer.errors)

    def test_prevent_user_collision_same_time_slot(self):
        factory = APIRequestFactory()
        request = factory.post('/api/bookings')
        request.user = self.student
        
        booking_date = dt.date.today() + dt.timedelta(days=2)
        time_slot = '03:00 PM - 05:00 PM'
        
        # Student already has an approved booking for Classroom 101
        Booking.objects.create(
            user=self.student,
            resource=self.classroom,
            booking_date=booking_date,
            time_slot=time_slot,
            purpose='Exam',
            status='Approved'
        )
        
        # Student tries to book Lab A for the same time slot
        data = {
            'resource': self.lab.id,
            'booking_date': booking_date,
            'time_slot': time_slot,
            'purpose': 'Self Study'
        }
        serializer = BookingSerializer(data=data, context={'request': request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('time_slot', serializer.errors)
