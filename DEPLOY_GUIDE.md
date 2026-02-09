# Professional Cloud Deployment Guide

Follow these steps to take your project live.

## 1. Prerequisites

- A **GitHub** account.
- **Railway.app** (for MySQL and Backend).
- **Vercel.com** (for Frontend).
- **MetaMask** with some **Sepolia ETH** (get it from a faucet).

## 2. Step-by-Step Deployment

### A. Database (Railway)

1. Go to [Railway.app](https://railway.app) and create a new project.
2. Select **Provision MySQL**.
3. Under "Variables", find your `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_PORT`.
4. Use a MySQL client (or terminal) to run the `Database_API/schema.sql` file on your new database.

### B. Backend (Render or Railway)

1. Create a new "Web Service" on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. Set the "Root Directory" to `Database_API`.
4. Use the following Environment Variables:
   - `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`, `MYSQL_PORT` (from Step A).
   - `SECRET_KEY` (use the long string from your `.env`).
   - `SMTP_USER`, `SMTP_PASSWORD` (for Gmail OTPs).
   - `FRONTEND_URL` (your future Vercel URL).

### C. Blockchain (Sepolia)

1. In your `truffle-config.js`, verify `sepolia` settings.
2. Run: `truffle migrate --network sepolia`.
3. Note the **Contract Address** on Sepolia.

### D. Frontend (Vercel)

1. Update `src/js/app.js` with your live **Render URL**.
2. Run `npx browserify ./src/js/app.js -o ./src/dist/app.bundle.js` (and same for other scripts).
3. Connect your GitHub repo to **Vercel**.
4. Deploy!

## 3. Important Notes

- **Browserify**: Every time you change your `pythonApiUrl` or `Contract Address`, you **MUST** run the browserify bundling commands before pushing to GitHub.
- **CORS**: Ensure your Render backend has your Vercel URL in its `FRONTEND_URL` variable.
