# Campus Resource Management System (CampusRMS)
A modern, glassmorphic full-stack web application for managing campus resources, reservations, and system users with role-based access controls, interactive floor plan maps, and real-time operational auditing.

---

## 🚀 Features

### Core Operations
*   **User Management**: Administrators can view, update, status-toggle, and manage system user credentials.
*   **Resource Management**: Staff and Administrators can manage campus resources (Labs, Classrooms, Event Halls, Computers) with custom capacities, locations, and equipment tags.
*   **Booking System**: Students can book resources with date/time-slot validation and printable access pass generation.
*   **Role-Based Access**: Three user roles (Student, Staff, Admin) with granular permission guards.
*   **Real-time Status**: Currently logged-in sessions dynamically display as `ACTIVE`, while logged-out/inactive accounts show as `INACTIVE`.
*   **Smart Filters**: Search, category filters, and amenities tags filtering across resources.

### Premium Extensions
*   **🗺️ Interactive Floor Plan Map**: A custom SVG floor plan layout in the resources directory. Clicking on building wings filters the asset lists dynamically.
*   **❤️ Starred Favorites**: Local storage-based favorites system to bookmark frequently used classrooms and laboratories.
*   **📊 CSV Utilization Reports**: Admin-exclusive capability to download comprehensive stats reports containing system metrics, booking density charts, and live room occupancy statuses.
*   **📅 Recurring Reservations**: Bulk booking option supporting Daily and Weekly schedules (creating 3 reservations) with transactional overlap prevention.
*   **🎟️ Simulated QR Check-in**: Physical attendance check-in simulator on approved access passes that registers arrival times.
*   **🔐 Compliance Audit Logs**: Server-side auditing mapping CRUD transactions, logins/logouts, and check-ins along with client IP addresses.

---

## 📋 Prerequisites
*   **Python**: 3.8 or higher
*   **Node.js**: 18.x or higher
*   **MySQL**: 8.0 or higher
*   **Git**

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Pavithrainiya/CampusCRMS.git
cd CampusCRMS
```

### 2. Backend Setup (Django)

#### On Windows:
```bash
cd CampusRMS/backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

#### On Linux/Mac:
```bash
cd CampusRMS/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Configure Database:
1. Create a MySQL database named `crmss`:
   ```sql
   CREATE DATABASE crmss;
   ```
2. Update the database settings in `CampusRMS/backend/config/settings.py` with your credentials:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'crmss',
           'USER': 'your_mysql_username',
           'PASSWORD': 'your_mysql_password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

#### Apply Migrations:
```bash
python manage.py makemigrations api
python manage.py migrate
```

#### Seed Admin Account:
```bash
python manage.py create_admin
```
*   **Default Admin Email**: `admin@campusrms.com`
*   **Default Admin Password**: `Admin@12345`

---

### 3. Frontend Setup (React + Vite)
Open a new terminal:
```bash
cd CampusRMS/frontend
npm install
```

---

## 🚀 Running the Application

### Start Django Backend:
```bash
cd CampusRMS/backend
python manage.py runserver
```
*   **Backend URL**: [http://localhost:8000](http://localhost:8000)

### Start Vite React Frontend:
```bash
cd CampusRMS/frontend
npm run dev
```
*   **Frontend URL**: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Default Login Credentials
*   **Admin Account**:
    *   **Email**: `admin@campusrms.com`
    *   **Password**: `Admin@12345`
*   **Test Student/Staff Accounts**: Register new profiles using the signup form on the frontend, or create them using the Admin Panel dashboard.

---

## 📱 User Roles & Permissions

### Student
*   Browse resources, search names, filter categories, and select amenities tags.
*   Star favorite resources (persisted in browser storage).
*   Create new bookings and request recurring schedules.
*   Cancel own pending bookings and view approved access passes.
*   Perform simulated QR check-in when physically arriving at the resource.

### Staff
*   All student booking and search permissions.
*   Add, edit, modify, and delete resources.
*   Set resource status to active or maintenance.
*   View all bookings.

### Admin
*   Full Staff permissions.
*   Approve or reject booking requests.
*   Full user management (create new users, update profiles, toggle active status, and delete accounts).
*   Export comprehensive utilization metrics and live system occupancy reports as CSV.

---

## 🎯 Key Features Explained

### 1. Booking Validation
*   Prevents reservations in past dates.
*   Prevents reservations in past time slots on the current date.
*   Prevents double bookings for the same resource, date, and time slot.
*   Prevents students from booking different resources at the same time slot (overlapping student schedules).

### 2. Password Requirements
*   Minimum 8 characters.
*   At least one uppercase letter.
*   At least one lowercase letter.
*   At least one number.
*   At least one special character.

---

## 📂 Project Structure

```
CampusRMS/
├── backend/
│   ├── api/                    # Django Application
│   │   ├── migrations/         # Database migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_resource_amenities_resource_location_notification.py
│   │   │   └── 0003_booking_check_in_time_booking_checked_in_auditlog.py
│   │   ├── management/commands/
│   │   │   └── create_admin.py # Seed admin command
│   │   ├── models.py           # Database models (User, Resource, Booking, AuditLog, Notification)
│   │   ├── serializers.py      # DRF Model Serializers
│   │   ├── views.py            # API views & ViewSets (Booking approvals, check-ins)
│   │   ├── urls.py             # Router paths
│   │   └── tests.py            # Backend test suite
│   ├── config/                 # Settings configuration
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── manage.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # Context wrappers & layouts
│   │   │   ├── AuthContext.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── RouteGuards.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── pages/              # Interface pages
│   │   │   ├── Bookings.jsx    # Booking schedules, pass modal, & check-in
│   │   │   ├── Dashboard.jsx   # Metrics cards, graphs, & report export
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Resources.jsx   # Interactive map, favorites, & resource cards
│   │   │   └── Users.jsx       # User administration directory
│   │   ├── services/
│   │   │   └── api.js          # Axios API agent
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Glassmorphic Tailwind styling
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 🔧 Common Commands

