from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Resource

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample resources for CampusRMS'

    def handle(self, *args, **options):
        # Get or create admin user as creator
        admin = User.objects.filter(role='Admin').first()
        if not admin:
            self.stdout.write(self.style.ERROR('No admin user found. Please create an admin first.'))
            return

        resources_data = [
            {
                'resource_name': 'Computer Lab 1',
                'resource_type': 'Lab',
                'description': 'Main computer lab with 40 high-performance workstations',
                'capacity': 40,
                'location': 'Building A, Floor 2, Room 201',
                'amenities': 'Projector, Whiteboard, AC, High-speed Internet, Windows & Linux PCs',
                'availability_status': True
            },
            {
                'resource_name': 'Computer Lab 2',
                'resource_type': 'Lab',
                'description': 'Programming lab with latest development tools',
                'capacity': 35,
                'location': 'Building A, Floor 2, Room 205',
                'amenities': 'Projector, Whiteboard, AC, High-speed Internet, IDE Software',
                'availability_status': True
            },
            {
                'resource_name': 'Science Lab',
                'resource_type': 'Lab',
                'description': 'Chemistry and Physics laboratory',
                'capacity': 30,
                'location': 'Building B, Floor 1, Room 105',
                'amenities': 'Lab Equipment, Safety Gear, Fume Hood, Storage',
                'availability_status': True
            },
            {
                'resource_name': 'Lecture Hall A',
                'resource_type': 'Classroom',
                'description': 'Large lecture hall for presentations and classes',
                'capacity': 100,
                'location': 'Building C, Floor 1',
                'amenities': 'Projector, Sound System, Microphone, AC, Smart Board',
                'availability_status': True
            },
            {
                'resource_name': 'Lecture Hall B',
                'resource_type': 'Classroom',
                'description': 'Medium-sized classroom for interactive sessions',
                'capacity': 60,
                'location': 'Building C, Floor 2',
                'amenities': 'Projector, Whiteboard, AC, Audio System',
                'availability_status': True
            },
            {
                'resource_name': 'Seminar Room 1',
                'resource_type': 'Classroom',
                'description': 'Small classroom for tutorials and workshops',
                'capacity': 30,
                'location': 'Building D, Floor 1, Room 101',
                'amenities': 'Projector, Whiteboard, AC, Comfortable Seating',
                'availability_status': True
            },
            {
                'resource_name': 'Auditorium',
                'resource_type': 'Event Hall',
                'description': 'Main auditorium for events, seminars, and conferences',
                'capacity': 500,
                'location': 'Main Building, Ground Floor',
                'amenities': 'Stage, Sound System, Lighting, Projector, Green Room, AC',
                'availability_status': True
            },
            {
                'resource_name': 'Conference Hall',
                'resource_type': 'Event Hall',
                'description': 'Professional conference hall for meetings and workshops',
                'capacity': 150,
                'location': 'Administrative Building, Floor 3',
                'amenities': 'Video Conferencing, Projector, Sound System, AC, Refreshments Area',
                'availability_status': True
            },
            {
                'resource_name': 'Student Activity Center',
                'resource_type': 'Event Hall',
                'description': 'Multi-purpose hall for student activities and events',
                'capacity': 200,
                'location': 'Student Center, Floor 2',
                'amenities': 'Flexible Seating, Sound System, Stage, AC, Storage',
                'availability_status': True
            },
            {
                'resource_name': 'MacBook Pro Lab',
                'resource_type': 'Computer',
                'description': '20 MacBook Pro laptops for mobile computing',
                'capacity': 20,
                'location': 'Library, Floor 3, Room 301',
                'amenities': 'MacOS, Design Software, Development Tools, Charging Stations',
                'availability_status': True
            },
            {
                'resource_name': 'Gaming Lab',
                'resource_type': 'Computer',
                'description': 'High-end gaming computers for game development courses',
                'capacity': 25,
                'location': 'Building A, Floor 3, Room 310',
                'amenities': 'Gaming PCs, VR Headsets, High-refresh Monitors, RGB Lighting',
                'availability_status': True
            },
            {
                'resource_name': 'Design Studio',
                'resource_type': 'Lab',
                'description': 'Creative workspace with design software and drawing tablets',
                'capacity': 30,
                'location': 'Arts Building, Floor 2',
                'amenities': 'Drawing Tablets, Adobe Suite, High-resolution Monitors, Printers',
                'availability_status': True
            },
        ]

        created_count = 0
        for resource_data in resources_data:
            resource, created = Resource.objects.get_or_create(
                resource_name=resource_data['resource_name'],
                defaults={
                    **resource_data,
                    'created_by': admin
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {resource.resource_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'- Already exists: {resource.resource_name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {created_count} new resources!'))
        self.stdout.write(self.style.SUCCESS(f'📊 Total resources in database: {Resource.objects.count()}'))
