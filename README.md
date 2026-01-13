# Football Online Manager System

A NestJS-based backend for a Football Fantasy Manager system, allowing users to manage teams, transfer players, and more.

## Architecture & Workflow Diagrams

### 1. System Overview & Technical Stack
![System Overview](./diagrams/diagram-export-1-12-2026-3_30_49-AM.png)


### 2. User Authentication & Team Generation Flow
![Auth & Team Flow](./diagrams/diagram-export-1-12-2026-3_36_47-AM.png)

### 3. Database Entity Relationship Diagram (ERD)
![Database ERD](./diagrams/diagram-export-1-12-2026-3_34_38-AM.png)





## Features

- **Authentication**: JWT-based auth with single-flow entry (`/auth/connect`).
- **Team Management**: Async team creation with BullMQ (Redis). Generates 20 players per team ($5M budget).
- **Transfer Market**:
  - List players with filters (Team, Player, Price).
  - Buy players (Atomic transactions, 95% value transfer).
  - Team constraints (Max 25, Min 15 players).
- **Architecture**: Modular NestJS structure with Prisma ORM.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis (for Queue)
- pnpm (recommended) or npm

### Installation

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd football-manager-api
   pnpm install
   ```

2. **Database Setup**
   Update `.env` with your DB credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/football_db"
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   JWT_SECRET="super-secret"
   ```

   Run migrations & seed:
   ```bash
   pnpm prisma migrate dev
   pnpm prisma generate
   pnpm prisma db seed
   ```

3. **Running the App**
   ```bash
   # Start Redis server first!
   pnpm start:dev
   ```

4. **Testing**
   ```bash
   pnpm test
   ```

## API Documentation

Import the provided `Football-Manager.postman_collection.json` into Postman for full API examples.

### Key Endpoints
- `POST /auth/connect` - Login or Register (Single Flow)
- `GET /transfers` - List market players
- `POST /transfers/buy` - Buy a player

## Time Report

| Section | Time Spent | Details |
| :--- | :--- | :--- |
| **Analysis & Setup** | 1h 30m | Requirement analysis, project scaffolding, DB design. |
| **Auth Module** | 2h 00m | implementation of JWT, Login/Register DTOs, Single-flow refactor. |
| **Team Module** | 2h 30m | BullMQ setup, Async processor for team generation, "Seed" data constants. |
| **Transfer Market** | 2h 00m | Transfer logic, atomic transactions, unit tests. |
| **Debugging & Polish** | 1h 30m | Fixing Prisma import paths, RxJS conflicts, docs. |
| **Total** | **9h 30m** | |

## Tech Stack
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ (Redis)
- **Testing**: Jest
