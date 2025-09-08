# Hanabi Backend API

A Node.js Express backend for the Hanabi game application.

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Project Structure

```
Hanabi_BE/
├── config/         # Configuration files
├── controller/     # Route controllers
├── helper/         # Helper functions
├── middleware/     # Custom middleware
├── models/         # Data models
├── public/         # Static files
├── routes/         # API routes
├── socket/         # Socket.IO handlers
├── utils/          # Utility functions
├── validates/      # Input validation
├── index.js        # Main application file
├── package.json    # Dependencies
└── README.md       # This file
```

## Features

- Express.js web framework
- CORS enabled
- Helmet for security
- Morgan for logging
- Environment variables support
- Modular structure

## API Endpoints

- Base URL: `http://localhost:3000`
- API Routes: `/api/v1`

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
```
# HanabiHub_BE
