from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a default admin user for CampusRMS'

    def handle(self, *args, **options):
        email = 'admin@campusrms.com'
        phone = '1234567890'
        password = 'Admin@12345'
        name = 'System Admin'

        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                email=email,
                phone=phone,
                name=name,
                password=password,
                role='Admin',
                status='INACTIVE'
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created default admin user: {email}'))
        else:
            self.stdout.write(self.style.WARNING(f'Admin user with email {email} already exists.'))
