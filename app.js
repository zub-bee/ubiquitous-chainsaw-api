import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { RedisStore } from "connect-redis";
import redisClient from "./db/redisClient.js";
import { authenticateUser } from "./middlewares/authenticate.js";
import { checkHeaderVersion } from "./middlewares/checkHeader.js";
import { classifyRouter } from "./routes/classifyRouter.js";
import { profilesRouter } from "./routes/profilesRouter.js";
import { usersRouter } from "./routes/usersRouter.js";
import { createTable, indexTable, createUsersTable } from "./db/createTable.js";
import { seedProfiles } from "./db/seedProfiles.js";
import { redisCacheMiddleware } from "./middlewares/redis.js";
import { normalizeSearchQuery } from "./middlewares/normalizeSearchQuery.js";
import { authRouter } from "./routes/auth.js";
import { authLimiter, apiLimiter } from "./middlewares/rateLimit.js";

const PORT = process.env.PORT;

const app = express();

// Trust Railway's reverse proxy so req.secure is correct and express-session
// sets Secure cookies properly.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });
  next();
});

app.use("/auth", authLimiter, authRouter);

app.use("/api/classify", apiLimiter, authenticateUser, classifyRouter);

app.use(
  "/api/profiles",
  apiLimiter,
  normalizeSearchQuery,
  authenticateUser,
  redisCacheMiddleware(),
  checkHeaderVersion,
  profilesRouter,
);

app.use(
  "/api/users",
  apiLimiter,
  authenticateUser,
  redisCacheMiddleware(),
  checkHeaderVersion,
  usersRouter,
);

app.use((req, res) => {
  res.status(404).json({
    error: "Invalid endpoint",
    message:
      "Endpoint is invalid. Check the API documentation for more information",
  });
});

await startServer();

async function startServer() {
  try {
    await createTable();

    await createUsersTable();

    await indexTable();

    // Seed 10k profiles if table is empty
    const { db } = await import("./db/openDBConnection.js");
    const { rowCount } = await db.query("SELECT 1 FROM profiles LIMIT 1");
    if (rowCount === 0) {
      console.log("No profiles found. Seeding 10,000 profiles...");
      await seedProfiles();
    }

    app.listen(PORT, "0.0.0.0", () =>
      console.log(`This server is listening on port: ${PORT}`),
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
