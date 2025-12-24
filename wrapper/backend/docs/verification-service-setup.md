# Verification Service Setup Guide

## Overview

This document explains how to set up and use the PAN and GSTIN verification APIs for the onboarding process.

## Prerequisites

1. **API Account**: You need an account with access to the verification APIs
2. **API Credentials**: API Key and API Secret

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Verification API Credentials
VERIFICATION_API_KEY=your_api_key_here
VERIFICATION_API_SECRET=your_api_secret_here
VERIFICATION_API_VERSION=1.0.0
```

### Important Notes

1. **No spaces around `=`**: Make sure there are no spaces around the equals sign
   - ✅ Correct: `VERIFICATION_API_KEY=your_key`
   - ❌ Wrong: `VERIFICATION_API_KEY = your_key`

2. **No quotes needed**: Don't wrap values in quotes unless they contain spaces

3. **Variable names**: Use exact variable names:
   - `VERIFICATION_API_KEY`
   - `VERIFICATION_API_SECRET`
   - `VERIFICATION_API_VERSION` (optional, defaults to 1.0.0)

## Authentication Flow

The API uses a two-step authentication process that is **automatically handled** by the service:

1. **Authenticate** - First call `/authenticate` endpoint with:
   - `x-api-key`: Your API key
   - `x-api-secret`: Your API secret
   - `x-api-version`: API version (default: 1.0.0)
   
   This returns an `access_token` (JWT)

2. **Use Token** - Use the access token in subsequent API calls:
   - `Authorization: Bearer <access_token>`
   - `x-api-version`: For GST endpoints (when needed)

**Note:** The service automatically:
- Authenticates on first use
- Caches the access token for 1 hour
- Refreshes the token when it expires
- Handles all authentication errors gracefully

### Important Notes

1. **No spaces around `=`**: Make sure there are no spaces around the equals sign
   - ✅ Correct: `VERIFICATION_API_KEY=your_key`
   - ❌ Wrong: `VERIFICATION_API_KEY = your_key`

2. **No quotes needed**: Don't wrap values in quotes unless they contain spaces

3. **Variable names**: Use exact variable names:
   - `VERIFICATION_API_KEY`
   - `VERIFICATION_API_SECRET`
   - `VERIFICATION_API_VERSION` (optional, defaults to 1.0.0)

## API Endpoints Used

### 0. Authentication (Automatic)
```
POST https://test-api.sandbox.co.in/authenticate
POST https://api.co.in/authenticate (production)
```

**Request Headers:**
- `x-api-key`: Your API key
- `x-api-secret`: Your API secret
- `x-api-version`: 1.0.0

**Response:**
```json
{
  "code": 200,
  "data": {
    "access_token": "jwt_token_here"
  }
}
```

### 1. PAN Verification
```
POST https://test-api.sandbox.co.in/kyc/pan/verify
POST https://api.co.in/kyc/pan/verify (production)
```

**Request Body:**
```json
{
  "pan": "AAACJ2440E",
  "consent": "Y",
  "reason": "Business verification for onboarding",
  "name_as_per_pan": "Business Name" // optional
}
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "pan": "AAACJ2440E",
    "category": "individual",
    "status": "valid",
    "name_as_per_pan_match": true,
    "date_of_birth_match": true,
    "aadhaar_seeding_status": "y"
  }
}
```

### 2. GSTIN Verification
```
POST https://test-api.sandbox.co.in/gst/compliance/public/gstin/search
POST https://api.co.in/gst/compliance/public/gstin/search (production)
```

**Request Headers:**
- `x-api-version: 1.0.0`
- `Authorization: <authorization>`
- `x-api-key: <x-api-key>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "gstin": "05ABNTY3290P8ZB"
}
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "data": {
      "gstin": "36AEOFS9999J1ZI",
      "lgnm": "ACCOUNTS CONSULTANCY",
      "tradeNam": "ACCOUNTS CONSULTANCY",
      "sts": "Active",
      "ctb": "Partnership",
      "rgdt": "18/11/2021",
      "pradr": {
        "addr": {
          "bno": "FLAT 999, PLOT NO 3-123",
          "loc": "MADHAPUR",
          "dst": "Hyderabad",
          "stcd": "Telangana",
          "pncd": "500081"
        }
      }
    }
  }
}
```

### 3. PAN to GSTIN Lookup
```
POST https://test-api.sandbox.co.in/gst/compliance/public/pan/search
POST https://api.co.in/gst/compliance/public/pan/search (production)
```

**Request Body:**
```json
{
  "pan": "AAACJ2440E"
}
```

**Response:**
```json
{
  "code": 200,
  "data": [
    {
      "gstin": "33GSPTN9771G1ZR",
      "data": {
        "lgnm": "NARENDRA KUMAR PAREEK",
        "sts": "Active",
        "tradeNam": "M/S AJAY GAS CENTRE"
      }
    }
  ]
}
```

## How It Works

### Verification Flow

1. **User enters PAN/GSTIN** during onboarding
2. **System validates format** (basic regex check)
3. **System calls verification API** to verify the document
4. **If verification fails**, onboarding is blocked with an error message
5. **If verification succeeds**, onboarding proceeds normally

### When Verification Happens

- **PAN Verification**: Triggered when `panNumber` or `taxRegistrationDetails.pan` is provided
- **GSTIN Verification**: Triggered when `hasGstin` is `true` and `gstin` is provided

### Verification Requirements

- **PAN**: Must be valid (status: "valid")
- **GSTIN**: Must be valid and active (status: "Active")

## Error Handling

### Common Error Codes

- `PAN_VERIFICATION_FAILED`: PAN verification failed
- `GSTIN_VERIFICATION_FAILED`: GSTIN verification failed
- `GSTIN_NOT_ACTIVE`: GSTIN exists but is not active

### Error Response Format

```json
{
  "success": false,
  "error": "Verification Error",
  "message": "PAN verification failed. Please check the PAN number.",
  "errors": [
    {
      "field": "panNumber",
      "message": "PAN verification failed. Please check the PAN number.",
      "code": "PAN_VERIFICATION_FAILED"
    }
  ],
  "statusCode": 400
}
```

## Rate Limiting

The API may apply rate limits. The service handles rate limit errors gracefully and returns a retryable error.

## Testing

### Sandbox Testing

1. Use sandbox credentials in `.env`
2. Use test PAN/GSTIN numbers from API documentation
3. Verify error handling with invalid numbers

### Production Testing

1. Use production credentials in `.env`
2. Test with real PAN/GSTIN numbers
3. Monitor API usage and rate limits

## Service Location

The verification service is located at:
```
wrapper/backend/src/services/verification-service.js
```

## Integration Points

### 1. Onboarding Validation Service
```
wrapper/backend/src/features/onboarding/services/onboarding-validation-service.js
```

Verification is called in `validateCompleteOnboarding()` method before allowing onboarding to proceed.

### 2. Onboarding Route
```
wrapper/backend/src/features/onboarding/routes/core-onboarding.js
```

The route accepts `panNumber` and `taxRegistrationDetails` in the request body.

### 3. Verification Routes
```
wrapper/backend/src/features/onboarding/routes/verification-routes.js
```

Provides endpoints for real-time verification:
- `POST /api/onboarding/verify-pan`
- `POST /api/onboarding/verify-gstin`

## Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly
4. **Monitor API usage** for suspicious activity
5. **Handle errors gracefully** without exposing sensitive information

## Troubleshooting

### Verification Not Working

1. **Check credentials**: Ensure `VERIFICATION_API_KEY` and `VERIFICATION_AUTHORIZATION` are set
2. **Check environment**: Verify you're using the correct environment (sandbox vs production)
3. **Check format**: Ensure PAN/GSTIN format is correct
4. **Check logs**: Review server logs for detailed error messages

### Common Issues

- **401 Unauthorized**: Invalid credentials
- **429 Too Many Requests**: Rate limit exceeded
- **400 Bad Request**: Invalid PAN/GSTIN format
- **404 Not Found**: Endpoint not found (check API documentation)
- **500 Internal Server Error**: API issue (check API status page)

## Support

For API support:
- **Documentation**: Check API provider documentation
- **Support**: Contact API provider support team
- **Status Page**: Check API provider status page

