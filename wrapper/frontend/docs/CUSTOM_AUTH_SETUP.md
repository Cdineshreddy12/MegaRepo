# Custom Authentication Setup Guide

This guide explains how to set up Kinde custom authentication pages for the Zopkit application.

## Overview

The application now uses Kinde's custom authentication feature, which allows you to:
- Design your own login/signup UI in React
- Keep full control over branding and user experience
- Still leverage Kinde's secure authentication flows (OTP, MFA, etc.)

## Prerequisites

1. **Kinde Account**: You need a Kinde account with an application configured
2. **Connection IDs**: Each authentication method (Google, Email, etc.) has a Connection ID in Kinde

## Setup Steps

### Step 1: Enable Custom Auth in Kinde Dashboard

1. Log in to your [Kinde Dashboard](https://app.kinde.com)
2. Navigate to **Settings** → **Applications**
3. Select your application
4. Enable **"Use your own sign-up and sign-in screens"**
5. Save the changes

### Step 2: Get Your Google Connection ID

1. In Kinde Dashboard, go to **Settings** → **Connections**
2. Find your Google connection
3. Copy the **Connection ID** (it will look like `conn_google_abc123`)

### Step 3: Configure Environment Variables

Add the following environment variable to your `.env` file:

```env
# Existing Kinde configuration
VITE_KINDE_DOMAIN=https://your-domain.kinde.com
VITE_KINDE_CLIENT_ID=your_client_id

# Custom Auth - Google Connection ID
VITE_KINDE_GOOGLE_CONNECTION_ID=conn_google_abc123
```

### Step 4: Restart Your Application

After adding the environment variable, restart your development server:

```bash
npm run dev
# or
yarn dev
```

## How It Works

### Authentication Flow

1. **User clicks login button** → Your custom React UI
2. **Redirects to Kinde** → Secure authentication happens
3. **User returns to your app** → With user info and tokens

### What Your App Controls

- ✅ UI / branding
- ✅ Which login buttons to show
- ✅ When login starts
- ✅ User experience flow

### What Kinde Controls

- ✅ OTP/password screens
- ✅ Multi-factor authentication
- ✅ Account creation
- ✅ Security & compliance

## Implementation Details

### Login Page (`src/pages/Login.tsx`)

The main login page uses the custom auth approach:

```typescript
const googleConnectionId = import.meta.env.VITE_KINDE_GOOGLE_CONNECTION_ID;

await login({ connectionId: googleConnectionId });
```

### Social Login Component (`src/components/auth/SocialLogin.tsx`)

The SocialLogin component automatically uses custom auth when the connection ID is configured:

```typescript
if (provider === 'google' && googleConnectionId) {
  loginOptions.connectionId = googleConnectionId;
}
```

### Other Components

All authentication components have been updated to support custom auth:
- `AuthButton.tsx` - Uses connection ID for Google
- `Landing.tsx` - Landing page login button
- `Billing.tsx` - Billing page authentication

## Adding More Authentication Methods

To add more authentication methods (Email, Phone, etc.):

1. Get the Connection ID from Kinde Dashboard
2. Add environment variable: `VITE_KINDE_EMAIL_CONNECTION_ID=conn_email_xyz456`
3. Update the login logic to use the connection ID:

```typescript
const emailConnectionId = import.meta.env.VITE_KINDE_EMAIL_CONNECTION_ID;
await login({ connectionId: emailConnectionId });
```

## Troubleshooting

### Issue: "VITE_KINDE_GOOGLE_CONNECTION_ID is not configured"

**Solution**: Make sure you've added the environment variable to your `.env` file and restarted the server.

### Issue: Authentication redirects to default Kinde pages

**Solution**: 
1. Verify that "Use your own sign-up and sign-in screens" is enabled in Kinde Dashboard
2. Check that the Connection ID is correct
3. Ensure the environment variable is loaded (check browser console)

### Issue: Connection ID not working

**Solution**:
1. Verify the Connection ID in Kinde Dashboard
2. Ensure the connection is enabled and properly configured
3. Check browser console for detailed error messages

## Testing

1. **Test Login Flow**:
   - Navigate to `/login`
   - Click "Continue with Google"
   - Verify redirect to Google OAuth
   - Complete authentication
   - Verify return to application

2. **Test Landing Page**:
   - Navigate to `/landing`
   - Click "Sign In" or "Start Free Trial"
   - Verify custom auth flow works

3. **Test CRM Redirect**:
   - Navigate to `/login?source=crm&returnTo=...`
   - Complete authentication
   - Verify redirect to CRM after auth

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_KINDE_DOMAIN` | Your Kinde domain URL | Yes |
| `VITE_KINDE_CLIENT_ID` | Your Kinde application client ID | Yes |
| `VITE_KINDE_GOOGLE_CONNECTION_ID` | Google connection ID for custom auth | Yes (for Google auth) |
| `VITE_KINDE_REDIRECT_URI` | OAuth redirect URI | Optional (defaults to `/auth/callback`) |
| `VITE_KINDE_LOGOUT_URI` | Logout redirect URI | Optional (defaults to origin) |

## Additional Resources

- [Kinde Custom Auth Documentation](https://kinde.com/docs/developer-tools/custom-authentication-pages/)
- [Kinde React SDK Documentation](https://kinde.com/docs/developer-tools/react-sdk/)
- [Connection IDs Guide](https://kinde.com/docs/developer-tools/connection-ids/)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Kinde Dashboard settings are configured properly
4. Review Kinde documentation for latest updates










