# Self-hosted production Compose deployment

The production Compose stack runs MongoDB, the API, both web apps, and Caddy. Caddy obtains and renews HTTPS certificates automatically. Before starting it:

1. Point `fixtogether.com`, `app.fixtogether.com`, `admin.fixtogether.com`, and `api.fixtogether.com` to the Docker host. Ports 80 and 443 (TCP and UDP) must be reachable from the internet.
2. Add the variables listed in `docker-compose.prod.env.example` to the project-root `.env` file. Merge them with any existing values; do not overwrite an existing `.env` file. Use distinct, randomly generated JWT secrets, real Cloudinary credentials, and a Gemini key. Gmail SMTP needs a Google App Password and outbound access to port 587; if the host blocks SMTP, configure Resend or SendGrid over HTTPS instead.
3. Reuse the existing VAPID pair from the backend environment. Leave both VAPID key values empty to disable push, or set both together. Changing the pair requires users to subscribe to push notifications again.
4. Review the Compose configuration, then start the stack:

   ```sh
   docker compose -f docker-compose.prod.yml config --quiet
   docker compose -f docker-compose.prod.yml up --build -d
   ```

The Compose file reads substitutions from the project-root `.env` and the shell environment. The backend image excludes `.env` files from its build context; runtime secrets are injected by Compose. The public frontend and admin URLs are set to the domains above in the Compose file.

For an existing MongoDB volume, keep its current data and take a backup before changing database credentials or connection settings.
