# Northeast Basecamp

Premium Ziro Festival campsite website with a Node.js backend for booking requests.

## What Runs

- Frontend: `index.html`, `styles.css`, `script.js`, local images and video under `assets/`
- Backend: `server.js`
- Booking endpoint: `POST /api/bookings`
- Booking storage: `data/bookings.json` created automatically at runtime

## Local Run

```bash
npm start
```

The app uses `process.env.PORT` when available, otherwise it runs on port `3000`.

## Hostinger Node.js Deployment

1. Create a Node.js app in Hostinger.
2. Set the application root to the uploaded repository folder.
3. Framework type: `Other`.
4. Entry file: `server.js`.
5. Build command: `npm run build`.
6. Output directory: leave blank.
7. Use Node.js 20 or newer (Node.js 18 also works).
8. Keep `data/` writable so booking requests can be stored in `data/bookings.json`.
9. Point the domain to the Node.js app, not only to static hosting, because bookings use `/api/bookings`.

Hostinger starts the configured entry file automatically after the build. Leave `PORT` unset in hPanel: Hostinger supplies it to the application, and the server reads it automatically (falling back to `3000`). Do not enter `npm start` as the build command, as that launches a second server during the build and produces the `EADDRINUSE` error.

If Hostinger shows `EADDRINUSE: address already in use :::3000`, check that `npm start` is not entered as the build command. `npm start` launches the long-running server and should only be used as the startup command.

The only runtime dependency is `mysql2`, used for Hostinger MySQL booking storage.

## Hostinger MySQL Database

The app stores booking requests in MySQL when database environment variables are present. Without these variables, it falls back to local JSON storage for development.

Set these environment variables in Hostinger:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=u644575138_admin
DB_PASSWORD=your_database_password
DB_NAME=u644575138_Northeastbase
NODE_ENV=production
```

Do not commit the real password to GitHub. Use Hostinger's Environment Variables screen or import a private `.env` file during deployment.

The app can create the required tables automatically on first database use. You can also run `database.sql` manually in phpMyAdmin to create `bookings` and `enquiries` ahead of time.

After deployment, visit `/health` or `/healthz`. It should return JSON and show `storage: "mysql"` when the database variables are configured. Visit `/healthz?db=1` to force a database connection check.

## Contact

- Email: sales@northeastbasecamp.com
- Phone: +91 96789 80213, +91 87199 62147, +91 88229 14698
- Instagram: https://www.instagram.com/northeast_basecamp?igsh=MWczYzZrMG9tNmd1cA==
