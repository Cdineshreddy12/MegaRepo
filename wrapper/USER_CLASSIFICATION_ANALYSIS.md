# User Classification System - Exhaustive Analysis

## Overview
This document provides a comprehensive analysis of how the system determines user classifications like `aspiringFounder`, `corporateEmployee`, `withGST`, `withoutGST`, etc. The classification system uses a **priority-based decision tree** that evaluates multiple signals to determine the most appropriate user profile.

---

## 1. Classification Decision Tree

The classification follows a **strict priority order** (highest to lowest):

```
1. Mobile OTP Verification
   └─> 'mobileOtpVerified'
   
2. DIN Verification
   └─> 'dinVerification'
   
3. URL Parameter Override
   └─> Explicit classification from ?classification=xxx
   
4. Matrix Classification (Email + GST Status)
   └─> 2x2 Matrix: [hasGST: true/false] × [isDomainEmail: true/false]
   
5. Email Domain Analysis
   └─> 'withDomainMail' or 'withoutDomainMail'
   
6. GST Status Only
   └─> 'withGST' or 'withoutGST'
   
7. User Profile Role
   └─> 'employee' or 'founder'
   
8. Subscription Tier
   └─> 'freemium', 'growth', or 'enterprise'
   
9. Default Fallback
   └─> 'aspiringFounder'
```

---

## 2. Detailed Classification Logic

### 2.1 Priority Level 1: Mobile OTP Verification
**Location**: `OnboardingForm.tsx:76-79`

```typescript
if (mobileVerified) {
  return 'mobileOtpVerified';
}
```

**Trigger**: User has verified their mobile number via OTP
**Use Case**: Security-first onboarding for sensitive operations
**Features**: 
- Mobile verification required
- Secure account setup
- OTP-based authentication

---

### 2.2 Priority Level 2: DIN Verification
**Location**: `OnboardingForm.tsx:81-84`

```typescript
if (dinVerified) {
  return 'dinVerification';
}
```

**Trigger**: User has verified their DIN (Director Identification Number)
**Use Case**: Legal compliance for company directors in India
**Features**:
- DIN verification required
- Enhanced business credentials
- Legal compliance features
- Director-level access

---

### 2.3 Priority Level 3: URL Parameter Override
**Location**: `OnboardingForm.tsx:86-99`

```typescript
if (urlParams) {
  const explicitClassification = urlParams.get('classification');
  if (explicitClassification) {
    const validClassifications = [
      'enterprise', 'freemium', 'growth', 'aspiringFounder', 
      'corporateEmployee', 'withGST', 'withoutGST', 'withDomainMail', 
      'withoutDomainMail', 'employee', 'founder'
    ];
    if (validClassifications.includes(explicitClassification)) {
      return explicitClassification;
    }
  }
}
```

**Trigger**: URL contains `?classification=xxx` parameter
**Use Case**: 
- Manual override for testing
- Direct links to specific onboarding flows
- Marketing campaigns targeting specific user types
**Example URLs**:
- `https://app.zopkit.com/onboarding?classification=enterprise`
- `https://app.zopkit.com/onboarding?classification=aspiringFounder`

---

### 2.4 Priority Level 4: Matrix Classification (Email + GST)
**Location**: `OnboardingForm.tsx:101-111`

This is the **core classification logic** that creates a 2×2 matrix:

#### Matrix Logic:
```typescript
if (email) {
  const emailVerification = verifyEmailDomain(email);
  const hasGST = determineGSTStatus(urlParams, userProfile, formData);
  
  if (hasGST !== null) {
    // 2x2 Matrix Classification
    if (hasGST === true && emailVerification.isDomainEmail) 
      return 'corporateEmployee';
    if (hasGST === true && !emailVerification.isDomainEmail) 
      return 'founder';
    if (hasGST === false && emailVerification.isDomainEmail) 
      return 'corporateEmployee';
    if (hasGST === false && !emailVerification.isDomainEmail) 
      return 'aspiringFounder';
  }
}
```

#### Classification Matrix:

| GST Status | Domain Email | Classification | Description |
|------------|--------------|----------------|-------------|
| ✅ **Has GST** | ✅ **Domain Email** | `corporateEmployee` | Established business with corporate email |
| ✅ **Has GST** | ❌ **Personal Email** | `founder` | Business owner using personal email |
| ❌ **No GST** | ✅ **Domain Email** | `corporateEmployee` | Corporate employee (no GST required) |
| ❌ **No GST** | ❌ **Personal Email** | `aspiringFounder` | New entrepreneur starting out |

#### Examples:

**Example 1: Corporate Employee (GST + Domain)**
- Email: `john.doe@acmecorp.com`
- GST: `27ABCDE1234F1Z5`
- **Result**: `corporateEmployee`
- **Reason**: Has GST registration + corporate domain email

