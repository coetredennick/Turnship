# Turnship

A modern project management platform built with React and Node.js.

## Architecture

Turnship follows a monorepo structure with workspaces:

- **server/**: Node.js + Express API server with SQLite database
- **client/**: React frontend with Vite and TailwindCSS
- **shared/**: Shared types and utilities

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd turnship
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```
   The `CLIENT_URL` variable should point to the URL of the React
   frontend (default `http://localhost:5173`).

   Google OAuth credentials must be provided via the environment variables
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in
   your `.env` file.

### Development

Start both development servers concurrently:

```bash
npm run dev
```

This will start:
- **Server**: http://localhost:3001
- **Client**: http://localhost:5173

### Individual Services

You can also run services individually:

```bash
# Server only
npm run dev -w server

# Client only
npm run dev -w client
```

### Testing

Run tests for all workspaces:

```bash
npm test
```

Run tests for specific workspace:

```bash
# Server tests
npm run test -w server

# Client tests
npm run test -w client
```

### Linting (temporarily disabled in CI)

ESLint remains configured for the project, but the automated `npm run lint` scripts have been removed from CI until the legacy codebase is cleaned up.  You can still run the linter locally if you wish:

```bash
npx eslint client/src server/{db,routes,services} --ext js,jsx
```

Feel free to submit follow-up PRs that re-enable the workspace lint scripts once outstanding style violations are addressed.

### Building

Build the client for production:

```bash
npm run build
```

### Database

The server uses SQLite with automatic database initialization. The database file (`dev.db`) will be created automatically when you first run the server.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API information

## Development Workflow

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks (pre-commit linting)
- **Jest** for testing (server)
- **React Testing Library** for component testing (client)

## Collaboration Protocol

For AI-assisted development, please refer to the [collaboration protocol](./claude-cli-collaboration.md) for guidelines on working with Claude Code CLI.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting: `npm test && npm run lint`
4. Commit your changes
5. Push and create a pull request

## License
ISC
