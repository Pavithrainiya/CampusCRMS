import qrcode
from io import BytesIO
from django.core.files import File
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'Admin')
        extra_fields.setdefault('status', 'ACTIVE')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None  # Disable username in favor of email
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, unique=True)
    
    ROLE_CHOICES = (
        ('Student', 'Student'),
        ('Staff', 'Staff'),
        ('Admin', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    
    STATUS_CHOICES = (
        ('ACTIVE', 'ACTIVE'),
        ('INACTIVE', 'INACTIVE'),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='INACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'phone']
    
    def __str__(self):
        return f"{self.email} ({self.role})"

class Resource(models.Model):
    RESOURCE_TYPES = (
        ('Lab', 'Lab'),
        ('Classroom', 'Classroom'),
        ('Event Hall', 'Event Hall'),
        ('Computer', 'Computer'),
    )
    resource_name = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    description = models.TextField(blank=True, null=True)
    capacity = models.PositiveIntegerField()
    location = models.CharField(max_length=255, blank=True, null=True)
    amenities = models.TextField(blank=True, null=True)  # Comma-separated tags, e.g., "Projector, Whiteboard"
    availability_status = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_resources')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.resource_name

class Booking(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateField()
    time_slot = models.CharField(max_length=50)  # e.g., "09:00 AM - 11:00 AM"
    purpose = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    checked_in = models.BooleanField(default=False)
    check_in_time = models.DateTimeField(null=True, blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    qr_code_data = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def generate_qr_code(self):
        """Generate QR code for the booking"""
        if not self.qr_code_data:
            # Create unique QR code data
            self.qr_code_data = f"BOOKING-{self.id}-{self.user.id}-{self.created_at.timestamp()}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(self.qr_code_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to model
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        filename = f'qr_booking_{self.id}.png'
        self.qr_code.save(filename, File(buffer), save=False)
        buffer.close()
    
    def save(self, *args, **kwargs):
        # Generate QR code when booking is approved
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if self.status == 'Approved' and not self.qr_code:
            self.generate_qr_code()
            super().save(update_fields=['qr_code', 'qr_code_data'])
    
    def __str__(self):
        return f"{self.user.email} - {self.resource.resource_name} - {self.booking_date} ({self.time_slot})"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.email} - Read: {self.is_read}"

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        user_email = self.user.email if self.user else "Anonymous"
        return f"{user_email} - {self.action} - {self.timestamp}"

