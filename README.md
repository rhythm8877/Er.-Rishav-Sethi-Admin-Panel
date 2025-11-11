# Er.-Rishav-Sethi-Admin-Panel

React + Vite admin panel for managing blogs, events, users, and more.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

You can copy `.env.example` to `.env` and fill in your values.

### 3. Run Development Server

```bash
npm run dev
```

## Deployment to Netlify

### Setting Environment Variables on Netlify

**Important:** For Firebase to work on Netlify, you must set the environment variables in the Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables (with the `VITE_` prefix):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

4. After adding the variables, **trigger a new deploy** (either by pushing to your connected branch or manually redeploying)

### Build Settings

- **Build command:** `npm run build`
- **Publish directory:** `dist`

The `_redirects` file in the `public` folder is automatically included in the build to handle SPA routing.

## Troubleshooting

### Firebase Not Working

If data is not loading:

1. **Check browser console** for error messages about missing environment variables
2. **Verify environment variables** are set correctly in Netlify dashboard
3. **Redeploy** after adding/changing environment variables
4. **Check Firebase console** to ensure your Firestore database has the correct collections (`blogs`, `events`, etc.)

### 404 Errors on Refresh

The `_redirects` file should handle this. If you still see 404s:
- Ensure `public/_redirects` exists with: `/*    /index.html   200`
- Redeploy your site

## Features

- User authentication
- Blog management
- Event management
- User management
- Connect section
- Carousel management
- Light/Dark theme toggle
