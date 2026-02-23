import express, { Express } from "express";
import { Server } from "http";
import { Config, IConfig } from "./utils/config";
import { BackendServerDetails } from "./backend-server-details";
import { HttpClient } from "./utils/http-client";
import { AxiosRequestConfig, Method } from "axios";

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

    this.app.get("/", (_req, res) => {
      res.send("Load Balancer v1.0");
    });
  }

  private registerRoutes() : void {
    this.app.get("/" , (_req , res) => {
        res.send("Load Balancer v1.0");
    });


    //basic proxy logic : pick first backend (for now)>>
    this.app.use(async (req , res) => {
        const server = this.backendServers[0];
        if(!server){
            res.status(503).send("No backend servers available");
            return;
        }
        try{
            server.incrementRequestsServed();
            const targetUrl = new URL(req.originalUrl || req.url , server.url).toString();
            const headers = {...req.headers} as Record<string , string>;
            delete headers.host; // Let the backend server handle the Host header
            const requestConfig : AxiosRequestConfig = {
                url  : targetUrl,
                method  : req.method as Method,
                headers,
                data : req.body,
                validateStatus : () => true , //forward status from the backend as is.
            };

            const upstreamResponse = await HttpClient(requestConfig);

            //forward upstream headers , except hp by hop troublemmakers.
            const blocked = new Set([
                "transfer-encoding",
                "content-length",
                "connection",
                "keep-alive"
            ]);

            for(const [key , value] of Object.entries(upstreamResponse.headers || {})){
                if(!blocked.has(key.toLowerCase()) && value !== undefined){
                    res.setHeader(key , value as string);
                }
            }
            res.status(upstreamResponse.status);

            if(upstreamResponse.data === undefined || upstreamResponse.data === null){
                res.end();
                return;
            }
            
            if(typeof upstreamResponse.data === "object") {res.send(upstreamResponse.data); return;};
            res.send(String(upstreamResponse.data));
        }catch(err){
            console.error("Error forwarding request to backend:", err instanceof Error ? err.message : String(err));
            res.status(500).send("Error forwarding request to backend");
        }
    })
  }
  
  public init(): void {
    this.server = this.app.listen(this.config.lbPORT, () => {
      console.log(`LB listening on ${this.config.lbPORT}`);
      console.log(`Initialized ${this.backendServers.length} backends`);
    });
  }
}