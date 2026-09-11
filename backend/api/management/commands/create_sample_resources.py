from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
import datetime as dt
from api.models import Resource, Booking, ResourceReview

User = get_user_model()

class Command(BaseCommand):
    help = 'Create or update sample resources with equipment, dress code, and image URLs for CampusRMS'

    def handle(self, *args, **options):
        admin = User.objects.filter(role='Admin').first()
        if not admin:
            admin = User.objects.first()

        resources_data = [
            {
                'resource_name': 'Computer Lab 1',
                'resource_type': 'Lab',
                'description': 'Main computer lab equipped with 40 high-performance workstations for software engineering and data science practicals.',
                'capacity': 40,
                'location': 'Building A, Floor 2, Room 201',
                'amenities': 'Projector, Whiteboard, AC, High-speed Internet, Windows & Linux PCs',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Standard Campus Casual',
                'equipment_needed': 'Desktop PC (Provided), Dual 27" Monitors, Gigabit Ethernet',
                'materials_required': 'USB Storage (16GB+), Practical Journal, Student ID Badge, Pen & Notepad'
            },
            {
                'resource_name': 'Computer Lab 2',
                'resource_type': 'Lab',
                'description': 'Advanced programming lab optimized for web development, cloud computing, and AI model training courses.',
                'capacity': 35,
                'location': 'Building A, Floor 2, Room 205',
                'amenities': 'Projector, Whiteboard, AC, High-speed Internet, IDE Software',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Smart Casual',
                'equipment_needed': 'Python & Java IDE Workstation, Projector, Code Compiler',
                'materials_required': 'Coding Notebook, External SSD, Student ID Card, Course Syllabus'
            },
            {
                'resource_name': 'Science Lab',
                'resource_type': 'Lab',
                'description': 'Fully certified chemical and physical science experimentation facility with fume hood safety apparatus.',
                'capacity': 30,
                'location': 'Building B, Floor 1, Room 105',
                'amenities': 'Lab Equipment, Safety Gear, Fume Hood, Chemical Storage',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'White Lab Coat & Closed-Toe Leather Shoes Required',
                'equipment_needed': 'Digital Microscope, Fume Hood, Bunsen Burner, Precision Scale',
                'materials_required': 'Hardbound Lab Journal, Safety Glasses, Nitrile Gloves, Permanent Marker'
            },
            {
                'resource_name': 'Lecture Hall A',
                'resource_type': 'Classroom',
                'description': 'Tiered amphitheater auditorium styled lecture hall suitable for department guest talks and mega classes.',
                'capacity': 100,
                'location': 'Building C, Floor 1',
                'amenities': 'Projector, Sound System, Wireless Microphone, AC, Smart Board',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Campus Formal / Casual',
                'equipment_needed': 'Stereo PA System, Interactive Smart Screen, Wireless Mic',
                'materials_required': 'Subject Textbook, Notebook, Scientific Calculator, Handout Binder'
            },
            {
                'resource_name': 'Lecture Hall B',
                'resource_type': 'Classroom',
                'description': 'Medium interactive classroom featuring flexible desk configurations and dual high-definition projectors.',
                'capacity': 60,
                'location': 'Building C, Floor 2',
                'amenities': 'Projector, Whiteboard, AC, Surround Audio',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Standard Campus Casual',
                'equipment_needed': 'Dual Wall Projectors, Whiteboard, Room Speakers',
                'materials_required': 'Class Notebook, Graph Sheets, Blue & Black Pens, Student ID'
            },
            {
                'resource_name': 'Seminar Room 1',
                'resource_type': 'Classroom',
                'description': 'Executive round-table seminar room designed for team discussions, thesis defenses, and staff meetings.',
                'capacity': 30,
                'location': 'Building D, Floor 1, Room 101',
                'amenities': 'Projector, Whiteboard, AC, Executive Leather Chairs',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Smart Casual / Business Casual',
                'equipment_needed': 'HD Projector, Conference Oval Desk, Dry Erase Markers',
                'materials_required': 'Presentation Slides on USB, Meeting Agenda, Personal Laptop'
            },
            {
                'resource_name': 'Auditorium',
                'resource_type': 'Event Hall',
                'description': 'Grand 500-seat university auditorium equipped with concert theatrical lighting, stage, and backstage green room.',
                'capacity': 500,
                'location': 'Main Building, Ground Floor',
                'amenities': 'Stage, Concert Sound System, Stage Lighting, Green Room, AC',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Formal / Institutional Event Attire',
                'equipment_needed': 'Stage Lighting Console, 16-Channel Audio Mixer, Presentation Clicker',
                'materials_required': 'Event Schedule Printouts, Delegate Badges, Wireless Presentation Clicker'
            },
            {
                'resource_name': 'Conference Hall',
                'resource_type': 'Event Hall',
                'description': 'High-end conference venue equipped with video conferencing systems for international academic summits.',
                'capacity': 150,
                'location': 'Administrative Building, Floor 3',
                'amenities': 'Video Conferencing, 4K Projector, Sound System, AC, Catering Counter',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Formal Business Attire',
                'equipment_needed': '4K Conference Display, Polycom Ceiling Mic, Zoom Room Console',
                'materials_required': 'Laptop with HDMI Dongle, Executive Notepad, ID Credentials'
            },
            {
                'resource_name': 'Student Activity Center',
                'resource_type': 'Event Hall',
                'description': 'Spacious multi-purpose arena for student club expos, cultural performances, hackathons, and fairs.',
                'capacity': 200,
                'location': 'Student Center, Floor 2',
                'amenities': 'Flexible Seating, PA Speakers, Modular Stage, Storage Room',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Comfortable Casual / Club Uniform',
                'equipment_needed': 'Portable PA System, Stage Riser Blocks, Extension Power Reels',
                'materials_required': 'Club Banner, Student ID Card, Water Bottle, Event Signage & Props'
            },
            {
                'resource_name': 'MacBook Pro Lab',
                'resource_type': 'Computer',
                'description': 'Specialized Apple ecosystem studio with M2 MacBook Pro laptops for iOS app development and video editing.',
                'capacity': 20,
                'location': 'Library, Floor 3, Room 301',
                'amenities': 'MacOS, Xcode, Final Cut Pro, Adobe CC, USB-C Charging Stations',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Standard Campus Casual',
                'equipment_needed': 'Apple M2 MacBook Pro, Xcode 15, USB-C Docking Hub',
                'materials_required': 'Apple ID Logins, USB-C External Flash Drive, Headphones, Notebook'
            },
            {
                'resource_name': 'Gaming Lab',
                'resource_type': 'Computer',
                'description': 'High-performance graphics workstation lab with liquid-cooled PCs and VR gear for game development.',
                'capacity': 25,
                'location': 'Building A, Floor 3, Room 310',
                'amenities': 'RTX 4090 Gaming PCs, VR Headsets, 240Hz Monitors, RGB Desk Lamps',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Casual',
                'equipment_needed': 'RTX 4090 Rig, Meta Quest 3 VR Headset, Mechanical Keyboards',
                'materials_required': 'Game Controller, High-speed Flash Drive, Noise-Cancelling Headset'
            },
            {
                'resource_name': 'Design Studio',
                'resource_type': 'Lab',
                'description': 'Creative arts studio with professional Wacom drawing tablets and large-format architectural plotters.',
                'capacity': 30,
                'location': 'Arts Building, Floor 2',
                'amenities': 'Wacom Tablets, Adobe Suite, High-res Color Printers, Easels',
                'hourly_rate': 0.00,
                'availability_status': True,
                'image_url': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
                'dress_code': 'Casual / Art Apron Recommended',
                'equipment_needed': 'Wacom Cintiq Pro 24, Adobe Photoshop & Illustrator, A3 Plotter',
                'materials_required': 'A3 Sketchbook, Drawing Pencils, Color Swatches, Digital Stylus'
            },
        ]

        count = 0
        for item in resources_data:
            res, created = Resource.objects.update_or_create(
                resource_name=item['resource_name'],
                defaults={
                    **item,
                    'created_by': admin
                }
            )
            count += 1
            self.stdout.write(self.style.SUCCESS(f'{"[NEW]" if created else "[UPDATED]"} {res.resource_name}'))

        # Create or fetch sample users for student reviews
        from api.models import ResourceReview
        sample_users_data = [
            {'email': 'alex.student@campus.edu', 'name': 'Alex Rivera', 'role': 'Student', 'phone': '9876543210'},
            {'email': 'sarah.chen@campus.edu', 'name': 'Sarah Chen', 'role': 'Student', 'phone': '9876543211'},
            {'email': 'marcus.v@campus.edu', 'name': 'Marcus Vance', 'role': 'Student', 'phone': '9876543212'},
            {'email': 'emily.watson@campus.edu', 'name': 'Emily Watson', 'role': 'Student', 'phone': '9876543213'},
        ]
        reviewers = []
        for u_data in sample_users_data:
            u = User.objects.filter(email=u_data['email']).first()
            if not u:
                try:
                    u = User.objects.create(
                        email=u_data['email'],
                        name=u_data['name'],
                        role=u_data['role'],
                        phone=u_data['phone'],
                        status='Approved'
                    )
                    u.set_password('Student123!')
                    u.save()
                except Exception:
                    u = admin
            reviewers.append(u)

        # Sample reviews mapping per resource name
        reviews_map = {
            'Computer Lab 1': [
                (5, "Excellent dual-monitor workstations and ultra fast gigabit ethernet! Perfect for programming labs."),
                (5, "Very quiet during off-peak hours (11 AM - 1 PM). All IDE tools are pre-configured."),
                (4, "Great facility overall. Clean desks and powerful PCs.")
            ],
            'Computer Lab 2': [
                (5, "Top notch setup for Python and AI model training. High speed internet worked seamlessly."),
                (4, "Spacious and well ventilated. Projector visibility is excellent from all seats.")
            ],
            'Science Lab': [
                (5, "Fume hood apparatus and safety gear are in top condition. Strict dress code enforced."),
                (5, "Digital microscopes and precision scales worked flawlessly for our lab practical.")
            ],
            'Lecture Hall A': [
                (5, "Tiered seating with excellent acoustic clarity and wireless microphones."),
                (4, "Comfortable seats and crystal clear smart screen projection.")
            ],
            'Lecture Hall B': [
                (5, "Dual wall projectors are amazing for split screen slides during lectures."),
                (4, "Good air conditioning and room sound system.")
            ],
            'Seminar Room 1': [
                (5, "Executive conference table and leather chairs are super comfortable for team discussions."),
                (5, "Ideal room for thesis defenses and group presentations.")
            ],
            'Auditorium': [
                (5, "Grand 500-seat theater with professional concert sound and stage lighting!"),
                (5, "Backstage green room and stage console were impressive for our campus event.")
            ],
            'Conference Hall': [
                (5, "Polycom video conferencing system and 4K display made international summit smooth."),
                (4, "High-end venue with great catering layout area.")
            ],
            'Student Activity Center': [
                (5, "Huge flexible arena for club expos and hackathons. Lots of extension power reels."),
                (4, "Modular stage setup was super convenient for our cultural event.")
            ],
            'MacBook Pro Lab': [
                (5, "M2 MacBook Pros with Xcode 15 and USB-C docks. Lightning fast for iOS app builds!"),
                (5, "Super clean environment with Final Cut Pro and Adobe Creative Cloud installed.")
            ],
            'Gaming Lab': [
                (5, "Liquid-cooled RTX 4090 rigs and 240Hz monitors are insane! Meta Quest 3 VR worked great."),
                (5, "Best lab on campus for 3D graphics rendering and game design practicals.")
            ],
            'Design Studio': [
                (5, "Wacom Cintiq Pro 24 drawing tablets and high-res plotters are top tier."),
                (4, "Great lighting and spacious drawing easels for architecture projects.")
            ]
        }

        reviews_created = 0
        for res_name, rev_list in reviews_map.items():
            res_obj = Resource.objects.filter(resource_name=res_name).first()
            if res_obj:
                for idx, (rating, comment) in enumerate(rev_list):
                    reviewer = reviewers[idx % len(reviewers)]
                    _, rev_c = ResourceReview.objects.get_or_create(
                        resource=res_obj,
                        user=reviewer,
                        comment=comment,
                        defaults={'rating': rating}
                    )
                    if rev_c:
                        reviews_created += 1

        # Seed sample bookings for Analytics charts
        today = timezone.localdate()
        sample_bookings_data = [
            # Past bookings (last 6 days)
            {'res': 'Computer Lab 1', 'user_idx': 0, 'offset': -6, 'slot': '09:00 AM - 11:00 AM', 'status': 'Approved', 'purpose': 'CS301 Software Engineering Lab Practical'},
            {'res': 'Science Lab', 'user_idx': 1, 'offset': -5, 'slot': '11:00 AM - 01:00 PM', 'status': 'Approved', 'purpose': 'Organic Chemistry Titration Experiment'},
            {'res': 'Lecture Hall A', 'user_idx': 2, 'offset': -5, 'slot': '02:00 PM - 04:00 PM', 'status': 'Approved', 'purpose': 'Guest Lecture on Quantum Computing'},
            {'res': 'Computer Lab 2', 'user_idx': 3, 'offset': -4, 'slot': '09:00 AM - 11:00 AM', 'status': 'Approved', 'purpose': 'Python Data Science Workshop'},
            {'res': 'MacBook Pro Lab', 'user_idx': 0, 'offset': -4, 'slot': '02:00 PM - 04:00 PM', 'status': 'Rejected', 'purpose': 'Personal Video Editing Session'},
            {'res': 'Gaming Lab', 'user_idx': 1, 'offset': -3, 'slot': '11:00 AM - 01:00 PM', 'status': 'Approved', 'purpose': '3D Game Graphics Rendering Practice'},
            {'res': 'Seminar Room 1', 'user_idx': 2, 'offset': -3, 'slot': '02:00 PM - 04:00 PM', 'status': 'Approved', 'purpose': 'Senior Thesis Project Defense'},
            {'res': 'Auditorium', 'user_idx': 3, 'offset': -2, 'slot': '09:00 AM - 01:00 PM', 'status': 'Approved', 'purpose': 'Annual Campus Cultural Summit'},
            {'res': 'Conference Hall', 'user_idx': 0, 'offset': -2, 'slot': '02:00 PM - 04:00 PM', 'status': 'Approved', 'purpose': 'International Academic Video Conference'},
            {'res': 'Design Studio', 'user_idx': 1, 'offset': -1, 'slot': '09:00 AM - 11:00 AM', 'status': 'Approved', 'purpose': 'Wacom Tablet UI/UX Prototype Review'},
            {'res': 'Lecture Hall B', 'user_idx': 2, 'offset': -1, 'slot': '11:00 AM - 01:00 PM', 'status': 'Rejected', 'purpose': 'Unscheduled Extra Class'},
            
            # Today's bookings
            {'res': 'Computer Lab 1', 'user_idx': 0, 'offset': 0, 'slot': '09:00 AM - 11:00 AM', 'status': 'Approved', 'purpose': 'Full-stack Web Dev Code Review'},
            {'res': 'Student Activity Center', 'user_idx': 1, 'offset': 0, 'slot': '02:00 PM - 05:00 PM', 'status': 'Pending', 'purpose': 'Student Robotics Club Expo Setup'},
            
            # Upcoming bookings (next few days)
            {'res': 'Computer Lab 2', 'user_idx': 2, 'offset': 1, 'slot': '09:00 AM - 11:00 AM', 'status': 'Pending', 'purpose': 'AI Neural Network Training Lab'},
            {'res': 'Science Lab', 'user_idx': 3, 'offset': 2, 'slot': '11:00 AM - 01:00 PM', 'status': 'Approved', 'purpose': 'Microbiology Culture Examination'},
            {'res': 'Lecture Hall A', 'user_idx': 0, 'offset': 3, 'slot': '02:00 PM - 04:00 PM', 'status': 'Pending', 'purpose': 'Department Orientation Seminar'},
            {'res': 'MacBook Pro Lab', 'user_idx': 1, 'offset': 4, 'slot': '09:00 AM - 11:00 AM', 'status': 'Approved', 'purpose': 'Swift & SwiftUI iOS App Hackathon'},
            {'res': 'Auditorium', 'user_idx': 2, 'offset': 5, 'slot': '10:00 AM - 04:00 PM', 'status': 'Pending', 'purpose': 'Campus Grand Annual Alumni Meet'},
        ]

        bookings_created = 0
        for b_info in sample_bookings_data:
            res_obj = Resource.objects.filter(resource_name=b_info['res']).first()
            usr_obj = reviewers[b_info['user_idx'] % len(reviewers)]
            b_date = today + dt.timedelta(days=b_info['offset'])
            if res_obj and usr_obj:
                b_item, b_c = Booking.objects.get_or_create(
                    user=usr_obj,
                    resource=res_obj,
                    booking_date=b_date,
                    time_slot=b_info['slot'],
                    defaults={
                        'purpose': b_info['purpose'],
                        'status': b_info['status'],
                        'amount_paid': 0.00,
                        'payment_status': 'FREE',
                        'checked_in': True if (b_info['offset'] < 0 and b_info['status'] == 'Approved') else False
                    }
                )
                if b_c:
                    bookings_created += 1

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully populated/updated {count} resources with images, dress code, equipment, materials, {reviews_created} student reviews & ratings, and {bookings_created} sample bookings!'))

