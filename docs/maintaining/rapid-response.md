# Rapid Response

It could happen that something goes wrong, and that whoever knows best might not be able to fix it right away. This guide is to help make decisions on what the appropriate response is. It should be a living document and built based on experience.

## Resolving DNS issues

We've had a weird instance where things in Cloudflare seem to not be connecting to the website. Here's some things to try:

- Disable proxying on Cloudflare. This should be instant.
- Disable the Custom DNS on Namecheap. This might take a second to update.

## Something wrong at a regular interval

It could be that something is repeatedly going wrong at a very regular interval--the most obvious indication of this is if an e-mail is getting sent out every x minutes. This likely means that a cron job is breaking and not completing, and the next time it runs it tries to do it with the same set of information. See: the famous April 13 incident with the April Update Email, which some users received 11 times.

We've got three recurring tasks: every-minute-tasks (runs every 10 minutes), every-day-tasks (22:00 UTC) and every-month-tasks (1st of the month, 00:00 UTC). They run inside the `background` worker as BullMQ job schedulers on the `scheduled-tasks` queue.

You can see what these jobs do in `src/jobs/every-minute-tasks.ts`, `src/jobs/every-day-tasks.ts` and `src/jobs/every-month-tasks.ts`. The schedules themselves are in `src/jobs/scheduled-tasks.ts`. Scheduled runs are never retried, so a failing run won't immediately repeat itself — but the next scheduled run will try again.

Currently there's nothing critical that these tasks do that needs to run every ten minutes, so it is safe to pause them until we're able to figure out what is wrong. As an admin, turn on "show queue dashboard" in Admin Settings if it isn't already, then go to `/admin/queues` on the API, open the `scheduled-tasks` queue and pause it. This stops all three tasks without affecting the other queues (uploads, emails, etc.). Resume it from the same page once things are fixed.

> Note: suspending any Render service will negatively impact the service and likely make core functionality unavailable. Suspending the service is **likely not the solution** for those scenarios.

### Then

Critically, it's not just about turning off the service. Once it off **We need to fix things** so that we can turn it back on!

First, [make an issue on GitHub](https://github.com/funmusicplace/mirlo/issues). Add _everything you know to it_, including either copies of what was happening, or links to conversation threads, as well as what you did to temporarily fix it.