**Example 2: Founder (GST + Personal)**
- Email: `founder@gmail.com`
- GST: `27ABCDE1234F1Z5`
- **Result**: `founder`
- **Reason**: Has GST but uses personal email (likely solo founder)

**Example 3: Corporate Employee (No GST + Domain)**
- Email: `employee@startup.com`
- GST: None
- **Result**: `corporateEmployee`
- **Reason**: Corporate email but no GST (early-stage company or employee)

**Example 4: Aspiring Founder (No GST + Personal)**
- Email: `entrepreneur@gmail.com`
- GST: None
- **Result**: `aspiringFounder`
- **Reason**: No GST + personal email = new entrepreneur

---

### 2.5 Email Domain Verification
**Location**: `OnboardingForm.tsx:18-36`

```typescript
export const verifyEmailDomain = (email: string): { 
  isDomainEmail: boolean; 
  domain: string | null 
} => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isDomainEmail: false, domain: null };
  }
  
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
    'yandex.com', 'zoho.com', 'gmx.com'
  ];
  
  const isPersonalEmail = personalDomains.some(personal => 
    domain.includes(personal)
  );
  
  return {
    isDomainEmail: !isPersonalEmail,
    domain: domain
  };
};
```

#### Personal Email Providers (NOT domain emails):
- `gmail.com`
- `yahoo.com`
- `hotmail.com`
- `outlook.com`
- `aol.com`
- `icloud.com`
- `protonmail.com`
- `mail.com`
- `yandex.com`
- `zoho.com` (personal)
- `gmx.com`

#### Domain Email Examples:
- ✅ `john@acmecorp.com` → Domain email
- ✅ `founder@startup.io` → Domain email
- ✅ `admin@mycompany.co.in` → Domain email
- ❌ `user@gmail.com` → Personal email
- ❌ `founder@yahoo.com` → Personal email

**Note**: The check uses `.includes()` so subdomains like `user@mail.gmail.com` would still be detected as personal.

---

### 2.6 GST Status Detection
**Location**: `OnboardingForm.tsx:41-63`

```typescript
const determineGSTStatus = (
  urlParams?: URLSearchParams,
  userProfile?: any,
  formData?: any
): boolean | null => {
  // 1. Check URL parameters
  if (urlParams) {
    const gstParam = urlParams.get('gst');
    if (gstParam === 'true') return true;
    if (gstParam === 'false') return false;
  }
  
  // 2. Check user profile
  if (userProfile?.hasExistingBusiness) return true;
  if (userProfile?.isRegisteredBusiness === false) return false;
  if (userProfile?.hasGST) return true;
  
  // 3. Check form data (if available)
  if (formData?.vatGstRegistered) return true;
  if (formData?.gstin) return true;
  
  return null; // Unknown
};
```

#### GST Detection Priority:
1. **URL Parameter**: `?gst=true` or `?gst=false`
2. **User Profile**: 
   - `hasExistingBusiness: true` → GST = true
   - `isRegisteredBusiness: false` → GST = false
   - `hasGST: true` → GST = true
3. **Form Data**:
   - `vatGstRegistered: true` → GST = true
   - `gstin` present → GST = true
4. **Unknown**: Returns `null` if no GST information available

---

### 2.7 Priority Level 5: Email Domain Only
**Location**: `OnboardingForm.tsx:113`

```typescript
return emailVerification.isDomainEmail 
  ? 'withDomainMail' 
  : 'withoutDomainMail';
```

**Trigger**: Email is available but GST status is unknown
**Use Case**: Early classification before GST information is collected

---

### 2.8 Priority Level 6: GST Status Only
**Location**: `OnboardingForm.tsx:116-118`

```typescript
const hasGST = determineGSTStatus(urlParams, userProfile, formData);
if (hasGST === true) return 'withGST';
if (hasGST === false) return 'withoutGST';
```

**Trigger**: No email available, but GST status is known
**Use Case**: Classification based solely on business registration status

---

### 2.9 Priority Level 7: User Profile Role
**Location**: `OnboardingForm.tsx:120-123`

```typescript
if (userProfile) {
  if (userProfile.role === 'employee' || userProfile.isEmployee) 
    return 'employee';
  if (userProfile.role === 'founder' || userProfile.isFounder || userProfile.isOwner) 
    return 'founder';
}
```

**Trigger**: User profile contains role information
**Profile Fields Checked**:
- `role === 'employee'` or `isEmployee === true` → `employee`
- `role === 'founder'` or `isFounder === true` or `isOwner === true` → `founder`

---

### 2.10 Priority Level 8: Subscription Tier
**Location**: `OnboardingForm.tsx:125-129`

