# mcp-svg-render

**Give your AI coding agent eyes for the SVG it writes.**

Models can author SVG — diagrams, UI mockups, charts, icons, logos, badges — but they can't *see* the result, so they ship misaligned, overflowing, or wrong-colored graphics blind and only find out when you tell them. This MCP server fixes that with one tool: **`render_svg`** rasterizes SVG to PNG (via [resvg](https://github.com/yisibl/resvg-js) — no headless browser) and returns it **inline as an image**, so the model closes the author → *see* → fix loop in a single call.

```
write SVG  →  render_svg  →  the agent sees the PNG  →  fix & repeat
```

## Install

Requires Node ≥ 18.17. It runs via `npx` — no global install needed.

### Claude Code
```bash
claude mcp add svg-render -- npx -y mcp-svg-render
```

### Any MCP client (Cursor, Windsurf, Claude Desktop, …)
Add to your MCP config:
```json
{
  "mcpServers": {
    "svg-render": {
      "command": "npx",
      "args": ["-y", "mcp-svg-render"]
    }
  }
}
```

## The tool

### `render_svg`
Rasterize an SVG and return it as an inline image.

| arg | type | notes |
|---|---|---|
| `svg` | string | Inline SVG markup. Provide this **or** `path`. |
| `path` | string | Path to a `.svg` file. Provide this **or** `svg`. |
| `scale` | number | Zoom multiplier (default `1`; use `2` for crisp/retina). |
| `background` | string | Background behind the SVG, e.g. `"#ffffff"`. Default: transparent. |
| `outPath` | string | If set, also writes the PNG to this path. |

Returns the rendered PNG as an inline image plus a one-line summary (`Rendered WxH PNG (N bytes)`).

System fonts are loaded automatically, so `<text>` renders; embedded `data:` images render too.

## Example

> *Agent:* "Draw a 3-node pipeline diagram in SVG and show it to me."

The agent writes the SVG, calls `render_svg`, and the rendered image comes straight back in the conversation — no screenshots, no guessing.

## Why

Built after one too many sessions shipping a banner/diagram with overlapping text because the model couldn't see its own output. SVG covers a huge slice of what an agent needs to draw, and resvg renders it fast and cross-platform with prebuilt binaries (no Chromium).

## License

MIT
