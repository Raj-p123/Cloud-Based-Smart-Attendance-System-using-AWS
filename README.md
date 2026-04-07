# Cloud-Based Smart Attendance Management System

An AWS-ready smart attendance platform with:

- React frontend styled with an organic, tactile design system
- Node.js + Express backend with JWT authentication
- MySQL schema intended for Amazon RDS
- QR-code attendance sessions with expiration support
- Teacher, student, and admin role dashboards
- EC2 deployment guidance and hooks for S3 / SES enhancements

## Structure

- `client/` React + Vite frontend
- `server/` Express API and MySQL schema

## Quick Start

1. Create the MySQL database using [schema.sql](D:\aws skill\server\sql\schema.sql).
2. Copy `server/.env.example` to `server/.env` and update it with your Amazon RDS and app settings.
3. Install dependencies:
   - `cd server && npm install`
   - `cd client && npm install`
4. Start the backend: `npm run dev`
5. Start the frontend: `npm run dev`

## AWS Deployment

Use EC2 to host the Node API and the built React app, point the backend at Amazon RDS MySQL, optionally move static uploads/backups to S3, and connect SES for email alerts.
