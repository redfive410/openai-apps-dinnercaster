# Quick Start Guide

## Deploy to Google Cloud Run in 5 Minutes

### Prerequisites
- Google Cloud account
- gcloud CLI installed and authenticated
- Docker Desktop running
- pnpm installed
- uv installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

### Steps

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd openai-apps-dinnercaster
   pnpm install
   ```

2. **Configure Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh
   ```

4. **Get your URL:**
   The script will output your service URL, something like:
   ```
   https://dinnercaster-mcp-xxxxx-uw.a.run.app
   ```

5. **Add to ChatGPT:**
   - Enable developer mode in ChatGPT
   - Go to Settings > Connectors
   - Add connector: `https://your-url.run.app/mcp`

6. **Test it:**
   Ask ChatGPT: "Show me my dinner plan" or "Add pizza to tonight's dinner"

That's it! 🎉

## Common Commands

```bash
# Redeploy after changes
./deploy.sh

# View logs
gcloud run services logs read dinnercaster-mcp --region us-west1

# Update configuration
gcloud run services update dinnercaster-mcp --region us-west1 --memory 1Gi

# Delete service
gcloud run services delete dinnercaster-mcp --region us-west1
```

## Troubleshooting

**"gcloud: command not found"**
- Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install)

**"Docker daemon not running"**
- Start Docker Desktop

**"API not enabled"**
- The deploy script enables them automatically, or run:
  ```bash
  gcloud services enable run.googleapis.com
  gcloud services enable containerregistry.googleapis.com
  ```

**Need more help?**
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- Check [Cloud Run docs](https://cloud.google.com/run/docs)
