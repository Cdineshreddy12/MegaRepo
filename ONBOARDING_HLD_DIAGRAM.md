# Onboarding High-Level Design Diagram

## Overview
This document provides a high-level design (HLD) diagram and Mermaid diagram for the onboarding workflow based on the provided logs.

## High-Level Design (HLD) Diagram

```mermaid
graph TD
    A[Onboarding Service] --> B[Validation Service]
    A --> C[Kinde Service]
    A --> D[Database Service]
    A --> E[Subscription Service]
    A --> F[Credit Service]
    A --> G[Application Service]

    B -->|Validate Email| H[Email Validation]
    B -->|Check Subdomain| I[Subdomain Availability]

    C -->|Authenticate User| J[Token Validation]
    C -->|Create Organization| K[Organization Creation]
    C -->|Add User to Org| L[User Assignment]

    D -->|Create Tenant| M[Tenant Records]
    D -->|Create Organization| N[Organization Records]
    D -->|Create User| O[User Records]

    E -->|Create Subscription| P[Subscription Records]

    F -->|Allocate Credits| Q[Credit Allocation]
    F -->|Track Usage| R[Credit Tracking]

    G -->|Assign Applications| S[Application Assignment]
```

## Mermaid Sequence Diagram (Detailed Flow)

```mermaid
sequenceDiagram
    participant User
    participant Onboarding
    participant Validation
    participant Kinde
    participant Database
    participant Subscription
    participant Credit
    participant Application

    User->>Onboarding: Start Onboarding
    Onboarding->>Validation: Validate Email
    Validation-->>Onboarding: Email Valid
    Onboarding->>Validation: Check Subdomain
    Validation-->>Onboarding: Subdomain Available
    Onboarding->>Kinde: Validate Token
    Kinde-->>Onboarding: Token Valid
    Onboarding->>Kinde: Create Organization
    Kinde-->>Onboarding: Organization Created
    Onboarding->>Kinde: Add User to Org
    Kinde-->>Onboarding: User Added (Failed)
    Onboarding->>Database: Create Records
    Database-->>Onboarding: Records Created
    Onboarding->>Subscription: Create Free Subscription
    Subscription-->>Onboarding: Subscription Created
    Onboarding->>Credit: Allocate Initial Credits
    Credit-->>Onboarding: Credits Allocated
    Onboarding->>Application: Assign Applications
    Application-->>Onboarding: Applications Assigned
    Onboarding->>Database: Verify All Steps
    Database-->>Onboarding: Verification Failed
    Onboarding-->>User: Onboarding Failed
```

## Key Components

### 1. Onboarding Service
- Main orchestrator of the onboarding process
- Coordinates all other services
- Handles the overall workflow

### 2. Validation Service
- Validates user email for duplicates
- Checks subdomain availability
- Performs initial data validation

### 3. Kinde Service
- Handles authentication via JWT tokens
- Creates organizations in Kinde
- Manages user-organization assignments
- Note: User assignment step failed in the logs

### 4. Database Service
- Creates tenant records
- Creates organization records
- Creates user records
- Performs final verification

### 5. Subscription Service
- Creates free subscription plans
- Manages subscription records
- Handles plan-specific configurations

### 6. Credit Service
- Allocates initial credits to organizations
- Tracks credit usage
- Manages credit balances

### 7. Application Service
- Assigns applications to tenants
- Configures application-specific settings
- Manages application access

## Workflow Steps

1. **Initialization**: Onboarding process starts
2. **Email Validation**: Check for duplicate emails
3. **Subdomain Generation**: Create/validate unique subdomain
4. **Authentication**: Validate JWT token and user info
5. **Kinde Setup**: Create organization and add user
6. **Database Creation**: Create tenant, org, and user records
7. **Subscription Creation**: Set up free subscription
8. **Credit Allocation**: Allocate initial credits
9. **Application Assignment**: Assign applications to tenant
10. **Verification**: Verify all steps completed successfully

## Failure Points Identified

1. **Kinde User Assignment**: All endpoints failed with "Invalid organization" errors
2. **Final Verification**: PostgreSQL syntax error during verification

## Recommendations

1. Investigate Kinde API organization validation
2. Review PostgreSQL query syntax in verification step
3. Add better error handling for Kinde API failures
4. Implement fallback mechanisms for critical steps