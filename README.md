This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Shadowserver Report Viewer

## Introduction

This project provides Shadowserver API subscribers with a web interface to list, view and download available reports. It's designed to make it easy for analysts to get started with Shadowserver reporting.

### Security
While this is designed to be a client side web application, it utilises Next.js API routes to proxy requests to the Shadowserver API.
API keys are securely stored in browser cookies using iron-session.


### Features

- Filter by report type and date range
- List reports
- Download CSV reports
- View reports in the powerful Ag-grid component
- ASN name lookups using Cloudflare Radar API
- On-demand validation of DNS hostnames using Cloudflare 1.1.1.1 DoH resolver
- Analyst workstation features such as 'Lookup IP in Shodan'

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
