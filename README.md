This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Report Viewer for Shadowserver

## Introduction

This project is an *unoffical* web interface for Shadowserver API subscribers to view/download Shadowserver reports.
While it is preferable for subscribers to ingest data into their own platforms, this tool can be helpful for analysts who may need to review ad-hoc reports.

Self host or use the Vercel hosted deployment at [Report Viewer for Shadowserver](https://shadowserverreportviewer.vercel.app)

### Features

- Filter by report type and date range
- List reports
- View reports (using Ag-Grid)
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