```typescript
if (userProfile?.tier) {
  if (userProfile.tier === 'freemium' || userProfile.plan === 'free') 
    return 'freemium';
  if (userProfile.tier === 'growth' || userProfile.plan === 'growth') 
    return 'growth';
  if (userProfile.tier === 'enterprise' || userProfile.plan === 'enterprise') 
    return 'enterprise';
}
```

**Trigger**: User profile contains subscription/tier information
**Tier Mapping**:
- `tier: 'freemium'` or `plan: 'free'` → `freemium`
- `tier: 'growth'` or `plan: 'growth'` → `growth`
- `tier: 'enterprise'` or `plan: 'enterprise'` → `enterprise`

---

### 2.11 Priority Level 9: Default Fallback
**Location**: `OnboardingForm.tsx:131`

```typescript
return 'aspiringFounder';
```

**Trigger**: None of the above conditions matched
**Use Case**: Default classification for new users with no prior information
**Features**: 
- Basic onboarding path
- Startup-friendly features
- Growth-oriented messaging

---

## 3. Complete Classification Types

### 3.1 All Possible Classifications

```typescript
export type UserClassification =
  // Main business registration paths
  | 'withGST' | 'withoutGST'
  // Email domain paths
  | 'withDomainMail' | 'withoutDomainMail'
  // User role paths
  | 'employee' | 'founder'
  // Tier classifications
  | 'freemium' | 'growth' | 'enterprise'
  // Account type classifications
  | 'aspiringFounder' | 'corporateEmployee' | 'individual' | 'company'
  // Special classifications
  | 'dinVerification' | 'mobileOtpVerified';
```

### 3.2 Classification Descriptions

| Classification | Description | Typical User | Features |
|---------------|-------------|--------------|----------|
| `aspiringFounder` | New entrepreneur starting out | Solo founder, no GST, personal email | Basic CRM, limited features, upgrade prompts |
| `corporateEmployee` | Corporate employee or established business | Employee at company, domain email | Full B2B CRM, team features, enterprise integration |
| `founder` | Business owner with GST | GST-registered founder, personal email | B2B CRM, GST compliance, invoicing |
| `withGST` | GST-registered business | Any business with GST number | Tax compliance, invoicing, financial accounting |
| `withoutGST` | Non-GST business | New business, unregistered | Simplified registration, basic features |
| `withDomainMail` | Professional domain email | Corporate users | Domain integration, professional setup |
| `withoutDomainMail` | Personal email provider | Individual users | Personal setup, quick access |
| `employee` | Employee role | Team members | Role-based access, permissions |
| `founder` | Founder role | Business owners | Ownership rights, full control |
| `freemium` | Free tier | New users | Basic features, upgrade path |
| `growth` | Growth tier | Scaling businesses | Advanced features, team management |
| `enterprise` | Enterprise tier | Large organizations | Full feature set, premium support |
| `dinVerification` | DIN verified | Company directors | Legal compliance, director access |
| `mobileOtpVerified` | Mobile verified | Security-focused users | Secure setup, OTP authentication |

---

## 4. Real-World Classification Examples

### Example 1: Aspiring Founder
**Input**:
- Email: `entrepreneur@gmail.com`
- GST: None
- Profile: None

**Classification Flow**:
1. ❌ No mobile verification
2. ❌ No DIN verification
3. ❌ No URL parameter
4. ✅ Email available → Matrix classification
   - `isDomainEmail = false` (gmail.com is personal)
   - `hasGST = false` (no GST detected)
   - **Result**: `aspiringFounder`

**Onboarding Experience**:
- "Welcome, Aspiring Founder!"
- Startup-friendly messaging
- Basic features available
- Upgrade prompts for GST registration

---

### Example 2: Corporate Employee
**Input**:
- Email: `john.doe@acmecorp.com`
- GST: `27ABCDE1234F1Z5`
- Profile: `{ role: 'employee' }`

**Classification Flow**:
1. ❌ No mobile verification
2. ❌ No DIN verification
3. ❌ No URL parameter
4. ✅ Email available → Matrix classification
   - `isDomainEmail = true` (acmecorp.com is domain)
   - `hasGST = true` (GST number provided)
   - **Result**: `corporateEmployee`

**Onboarding Experience**:
- "Welcome, Corporate Employee!"
- Enterprise integration features
- Team setup options
- Corporate security features

---

### Example 3: Founder with GST
**Input**:
- Email: `founder@gmail.com`
- GST: `27ABCDE1234F1Z5`
- Profile: `{ isFounder: true }`

**Classification Flow**:
1. ❌ No mobile verification
2. ❌ No DIN verification
3. ❌ No URL parameter
4. ✅ Email available → Matrix classification
   - `isDomainEmail = false` (gmail.com is personal)
   - `hasGST = true` (GST number provided)
   - **Result**: `founder`

