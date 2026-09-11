from django.contrib.auth import authenticate, get_user_model
from django.db import models
from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Resource, Booking, Notification, AuditLog, ResourceReview
from .serializers import UserSerializer, ResourceSerializer, BookingSerializer, NotificationSerializer, ResourceReviewSerializer
from .tasks import send_booking_approved_email, send_booking_rejected_email, send_welcome_email, send_realtime_notification, send_booking_created_email, send_booking_cancelled_email
import datetime as dt
from io import BytesIO
import pandas as pd
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import threading

def run_async(func, *args, **kwargs):
    """Run email/background tasks in a daemon thread so the API responds instantly."""
    threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True).start()

User = get_user_model()

# Audit Log Helper
def log_action(user, action_desc, request=None):
    ip_addr = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_addr = x_forwarded_for.split(',')[0]
        else:
            ip_addr = request.META.get('REMOTE_ADDR')
    
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action_desc,
        ip_address=ip_addr
    )


# Custom Permissions
class IsAdminUserOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'Admin' or request.user.is_superuser)

class IsStaffOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['Staff', 'Admin']


# Authentication Views
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({"error": "Please provide both email and password."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(email=email, password=password)

        if user is None:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)

        # Update User Status Management constraint:
        # Only currently logged-in user should show ACTIVE. All others remain INACTIVE.
        User.objects.all().update(status='INACTIVE')
        user.status = 'ACTIVE'
        user.save()

        # Log User Login
        log_action(user, "User logged in", request)

        refresh = RefreshToken.for_user(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.status = 'INACTIVE'
        user.save()

        log_action(user, "User logged out", request)

        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass

        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            req_role = request.data.get('role', 'Student')
            if req_role not in ['Student', 'Staff', 'Admin']:
                req_role = 'Student'
            
            is_staff = True if req_role in ['Staff', 'Admin'] else False
            is_superuser = True if req_role == 'Admin' else False
            
            user = serializer.save(role=req_role, is_staff=is_staff, is_superuser=is_superuser)
            log_action(user, f"{req_role} account registered", request)
            
            # Send welcome email asynchronously via daemon thread
            run_async(send_welcome_email, user.id)
            
            # Generate JWT tokens for instant auto-login
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data
            
            return Response({
                'user': user_data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'message': f'{req_role} account registered successfully!'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Users CRUD (Staff / Admin)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer
    permission_classes = [IsStaffOrAdmin]


# Resources CRUD (Read: Authenticated, Write: Staff/Admin)
class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'export_csv', 'recommendations', 'seed_sample']:
            return [permissions.IsAuthenticated()]
        return [IsStaffOrAdmin()]

    @action(detail=False, methods=['post'])
    def seed_sample(self, request):
        from django.core.management import call_command
        call_command('create_sample_resources')
        return Response({"message": "Successfully populated campus facilities!"}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        resource = serializer.save(created_by=self.request.user)
        log_action(self.request.user, f"Created resource '{resource.resource_name}'", self.request)

    def perform_update(self, serializer):
        resource = serializer.save()
        log_action(self.request.user, f"Updated resource '{resource.resource_name}'", self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, f"Deleted resource '{instance.resource_name}'", self.request)
        instance.delete()

    def get_queryset(self):
        queryset = Resource.objects.all().order_by('-created_at')

        # Filter by Resource Type
        res_type = self.request.query_params.get('type')
        if res_type and res_type != 'All':
            # Map search params
            mapping = {
                'Labs': 'Lab',
                'Classrooms': 'Classroom',
                'Event Halls': 'Event Hall',
                'Computers': 'Computer',
                'Lab': 'Lab',
                'Classroom': 'Classroom',
                'Event Hall': 'Event Hall',
                'Computer': 'Computer'
            }
            mapped = mapping.get(res_type)
            if mapped:
                queryset = queryset.filter(resource_type=mapped)

        # Search by resource name or type
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(resource_name__icontains=search) |
                models.Q(resource_type__icontains=search)
            )

        return queryset

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Rank available resources using the user's booking history and optional criteria."""
        queryset = self.get_queryset().filter(availability_status=True)
        min_capacity = request.query_params.get('min_capacity')
        location = request.query_params.get('location')
        amenities = request.query_params.get('amenities')
        if min_capacity:
            queryset = queryset.filter(capacity__gte=min_capacity)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if amenities:
            for amenity in amenities.split(','):
                queryset = queryset.filter(amenities__icontains=amenity.strip())

        history = Booking.objects.filter(user=request.user, status='Approved').values_list('resource_id', flat=True)
        resources = queryset.annotate(popularity=Count('bookings')).order_by('-popularity', 'resource_name')[:10]
        return Response([
            {
                **ResourceSerializer(resource).data,
                'recommendation_reason': 'Previously booked by you' if resource.id in history else ('Popular with campus users' if resource.popularity else 'Available and matches your criteria'),
            }
            for resource in resources
        ])

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        resources = self.get_queryset()
        data = []
        for r in resources:
            data.append({
                'ID': r.id,
                'Resource Name': r.resource_name,
                'Type': r.resource_type,
                'Capacity': r.capacity,
                'Location': r.location or '',
                'Amenities': r.amenities or '',
                'Status': 'Available' if r.availability_status else 'Unavailable',
                'Avg Rating': r.reviews.aggregate(models.Avg('rating'))['rating__avg'] or 'N/A'
            })
        df = pd.DataFrame(data)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="campus_resources.csv"'
        df.to_csv(path_or_buf=response, index=False)
        return response


# Booking CRUD
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['Staff', 'Admin'] or user.is_superuser:
            queryset = Booking.objects.all().order_by('-created_at')
        else:
            queryset = Booking.objects.filter(user=user).order_by('-created_at')

        # Filtering by booking dates: Upcoming, Past, All
        filter_type = self.request.query_params.get('filter')
        today = dt.date.today()
        if filter_type == 'upcoming':
            queryset = queryset.filter(booking_date__gte=today)
        elif filter_type == 'past':
            queryset = queryset.filter(booking_date__lt=today)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        recurring_type = request.data.get('recurring_type') # 'daily', 'weekly', or None
        
        if recurring_type not in ['daily', 'weekly']:
            # Normal single booking creation
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            booking = serializer.instance
            log_action(request.user, f"Requested booking #{booking.id} for {booking.resource.resource_name}", request)

            # Trigger email confirmation to student asynchronously
            run_async(send_booking_created_email, booking.id)

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        # Recurring Booking creation
        resource_id = request.data.get('resource')
        booking_date_str = request.data.get('booking_date')
        time_slot = request.data.get('time_slot')
        purpose = request.data.get('purpose')
        
        if not resource_id or not booking_date_str or not time_slot or not purpose:
            return Response({"error": "Required fields missing for recurring booking."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            start_date = dt.datetime.strptime(booking_date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate the 3 dates
        dates = []
        for i in range(3):
            if recurring_type == 'daily':
                dates.append(start_date + dt.timedelta(days=i))
            elif recurring_type == 'weekly':
                dates.append(start_date + dt.timedelta(weeks=i))
                
        # Validate all dates first
        created_bookings = []
        try:
            for date in dates:
                data = {
                    'resource': resource_id,
                    'booking_date': date.strftime("%Y-%m-%d"),
                    'time_slot': time_slot,
                    'purpose': purpose
                }
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                
            # If all are valid, create them
            for date in dates:
                data = {
                    'resource': resource_id,
                    'booking_date': date.strftime("%Y-%m-%d"),
                    'time_slot': time_slot,
                    'purpose': purpose
                }
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                created_bookings.append(serializer.instance)
                
        except Exception as e:
            err_msg = getattr(e, 'detail', str(e))
            if isinstance(err_msg, dict):
                # Format serializer errors cleanly
                err_msg = ", ".join([f"{k}: {v[0] if isinstance(v, list) else v}" for k, v in err_msg.items()])
            return Response({"error": f"Conflict on a recurring date: {err_msg}"}, status=status.HTTP_400_BAD_REQUEST)

        log_action(request.user, f"Created {len(created_bookings)} recurring bookings for resource {resource_id}", request)
        return Response(BookingSerializer(created_bookings, many=True).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        # Students can only cancel (delete) their own bookings
        if request.user.role == 'Student' and booking.user != request.user:
            return Response({"error": "You do not have permission to delete this booking."}, status=status.HTTP_403_FORBIDDEN)
        
        user_email = booking.user.email
        user_name = booking.user.name
        resource_name = booking.resource.resource_name
        booking_date = str(booking.booking_date)
        time_slot = booking.time_slot

        log_action(request.user, f"Cancelled & Deleted booking #{booking.id} ({resource_name})", request)

        # 1. Send Cancellation Confirmation Email to the user
        run_async(send_booking_cancelled_email, user_email, user_name, resource_name, booking_date, time_slot)

        # 2. Broadcast System Notification to ALL active users in the organization
        broadcast_msg = f"📢 Class Slot Released: '{resource_name}' is now AVAILABLE on {booking_date} for slot {time_slot}!"
        all_active_users = User.objects.filter(status='ACTIVE')
        notifications = [Notification(user=u, message=broadcast_msg) for u in all_active_users]
        Notification.objects.bulk_create(notifications)

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if request.user.role == 'Student' and booking.user != request.user:
            return Response({"error": "You do not have permission to cancel this booking."}, status=status.HTTP_403_FORBIDDEN)
        
        booking.status = 'Cancelled'
        booking.cancelled_at = timezone.now()
        booking.save()

        user_email = booking.user.email
        user_name = booking.user.name
        resource_name = booking.resource.resource_name
        booking_date = str(booking.booking_date)
        time_slot = booking.time_slot

        log_action(request.user, f"Cancelled booking #{booking.id} ({resource_name})", request)

        # 1. Send Cancellation Confirmation Email to the user
        run_async(send_booking_cancelled_email, user_email, user_name, resource_name, booking_date, time_slot)

        # 2. Broadcast System Notification to ALL active users in the organization
        broadcast_msg = f"📢 Class Slot Released: '{resource_name}' is now AVAILABLE on {booking_date} for slot {time_slot}!"
        all_active_users = User.objects.filter(status='ACTIVE')
        notifications = [Notification(user=u, message=broadcast_msg) for u in all_active_users]
        Notification.objects.bulk_create(notifications)

        return Response(BookingSerializer(booking, context={'request': request}).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        # Students can only edit their own bookings
        if request.user.role == 'Student' and booking.user != request.user:
            return Response({"error": "You do not have permission to update this booking."}, status=status.HTTP_403_FORBIDDEN)
        
        log_action(request.user, f"Updated booking #{booking.id}", request)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOnly])
    def approve(self, request, pk=None):
        booking = self.get_object()
        
        # Double check booking collision before approval
        overlapping = Booking.objects.filter(
            resource=booking.resource,
            booking_date=booking.booking_date,
            time_slot=booking.time_slot,
            status='Approved'
        ).exclude(pk=booking.pk)
        
        if overlapping.exists():
            return Response({"error": "Cannot approve. This resource is already booked for this time slot."}, status=status.HTTP_400_BAD_REQUEST)
 
        user_overlapping = Booking.objects.filter(
            user=booking.user,
            booking_date=booking.booking_date,
            time_slot=booking.time_slot,
            status='Approved'
        ).exclude(pk=booking.pk)
        
        if user_overlapping.exists():
            return Response({"error": "Cannot approve. The student already has another approved booking in this time slot."}, status=status.HTTP_400_BAD_REQUEST)
 
        booking.status = 'Approved'
        booking.save()

        # Log action
        log_action(request.user, f"Approved booking #{booking.id} for {booking.user.email}", request)

        # Create alert notification for user
        Notification.objects.create(
            user=booking.user,
            message=f"Your booking for '{booking.resource.resource_name}' on {booking.booking_date} ({booking.time_slot}) has been Approved."
        )
        
        # Send approval email to student asynchronously
        run_async(send_booking_approved_email, booking.id)
        
        # Send real-time notification
        send_realtime_notification(booking.user.id, f"Booking Approved: {booking.resource.resource_name}")

        return Response(BookingSerializer(booking, context={'request': request}).data, status=status.HTTP_200_OK)
 
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOnly])
    def reject(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'Rejected'
        booking.save()

        # Log action
        log_action(request.user, f"Rejected booking #{booking.id} for {booking.user.email}", request)

        # Create alert notification for user
        Notification.objects.create(
            user=booking.user,
            message=f"Your booking for '{booking.resource.resource_name}' on {booking.booking_date} ({booking.time_slot}) has been Rejected."
        )
        
        # Send rejection email to student asynchronously
        run_async(send_booking_rejected_email, booking.id)
        
        # Send real-time notification
        send_realtime_notification(booking.user.id, f"Booking Rejected: {booking.resource.resource_name}")

        return Response(BookingSerializer(booking, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        if booking.status != 'Approved':
            return Response({"error": "Only approved bookings can be checked in."}, status=status.HTTP_400_BAD_REQUEST)

        booking.checked_in = True
        booking.check_in_time = timezone.now()
        booking.save()

        # Log Action
        log_action(request.user, f"Checked-in to booking #{booking.id} ({booking.resource.resource_name})", request)

        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        bookings = self.get_queryset()
        data = []
        for b in bookings:
            data.append({
                'Booking ID': b.id,
                'Resource': b.resource.resource_name,
                'User': b.user.name,
                'User Email': b.user.email,
                'Date': b.booking_date,
                'Time Slot': b.time_slot,
                'Status': b.status,
                'Purpose': b.purpose,
                'Checked In': 'Yes' if b.checked_in else 'No'
            })
        df = pd.DataFrame(data)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="campus_bookings.csv"'
        df.to_csv(path_or_buf=response, index=False)
        return response

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def verify_qr(self, request):
        """Staff-only QR verification endpoint used by a mobile scanner or manual paste."""
        qr_data = request.data.get('qr_code_data', '').strip()
        if not qr_data:
            return Response({'valid': False, 'error': 'Pass code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        booking = None
        # 1. Exact match by qr_code_data
        booking = Booking.objects.select_related('user', 'resource').filter(qr_code_data=qr_data).first()
        
        # 2. Flexible lookup by numeric ID (e.g. "1", "#1", "CRMS-PASS-1", "BOOKING-1")
        if not booking:
            import re
            match = re.search(r'\d+', qr_data)
            if match:
                booking_id = match.group(0)
                booking = Booking.objects.select_related('user', 'resource').filter(id=booking_id).first()

        if not booking:
            return Response({'valid': False, 'error': 'Unknown pass code or reservation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'Approved':
            return Response({'valid': False, 'error': f'Booking #{booking.id} status is {booking.status}. Only Approved reservations can check in.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.checked_in:
            return Response({
                'valid': False, 
                'error': f'Booking #{booking.id} was already checked in at {booking.check_in_time.strftime("%I:%M %p") if booking.check_in_time else "earlier time"}.',
                'booking': BookingSerializer(booking, context={'request': request}).data
            }, status=status.HTTP_400_BAD_REQUEST)

        booking.checked_in = True
        booking.check_in_time = timezone.now()
        booking.save(update_fields=['checked_in', 'check_in_time'])
        log_action(request.user, f"Verified QR check-in for booking #{booking.id}", request)
        return Response({'valid': True, 'booking': BookingSerializer(booking, context={'request': request}).data})

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """Extend an approved booking into the immediately following configured slot."""
        booking = self.get_object()
        if booking.user != request.user and request.user.role not in ['Staff', 'Admin']:
            return Response({'error': 'You cannot extend this booking.'}, status=status.HTTP_403_FORBIDDEN)
        slots = ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM']
        try:
            next_slot = slots[slots.index(booking.time_slot) + 1]
        except (ValueError, IndexError):
            return Response({'error': 'No later slot is available for an extension.'}, status=status.HTTP_400_BAD_REQUEST)
        if Booking.objects.filter(resource=booking.resource, booking_date=booking.booking_date, time_slot=next_slot, status='Approved').exists():
            return Response({'error': 'The next slot is already booked.'}, status=status.HTTP_400_BAD_REQUEST)
        booking.time_slot = next_slot
        booking.save(update_fields=['time_slot'])
        return Response(BookingSerializer(booking, context={'request': request}).data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "all read"}, status=status.HTTP_200_OK)



# Dashboard Statistics View
class StatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
 
    def get(self, request):
        user = request.user
        today = dt.date.today()
 
        # Calculate Live Occupancy status of all resources
        live_occupancy = []
        now_time = dt.datetime.now().time()
        for r in Resource.objects.filter(availability_status=True):
            is_busy = False
            booked_by = None
            active_bookings = Booking.objects.filter(resource=r, booking_date=today, status='Approved')
            for b in active_bookings:
                try:
                    start_str, end_str = b.time_slot.split('-')
                    start_time = dt.datetime.strptime(start_str.strip(), "%I:%M %p").time()
                    end_time = dt.datetime.strptime(end_str.strip(), "%I:%M %p").time()
                    if start_time <= now_time <= end_time:
                        is_busy = True
                        booked_by = b.user.name
                        break
                except Exception:
                    pass
            live_occupancy.append({
                'id': r.id,
                'resource_name': r.resource_name,
                'resource_type': r.resource_type,
                'status': 'Busy' if is_busy else 'Free',
                'user': booked_by
            })

        # Booking density chart data (top 6 resources by bookings count)
        from django.db.models import Count
        resource_bookings = Booking.objects.values('resource__resource_name').annotate(count=Count('id')).order_by('-count')[:6]
        chart_data = [{'resource_name': rb['resource__resource_name'], 'count': rb['count']} for rb in resource_bookings]

        # Role specific basic stats counters
        if user.role == 'Admin' or user.is_superuser:
            total_users = User.objects.count()
            total_resources = Resource.objects.count()
            total_bookings = Booking.objects.count()
            pending_bookings = Booking.objects.filter(status='Pending').count()
            approved_bookings = Booking.objects.filter(status='Approved').count()
            rejected_bookings = Booking.objects.filter(status='Rejected').count()
 
            return Response({
                'role': 'Admin',
                'stats': {
                    'total_users': total_users,
                    'total_resources': total_resources,
                    'total_bookings': total_bookings,
                    'pending_bookings': pending_bookings,
                    'approved_bookings': approved_bookings,
                    'rejected_bookings': rejected_bookings
                },
                'live_occupancy': live_occupancy,
                'chart_data': chart_data
            }, status=status.HTTP_200_OK)

        elif user.role == 'Staff':
            total_resources = Resource.objects.count()
            total_bookings = Booking.objects.count()
 
            return Response({
                'role': 'Staff',
                'stats': {
                    'total_resources': total_resources,
                    'total_bookings': total_bookings
                },
                'live_occupancy': live_occupancy,
                'chart_data': chart_data
            }, status=status.HTTP_200_OK)

        else:
            # Student Dashboard
            my_bookings = Booking.objects.filter(user=user).count()
            upcoming_bookings = Booking.objects.filter(user=user, booking_date__gte=today).count()
            approved_bookings = Booking.objects.filter(user=user, status='Approved').count()
 
            return Response({
                'role': 'Student',
                'stats': {
                    'my_bookings': my_bookings,
                    'upcoming_bookings': upcoming_bookings,
                    'approved_bookings': approved_bookings
                },
                'live_occupancy': live_occupancy,
                'chart_data': chart_data
            }, status=status.HTTP_200_OK)


class AnalyticsView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        today = timezone.localdate()
        bookings = Booking.objects.all()
        approved = bookings.filter(status='Approved')
        by_hour = {}
        for value in approved.values_list('time_slot', flat=True):
            hour = value.split(' - ')[0]
            by_hour[hour] = by_hour.get(hour, 0) + 1
        total = bookings.count()
        checked_in = approved.filter(checked_in=True).count()
        popular = approved.values('resource__resource_name').annotate(count=Count('id')).order_by('-count')[:6]
        utilization = []
        for resource in Resource.objects.all():
            count = approved.filter(resource=resource).count()
            utilization.append({'resource_name': resource.resource_name, 'bookings': count, 'utilization_rate': round((count / max(total, 1)) * 100, 1)})
        payload = {
            'upcoming_bookings': approved.filter(booking_date__gte=today).count(),
            'past_bookings': bookings.filter(booking_date__lt=today).count(),
            'status_distribution': {state: bookings.filter(status=state).count() for state in ['Approved', 'Pending', 'Rejected', 'Cancelled']},
            'peak_hours': [{'time_slot': slot, 'count': count} for slot, count in sorted(by_hour.items())],
            'popular_resources': list(popular),
            'resource_utilization': sorted(utilization, key=lambda row: row['utilization_rate'], reverse=True),
            'no_show_rate': round(((approved.count() - checked_in) / max(approved.count(), 1)) * 100, 1),
            'bookings_by_day': [{'date': str(today - dt.timedelta(days=offset)), 'count': bookings.filter(booking_date=today - dt.timedelta(days=offset)).count()} for offset in range(6, -1, -1)],
        }
        report_format = request.query_params.get('format')
        if report_format == 'xlsx':
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                pd.DataFrame(payload['resource_utilization']).to_excel(writer, sheet_name='Utilization', index=False)
                pd.DataFrame(payload['popular_resources']).to_excel(writer, sheet_name='Popular resources', index=False)
                pd.DataFrame(payload['peak_hours']).to_excel(writer, sheet_name='Peak hours', index=False)
            response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="campusrms-analytics.xlsx"'
            return response
        if report_format == 'pdf':
            output = BytesIO()
            pdf = canvas.Canvas(output, pagesize=letter)
            pdf.setTitle('CampusRMS Analytics Report')
            pdf.setFont('Helvetica-Bold', 16)
            pdf.drawString(54, 750, 'CampusRMS Analytics Report')
            pdf.setFont('Helvetica', 10)
            y = 720
            for label, value in [('Upcoming bookings', payload['upcoming_bookings']), ('Past bookings', payload['past_bookings']), ('No-show rate', f"{payload['no_show_rate']}%")]:
                pdf.drawString(54, y, f'{label}: {value}')
                y -= 20
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(54, y - 8, 'Most popular resources')
            pdf.setFont('Helvetica', 10)
            y -= 28
            for item in payload['popular_resources']:
                pdf.drawString(54, y, f"{item['resource__resource_name']}: {item['count']} bookings")
                y -= 16
            pdf.save()
            response = HttpResponse(output.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="campusrms-analytics.pdf"'
            return response
        return Response(payload)


class ResourceReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ResourceReview.objects.all().order_by('-created_at')
        resource_id = self.request.query_params.get('resource')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
