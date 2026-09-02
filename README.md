# JobFlow – Job Application Tracker

JobFlow is a modern job application tracking dashboard built with plain HTML, CSS, and JavaScript on the frontend, and a Node.js backend that supports both local JSON storage and MongoDB persistence.

It helps users:

- Track all job applications in one place
- Update application statuses
- Add interview and follow-up reminders
- Upload and track resumes
- View analytics and dashboard insights
- Manage recent applications, deadlines, and upcoming events

## Features

- Dashboard overview for application tracking
- Add, edit, delete, and advance job records
- Status tracking such as Applied, Interviewing, Offer, Rejected
- Quick capture form for fast job entry
- Resume upload support for PDF files
- Recent applications section
- Upcoming interviews and follow-ups
- Resume-used tracking
- Application deadlines and schedules
- Reports and analytics cards
- Calendar-style timeline and event summary
- MongoDB-ready backend with fallback to local JSON storage

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js
- Database: MongoDB (optional, local or cloud)
- Storage fallback: local JSON file

## Project Structure

```text
Job_tracker_NGS/
├── backend/
│   ├── data/
│   │   └── jobs.json
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── .gitignore
├── Job_Application_Tracker Project_Overview.pdf
├── project-summary.html
└── README.md
```

## Prerequisites

Before running the project on your PC, make sure you have:

- Node.js installed
- npm installed
- MongoDB installed locally (optional if you want to use JSON fallback)
- A browser such as Chrome or Edge

### Check Node.js and npm

Run the following in your terminal:

```bash
node -v
npm -v
```

If both commands return versions, your environment is ready.

## Option 1: Run Without MongoDB

This mode uses the local JSON file for storage and requires no database setup.

### Step 1: Open terminal in the project folder

```bash
cd "C:\Users\YourName\Desktop\Job_tracker_NGS"
```

### Step 2: Start the backend

```bash
cd backend
npm install
node server.js
```

The server will run on:

```text
http://localhost:5000
```

### Step 3: Open in browser

Open:

```text
http://localhost:5000
```

---

## Option 2: Run With MongoDB Locally

This mode stores data in your local MongoDB database.

### Step 1: Install MongoDB

Download and install MongoDB Community Server from the official MongoDB website.

Then start MongoDB locally using the default port:

```text
mongodb://localhost:27017
```

### Step 2: Create database and collection

The app is configured to use:

- Database: `job_tracker`
- Collection: `jobs`

If MongoDB is running locally, the app will connect automatically using:

```bash
MONGODB_URI=mongodb://localhost:27017/job_tracker
MONGODB_DB=job_tracker
```

### Step 3: Start backend with MongoDB environment variables

In PowerShell:

```powershell
cd "C:\Users\YourName\Desktop\Job_tracker_NGS\backend"
$env:MONGODB_URI='mongodb://localhost:27017/job_tracker'
$env:MONGODB_DB='job_tracker'
node server.js
```

### Step 4: Open the app

Visit:

```text
http://localhost:5000
```

## Environment Variables

The backend reads the following environment variables:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/job_tracker
MONGODB_DB=job_tracker
```

If `MONGODB_URI` is not set, the app falls back to the local JSON file in:

```text
backend/data/jobs.json
```

## How the App Works

- The frontend sends requests to the backend API at `/api/jobs`
- The backend stores data in MongoDB if available
- If MongoDB is unavailable or not configured, it automatically saves to the JSON file
- The dashboard refreshes data after each add, update, or delete action

## Common Commands

### Install backend dependencies

```bash
cd backend
npm install
```

### Start server

```bash
cd backend
node server.js
```

### Start server with MongoDB config (PowerShell)

```powershell
cd backend
$env:MONGODB_URI='mongodb://localhost:27017/job_tracker'
$env:MONGODB_DB='job_tracker'
node server.js
```

## Notes

- The app is designed for local development and demo use
- Resume uploads are limited to PDF files
- The dashboard is a polished UI for job tracking and interview management
- You can expand this project later with:
  - login/authentication
  - user-specific records
  - cloud deployment
  - MongoDB Atlas integration
  - export to CSV/PDF

## Troubleshooting

### Port already in use

If port `5000` is already busy, free it and restart:

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5000
Stop-Process -Id <PID>
```

Then start the app again.

### MongoDB not connecting

Check that MongoDB is running:

```bash
mongosh
```

If MongoDB is not installed, install it first and then restart the backend.

### App not loading

Make sure you are running the backend from the `backend` folder and then opening:

```text
http://localhost:5000
```

## License

This project is for educational and personal project use.

## Author

Shashank SM JobFlow Dashboard

##Deployed Dashboard explore
```text
https://job-flow-7qmr.vercel.app/
```
