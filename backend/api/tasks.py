from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Booking, User, Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def booking_start(booking):
    """Return an aware start datetime for the standard booking slot format."""
    start_text = booking.time_slot.split(' - ')[0].strip()
    start_time = datetime.strptime(start_text, '%I:%M %p').time()
    return timezone.make_aware(datetime.combine(booking.booking_date, start_time))

@shared_task
def send_booking_created_email(booking_id):
    """Send confirmation email & notification when a student submits a new booking request"""
    try:
        booking = Booking.objects.select_related('user', 'resource').get(id=booking_id)
        
        # 1. Create in-app notification
        Notification.objects.create(
            user=booking.user,
            message=f"📌 Reservation request submitted for {booking.resource.resource_name} on {booking.booking_date} ({booking.time_slot}). Currently pending administrator review."
        )
        send_realtime_notification(booking.user.id, f"Reservation submitted for {booking.resource.resource_name}")

        # 2. Dispatch email notification
        subject = f'Reservation Request Submitted: {booking.resource.resource_name}'
        message = f"""Dear {booking.user.name},

Thank you for submitting a reservation request on CampusRMS! Your request has been received and is currently pending administrator review.

--- RESERVATION SUMMARY ---
Request Pass Code: #CRMS-PASS-{booking.id}
Facility Resource: {booking.resource.resource_name} ({booking.resource.resource_type})
Location: {booking.resource.location or 'Campus Main Block'}
Capacity: {booking.resource.capacity} Seats
Facility Description: {booking.resource.description or 'Campus Academic Facility'}
Amenities: {booking.resource.amenities or 'Standard Equipment'}

--- SCHEDULE & TIME SLOTS ---
Booked Date: {booking.booking_date}
Booked Time Slot: {booking.time_slot}
Purpose / Activity: {booking.purpose}

--- STATUS ---
Current Status: Pending Approval

You will receive an email notification as soon as the administrator approves your reservation.

Best regards,
CampusRMS Administration Team
"""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campusrms.com')
        send_mail(
            subject,
            message,
            from_email,
            [booking.user.email],
            fail_silently=True,
        )
        print(f"[EMAIL NOTIFICATION] Request confirmation sent to {booking.user.email}")
        return f"Request confirmation email sent to {booking.user.email}"
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send request confirmation email: {str(e)}")
        return f"Failed to send request confirmation email: {str(e)}"

@shared_task
def send_booking_approved_email(booking_id):
    """Send email & notification when booking is approved by Admin"""
    try:
        booking = Booking.objects.select_related('user', 'resource').get(id=booking_id)

        # 1. Create in-app notification
        Notification.objects.create(
            user=booking.user,
            message=f"✓ Great news! Your booking for {booking.resource.resource_name} on {booking.booking_date} ({booking.time_slot}) has been APPROVED! Pass Code: #CRMS-PASS-{booking.id}"
        )
        send_realtime_notification(booking.user.id, f"✓ Booking Approved: {booking.resource.resource_name}")

        # 2. Dispatch email notification
        subject = f'✓ Booking Approved: {booking.resource.resource_name} (#CRMS-PASS-{booking.id})'
        message = f"""Dear {booking.user.name},

Great news! Your campus facility reservation request has been APPROVED by the System Administrator.

--- PASS APPROVAL CODE ---
Pass Code: #CRMS-PASS-{booking.id}

--- FACILITY & SPACE DETAILS ---
Facility Resource: {booking.resource.resource_name} ({booking.resource.resource_type})
Location: {booking.resource.location or 'Campus Main Block'}
Capacity: {booking.resource.capacity} Seats
Description: {booking.resource.description or 'Campus Academic Facility'}
Amenities: {booking.resource.amenities or 'Standard Equipment'}

--- SCHEDULE & TIME SLOTS ---
Booked Date: {booking.booking_date}
Booked Time Slot: {booking.time_slot}
Purpose / Activity: {booking.purpose}

--- CHECK-IN INSTRUCTIONS ---
When you arrive at the facility, present your Pass Approval Code (#CRMS-PASS-{booking.id}) or QR Pass to the staff member for check-in verification.

Best regards,
CampusRMS Administration Team
"""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campusrms.com')
        send_mail(
            subject,
            message,
            from_email,
            [booking.user.email],
            fail_silently=True,
        )
        print(f"[EMAIL NOTIFICATION] Approval email sent to {booking.user.email}")
        return f"Approval email sent successfully to {booking.user.email}"
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send approval email: {str(e)}")
        return f"Failed to send email to student: {str(e)}"

