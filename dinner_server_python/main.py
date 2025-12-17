"""Dinner MCP server implemented with the Python FastMCP helper.

This server implements a dinner planner with add_meal, remove_meal, and
show_meals tools. The tools return structured content with the current meal
plan that gets rendered in a widget UI."""

from __future__ import annotations

import os
from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import BaseModel, ConfigDict, Field, ValidationError

# Meal state management
meals: List[Dict[str, Any]] = []
next_id: int = 1

@dataclass(frozen=True)
class WidgetConfig:
    template_uri: str
    html: str


ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


@lru_cache(maxsize=None)
def _load_widget_html(component_name: str) -> str:
    html_path = ASSETS_DIR / f"{component_name}.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf8")

    fallback_candidates = sorted(ASSETS_DIR.glob(f"{component_name}-*.html"))
    if fallback_candidates:
        return fallback_candidates[-1].read_text(encoding="utf8")

    raise FileNotFoundError(
        f'Widget HTML for "{component_name}" not found in {ASSETS_DIR}. '
        "Run `pnpm run build` to generate the assets before starting the server."
    )


# Widget configuration
DINNER_WIDGET = WidgetConfig(
    template_uri="ui://widget/dinnercaster.html",
    html=_load_widget_html("dinnercaster"),
)


MIME_TYPE = "text/html+skybridge"


class AddMealInput(BaseModel):
    """Schema for add_meal tool."""

    meal: str = Field(
        ...,
        min_length=1,
        description="The name of the meal/dish",
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class RemoveMealInput(BaseModel):
    """Schema for remove_meal tool."""

    id: str = Field(
        ...,
        min_length=1,
        description="The id of the meal to remove",
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


# Disable DNS rebinding protection for Cloud Run
transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=False,
)

mcp = FastMCP(
    name="dinner-app",
    stateless_http=True,
    transport_security=transport_security,
)


ADD_MEAL_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "meal": {
            "type": "string",
            "minLength": 1,
            "description": "The name of the meal/dish",
        }
    },
    "required": ["meal"],
    "additionalProperties": True,
}

REMOVE_MEAL_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "minLength": 1,
            "description": "The id of the meal to remove",
        }
    },
    "required": ["id"],
    "additionalProperties": True,
}

SHOW_MEALS_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {},
    "additionalProperties": True,
}


def _tool_meta(tool_name: str) -> Dict[str, Any]:
    """Generate metadata for tools."""
    if tool_name == "add_meal":
        return {
            "openai/outputTemplate": DINNER_WIDGET.template_uri,
            "openai/toolInvocation/invoking": "Adding meal",
            "openai/toolInvocation/invoked": "Added meal",
        }
    elif tool_name == "remove_meal":
        return {
            "openai/outputTemplate": DINNER_WIDGET.template_uri,
            "openai/toolInvocation/invoking": "Removing meal",
            "openai/toolInvocation/invoked": "Removed meal",
        }
    elif tool_name == "show_meals":
        return {
            "openai/outputTemplate": DINNER_WIDGET.template_uri,
            "openai/toolInvocation/invoking": "Showing meal plan",
            "openai/toolInvocation/invoked": "Showed meal plan",
        }
    return {}


def _embedded_widget_resource() -> types.EmbeddedResource:
    """Create embedded widget resource for dinner widget."""
    return types.EmbeddedResource(
        type="resource",
        resource=types.TextResourceContents(
            uri=DINNER_WIDGET.template_uri,
            mimeType=MIME_TYPE,
            text=DINNER_WIDGET.html,
        ),
    )


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="add_meal",
            title="Add meal to dinner plan",
            description="Adds a meal to the dinner plan.",
            inputSchema=deepcopy(ADD_MEAL_INPUT_SCHEMA),
            _meta=_tool_meta("add_meal"),
        ),
        types.Tool(
            name="remove_meal",
            title="Remove meal from dinner plan",
            description="Removes a meal from the dinner plan by id.",
            inputSchema=deepcopy(REMOVE_MEAL_INPUT_SCHEMA),
            _meta=_tool_meta("remove_meal"),
        ),
        types.Tool(
            name="show_meals",
            title="Show dinner plan",
            description="Shows the current dinner plan with all scheduled meals.",
            inputSchema=deepcopy(SHOW_MEALS_INPUT_SCHEMA),
            _meta=_tool_meta("show_meals"),
            annotations={
                "readOnlyHint": True,
                "destructiveHint": False,
                "openWorldHint": False,
            },
        ),
    ]

