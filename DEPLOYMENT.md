# AWS Deployment Notes

## Architecture

- Frontend: React app built with Vite
- Backend: Node.js + Express API on Amazon EC2
- Database: Amazon RDS MySQL
- Optional: Amazon S3 for exports/backups, Amazon SES for notifications

## EC2 Setup

1. Launch an EC2 instance with Node.js installed.
2. Clone this repository onto the instance.
3. In `server/.env`, set `DB_HOST` to the RDS endpoint and configure `JWT_SECRET`, `CLIENT_URL`, and `QR_BASE_URL`.
4. In `client/.env`, set `VITE_API_BASE_URL` to your public API URL.
5. Build the frontend with `npm run build` inside `client/`.
6. Serve the built frontend from Nginx or from Express as static files.
7. Run the backend with a process manager like PM2 or `systemd`.

## RDS Setup

1. Create an Amazon RDS MySQL instance.
2. Allow inbound access from the EC2 security group on port `3306`.
3. Run [schema.sql](D:\aws skill\server\sql\schema.sql) against the RDS instance.
4. Store database credentials in environment variables, not in source files.

## Security

- Use IAM roles for EC2 where possible.
- Restrict RDS and EC2 security groups to required ports only.
- Put the app behind HTTPS with an Application Load Balancer or Nginx + ACM.
- Rotate `JWT_SECRET` and database passwords before production launch.

## Optional Enhancements

- Store generated reports or backups in Amazon S3.
- Send attendance alerts or summaries through Amazon SES.
- Add geofencing checks in `markAttendance` using session coordinates and browser geolocation.
