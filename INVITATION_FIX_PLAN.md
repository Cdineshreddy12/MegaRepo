# User Invitation Fix Plan

## Issues Identified

### 1. Organization Information Missing in Invitation Emails
**Problem**: When sending user invitation emails, the organization information is not always included in the email template, especially for multi-entity invitations.

**Root Cause**: 
- In `wrapper/backend/src/routes/invitations.js`, the `sendUserInvitation` method calls in the resend endpoint (lines 776-857) don't always pass complete organization and location information to the email service.
- The email template in `wrapper/backend/src/utils/email.js` expects `organizations` and `locations` arrays but these are not always populated.

**Impact**: Users receive invitation emails without clear information about which organizations/locations they're being invited to.

### 2. Invitation URL Not Present in Admin Table
**Problem**: The admin endpoint for listing invitations doesn't consistently show the invitation URL in the response.

**Root Cause**:
- In `wrapper/backend/src/routes/invitations.js`, the admin endpoint (lines 630-710) generates invitation URLs but there may be issues with how the URL is stored or retrieved from the database.
- The `invitationUrl` field exists in the `tenantInvitations` table but may not be consistently populated or returned in API responses.

**Impact**: Admins cannot easily access or share invitation links from the admin interface.

## Proposed Solutions

### Fix 1: Enhance Organization Information in Email Service
**File**: `wrapper/backend/src/routes/invitations.js`
**Location**: Lines 776-857 (resend invitation endpoint)

**Changes Needed**:
1. Ensure organization and location information is properly extracted from target entities
2. Pass complete organization/location arrays to the email service
3. Handle both single-entity and multi-entity invitations consistently

### Fix 2: Ensure Invitation URL is Always Present
**File**: `wrapper/backend/src/routes/invitations.js`
**Location**: Lines 630-710 (admin get invitations endpoint)

**Changes Needed**:
1. Ensure `invitationUrl` is always generated and stored when creating invitations
2. Verify the URL is properly returned in the admin API response
3. Add fallback URL generation if the stored URL is missing

## Implementation Plan

### Step 1: Fix Organization Information in Emails
- Modify the resend invitation endpoint to properly extract organization/location info
- Ensure the email service receives complete data for both single and multi-entity invitations
- Test with various invitation scenarios

### Step 2: Fix Invitation URL Display
- Review invitation creation endpoints to ensure URLs are always generated and stored
- Update admin endpoint to consistently return invitation URLs
- Add validation to ensure URLs are never null/undefined

### Step 3: Testing
- Test single-entity invitations
- Test multi-entity invitations  
- Test admin interface URL display
- Verify email content includes proper organization information

### Step 4: Documentation
- Update API documentation
- Add comments explaining the fixes
- Document expected behavior for future reference

## Expected Outcomes

1. **Complete Organization Information**: All invitation emails will clearly show which organizations/locations the user is being invited to.

2. **Consistent URL Availability**: All invitations will have accessible URLs in the admin interface for easy sharing and management.

3. **Improved User Experience**: Users will have clear context about their invitations, and admins will have better tools for managing the invitation process.