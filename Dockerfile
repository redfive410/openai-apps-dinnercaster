# Use the official Python image
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install the project into /app
COPY . /app
WORKDIR /app

# Allow statements and log messages to immediately appear in the logs
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN uv sync

# Expose the default port for the MCP server
EXPOSE 8000

# Run the MCP server
# Cloud Run will set PORT env var, bind to 0.0.0.0 to accept external connections
CMD ["uv", "run", "python", "dinner_server_python/main.py"]
