This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

The Vercel project is `SANCTUM_COUNCIL`. Its Neon connection string is read
from `DB_CONNECT`; the conventional `DATABASE_URL` and Vercel Postgres variable
names remain supported as fallbacks for local development.

Keep the value server-only. For local development, link the Vercel project and
run `vercel env pull .env.local --yes`, or run a one-off command with
`vercel env run -- npm run dev`. Standalone migration scripts do not load
`.env.local` automatically unless they are launched through Vercel's env runner.

The complete local Scripture corpus lives in `public/data/douay-rheims`.
To regenerate it from a clone of the pinned upstream source, run
`npm run scripture:import -- C:\\path\\to\\original-douay-rheims`.

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

The app includes a daily formation hub, a complete local 73-book Catholic
Scripture reader, a guided Rosary, a prayer/devotion library, and physical-book
guidance for the Liturgy of the Hours.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
