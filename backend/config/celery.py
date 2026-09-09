import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic Tasks Configuration
app.conf.beat_schedule = {
    'send-booking-reminders': {
        'task': 'api.tasks.send_booking_reminders',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    'auto-cancel-late-bookings': {
        'task': 'api.tasks.auto_cancel_late_bookings',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'send-weekly-digest': {
        'task': 'api.tasks.send_weekly_digest',
        'schedule': crontab(day_of_week='monday', hour=9, minute=0),  # Every Monday at 9 AM
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
