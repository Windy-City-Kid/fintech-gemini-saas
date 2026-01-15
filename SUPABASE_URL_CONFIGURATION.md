# Supabase URL Configuration Guide

## Password Reset Flow Configuration

This guide explains how to configure Supabase Dashboard URL settings to ensure the password reset flow works correctly.

---

## Required Configuration

### Step 1: Navigate to Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**

### Step 2: Configure Site URL

**Site URL**: `http://localhost:8080`

This is the base URL for your application. Supabase will default to this URL if no redirect URL is specified.

---

### Step 3: Configure Redirect URLs

In the **Additional Redirect URLs** section, add the following URLs (one per line):

```
http://localhost:8080/reset-password
http://localhost:8080/
http://localhost:8080/auth
```

**Important Notes:**
- `http://localhost:8080/reset-password` is **REQUIRED** for password reset flow
- Without this URL in the redirect list, Supabase will default to the Site URL (`/`)
- This causes the app to auto-login and redirect to dashboard, bypassing the reset password page

---

## How It Works

### Password Reset Flow:

1. User clicks "Forgot password?" on auth page
2. User receives email with reset link containing `type=recovery` token
3. User clicks link → Supabase redirects to URL specified in `resetPasswordForEmail()` options
4. If `/reset-password` is in **Additional Redirect URLs**, user is redirected there
5. If `/reset-password` is **NOT** in redirect URLs, Supabase defaults to Site URL (`/`)
6. App auto-logs in and redirects to dashboard (bypassing reset page) ❌

### With Correct Configuration:

✅ User clicks reset link → Redirects to `/reset-password`
✅ `PASSWORD_RECOVERY` event is intercepted by AuthContext
✅ User stays on reset password page
✅ User completes password reset → Redirects to dashboard

---

## Production Configuration

For production, replace `localhost:8080` with your production domain:

**Site URL**: `https://your-production-domain.com`

**Additional Redirect URLs**:
```
https://your-production-domain.com/reset-password
https://your-production-domain.com/
https://your-production-domain.com/auth
```

---

## Verification Checklist

- [ ] Site URL is set to `http://localhost:8080` (or production domain)
- [ ] `/reset-password` is added to Additional Redirect URLs
- [ ] `/` (dashboard) is added to Additional Redirect URLs
- [ ] `/auth` is added to Additional Redirect URLs
- [ ] Test password reset flow end-to-end
- [ ] Verify user is NOT auto-redirected to dashboard during reset flow

---

## Troubleshooting

### Issue: User is auto-redirected to dashboard after clicking reset link

**Solution**: Ensure `http://localhost:8080/reset-password` is in Additional Redirect URLs

### Issue: "Invalid redirect URL" error

**Solution**: Check that the exact URL (including protocol `http://` or `https://`) matches what's configured

### Issue: Password reset page shows "Invalid or expired reset link"

**Solution**: 
- Check that the link hasn't expired (default: 1 hour)
- Verify session is valid in browser DevTools
- Ensure you're clicking the link from the most recent reset email

---

## Reference

- Supabase Auth Documentation: https://supabase.com/docs/guides/auth/auth-helpers/auth-redirects
- Password Reset Flow: https://supabase.com/docs/guides/auth/auth-helpers/auth-redirects#password-reset-redirects
