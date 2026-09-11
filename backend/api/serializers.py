import re
import datetime as dt
from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models import Resource, Booking, Notification, ResourceReview
from django.db.models import Avg

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'phone', 'password', 'role', 'status', 'created_at')
        read_only_fields = ('id', 'status', 'created_at')

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value

    def validate_email(self, value):
        queryset = User.objects.filter(email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_phone(self, value):
        queryset = User.objects.filter(phone=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def validate(self, data):
        if not self.instance and 'password' not in data:
            raise serializers.ValidationError({"password": "This field is required."})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            self.validate_password(password)
            instance.set_password(password)
        instance.save()
        return instance


class ResourceReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = ResourceReview
        fields = ('id', 'resource', 'user', 'user_name', 'user_email', 'rating', 'comment', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class ResourceSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    reviews = ResourceReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Resource
        fields = ('id', 'resource_name', 'resource_type', 'description', 'capacity', 
                  'location', 'amenities', 'hourly_rate', 'availability_status', 
                  'image_url', 'dress_code', 'equipment_needed', 'materials_required',
                  'created_by', 'created_by_name', 'created_by_email', 'avg_rating', 'review_count', 'reviews', 'created_at')
        read_only_fields = ('id', 'created_by', 'created_at')

    def get_avg_rating(self, obj):
        res = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(res, 1) if res else 0.0

    def get_review_count(self, obj):
        return obj.reviews.count()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'is_read', 'created_at')
        read_only_fields = ('id', 'created_at')


class BookingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    resource_name = serializers.CharField(source='resource.resource_name', read_only=True)
    resource_type = serializers.CharField(source='resource.resource_type', read_only=True)
    resource_location = serializers.CharField(source='resource.location', read_only=True)
    resource_hourly_rate = serializers.DecimalField(source='resource.hourly_rate', max_digits=8, decimal_places=2, read_only=True)
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ('id', 'user', 'resource', 'booking_date', 'time_slot', 'purpose', 'status', 
                  'user_name', 'user_email', 'resource_name', 'resource_type', 'resource_location', 'resource_hourly_rate',
                  'amount_paid', 'payment_status',
                  'checked_in', 'check_in_time', 'reminder_sent_at', 'cancelled_at', 'qr_code_url', 'qr_code_data', 'created_at')
        read_only_fields = ('id', 'user', 'status', 'checked_in', 'check_in_time', 'reminder_sent_at', 'cancelled_at', 'qr_code_url', 'qr_code_data', 'created_at')
    
    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
        return None

    def validate(self, data):
        booking_date = data.get('booking_date')
        time_slot = data.get('time_slot')
        resource = data.get('resource')

        if self.instance:
            booking_date = booking_date or self.instance.booking_date
            time_slot = time_slot or self.instance.time_slot
            resource = resource or self.instance.resource
            user = self.instance.user
        else:
            user = self.context['request'].user

        today = dt.date.today()

        # Check resource availability
        if resource and not resource.availability_status:
            raise serializers.ValidationError({"resource": "This resource is currently not available for booking."})

        # 1. Cannot book past dates
        if booking_date and booking_date < today:
            raise serializers.ValidationError({"booking_date": "Cannot book a date in the past."})

        # 2. Cannot book past time slots
        if booking_date and booking_date == today and time_slot:
            try:
                start_time_str = time_slot.split('-')[0].strip()
                start_time = dt.datetime.strptime(start_time_str, "%I:%M %p").time()
                current_time = dt.datetime.now().time()
                
                if current_time >= start_time:
                    raise serializers.ValidationError({"time_slot": "This time slot has already passed for today."})
            except ValueError:
                raise serializers.ValidationError({"time_slot": "Time slot must be in the format 'HH:MM AM/PM - HH:MM AM/PM'."})

        # 3. Prevent double booking of same resource in same time slot (check Approved & Pending bookings)
        if resource and booking_date and time_slot:
            overlapping_resource_bookings = Booking.objects.filter(
                resource=resource,
                booking_date=booking_date,
                time_slot=time_slot,
                status__in=['Approved', 'Pending']
            )
            if self.instance:
                overlapping_resource_bookings = overlapping_resource_bookings.exclude(pk=self.instance.pk)
            if overlapping_resource_bookings.exists():
                existing_b = overlapping_resource_bookings.first()
                all_slots = [
                    '09:00 AM - 11:00 AM',
                    '11:00 AM - 01:00 PM',
                    '01:00 PM - 03:00 PM',
                    '03:00 PM - 05:00 PM',
                    '05:00 PM - 07:00 PM'
                ]
                taken_slots = Booking.objects.filter(
                    resource=resource,
                    booking_date=booking_date,
                    status__in=['Approved', 'Pending']
                ).values_list('time_slot', flat=True)
                
                alt_slots = [s for s in all_slots if s not in taken_slots]
                
                raise serializers.ValidationError({
                    "resource": f"This facility is already reserved for {booking_date} at {time_slot} (Status: {existing_b.status}). Please choose an alternative time slot or date.",
                    "alternative_slots": alt_slots
                })

        # 4. Prevent user booking multiple resources in same time slot (only check Approved bookings)
        if user and booking_date and time_slot:
            overlapping_user_bookings = Booking.objects.filter(
                user=user,
                booking_date=booking_date,
                time_slot=time_slot,
                status='Approved'
            )
            if self.instance:
                overlapping_user_bookings = overlapping_user_bookings.exclude(pk=self.instance.pk)
            if overlapping_user_bookings.exists():
                raise serializers.ValidationError({"time_slot": "You already have an approved booking in this time slot."})

        return data
