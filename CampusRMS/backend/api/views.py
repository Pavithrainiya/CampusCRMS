from django.contrib.auth import authenticate, get_user_model
from django.db import models
from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Resource, Booking, Notification, AuditLog
from .serializers import UserSerializer, ResourceSerializer, BookingSerializer, NotificationSerializer
import datetime as dt


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
            user = serializer.save(role='Student')  # Default role is Student
            log_action(user, "Student registered account", request)
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Users CRUD (Admin Only)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserOnly]


# Resources CRUD (Read: Authenticated, Write: Staff/Admin)
class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsStaffOrAdmin()]

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
        
        log_action(request.user, f"Cancelled booking #{booking.id}", request)
        return super().destroy(request, *args, **kwargs)

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

        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)
 
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

        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        if booking.status != 'Approved':
            return Response({"error": "Only approved bookings can be checked in."}, status=status.HTTP_400_BAD_REQUEST)

        booking.checked_in = True
        booking.check_in_time = dt.datetime.now()
        booking.save()

        # Log Action
        log_action(request.user, f"Checked-in to booking #{booking.id} ({booking.resource.resource_name})", request)

        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)


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

