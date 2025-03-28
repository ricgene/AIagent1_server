#!/bin/bash

# Setup colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment process...${NC}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Compile TypeScript
echo -e "${GREEN}Compiling TypeScript...${NC}"
npx tsc --outDir dist

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript compilation failed. Please fix the errors and try again.${NC}"
    exit 1
fi

# Copy package.json to dist directory
echo -e "${GREEN}Copying package.json to dist directory...${NC}"
cp package.json dist/

# Check if .env.yaml exists
if [ ! -f .env.yaml ]; then
    echo -e "${RED}Missing .env.yaml file. Please create it with your environment variables.${NC}"
    exit 1
fi

# Deploy to GCP Cloud Functions
echo -e "${GREEN}Deploying to GCP Cloud Functions...${NC}"
cd dist
gcloud functions deploy ai-api-handler \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=apiHandler \
  --env-vars-file=../.env.yaml

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