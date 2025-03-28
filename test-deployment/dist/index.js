"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiHandler = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = require("./routes");
// Initialize Express app
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Add logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    });
    next();
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
});
// Routes setup
let setupComplete = false;
const setupApp = async () => {
    if (!setupComplete) {
        await (0, routes_1.registerRoutes)(app);
        setupComplete = true;
    }
};
// For serverless deployment
const apiHandler = async (req, res) => {
    await setupApp();
    return app(req, res);
};
exports.apiHandler = apiHandler;
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
exports.apiHandler = exports.apiHandler;
//# sourceMappingURL=index.js.map