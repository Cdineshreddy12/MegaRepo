# Custom Auth Troubleshooting Guide

## Issue: Still Seeing Kinde Default Form

If you're still seeing Kinde's default authentication form instead of your custom form, follow these steps:

### Step 1: Verify Custom Auth is Enabled in Kinde Dashboard

1. Log in to [Kinde Dashboard](https://app.kinde.com)
2. Navigate to **Settings** → **Applications**
3. Select your application
4. Look for **"Use your own sign-up and sign-in screens"** toggle
5. **Enable** this toggle if it's not already enabled
6. **Save** the changes

### Step 2: Verify Connection ID

1. In Kinde Dashboard, go to **Settings** → **Connections**
2. Find your Google connection
3. Copy the **Connection ID** (format: `conn_google_xxxxx`)
4. Verify it matches your `.env` file:
   ```env
   VITE_KINDE_GOOGLE_CONNECTION_ID=conn_google_xxxxx
   ```

### Step 3: Check Browser Console

Open your browser's developer console (F12) and look for:
- `🔄 Starting Google login flow with custom auth`
- `📋 Connection ID: conn_google_xxxxx`

If you see:
- `❌ VITE_KINDE_GOOGLE_CONNECTION_ID is not configured` → The environment variable is missing
- `⚠️ Falling back to default Kinde login` → Connection ID not found, using default

### Step 4: Verify Environment Variable is Loaded

1. Check your `.env` file exists in `wrapper/frontend/`
2. Restart your development server after adding/changing environment variables
3. Verify the variable is loaded:
   ```javascript
   console.log('Connection ID:', import.meta.env.VITE_KINDE_GOOGLE_CONNECTION_ID)
   ```

### Step 5: Clear Browser Cache

Sometimes cached authentication states can cause issues:
1. Clear browser cache and cookies
2. Try in an incognito/private window
3. Test the login flow again

### Step 6: Check Kinde SDK Version

Ensure you're using a compatible version:
```bash
npm list @kinde-oss/kinde-auth-react
```

Recommended version: `^5.4.1` or higher

### Step 7: Verify Redirect URI

Ensure your redirect URI matches in:
1. Kinde Dashboard → Settings → Applications → Your App → Redirect URLs
2. Your `.env` file: `VITE_KINDE_REDIRECT_URI`

### Common Issues

#### Issue: Connection ID Not Working

**Solution**: The parameter name might vary. The code now tries both:
- `connectionId` (camelCase)
- `connection_id` (snake_case)

#### Issue: Still Redirecting to Kinde Default Form

**Possible Causes**:
1. Custom auth not enabled in Kinde Dashboard
2. Connection ID is incorrect or doesn't match
3. Environment variable not loaded (server not restarted)
4. Using wrong connection ID (not the Google one)

#### Issue: "Authentication configuration error"

**Solution**: 
- Check that `VITE_KINDE_GOOGLE_CONNECTION_ID` is set in your `.env` file
- Restart your development server
- Verify the connection ID format: `conn_google_xxxxx`

### Testing Checklist

- [ ] Custom auth enabled in Kinde Dashboard
- [ ] Connection ID copied from Kinde Dashboard
- [ ] Environment variable set in `.env` file
- [ ] Development server restarted after adding env variable
- [ ] Browser console shows connection ID when logging in
- [ ] No errors in browser console
- [ ] Redirect URI matches in Kinde Dashboard

### Expected Behavior

When custom auth is properly configured:
1. User clicks "Continue with Google" on YOUR custom login page
2. User is redirected directly to Google OAuth (not Kinde's default form)
3. After Google authentication, user returns to your app
4. Kinde handles the secure token exchange in the background

### Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Kinde Dashboard settings match your configuration
4. Try testing in an incognito window to rule out cache issues
5. Review Kinde's official documentation: https://docs.kinde.com/authenticate/custom-configurations/custom-authentication-pages/










