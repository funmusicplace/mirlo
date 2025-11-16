Mirlo's architecture looks like:

![Architecture](../images/Mirlo%20Architecture.drawio.png)

We're hosted on Render and use Postgres for a database. We use S3 compliant file storage Backblaze, with MinIO for local development. Our API is written in Express TypeScript and is written as an OpenAPI CRUD app. The API uses background workers and a redis queue to complete tasks and processing of our audio files (which uses ffmpeg for converting audio). We use a React client to as our UI and a mobile app for listening. Our DNS is managed by Cloudflare.
