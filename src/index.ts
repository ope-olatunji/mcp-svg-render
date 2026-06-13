#!/usr/bin/env node
/**
 * mcp-svg-render — give an AI coding agent eyes for the SVG it authors.
 *
 * Models can write SVG (diagrams, UI mockups, charts, icons, badges) but can't
 * SEE the result, so they ship misaligned or broken graphics blind. This MCP
 * server exposes one tool, `render_svg`, that rasterizes SVG to PNG (via resvg,
 * no browser) and returns it INLINE as an image — closing the author→verify
 * loop in a single tool call.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Resvg } from "@resvg/resvg-js";
import { z } from "zod";

const server = new McpServer({ name: "mcp-svg-render", version: "0.1.0" });

server.registerTool(
  "render_svg",
  {
    title: "Render SVG to image",
    description:
      "Rasterize an SVG to a PNG and return it INLINE as an image so you can actually SEE the result. " +
      "Use it right after writing or editing any SVG — a diagram, UI mockup, chart, icon, logo, or badge — " +
      "to visually verify layout, alignment, overflow, and colors before shipping. " +
      "Accepts inline markup (`svg`) or a file (`path`), and can also save the PNG to disk (`outPath`).",
    inputSchema: {
      svg: z.string().optional().describe("Inline SVG markup. Provide this OR `path`."),
      path: z.string().optional().describe("Path to a .svg file. Provide this OR `svg`."),
      scale: z
        .number()
        .positive()
        .max(8)
        .optional()
        .describe("Zoom multiplier for the raster (default 1; use 2 for crisp/retina output)."),
      background: z
        .string()
        .optional()
        .describe("Background behind the SVG, e.g. '#ffffff' or 'white'. Default: transparent."),
      outPath: z.string().optional().describe("If set, also write the rendered PNG to this file path."),
    },
  },
  async ({ svg, path, scale, background, outPath }) => {
    let source = "";
    try {
      source = svg ?? (path ? readFileSync(path, "utf8") : "");
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Could not read "${path}": ${(e as Error).message}` }],
      };
    }
    if (!source.trim()) {
      return {
        isError: true,
        content: [{ type: "text", text: "Provide `svg` markup or a `path` to an .svg file." }],
      };
    }
    try {
      const resvg = new Resvg(source, {
        ...(background ? { background } : {}),
        font: { loadSystemFonts: true },
        ...(scale && scale !== 1 ? { fitTo: { mode: "zoom" as const, value: scale } } : {}),
      });
      const rendered = resvg.render();
      const png = rendered.asPng();
      if (outPath) writeFileSync(outPath, png);
      return {
        content: [
          { type: "image" as const, data: png.toString("base64"), mimeType: "image/png" },
          {
            type: "text" as const,
            text: `Rendered ${rendered.width}×${rendered.height}px PNG (${png.length.toLocaleString()} bytes)${
              outPath ? `, saved to ${outPath}` : ""
            }.`,
          },
        ],
      };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `SVG render failed: ${(e as Error).message}` }],
      };
    }
  },
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  // stdio transport keeps the process alive; nothing logs to stdout (reserved
  // for the JSON-RPC stream) — diagnostics go to stderr only.
  console.error("[mcp-svg-render] ready");
}

main().catch((e) => {
  console.error("[mcp-svg-render] fatal:", e);
  process.exit(1);
});
