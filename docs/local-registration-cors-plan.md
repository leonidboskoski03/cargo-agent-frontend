# LOCAL_REGISTRATION_CORS_PLAN

## Summary

Fix the local registration `Network Error` by aligning backend CORS with the Vite frontend origin.

## Problem

The backend route exists:

```text
POST http://localhost:4000/api/v1/auth/registration/start
```

The browser request fails when backend CORS is configured for:

```env
CORS_ORIGIN=http://localhost:3000
```

while the frontend is running on:

```text
http://localhost:5173
```

Browsers require scheme, host, and port to match.

## Fix

Use Vite's local frontend origin:

```env
CORS_ORIGIN=http://localhost:5173
```

Then open the frontend as:

```text
http://localhost:5173
```

Restart the backend after editing `.env`.

## Test Plan

- Restart backend.
- Open frontend at `http://localhost:5173`.
- Submit company registration start form.
- Expected result: no Axios `Network Error`.
- If the backend rejects the request, it should now show a real HTTP validation/business error instead of a browser network/CORS error.
