# forge_ws

`forge_ws` is an authoritative multiplayer game server platform with docker orchestration and WebSocket transport.

It provides a control plane that dynamically provisions game server instances and per-instance WebSocket servers that run fully authoritative game logic, including movement, collision detection, and game state simulation.

## Architecture

### Control Plane
- Deno API
- Manages lifecycle of game server containers
- Pulls images, starts and stops servers, and allocates instances

### Game Servers
- WebSocket servers
- Fully authoritative simulation
- Server controlls movement, collision detection, and game state
- Clients send **input intents** (never state) to ensure authority

## Features

- Full server authority over game state
- Lightweight orchestration using Docker (no Kubernetes required)
- Designed for real-time multiplayer games

## Tech Stack

- **Deno** – API and server orchestration
- **Docker** – Containerized game server instances
- **WebSockets** – Client-server communication

## Status

Early development. Core orchestration works; game logic and simulation under active design.
