#!/bin/bash

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION=${REGION:-us-west1}
SERVICE_NAME=${SERVICE_NAME:-"dinnercaster-mcp"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Starting deployment to Cloud Run..."
echo "Project ID: ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"

# Enable required APIs
echo "🔌 Enabling required GCP APIs..."
gcloud services enable run.googleapis.com --project=${PROJECT_ID}
gcloud services enable containerregistry.googleapis.com --project=${PROJECT_ID}

# Authenticate Docker with gcloud
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker gcr.io --quiet

# Build the frontend assets first
echo "📦 Building frontend assets..."
if command -v pnpm &> /dev/null; then
    pnpm run build
else
    echo "⚠️  pnpm not found, skipping frontend build. Make sure assets are built before deploying."
fi

# Build the Docker image for linux/amd64 platform
echo "🐳 Building Docker image..."
docker build --platform linux/amd64 -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
echo "⬆️  Pushing image to Container Registry..."
docker push ${IMAGE_NAME}

# Check if service already exists to get the URL
echo "🔍 Checking if service already exists..."
EXISTING_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$EXISTING_URL" ]; then
    # First deployment - use a temporary HTTPS placeholder
    echo "📦 First deployment - will update with actual URL after deployment..."
    TEMP_BASE_URL="https://temp.example.com"
else
    # Service exists - use the existing URL
    echo "♻️  Updating existing service with URL: ${EXISTING_URL}"
    TEMP_BASE_URL="${EXISTING_URL}"
fi

# Deploy to Cloud Run
echo "🌟 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --port 8000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --allow-unauthenticated \
    --set-env-vars BASE_URL=${TEMP_BASE_URL} \
    --project ${PROJECT_ID}

# Get the actual service URL
echo "🔍 Getting actual service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format="value(status.url)")

# If this was a first deployment with temp URL, update with the real URL
if [ "$TEMP_BASE_URL" = "https://temp.example.com" ]; then
    echo "📝 Updating service with correct BASE_URL: ${SERVICE_URL}"
    gcloud run services update ${SERVICE_NAME} \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --set-env-vars BASE_URL=${SERVICE_URL}
fi

echo "✅ Deployment complete!"
echo "🔗 Service URL: ${SERVICE_URL}"
echo "📡 MCP Endpoint: ${SERVICE_URL}/mcp"
echo ""
echo "To test your deployment:"
echo "  curl ${SERVICE_URL}"
echo ""
echo "To add to ChatGPT:"
echo "  1. Enable developer mode in ChatGPT"
echo "  2. Go to Settings > Connectors"
echo "  3. Add connector with URL: ${SERVICE_URL}/mcp"
