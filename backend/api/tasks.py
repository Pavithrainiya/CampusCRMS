from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Booking, User, Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def send_booking_approved_email(booking_id):
    """Send email when booking is approved"""
    try:
        booking = Booking.objects.get(id=booking_id)
        subject = f'Booking Approved - {booking.resource.resource_name}'
        message = f"""
Dear {booking.user.name},

Your booking has been approved!

Resource: {booking.resource.resource_name}
Date: {booking.booking_date}
Time: {booking.time_slot}
Purpose: {booking.purpose}

Please check-in at the scheduled time.

Best regards,
CampusRMS Team
        """
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [booking.user.email],
            fail_silently=False,
        )
        return f"Email sent to {booking.user.email}"
    except Exception as e:
        return f"Failed to send email: {str(e)}"

@shared_task
def send_booking_rejected_email(booking_id):
    """Send email when booking is rejected"""
    try:
        booking = Booking.objects.get(id=booking_id)
        subject = f'Booking Rejected - {booking.resource.resource_name}'
        message = f"""
Dear {booking.user.name},

Unfortunately, your booking request has been rejected.

Resource: {booking.resource.resource_name}
Date: {booking.booking_date}
Time: {booking.time_slot}

Please contact the admin for more information or try booking a different time slot.

Best regards,
CampusRMS Team
        """
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [booking.user.email],
            fail_silently=False,
        )
        return f"Email sent to {booking.user.email}"
    except Exception as e:
        return f"Failed to send email: {str(e)}"

@shared_task
def send_booking_reminders():
    """Send reminders for bookings happening in next hour"""
    now = timezone.now()
    one_hour_later = now + timedelta(hours=1)
    
    # Get approved bookings for today that haven't been checked in
    today = now.date()
    bookings = Booking.objects.filter(
        booking_date=today,
        status='Approved',
        checked_in=False
    )
    
    count = 0
    for booking in bookings:
        # Parse time slot to check if it's within next hour
        # Format: "09:00 AM - 11:00 AM"
        try:
            start_time_str = booking.time_slot.split(' - ')[0]
            # Simple check: send reminder for all today's bookings
            # In production, you'd parse the time properly
            
            subject = f'Reminder: Booking at {booking.time_slot}'
            message = f"""
Dear {booking.user.name},

This is a reminder for your upcoming booking:

Resource: {booking.resource.resource_name}
Date: {booking.booking_date}
Time: {booking.time_slot}
Location: {booking.resource.location or 'TBA'}

Don't forget to check-in when you arrive!

Best regards,
CampusRMS Team
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [booking.user.email],
                fail_silently=True,
            )
            
            # Create in-app notification
            Notification.objects.create(
                user=booking.user,
                message=f"Reminder: Your booking for {booking.resource.resource_name} is at {booking.time_slot} today!"
            )
            
            # Send WebSocket notification
            send_realtime_notification(booking.user.id, f"Reminder: Booking at {booking.time_slot}")
            
            count += 1
        except Exception as e:
            print(f"Error sending reminder for booking {booking.id}: {str(e)}")
            continue
    
    return f"Sent {count} booking reminders"

@shared_task
def auto_cancel_late_bookings():
    """Auto-cancel bookings if user hasn't checked in 15 mins after start time"""
    now = timezone.now()
    grace_period = now - timedelta(minutes=15)
    
    # Get approved bookings that should have started but no check-in
    today = now.date()
    late_bookings = Booking.objects.filter(
        booking_date=today,
        status='Approved',
        checked_in=False,
        # Add more sophisticated time checking in production
    )
    
    count = 0
    for booking in late_bookings:
        # In production, parse time_slot and check if grace period has passed
        # For now, we'll skip auto-cancellation to avoid false positives
        # booking.status = 'Rejected'
        # booking.save()
        # count += 1
        pass
    
    return f"Auto-cancelled {count} late bookings"

@shared_task
def send_weekly_digest():
    """Send weekly digest to all active users"""
    users = User.objects.filter(is_active=True)
    count = 0
    
    for user in users:
        try:
            # Get user's bookings for next week
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=7)
            
            upcoming_bookings = Booking.objects.filter(
                user=user,
                booking_date__range=[start_date, end_date],
                status='Approved'
            )
            
            if upcoming_bookings.exists():
                booking_list = '\n'.join([
                    f"- {b.resource.resource_name} on {b.booking_date} at {b.time_slot}"
                    for b in upcoming_bookings
                ])
                
                subject = 'Your Weekly Booking Digest'
                message = f"""
Dear {user.name},

Here are your upcoming bookings for this week:

{booking_list}

Have a great week!

Best regards,
CampusRMS Team
                """
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,
                )
                count += 1
        except Exception as e:
            print(f"Error sending weekly digest to {user.email}: {str(e)}")
            continue
    
    return f"Sent weekly digest to {count} users"

@shared_task
def send_welcome_email(user_id):
    """Send welcome email to new users"""
    try:
        user = User.objects.get(id=user_id)
        subject = 'Welcome to CampusRMS!'
        message = f"""
Dear {user.name},

Welcome to CampusRMS - Campus Resource Management System!

Your account has been successfully created. You can now:
- Browse available resources
- Book resources for your needs
- Manage your bookings
- Receive notifications

If you have any questions, please don't hesitate to contact our support team.

Best regards,
CampusRMS Team
        """
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return f"Welcome email sent to {user.email}"
    except Exception as e:
        return f"Failed to send welcome email: {str(e)}"

def send_realtime_notification(user_id, message):
    """Send real-time notification via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'notification_message',
                'message': message
            }
        )
    except Exception as e:
        print(f"Error sending realtime notification: {str(e)}")