@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    """List available resources."""
    return [
        types.Resource(
            name="dinner-widget",
            title="Dinner Planner Widget",
            uri=DINNER_WIDGET.template_uri,
            description="Dinner planner widget markup",
            mimeType=MIME_TYPE,
            _meta={"openai/widgetPrefersBorder": True},
        )
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    """Handle resource read requests."""
    if str(req.params.uri) != DINNER_WIDGET.template_uri:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    contents = [
        types.TextResourceContents(
            uri=DINNER_WIDGET.template_uri,
            mimeType=MIME_TYPE,
            text=DINNER_WIDGET.html,
            _meta={"openai/widgetPrefersBorder": True},
        )
    ]

    return types.ServerResult(types.ReadResourceResult(contents=contents))


def _reply_with_meals(meals_list: List[Dict[str, Any]], message: str = "") -> types.CallToolResult:
    """Helper to create a tool result with current meals."""
    content = []
    if message:
        content.append(types.TextContent(type="text", text=message))

    widget_resource = _embedded_widget_resource()
    meta: Dict[str, Any] = {
        "openai.com/widget": widget_resource.model_dump(mode="json"),
        "openai/outputTemplate": DINNER_WIDGET.template_uri,
        "openai/widgetAccessible": True,
        "openai/resultCanProduceWidget": True,
    }

    return types.CallToolResult(
        content=content,
        structuredContent={"meals": meals_list},
        _meta=meta,
    )


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    """Handle tool call requests."""
    global meals, next_id

    tool_name = req.params.name
    arguments = req.params.arguments or {}

    if tool_name == "add_meal":
        try:
            payload = AddMealInput.model_validate(arguments)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[
                        types.TextContent(
                            type="text",
                            text=f"Input validation error: {exc.errors()}",
                        )
                    ],
                    isError=True,
                )
            )

        meal_name = payload.meal.strip()
        if not meal_name:
            return types.ServerResult(_reply_with_meals(meals, "Missing meal name."))

        meal = {
            "id": f"meal-{next_id}",
            "meal": meal_name,
        }
        meals.append(meal)
        next_id += 1

        return types.ServerResult(_reply_with_meals(meals, f'Added "{meal["meal"]}".'))

    elif tool_name == "remove_meal":
        try:
            payload = RemoveMealInput.model_validate(arguments)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[
                        types.TextContent(
                            type="text",
                            text=f"Input validation error: {exc.errors()}",
                        )
                    ],
                    isError=True,
                )
            )

        meal_id = payload.id
        if not meal_id:
            return types.ServerResult(_reply_with_meals(meals, "Missing meal id."))

        # Find the meal
        meal = next((m for m in meals if m["id"] == meal_id), None)
        if not meal:
            return types.ServerResult(_reply_with_meals(meals, f"Meal {meal_id} was not found."))

        # Remove the meal
        meals = [m for m in meals if m["id"] != meal_id]

        return types.ServerResult(_reply_with_meals(meals, f'Removed "{meal["meal"]}".'))

    elif tool_name == "show_meals":
        message = f"You have {len(meals)} meal(s) planned." if meals else "Your dinner plan is empty."
        return types.ServerResult(_reply_with_meals(meals, message))

    else:
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=f"Unknown tool: {tool_name}",
                    )
                ],
                isError=True,
            )
        )


mcp._mcp_server.request_handlers[types.CallToolRequest] = _call_tool_request
mcp._mcp_server.request_handlers[types.ReadResourceRequest] = _handle_read_resource


app = mcp.streamable_http_app()

try:
    from starlette.middleware.cors import CORSMiddleware
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    from starlette.routing import Route
    from starlette.responses import PlainTextResponse, FileResponse
    from starlette.staticfiles import StaticFiles

    # Add a simple home route
    async def home(request):
        """Simple home route to verify server is running."""
        return PlainTextResponse("Dinner MCP server")

    # Serve static assets from the assets directory
    assets_path = Path(__file__).resolve().parent.parent / "assets"

    # Serve individual asset files from root for widget loading
    async def serve_js(request):
        """Serve JS asset files."""
        filename = request.path_params.get("filename")
        file_path = assets_path / f"{filename}.js"
        if file_path.exists() and file_path.is_file():
            response = FileResponse(file_path, media_type="application/javascript")
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        return PlainTextResponse("Not found", status_code=404)

    async def serve_css(request):
        """Serve CSS asset files."""
        filename = request.path_params.get("filename")
        file_path = assets_path / f"{filename}.css"
        if file_path.exists() and file_path.is_file():
            response = FileResponse(file_path, media_type="text/css")
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        return PlainTextResponse("Not found", status_code=404)

    # Handle OPTIONS preflight requests
    async def handle_options(request):
        """Handle CORS preflight requests."""
        response = PlainTextResponse("", status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    # Add the routes to the app
    app.routes.insert(0, Route("/", home))
    app.routes.insert(1, Route("/{filename}.js", serve_js, methods=["GET", "HEAD"]))
    app.routes.insert(2, Route("/{filename}.css", serve_css, methods=["GET", "HEAD"]))
    app.routes.insert(3, Route("/{filename}.js", handle_options, methods=["OPTIONS"]))
    app.routes.insert(4, Route("/{filename}.css", handle_options, methods=["OPTIONS"]))

    # Add TrustedHost middleware to allow all hosts (needed for Cloud Run)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

    # Add CORS middleware BEFORE routes
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
        allow_headers=["*"],
        allow_credentials=False,
        expose_headers=["*"],
    )
except Exception:
    pass


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f"Dinner MCP server listening on http://0.0.0.0:{port}/mcp")
    uvicorn.run(app, host="0.0.0.0", port=port)
