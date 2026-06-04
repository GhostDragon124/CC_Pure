import { buildCommand, numberParser } from "@stricli/core";
import type { LocalContext } from "./context.js";

export const command = buildCommand({
  docs: {
    brief: "Start the ACP proxy server",
    fullDescription:
      "Starts a WebSocket proxy server that bridges clients to ACP agents. " +
      "The agent command is spawned as a subprocess and communicates via stdin/stdout.\n\n" +
      "Use -- to pass arguments to the agent:\n" +
      "  acp-link /path/to/agent -- --verbose --model gpt-4\n\n" +
      "Use --manager to start the Manager Web UI instead:\n" +
      "  acp-link --manager\n\n" +
      "For remote access, set ACP_AUTH_TOKEN environment variable or let it auto-generate.",
  },
  parameters: {
    flags: {
      port: {
        kind: "parsed",
        parse: numberParser,
        brief: "Port to listen on",
        optional: true,
      },
      host: {
        kind: "parsed",
        parse: String,
        brief: "Host to bind to (use 0.0.0.0 for remote access)",
        optional: true,
      },
      debug: {
        kind: "boolean",
        brief: "Enable debug logging to file",
        optional: true,
      },
      "no-auth": {
        kind: "boolean",
        brief: "DANGEROUS: Disable authentication (not recommended)",
        optional: true,
      },
      https: {
        kind: "boolean",
        brief: "Enable HTTPS with auto-generated self-signed certificate",
        optional: true,
      },
      manager: {
        kind: "boolean",
        brief: "Start Manager Web UI (no proxy)",
        optional: true,
      },
      group: {
        kind: "parsed",
        parse: (value: string) => {
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            throw new Error(`Invalid group "${value}": only letters, digits, hyphens, and underscores are allowed`);
          }
          return value;
        },
        brief: "Channel group ID for RCS registration (env: ACP_RCS_GROUP)",
        optional: true,
      },
    },
    positional: {
      kind: "array",
      parameter: {
        brief: "Agent command and arguments (use -- before agent flags)",
        parse: String,
        placeholder: "command",
        optional: true,
      },
      minimum: 0,
    },
  },
  func: async function (
    this: LocalContext,
    flags: { port?: number; host?: string; debug?: boolean; "no-auth"?: boolean; https?: boolean; manager?: boolean; group?: string },
    ...args: readonly string[]
  ) {
    const port = flags.port ?? 9315;
    const host = flags.host ?? "localhost";
    const debug = flags.debug ?? false;
    const noAuth = flags["no-auth"] ?? false;
    const https = flags.https ?? false;
    const manager = flags.manager ?? false;
    const group = flags.group;

    // Manager mode: start web UI only, no proxy
    if (manager) {
      const { startManager } = await import("../manager/index.js");
      await startManager(port);
      return;
    }

    // Proxy mode: agent command is required
    if (args.length === 0) {
      console.error("Error: agent command is required (or use --manager)");
      process.exit(1);
    }
    const [command, ...agentArgs] = args;
    const cwd = process.cwd();

    // Determine auth token
    // Priority: ACP_AUTH_TOKEN env var > auto-generate (unless --no-auth)
    let token: string | undefined;
    if (noAuth) {
      console.warn("⚠️  WARNING: Authentication disabled. This is dangerous for remote access!");
      token = undefined;
    } else {
      token = process.env.ACP_AUTH_TOKEN;
      if (!token) {
        // Auto-generate random token
        const { randomBytes } = await import("node:crypto");
        token = randomBytes(32).toString("hex");
      }
    }

    // Initialize logger
    const { initLogger } = await import("../logger.js");
    initLogger({ debug });

    // Import and run the server
    const { startServer } = await import("../server.js");
    await startServer({ port, host, command: command!, args: [...agentArgs], cwd, debug, token, https, group });
  },
});
