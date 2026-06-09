# Campus Resource Management System (CampusRMS)

CampusRMS is a premium, modern full-stack web application designed for scheduling, monitoring, and auditing school resources (such as computer stations, laboratories, classrooms, and conference halls) with role-based access.

---

## 🚀 Key Premium Features

*   **🗺️ Interactive SVG Floor Plan Map**: A beautiful blueprint overlay on the resources directory page that allows users to filter asset lists by clicking specific sections/wings of the building.
*   **❤️ Local Starred Favorites**: Persistent client-side favorites system using `localStorage` to bookmark and filter preferred spaces.
*   **📊 CSV Utilization Reports**: Admin-only feature that compiles statistics, resource utilization densities, and live room occupancy statuses into a downloadable CSV spreadsheet.
*   **📅 Recurring Booking Engine**: Support for scheduling daily and weekly reservation series in bulk with transaction-safe conflict validation across all dates.
*   **🎟️ Printable Access Pass & QR Check-in**: Secure access pass modals displaying resource details, location, and a mock barcode with a simulated QR check-in mechanism that updates arrival statuses.
*   **🔐 Activity Audit Logs**: Server-side tracking that logs user authentication, resource adjustments, and booking edits along with user IP addresses for administrative accountability.

---

## 🛠️ Technology Stack

*   **Backend**: Python, Django REST Framework, SimpleJWT (JWT Authentication), MySQL / SQLite database engines.
*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React icons.

---

## ⚙️ Installation & Setup

### 1. Backend Setup (Django)

1. Navigate to the backend directory:
   ```bash
   cd CampusRMS/backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install django djangorestframework djangorestframework-simplejwt django-cors-headers mysqlclient
   ```
4. Run migrations:
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   ```
5. Start the backend development server:
   ```bash
   python manage.py runserver
   ```

### 2. Frontend Setup (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd CampusRMS/frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🧪 Running Tests
To verify backend functionality and view logic correctness:
```bash
cd CampusRMS/backend
python manage.py test api
```
