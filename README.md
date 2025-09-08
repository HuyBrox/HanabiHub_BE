# Hanabi Backend API

A TypeScript Node.js Express backend for the Hanabi game application.

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Production
```bash
npm run build
npm start
```

### Testing
```bash
npm test
npm run test:watch
```

## Project Structure

```
Hanabi_BE/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── helpers/        # Helper functions
│   ├── middleware/     # Custom middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── socket/         # Socket.IO handlers
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── validators/     # Input validation
│   └── index.ts        # Main application file
├── dist/               # Compiled JavaScript (production)
├── public/             # Static files
├── tsconfig.json       # TypeScript configuration
├── nodemon.json        # Nodemon configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: Fast web framework for Node.js
- **CORS**: Cross-Origin Resource Sharing enabled
- **Helmet**: Security middleware
- **Morgan**: HTTP request logging
- **Environment variables**: Configuration via .env files
- **Socket.IO**: Real-time bidirectional event-based communication
- **JWT**: JSON Web Token authentication
- **MongoDB**: NoSQL database with Mongoose ODM
- **File Upload**: Multer for handling file uploads
- **Image Processing**: Sharp for image manipulation
- **Modular Architecture**: Clean, scalable code structure

## API Endpoints

- Base URL: `http://localhost:3000`
- API Routes: `/api/v1`
- Health Check: `/health`

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
DB_HOST=localhost
DB_PORT=27017
DB_NAME=hanabi
DB_USER=your_username
DB_PASSWORD=your_password
SOCKET_CORS_ORIGIN=http://localhost:3000
```

## Development

1. Install dependencies: `npm install`
2. Set up environment variables in `.env`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`
5. Start production server: `npm start`

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- Target: ES2022
- Module: CommonJS
- Strict type checking enabled
- Path mapping for clean imports
- Source maps for debugging
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
