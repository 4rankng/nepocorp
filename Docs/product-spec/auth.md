POST /api/v1/auth/login

Body:
{
    "username": "string",
    "password": "string"
}

Response:
{
    "token": "string"
}

│ │ POST /api/v1/auth/login          - Username/password login                                                     │ │
│ │ POST /api/v1/auth/oauth/google   - Google OAuth callback                                                       │ │
│ │ POST /api/v1/auth/oauth/facebook - Facebook OAuth callback                                                     │ │
│ │ POST /api/v1/auth/refresh        - Refresh JWT token                                                           │ │
│ │ GET  /api/v1/auth/profile        - Get current user profile                                                    │ │
│ │ POST /api/v1/auth/link           - Link OAuth to existing account                                              │ │
│ │
