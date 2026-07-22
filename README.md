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
3. Set the startup file to `server.js`.
4. Set the startup command to `npm start`.
5. Use Node.js 18 or newer.
6. Keep `data/` writable so booking requests can be stored in `data/bookings.json`.
7. Point the domain to the Node.js app, not only to static hosting, because bookings use `/api/bookings`.

No external npm packages are required.

## Contact

- Email: sales@northeastbasecamp.com
- Phone: +91 96789 80213, +91 87199 62147, +91 88229 14698
- Instagram: https://www.instagram.com/northeast_basecamp?igsh=MWczYzZrMG9tNmd1cA==