### Backend Commands:
```bash
# Run server
python manage.py runserver

# Generate migrations
python manage.py makemigrations api

# Apply database updates
python manage.py migrate

# Run views and validation tests
python manage.py test api

# Create customized admin user
python manage.py create_admin

# Django shell console
python manage.py shell
```

### Frontend Commands:
```bash
# Install assets
npm install

# Run Vite dev server
npm run dev

# Compile production bundle
npm run build
```

---

## 📊 API Endpoints

### Authentication
*   `POST /api/token/` - Obtain JWT Token
*   `POST /api/token/refresh/` - Refresh JWT Token
*   `POST /api/register/` - Create a new user account
*   `GET /api/user/` - Fetch currently authenticated user details

### Users List (Admin)
*   `GET /api/users/` - List all users
*   `POST /api/users/` - Create a new user
*   `PUT /api/users/{id}/` - Update a user profile
*   `DELETE /api/users/{id}/` - Delete user profile

### Resources Directory
*   `GET /api/resources/` - Query resources
*   `POST /api/resources/` - Create resource
*   `PUT /api/resources/{id}/` - Update resource details
*   `DELETE /api/resources/{id}/` - Delete resource

### Bookings Workflow
*   `GET /api/bookings/` - Retrieve bookings
*   `POST /api/bookings/` - Create booking (supports `recurring_type` payload)
*   `PUT /api/bookings/{id}/` - Modify pending booking details
*   `DELETE /api/bookings/{id}/` - Cancel a booking
*   `POST /api/bookings/{id}/approve/` - Approve reservation (Admin)
*   `POST /api/bookings/{id}/reject/` - Reject reservation (Admin)
*   `POST /api/bookings/{id}/check_in/` - Simulated QR attendance check-in

### System Analytics (Admin)
*   `GET /api/admin/stats/` - Retrieve dashboard telemetry and occupancy statuses

---

## 🔐 Security Features
*   **Password Hashing**: Implements Django's built-in PBKDF2 secure password hashing algorithms.
*   **Session Guard**: Authenticated endpoints protected via JSON Web Tokens (SimpleJWT).
*   **SQL Injection Prevention**: Standard database operations executed safely via Django's secure QuerySet abstraction layer.
*   **XSS Protection**: Sanitized UI state binding and inputs through Vite React.
*   **Audit Logging**: Persistent transaction accountability capturing request timestamps and user IP addresses.

---

## 🎨 Tech Stack
*   **Backend**: Django 5.x, Django REST Framework 3.x, MySQL, simpleJWT.
*   **Frontend**: React 18, Vite 6, Tailwind CSS, Framer Motion, Lucide Icons, Axios.

---

## 📝 License
This project is created for educational and campus administration purposes.
