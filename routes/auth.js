import express from "express";
import { githubLimiter } from "../middlewares/rateLimit.js";
import {
  redirectUserToGitHub,
  handleGitHubCallback,
  handleGitHubCliCallback,
  refreshToken,
  logoutUser,
} from "../controllers/authController.js";

export const authRouter = express.Router();

// for the auth with github endpoint — dedicated in-memory rate limiter
authRouter.get("/github", githubLimiter, redirectUserToGitHub);

// github callback
authRouter.post("/github/cli/callback", handleGitHubCliCallback);

// github callback
authRouter.get("/github/callback", handleGitHubCallback);

// send refresh token to get new pair of tokens
authRouter.post("/refresh", refreshToken);

// send refresh token to invalidate
authRouter.post("/logout", logoutUser);
