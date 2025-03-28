import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// Routes setup
let setupComplete = false;
const setupApp = async () => {
  if (!setupComplete) {
    await registerRoutes(app);
    setupComplete = true;
  }
};

// For serverless deployment
export const apiHandler = async (req: Request, res: Response) => {
  await setupApp();
  return app(req, res);
};

// For local development
if (process.env.NODE_ENV === 'development') {
  (async () => {
    await setupApp();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })();
}

// CommonJS style export for Cloud Functions
exports.apiHandler = apiHandler;
