# Mission Control Dashboard

A zo.space-based dashboard for managing and monitoring the Agent Army. Provides real-time visibility into agents, tasks, projects, memories, and documents.

## Features

- **Dashboard** (`/`) - Overview with agent stats, active projects, recent memories
- **Task Board** (`/tasks`) - Track and manage tasks across all agents
- **Calendar** (`/calendar`) - Schedule and deadline visualization
- **Projects** (`/projects`) - Project progress and management
- **Memories** (`/memories`) - Memory system visualization
- **Documents** (`/docs`) - Document management and search
- **AutoResearch** (`/autoresearch`) - Research experiment tracking
- **Army** (`/army`) - Agent management and monitoring

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/data` | Main data endpoint - returns agents, memories, projects, documents |
| `/api/chat-henry` | Chat interface for Henry (main orchestrator) |
| `/api/meta-improve` | Trigger AutoResearch improvements |
| `/api/autoresearch` | Get AutoResearch experiment data |
| `/api/debug` | Debug information |

## Data Structure

The `/api/data` endpoint returns:
- `agents` - Array of agent status objects
- `memories` - Recent memory entries
- `projects` - Active projects with progress
- `documents` - Created documents

## Access

- Public: Dashboard home (`/`)
- Private (requires auth): All other pages

## Tech Stack

- **Frontend**: React with Tailwind CSS
- **Icons**: Lucide React
- **Runtime**: zo.space (Bun + Hono)

## Development

The dashboard is deployed on zo.space at `https://lora.zo.space`. Routes are defined as zo.space page routes in the system.

To modify pages, use the zo.space route tools. Each route is a React component.