@shared_task
def send_booking_rejected_email(booking_id):
    """Send email & notification when booking is rejected by Admin"""
    try:
        booking = Booking.objects.select_related('user', 'resource').get(id=booking_id)

        # 1. Create in-app notification
        Notification.objects.create(
            user=booking.user,
            message=f"❌ Your reservation request for {booking.resource.resource_name} on {booking.booking_date} was REJECTED by Administration."
        )
        send_realtime_notification(booking.user.id, f"Reservation REJECTED: {booking.resource.resource_name}")

        # 2. Dispatch email notification
        subject = f'Booking Request Update: {booking.resource.resource_name}'
        message = f"""Dear {booking.user.name},

Your facility reservation request for {booking.resource.resource_name} on {booking.booking_date} ({booking.time_slot}) was REJECTED by the Administrator.

--- RESERVATION SUMMARY ---
Facility Resource: {booking.resource.resource_name} ({booking.resource.resource_type})
Location: {booking.resource.location or 'Campus Main Block'}
Description: {booking.resource.description or 'Campus Academic Facility'}

--- SCHEDULE & TIME SLOTS ---
Requested Date: {booking.booking_date}
Requested Time Slot: {booking.time_slot}
Purpose: {booking.purpose}

If you have questions or require an alternative space, please submit a new reservation request on the CampusRMS portal.

Best regards,
CampusRMS Administration Team
"""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campusrms.com')
        send_mail(
            subject,
            message,
            from_email,
            [booking.user.email],
            fail_silently=True,
        )
        print(f"[EMAIL NOTIFICATION] Rejection email sent to {booking.user.email}")
        return f"Rejection email sent to {booking.user.email}"
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send rejection email: {str(e)}")
        return f"Failed to send email to student: {str(e)}"

@shared_task
def send_booking_reminders():
    """Send reminders for bookings happening in next hour"""
    now = timezone.now()
    one_hour_later = now + timedelta(hours=1, minutes=5)
    bookings = Booking.objects.filter(
        status='Approved',
        checked_in=False,
        reminder_sent_at__isnull=True,
    )
    
    count = 0
    for booking in bookings:
        # Parse time slot to check if it's within next hour
        # Format: "09:00 AM - 11:00 AM"
        try:
            starts_at = booking_start(booking)
            if not now <= starts_at <= one_hour_later:
                continue
            
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
            booking.reminder_sent_at = now
            booking.save(update_fields=['reminder_sent_at'])
            
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
    late_bookings = Booking.objects.filter(
        status='Approved',
        checked_in=False,
    )
    
    count = 0
    for booking in late_bookings:
        try:
            if booking_start(booking) > grace_period:
                continue
            booking.status = 'Cancelled'
            booking.cancelled_at = now
            booking.save(update_fields=['status', 'cancelled_at'])
            Notification.objects.create(
                user=booking.user,
                message=f"Your booking for {booking.resource.resource_name} was cancelled because no check-in was recorded within 15 minutes."
            )
            send_realtime_notification(booking.user.id, f"Booking cancelled: {booking.resource.resource_name}")
            count += 1
        except (ValueError, IndexError):
            continue
    
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

@shared_task
def send_booking_cancelled_email(user_email, user_name, resource_name, booking_date, time_slot):
    """Send cancellation confirmation email to user when a booking is cancelled/deleted"""
    try:
        subject = f'Reservation Cancelled: {resource_name}'
        message = f"""Dear {user_name},

Your facility reservation for {resource_name} on {booking_date} ({time_slot}) has been CANCELLED as requested.

The reserved time slot has been released back to the campus schedule and is now available for other students and faculty.

If this was done in error or if you need to schedule another space, you can submit a new booking anytime on the CampusRMS portal.

Best regards,
CampusRMS Administration Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            fail_silently=False,
        )
        return f"Cancellation email sent to {user_email}"
    except Exception as e:
        return f"Failed to send cancellation email: {str(e)}"
