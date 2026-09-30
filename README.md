# Carthage

**Carthage** is a self-hosted home server dashboard for monitoring system resources and managing Docker containers through a web interface.

The project provides a centralized dashboard for viewing server metrics, monitoring containers, performing container actions, and reviewing activity logs.

> **Status:** In Development

## Features

* **Authentication**

  * Login with JWT-based authentication.
  * Protected dashboard routes.
* **System Monitoring**

  * Monitor server resource usage.
  * View system metrics and resource charts.
  * Automatic dashboard refresh.
* **Docker Management**

  * List and inspect Docker containers.
  * View container status, image, ports, and details.
  * View container statistics and logs.
  * Start, stop, and restart containers.
* **Activity Logging**

  * Record Docker management actions.
  * Review Docker action history.
* **Dashboard**

  * Centralized home server overview.
  * Dark interface with a minimal design.

## Tech Stack

### Frontend

* [React](https://react.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vite.dev/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Lucide React](https://lucide.dev/)
* [React Router](https://reactrouter.com/)
* [Axios](https://axios-http.com/)
* [Bun](https://bun.sh/)

### Backend

* [Go](https://go.dev/)
* [Fiber](https://gofiber.io/) v2
* [PostgreSQL](https://www.postgresql.org/) 17
* [pgx](https://github.com/jackc/pgx)
* [JWT](https://jwt.io/)
* [gopsutil](https://github.com/shirou/gopsutil)
* [Moby](https://github.com/moby/moby) Docker client

### Infrastructure

* Docker
* Docker Compose
* PostgreSQL

## Project Structure

```text
carthage/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── ...
│   ├── migrations/
│   ├── go.mod
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   └── layout/
│   │   ├── features/
│   │   │   └── docker/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── ...
│
├── docker-compose.yml
└── README.md
```

*The backend's internal directory and the exact Compose filename may vary according to the current project layout.*

## Requirements

Before running Carthage, ensure the following tools are installed:

* Go
* Bun
* Docker
* Docker Compose
* Git

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd carthage
```

### 2. Configure Environment Variables

Create the backend environment file based on the variables used by the application.

```bash
cd backend
cp .env.example .env
```

Configure the database connection, JWT secret, server port, and any other required settings in `.env`.

Example configuration (adjust variable names to match the backend implementation):

```env
APP_ENV=development
APP_PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=carthage
DB_SSLMODE=disable

JWT_SECRET=change-this-to-a-secure-secret
```

**Important:** Use a strong, unique JWT secret and do not commit real credentials to version control.

### 3. Start PostgreSQL

From the project root, start the database using Docker Compose:

```bash
docker compose up -d postgres
```

Check the container status:

```bash
docker compose ps
```

### 4. Run Database Migrations

Run the project's migrations using the migration tool and configuration already set up in the backend.

For example, if the project uses `golang-migrate`:

```bash
migrate -path migrations \
  -database "postgres://postgres:postgres@localhost:5432/carthage?sslmode=disable" \
  up
```

Adjust the connection string to match your environment. Ensure the database exists and the migration version is consistent before applying migrations.

### 5. Start the Backend

From the `backend` directory:

```bash
go mod download
go run ./cmd/server
```

The API should be available at the configured backend address, for example:

```text
http://localhost:8080
```

### 6. Start the Frontend

Open another terminal and navigate to the frontend:

```bash
cd frontend
bun install
bun run dev
```

Vite will display the local development URL, typically:

```text
http://localhost:5173
```

The frontend uses `/api` as its Axios base URL. Configure the Vite development proxy to forward `/api` requests to the backend, if it is not already configured.

## Development Commands

### Frontend

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Type-check and build
bun run build

# Preview production build
bun run preview
```

### Backend

```bash
# Download Go dependencies
go mod download

# Run the application
go run ./cmd/server

# Run tests
go test ./...
```

## API Overview

The following routes represent the Docker API structure used by the frontend. Exact response formats and authentication requirements should be confirmed against the current backend handlers.

| Method | Endpoint                             | Description                                |
| ------ | ------------------------------------ | ------------------------------------------ |
| GET    | `/api/docker/containers`             | List Docker containers                     |
| GET    | `/api/docker/containers/:id/stats`   | Retrieve container statistics              |
| GET    | `/api/docker/containers/:id/logs`    | Retrieve container logs                    |
| POST   | `/api/docker/containers/:id/start`   | Start a container                          |
| POST   | `/api/docker/containers/:id/stop`    | Stop a container                           |
| POST   | `/api/docker/containers/:id/restart` | Restart a container                        |
| GET    | `/api/docker/actions`                | Retrieve Docker action history, if enabled |

Protected API requests use a bearer token:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Security Notes

* Keep environment files and secrets out of Git.
* Use a strong JWT signing secret.
* Protect Docker management endpoints with authentication and authorization.
* Restrict access to the Docker socket because it grants extensive control over the host.
* Validate container IDs and action requests on the backend.
* Scope user-specific action history to the authenticated user, where applicable.
* Use HTTPS when exposing the dashboard beyond the local network.

## Design

Carthage uses a dark, minimal dashboard interface with a zinc-based neutral palette and emerald accents. The frontend is organized into reusable layout components, dashboard widgets, pages, and feature-specific modules.

## Roadmap

* [x] JWT authentication and protected dashboard routes
* [x] Initial system dashboard and resource visualization
* [x] Docker container listing and management interface
* [x] Container logs and statistics integration
* [ ] Complete and verify Docker action history
* [ ] Improve monitoring refresh and error handling
* [ ] Add deployment and production configuration
* [ ] Expand security and access-control options

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the relevant tests and build checks.
5. Submit a pull request with a clear description.

## License

Choose and add a license before distributing the project. Until a license is included, the repository's reuse and redistribution terms are not explicitly specified.

---

**Carthage** — A self-hosted dashboard for managing and monitoring your home server.