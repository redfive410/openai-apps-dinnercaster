# Dinnercaster - Meal Planning Widget

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A beautiful dinner planning widget for use with the OpenAI Apps SDK and MCP (Model Context Protocol). Based on the openai-apps-todolist example.

## What's included

- **Dinnercaster Widget** (`src/dinnercaster/`) - A React-based meal planning widget
- **Python MCP Server** (`dinner_server_python/`) - MCP server that exposes meal planning tools
- **Build System** (`build-all.mts`) - Vite-based build that produces versioned bundles

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build the widget

```bash
pnpm run build
```

This creates versioned `.html`, `.js`, and `.css` files in the `assets/` directory.

For production deployment with a custom URL:

```bash
BASE_URL=https://your-ngrok-url.ngrok-free.dev pnpm run build
```

### 3. Start the asset server

```bash
pnpm run serve
```

The assets will be available at `http://localhost:4444` with CORS enabled.

### 4. Run the MCP server

```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies and run the server
uv run python dinner_server_python/main.py
```

The server will start on `http://localhost:8000` with the MCP endpoint at `/mcp`.

## Testing in ChatGPT

1. Enable [developer mode](https://platform.openai.com/docs/guides/developer-mode) in ChatGPT
2. Expose your local server using [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 8000
   ```
3. Add the connector in ChatGPT Settings > Connectors using the ngrok URL:
   ```
   https://<your-endpoint>.ngrok-free.app/mcp
   ```
4. Add the app to your conversation using the "More" options
5. Try asking: "Show me my dinner plan" or "Add spaghetti carbonara to my dinner plan for tomorrow"

## Available MCP Tools

### add_meal
Adds a meal to the dinner plan.

**Parameters:**
- `meal` (string, required): The name of the meal/dish
- `date` (string, required): The date in YYYY-MM-DD format
- `notes` (string, optional): Recipe notes, ingredients, or cooking tips

**Example:**
```
Add chicken tikka masala to my dinner plan for 2025-12-01
```

### remove_meal
Removes a meal from the dinner plan by ID.

**Parameters:**
- `id` (string, required): The ID of the meal to remove

### show_meals
Displays the current dinner plan with all scheduled meals.

## Development

### Available scripts

- `pnpm run build` - Build production bundles
- `pnpm run serve` - Serve built assets on port 4444
- `pnpm run tsc` - Type check all TypeScript files

### Repository structure

```
.
├── src/
│   ├── dinnercaster/      # Dinnercaster widget source code
│   ├── index.css          # Global styles
│   ├── types.ts           # Shared TypeScript types
│   └── use-*.ts           # Shared React hooks
├── assets/                # Built widget bundles (generated)
├── dinner_server_python/  # Python MCP server
├── build-all.mts          # Build orchestrator
└── package.json           # Dependencies and scripts
```

## How it works

### MCP + Apps SDK

The Model Context Protocol (MCP) connects ChatGPT to your tools and UI:

1. **List tools** - Server advertises available tools with JSON schemas
2. **Call tools** - Model invokes tools with user-provided arguments
3. **Return widgets** - Server includes widget metadata in responses (`_meta.openai/outputTemplate`)

The widget is rendered inline in ChatGPT using the built assets.

## Deploying

### Deploy to Google Cloud Run

The easiest way to deploy is to Google Cloud Run:

```bash
./deploy.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions, including:
- Quick deployment with the provided script
- Manual deployment steps
- Configuration options
- Monitoring and troubleshooting
- Cost estimation
- Custom domains and CI/CD

### Deploy to Other Platforms

To deploy to other platforms:

1. Build the widgets with your production URL:
   ```bash
   BASE_URL=https://your-server.com pnpm run build
   ```

2. Deploy the MCP server with the same `BASE_URL` environment variable

3. Host the `assets/` directory at the specified base URL

4. Add your production MCP endpoint to ChatGPT

## Customizing

- **Widget UI** - Edit files in `src/dinnercaster/`
- **MCP tools** - Modify `dinner_server_python/main.py`
- **Styling** - Update `src/dinnercaster/dinnercaster.css` or adjust Tailwind classes

## Features

- 🍽️ Plan meals by date
- 📝 Add recipe notes and ingredients
- 🗑️ Easy meal removal
- 📅 Calendar-based organization
- 🎨 Beautiful orange/amber themed UI
- ✨ Smooth animations with Framer Motion
- 💾 Local storage support for standalone mode

## Credits

Based on the [openai-apps-todolist](https://github.com/openai/openai-apps-todolist) example from OpenAI.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
