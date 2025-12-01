# Deploying Dinnercaster to Google Cloud Run

This guide shows you how to deploy the Dinnercaster MCP server to Google Cloud Run.

## Prerequisites

1. **Google Cloud Project**
   - Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com)
   - Note your project ID

2. **Google Cloud CLI**
   - Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
   - Authenticate: `gcloud auth login`
   - Set your project: `gcloud config set project YOUR_PROJECT_ID`

3. **Docker**
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Make sure Docker is running

4. **Local Dependencies**
   - Install pnpm: `npm install -g pnpm`
   - Install project dependencies: `pnpm install`
   - Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Quick Deployment

The easiest way to deploy is using the provided deployment script:

```bash
./deploy.sh
```

This script will:
1. ✅ Enable required GCP APIs (Cloud Run, Container Registry)
2. ✅ Build the frontend assets with `pnpm run build`
3. ✅ Build the Docker image for linux/amd64
4. ✅ Push the image to Google Container Registry
5. ✅ Deploy to Cloud Run with proper environment variables
6. ✅ Configure the service URL automatically

## Manual Deployment

If you prefer to deploy manually, follow these steps:

### 1. Build Frontend Assets

```bash
pnpm run build
```

This creates the widget HTML, CSS, and JS files in the `assets/` directory.

### 2. Enable GCP APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Configure Docker Authentication

```bash
gcloud auth configure-docker gcr.io
```

### 4. Build Docker Image

```bash
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="dinnercaster-mcp"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

docker build --platform linux/amd64 -t ${IMAGE_NAME} .
```

### 5. Push to Container Registry

```bash
docker push ${IMAGE_NAME}
```

### 6. Deploy to Cloud Run

```bash
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region us-west1 \
    --port 8000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --allow-unauthenticated \
    --project ${PROJECT_ID}
```

### 7. Get Service URL

```bash
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region us-west1 \
    --format="value(status.url)")

echo "Service URL: ${SERVICE_URL}"
echo "MCP Endpoint: ${SERVICE_URL}/mcp"
```

### 8. Update BASE_URL (Optional)

If your widgets need to reference the production URL:

```bash
gcloud run services update ${SERVICE_NAME} \
    --region us-west1 \
    --set-env-vars BASE_URL=${SERVICE_URL}
```

## Configuration

### Environment Variables

The deployment supports the following environment variables:

- `PORT` - Port to listen on (default: 8000, set automatically by Cloud Run)
- `BASE_URL` - Base URL for widget assets (set automatically during deployment)

### Cloud Run Settings

The default deployment uses:
- **Memory**: 512Mi
- **CPU**: 1
- **Min instances**: 0 (scales to zero when idle)
- **Max instances**: 10
- **Timeout**: 300 seconds
- **Authentication**: None (public access)

To modify these settings, edit `deploy.sh` or update the service after deployment:

```bash
gcloud run services update dinnercaster-mcp \
    --region us-west1 \
    --memory 1Gi \
    --cpu 2 \
    --min-instances 1
```

### Custom Region

To deploy to a different region:

```bash
REGION=us-central1 ./deploy.sh
```

Or manually specify in the gcloud commands.

### Custom Service Name

```bash
SERVICE_NAME=my-dinner-app ./deploy.sh
```

## Testing Your Deployment

### 1. Test the Server

```bash
curl https://your-service-url.run.app
```

Should return: `Dinner MCP server`

### 2. Test the MCP Endpoint

```bash
curl https://your-service-url.run.app/mcp
```

### 3. Add to ChatGPT

1. Enable [developer mode](https://platform.openai.com/docs/guides/developer-mode) in ChatGPT
2. Go to Settings > Connectors
3. Add connector with URL: `https://your-service-url.run.app/mcp`
4. Test by asking: "Show me my dinner plan" or "Add pizza to my dinner plan for tomorrow"

## Monitoring

### View Logs

```bash
gcloud run services logs read dinnercaster-mcp \
    --region us-west1 \
    --limit 50
```

### Live Tail Logs

```bash
gcloud run services logs tail dinnercaster-mcp \
    --region us-west1
```

### View Metrics

Visit the Cloud Run console:
```
https://console.cloud.google.com/run/detail/us-west1/dinnercaster-mcp/metrics
```

## Updating Your Deployment

After making changes to your code:

1. **Rebuild and redeploy:**
   ```bash
   ./deploy.sh
   ```

2. **Or manually:**
   ```bash
   pnpm run build
   docker build --platform linux/amd64 -t gcr.io/${PROJECT_ID}/dinnercaster-mcp .
   docker push gcr.io/${PROJECT_ID}/dinnercaster-mcp
   gcloud run services update dinnercaster-mcp --region us-west1
   ```

## Cost Estimation

Cloud Run pricing (as of 2024):

- **Free tier**: 2 million requests/month, 360,000 GB-seconds/month
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests

For light usage (100-1000 requests/day), expect costs under $1/month, often free.

## Troubleshooting

### "Permission denied" errors

Make sure you're authenticated and have set your project:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### "API not enabled" errors

Enable the required APIs:
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Docker build fails

Make sure Docker Desktop is running:
```bash
docker ps
```

### Assets not loading in widgets

1. Make sure you built the frontend: `pnpm run build`
2. Check that `assets/` directory contains the built files
3. Verify BASE_URL environment variable is set correctly

### Service won't start

Check the Cloud Run logs:
```bash
gcloud run services logs read dinnercaster-mcp --region us-west1 --limit 100
```

Common issues:
- Missing Python dependencies (check `requirements.txt`)
- Port mismatch (should be 8000)
- Missing asset files (run `pnpm run build`)

## Cleanup

To delete the deployed service:

```bash
gcloud run services delete dinnercaster-mcp --region us-west1
```

To delete the container images:

```bash
gcloud container images delete gcr.io/${PROJECT_ID}/dinnercaster-mcp
```

## Security Considerations

### Public Access

By default, the service allows unauthenticated access (`--allow-unauthenticated`). This is suitable for MCP servers that will be accessed by ChatGPT.

### Private Access

If you want to restrict access, deploy with authentication:

```bash
# Remove --allow-unauthenticated from deploy.sh
# Then deploy
./deploy.sh
```

Users will need to authenticate with Cloud IAM to access the service.

### HTTPS

Cloud Run automatically provides HTTPS endpoints with valid SSL certificates. Your service is secure by default.

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Verify domain ownership in Google Cloud Console
2. Map the domain to your Cloud Run service:
   ```bash
   gcloud run domain-mappings create \
       --service dinnercaster-mcp \
       --domain dinner.example.com \
       --region us-west1
   ```

### CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build frontend
        run: pnpm run build

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        run: ./deploy.sh
```

### Environment-specific Deployments

Deploy to different environments:

```bash
# Development
SERVICE_NAME=dinnercaster-dev REGION=us-west1 ./deploy.sh

# Staging
SERVICE_NAME=dinnercaster-staging REGION=us-central1 ./deploy.sh

# Production
SERVICE_NAME=dinnercaster-prod REGION=us-east1 ./deploy.sh
```

## Support

For issues with:
- **Cloud Run**: See [Cloud Run documentation](https://cloud.google.com/run/docs)
- **MCP Protocol**: See [MCP documentation](https://modelcontextprotocol.io/)
- **This app**: Open an issue on GitHub

## References

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK](https://platform.openai.com/docs/guides/apps)
- [Docker Documentation](https://docs.docker.com/)
