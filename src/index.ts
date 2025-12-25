// Alias setup removed

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import session from "express-session";
import { ExpressPeerServer } from "peer";
import { app, server } from "./socket/socket-server";
import routes from "./routes";
import connectDB from "./utils/db";
import { cleanup as cleanupLearningTracker } from "./middleware/learning-tracker";
import enrollmentsRouter from "./routes/enrollment.route";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "8080", 10);

// Trust proxy để detect HTTPS từ X-Forwarded-Proto header (cần cho Render, Vercel, etc.)
// Điều này quan trọng để cookies được set đúng với Secure flag
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(morgan("combined"));
app.use(cookieParser()); // Thêm cookie parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001",
      "https://hanabi-hub.vercel.app",
    ];

    // Kiểm tra origin có trong danh sách cho phép
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Cho phép Vercel preview deployments (pattern matching)
    if (origin.match(/^https:\/\/hanabi-hub.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Từ chối origin không được phép
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
  credentials: true, // Cho phép gửi cookies
};
app.use(cors(corsOptions));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use("/api/v1/enrollments", enrollmentsRouter);

// Tích hợp PeerServer vào HTTP server
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
  proxied: true,
});

// PeerJS WebSocket endpoint
app.use("/peerjs", peerServer);

// Route info cho PeerJS (GET request)
app.get("/peerjs-info", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "PeerJS server is running",
    timestamp: new Date().toISOString(),
    connection: {
      host: req.get("host"),
      path: "/peerjs",
      secure: req.secure,
      example: `const peer = new Peer(id, { host: '${req.get(
        "host"
      )}', path: '/peerjs' })`,
    },
  });
});

peerServer.on("connection", (peer: any) => {
  console.log("✅ Peer connected:", peer.id);
});

peerServer.on("disconnect", (peer: any) => {
  console.log("❌ Peer disconnected:", peer.id);
});

// Routes
app.use("/api/v1", routes);

app.get("/testServer", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Hanabi Backend chạy mượt!",
    timestamp: new Date().toISOString(),
  });
});

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} was not found.`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "hãy kiểm tra lại!",
  });
});

// Start server (Express + Socket.IO + PeerJS chung cổng)
server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Hanabi Backend running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/testServer`);
  console.log(` Môi trường: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} được gửi. Đang tắt máy dần...`);

  // Close BullMQ worker, queue, and Redis connection
  await cleanupLearningTracker();

  // Close server
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("⚠️ Đóng máy bắt buộc sau thời gian chờ");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
