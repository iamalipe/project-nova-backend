# Project Nova MCP Server Developer Guide

Welcome to the Project Nova Model Context Protocol (MCP) server development guide. This document explains the architecture of the MCP server, how to extend it, and how to perform local testing.

---

## 🏗️ Architecture

The MCP server is structured modularly inside the `app/mcp` directory:

```
app/mcp/
├── mcp.controller.ts      # Hono HTTP request controller & SSE transport wrapper
├── mcp.route.ts           # Hono routes defining /v1/mcp (Server) & /v1/mcp/connections (Clients)
├── mcp.schema.ts          # Zod input/output schemas for tools
├── mcp.server.ts          # Main entrypoint that builds the MCP server and registers modules
├── tools/                 # Tool registration modules (functionalities models can execute)
│   ├── index.ts
│   ├── ai.tools.ts        # AI LLM completion tools
│   ├── product.tools.ts   # Product CRUD tools (with input/output schemas)
│   └── user.tools.ts      # User profile tools (with input/output schemas)
├── prompts/               # Prompt template modules (predefined LLM context templates)
│   ├── index.ts
│   └── inventory.prompts.ts
└── resources/             # Resource registration modules (readable documents/data streams)
    ├── index.ts
    └── inventory.resources.ts
```

---

## 🛠️ How to Extend the Server

### 1. Adding a New Tool with Input and Output Schema

1. Define the input validation and output schemas in [mcp.schema.ts](file:///Users/abhiseck/Documents/Dev_Files/project-nova/project-nova-backend/app/mcp/mcp.schema.ts):
   ```typescript
   export const myNewToolInputSchema = z.object({
     paramName: z.string().describe('Description of the parameter'),
   });

   export const myNewToolOutputSchema = z.object({
     result: z.string().describe('Description of the return value'),
   });
   ```
2. Register the tool in one of the files in `/tools` (e.g. `product.tools.ts` or a new file):
   ```typescript
   server.registerTool(
     'my_new_tool',
     {
       title: 'My New Tool',
       description: 'Does something awesome.',
       inputSchema: myNewToolInputSchema,
       outputSchema: myNewToolOutputSchema,
     },
     async (input: any) => {
       const result = await myAwesomeService.execute(input.paramName);
       return {
         content: [{ type: 'text', text: JSON.stringify({ result }) }],
         structuredContent: { result },
         isError: false,
       };
     }
   );
   ```

---

## 🧪 Local Testing

The Project Nova MCP server communicates over HTTP/SSE. Because it uses Hono and requires Bearer token authentication, you can test it locally using any standard REST client (such as Postman, Bruno, or `curl`).

### Make JSON-RPC Requests
Make a `POST` request to `http://localhost:3000/v1/mcp` with the headers:
* `Authorization: Bearer <your_jwt_token>`
* `Content-Type: application/json`

#### Call the `completion` Tool
To use Google Gemini for direct completion:
* **Request Body:**
  ```json
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "completion",
      "arguments": {
        "prompt": "Recommend 3 tech gadgets under $50.",
        "temperature": 0.5
      }
    },
    "id": 1
  }
  ```
