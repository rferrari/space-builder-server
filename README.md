## Tom Bot
Tom Bot is an AI-powered chatbot that can listen to and respond to casts on Farcaster, designed for [@nounspaceTom](https://nounspace.com/s/nounspacetom)

## Table of Contents
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Development](#development)
  - [Production](#production)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- WebSocket-based real-time interactions.
- RAG framework for enhanced response generation using external data.
- Integration with Farcaster for decentralized social networking.
- Persistent conversation memory using LangChain components.
- Modular and extensible architecture.

---

## Getting Started

### Prerequisites
Ensure the following tools are installed on your machine:
- **Node.js** (>=16.0.0)
- **TypeScript** (>=5.0.0)
- **pnpm** (optional but recommended for dependency management)
- **Gulp CLI** (for building the project)

### Installation
1. Clone the repository:
```
git clone https://github.com/Nounspace/tom-bot.git
cd tom-bot-main
```
2. Install dependencies:
```
npm install
```

## Usage
### Development
To start the development server:
```
npm run dev
```
This command compiles the TypeScript files and starts a development server at http://localhost:3000.

### Production
1. Build the project:
```
npm run build
```
Start the production server:
```
npm run start:prod
```

### Configuration
The project uses environment variables for configuration. Create a .env file in the project root and define the following variables:
```
FARCASTER_API_KEY=your_farcaster_api_key
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

## Project Structure
- server/: Core backend logic.
  - server.ts: Entry point for the WebSocket server.
  - bot.controller.ts: Main chatbot logic.
  - farcaster.controller.ts: Handles Farcaster API integration.
  - ragSystem.ts: Implements RAG (Retrieval-Augmented Generation) functionality.
  - config.ts: Configuration management.
- dist-server/: Compiled production files.
- node_modules/: Installed dependencies.
- package.json: Dependency and script definitions.

## Key Components
### WebSocket Server
Defined in server/server.ts, this handles:
- Real-time communication with clients.
- Event bus for managing application-level events.

### Bot Controller
Located in server/bot.controller.ts, it:
- Manages conversation logic using LangChain.
- Utilizes RAG for knowledge retrieval.
- Maintains session context with LangChain's BufferMemory.

### Farcaster Integration
Implemented in server/farcaster.controller.ts:
- Connects with Farcaster API to fetch and post data.
- Integrates decentralized social networking features.

### RAG System
Implemented in server/ragSystem.ts, this module:
- Enhances chatbot responses with external data sources.
- Leverages LangChain's GraphInterface.

## Contributing 
1. Fork the respository.
2. Create a feature branch:
```
git checkout -b feature-name
```
3. Commit your changes:
```
git commit -m "Add feature description"
```
4. Push your branch and create a pull request.

## License
This project is licensed under the MIT License.
