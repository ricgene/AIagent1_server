#!/bin/bash

# Setup colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment process...${NC}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Compile TypeScript locally to check for errors
echo -e "${GREEN}Compiling TypeScript locally to check for errors...${NC}"
npx tsc --outDir dist --pretty

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript compilation failed. Please fix the errors and try again.${NC}"
    exit 1
fi

# Create a simple index.js file for deployment
echo -e "${GREEN}Creating a simplified entry point for Cloud Functions...${NC}"
cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Request received: ${req.method} ${req.path}`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Response sent: ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  
  next();
});

// Add simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: "Hello World! The API is running.",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown'
  });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Cloud Function handler
exports.apiHandler = (req, res) => {
  return app(req, res);
};
EOF

# Check if .env.yaml exists
if [ ! -f .env.yaml ]; then
    echo -e "${GREEN}Creating basic .env.yaml file...${NC}"
    cat > .env.yaml << 'EOF'
NODE_ENV: "production"
EOF
    echo -e "${GREEN}Created basic .env.yaml file. Add your API keys if needed.${NC}"
fi

# Deploy to GCP Cloud Functions using the simplified approach
echo -e "${GREEN}Deploying to GCP Cloud Functions...${NC}"
gcloud functions deploy ai-api-handler \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=apiHandler \
  --source=. \
  --env-vars-file=.env.yaml

# Check if deployment was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
    exit 1
else
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    # Get the deployed URL
    URL=$(gcloud functions describe ai-api-handler --format="value(httpsTrigger.url)")
    echo -e "${GREEN}Your API is now available at: ${URL}${NC}"
    echo -e "${GREEN}Test your API at: ${URL}/api/test${NC}"
fi
