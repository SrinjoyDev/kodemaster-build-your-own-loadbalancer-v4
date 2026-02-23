import express, { Express, Request, Response } from "express";
import { Server } from "http";
import { AxiosRequestConfig, Method } from "axios";
import { Config, IConfig } from "./utils/config";
import { BackendServerDetails } from "./backend-server-details";
import { HttpClient } from "./utils/http-client";

export class LBServer {
  public app: Express;
  public server?: Server;
  public backendServers: BackendServerDetails[];
  private config: IConfig;

  constructor() {
    Config.load();
    this.config = Config.getConfig();

    this.backendServers = this.config.be_servers.map(
      (s) => new BackendServerDetails(s.domain, s.weight)
    );

    this.app = express();
    this.app.use(express.json());
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.app.get("/", (_req: Request, res: Response) => {
      res.send("Load Balancer v1.0");
    });

    // Basic proxy logic: pick first backend for now.
    this.app.use(async (req: Request, res: Response) => {
      const server = this.backendServers[0];
      if (!server) {
        res.status(500).send("No backend server configured");
        return;
      }

      try {
        server.incrementRequestsServed();

        const targetUrl = new URL(req.originalUrl || req.url, server.url).toString();
        const headers = { ...req.headers } as Record<string, string>;
        delete headers.host;

        const requestConfig: AxiosRequestConfig = {
          url: targetUrl,
          method: req.method as Method,
          headers,
          data: req.body,
          validateStatus: () => true, // forward status from backend
        };

        const upstreamResponse = await HttpClient.request(requestConfig);

        // Forward upstream headers except hop-by-hop troublemakers.
        const blocked = new Set(["transfer-encoding", "content-length", "connection", "keep-alive"]);
        for (const [key, value] of Object.entries(upstreamResponse.headers || {})) {
          if (!blocked.has(key.toLowerCase()) && value !== undefined) {
            res.setHeader(key, value as string);
          }
        }

        res.status(upstreamResponse.status);

        if (upstreamResponse.data === undefined || upstreamResponse.data === null) {
          res.end();
          return;
        }

        if (typeof upstreamResponse.data === "object") {
          res.send(upstreamResponse.data);
          return;
        }

        res.send(String(upstreamResponse.data));
      } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).send("Failed to process request");
      }
    });
  }

  public init(): void {
    this.server = this.app.listen(this.config.lbPORT, () => {
      console.log(`LB listening on ${this.config.lbPORT}`);
      console.log(`Initialized ${this.backendServers.length} backends`);
    });
  }
}