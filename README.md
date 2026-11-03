# Campus Cart

Campus Cart is a learning marketplace project using HTML, normal CSS, browser JavaScript, Node.js, Express, and MongoDB Atlas. Do not use this prototype as a production authentication or marketplace system.

## Run locally

1. Install Node.js, then open a terminal in this project folder.
2. Install packages:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env`. Set `SESSION_SECRET` to a unique random value with at least 32 characters and set `MONGODB_URI` to your MongoDB Atlas connection string. Generate a session secret in PowerShell:

   ```powershell
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Do not commit `.env` or share its secret.
4. Start the server:

   ```powershell
   npm start
   ```

5. Open `http://localhost:3000`. The server listens on port 3000 by default. Set `PORT` to use another port.

The server connects to MongoDB before it starts listening. Users, products, and sessions are stored in MongoDB. Sessions use `connect-mongo` with an eight-hour expiration, so restarting the server does not remove active database records or sessions.

## Import existing JSON data

After setting `MONGODB_URI`, import the existing local data without deleting or changing the JSON files:

```powershell
npm run migrate
```

The migration preserves existing user IDs, product IDs, product ownership, and bcrypt password hashes. It skips records whose IDs or unique user emails already exist and reports imported and skipped counts. Running it again is safe.

## Authentication flow

- Sign up at `/signup` with a name, email, college, and password.
- The server validates each value and hashes the password with bcryptjs before writing the account to MongoDB. The password and its confirmation must match, and passwords must be 8–72 bytes.
- Log in at `/login`. The server checks the password hash and regenerates the session identifier on success.
- An HTTP-only, SameSite=Lax cookie identifies the session. It is not readable by JavaScript and passwords or session secrets are not stored in browser storage.
- MongoDB-backed sessions persist across server restarts. Use a managed MongoDB deployment and suitable operational controls for any real deployment.
- CSRF tokens are returned by the auth API and sent in `X-CSRF-Token` headers for state-changing requests.
- Set `NODE_ENV=production` behind HTTPS to enable secure cookies. Configure the trusted proxy correctly when deploying behind a reverse proxy.
- The full name in a newly created listing comes from the logged-in account. The listing contact field is intentionally visible to marketplace visitors.

An email address is only checked for valid email syntax. Campus Cart does not verify that it belongs to a student or send verification emails. There is no password reset, multi-factor authentication, rate limiting, payment processing, or secure in-app messaging. This prototype does not provide production-grade account protection. Marketplace browsing shows listings associated with an account; older sample products without an account owner are not displayed. New listings are associated with the creating user's ID.

## API examples

- `GET /api/products` — public product list.
- `GET /api/products/:id` — public listing detail.
- `GET /api/products?category=Electronics&location=College%20Campus&search=calculator` — combine public filters.
- `POST /api/products` — create a listing. Requires a logged-in session, a CSRF token, and JSON fields `title`, `description`, `price`, `category`, `condition`, `location`, and `contact`. The seller name and owner ID are assigned from the session.
- `GET /api/my-products` — retrieve the logged-in user's listings.
- `PUT /api/products/:id` — update your own listing; other accounts receive `403`.
- `DELETE /api/products/:id` — delete your own listing; other accounts receive `403`.
- `GET /api/auth/me` — check the current login session and receive a CSRF token.
- `POST /api/auth/register` — create a new account (requires `name`, `email`, `college`, `password`, and `confirmPassword`).
- `POST /api/auth/login` — sign in (requires `email` and `password`).
- `POST /api/auth/logout` — destroy the session.

For `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `POST`, `PUT`, or `DELETE /api/products/:id`, first obtain a CSRF token from `GET /api/auth/csrf` and pass it as the `X-CSRF-Token` request header. The browser pages do this automatically.
