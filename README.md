This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Shadowserver Reports

## Introduction

This project provides Shadowserver API subscribers with a web interface to list and download available reports.

API keys are securely stored in browser cookies and used by the server to proxy requests to the Shadowserver API.

### Features

- Filter by report type and date range
- List reports
- Download CSV reports

### Configuration

1. Create an environment variable IRONSESSION_SECRET to encrypt API secrets in user's browser cookie store, this should be at least 32 characters.
2. (Optional) If deploying internally, you can specify the API key and secret in an environment variable so it doesn't have to be configured for each user - SHADOWSERVER_API_KEY and SHADOWSERVER_API_SECRET.

### Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
