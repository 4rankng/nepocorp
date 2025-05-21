1.  Clone the repository.
2.  Ensure Docker and Docker Compose are installed.
3.  Create a `.env` file from a `.env.example` with necessary configurations (DB credentials, JWT secret).
4.  Run `docker-compose up --build` from the `/backend` directory.
5.  The API should be accessible at `http://localhost:PORT` (port defined in `docker-compose.yml` and Gin config).
6.  Database migrations will be handled by a migration tool (e.g., `golang-migrate/migrate`) either automatically on startup (development) or via a separate command.