**Onboarding Experience**:
- "Welcome, Founder!"
- Business registration features
- GST compliance modules
- Invoicing and accounting

---

### Example 4: URL Override
**Input**:
- Email: `user@gmail.com`
- GST: None
- URL: `?classification=enterprise`

**Classification Flow**:
1. ❌ No mobile verification
2. ❌ No DIN verification
3. ✅ URL parameter found → **Result**: `enterprise`

**Onboarding Experience**:
- "Welcome to Enterprise Plan!"
- Full feature set
- Premium support
- Enterprise security

---

## 5. Edge Cases and Fallbacks

### Edge Case 1: Invalid Email Format
**Input**: `invalid-email` (no @ symbol)
**Behavior**: 
- `verifyEmailDomain()` returns `{ isDomainEmail: false, domain: null }`
- Falls through to lower priority checks
- Default: `aspiringFounder`

### Edge Case 2: Unknown GST Status
**Input**: Email available, but GST status is `null`
**Behavior**:
- Matrix classification skipped (requires both email and GST)
- Falls to email-only classification: `withDomainMail` or `withoutDomainMail`

### Edge Case 3: Multiple Profile Signals
**Input**: 
- Profile has `role: 'employee'` AND `tier: 'enterprise'`
**Behavior**:
- Role check (Priority 7) executes first
- Returns `employee` (role takes precedence over tier)

### Edge Case 4: Conflicting Signals
**Input**:
- URL: `?classification=aspiringFounder`
- Email: `ceo@bigcorp.com`
- GST: `27ABCDE1234F1Z5`
**Behavior**:
- URL parameter (Priority 3) takes precedence
- Returns `aspiringFounder` (manual override)

---

## 6. Classification Impact on Onboarding

### 6.1 Step Customization

Different classifications show different content in onboarding steps:

**BusinessDetailsStep.tsx**:
```typescript
case 'aspiringFounder':
  return {
    title: 'Startup Vision',
    description: 'Define your company\'s identity and core operations.'
  };
case 'enterprise':
  return {
    title: 'Enterprise Profile',
    description: 'Configure your organization\'s operational details.'
  };
```

**TeamStep.tsx**:
```typescript
case 'aspiringFounder':
  return ['Co-founder', 'CTO', 'Lead Dev', 'Product'];
case 'corporateEmployee':
  return ['Dept Head', 'Lead', 'Senior', 'PM'];
```

### 6.2 Field Requirements

**TaxDetailsStep.tsx**:
- `withGST`: Shows GSTIN field as required
- `withoutGST`: Shows GSTIN field as optional
- `aspiringFounder`: Simplified tax section

**PersonalDetailsStep.tsx**:
- `withGST`: Phone verification required
- `aspiringFounder`: Phone verification optional

---

## 7. Backend Classification Service

**Location**: `wrapper/backend/src/features/users/services/user-classification-service.js`

The backend has a separate classification service that classifies users based on:
- Application access permissions
- Subscription tiers
- Role assignments
- Module access

This is **different** from the frontend onboarding classification and is used for:
- User access control
- Feature gating
- Application routing
- Permission management

---

## 8. Recommendations for Improvement

### 8.1 Current Limitations

1. **Email Domain Detection**: Uses simple `.includes()` which may have false positives
   - **Fix**: Use exact domain matching or maintain a comprehensive list

2. **GST Detection**: Only checks form data if available
   - **Fix**: Add API call to verify GST number validity

3. **No Machine Learning**: Classification is rule-based
   - **Enhancement**: Add ML model to predict user type based on behavior

4. **Limited Personal Domains List**: Only 11 personal email providers
   - **Enhancement**: Maintain comprehensive list or use API service

### 8.2 Suggested Enhancements

1. **Domain Verification API**: Verify domain ownership for corporate emails
2. **GST Validation API**: Real-time GST number validation
3. **Behavioral Classification**: Track user actions to refine classification
4. **Multi-factor Classification**: Combine multiple signals with weights
5. **Classification Confidence Score**: Return confidence level with classification

---

## 9. Summary

The user classification system uses a **9-level priority-based decision tree** that evaluates:
1. Security verifications (OTP, DIN)
2. Manual overrides (URL parameters)
3. **Core matrix**: Email domain × GST status
4. Individual signals (email, GST, role, tier)
5. Default fallback

The **most important classification** is the **2×2 matrix** that combines:
- **Email Type**: Domain email (corporate) vs Personal email
- **GST Status**: Has GST (registered) vs No GST (unregistered)

This creates four primary user types:
- `corporateEmployee` (Domain + GST)
- `founder` (Personal + GST)
- `corporateEmployee` (Domain + No GST)
- `aspiringFounder` (Personal + No GST)

The system is designed to be **flexible** (allows overrides) while being **intelligent** (uses available signals) and **safe** (has fallbacks).


