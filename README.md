# Student Hub

Student Hub is a full-stack academic platform for **students, professors and administrators**, with a Django REST backend and a React/Vite frontend. Professors publish assignments, students submit their work (alone or in groups), and everyone stays informed through announcements and notifications.

## Objectives

- Replace scattered emails and file sharing with one place to manage coursework.
- Give each role (student, professor, admin) its own dashboard and permissions.
- Make grading and feedback traceable, with deadlines and notifications.

## Stack

- Backend: Django 5, Django REST Framework, Simple JWT, django-allauth, dj-rest-auth
- Frontend: React 18, Vite, TailwindCSS, Framer Motion, i18next
- Database: PostgreSQL through `DATABASE_URL` such as Neon
- Storage: Cloudinary raw media storage
- Email: SMTP configured through environment variables
- Authentication: JWT, with Google sign-in configured through environment variables

## Features

- **Three roles**: student, professor and admin, each with a dedicated dashboard and permission rules.
- **Assignments**: TP, TD or project assignments with a deadline, attached files (PDF, Excel, PowerPoint, ZIP) and target majors and courses.
- **Submissions**: files or links, individually or as a project group with a leader and members.
- **Review workflow**: professors approve or reject submissions, with a grade and written feedback.
- **Announcements and notices**: broadcast messages and personal notices.
- **Notifications**: in-app notification bell and email messages (verification, welcome, notifications).
- **Data export** of assignment and submission data.
- **File validation**: type and size checks on uploads.
- **Multilingual and themed UI**: English and French, light and dark theme, accessible modals.

## Skills demonstrated

- Designing a relational data model across several Django apps: users, academics, pedagogy, assignments, announcements, notifications.
- Building a secure REST API (JWT authentication) consumed by a React client.
- Role-based access control and secure file upload handling.
- Internationalization (i18n) and accessible UI components.
- Cloud deployment and configuration through environment variables: Vercel, PostgreSQL (Neon), Cloudinary.

## Project structure

```
backend/
  apps/
    users/          Accounts, profiles, roles, permissions
    academics/      Academic structure
    pedagogique/    Majors and courses
    assignments/    Assignments, groups, submissions, files, export
    announcements/  Announcements
    notifications/  In-app notifications and emails
  config/           Django settings and URLs
  templates/emails/ HTML email templates
frontend/
  src/
    pages/          Landing, auth, student, professor and admin pages
    components/     Reusable UI (DataTable, FileDropzone, NotificationBell...)
    context/        Auth, language and theme providers
    locales/        en.json and fr.json
    services/       API client and endpoints
```

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Set the backend `.env` values before running migrations in a production-like environment:

```env
SECRET_KEY=replace-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CLOUDINARY_CLOUD_NAME=replace-me
CLOUDINARY_API_KEY=replace-me
CLOUDINARY_API_SECRET=replace-me
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=replace-me
EMAIL_HOST_PASSWORD=replace-me
DEFAULT_FROM_EMAIL=Student Hub <noreply@studenthub.com>
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend environment:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_GOOGLE_CLIENT_ID=replace-me
VITE_APP_NAME=Student Hub
```

## Deployment

### Frontend on Vercel

1. Import `/frontend` as the project root.
2. Set build command to `npm run build`.
3. Set output directory to `dist`.
4. Add `VITE_API_URL` pointing to the deployed backend `/api/v1` URL.
5. Keep the included `frontend/vercel.json` for SPA rewrites.

### Backend on Railway or Render

1. Set project root to `/backend`.
2. Use `pip install -r requirements.txt` as the install command.
3. Use the included `Procfile`: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`.
4. Add all backend environment variables from `backend/.env.example`.
5. Run `python manage.py migrate`.
6. Run `python manage.py collectstatic --noinput`.

## Author

**Saif-Eddine Bahiri** — [GitHub](https://github.com/saif-sudo-afk)
