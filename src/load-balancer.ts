import express, { Express } from "express";
import { Server } from "http";
import { Config, IConfig } from "./utils/config";
import { BackendServerDetails } from "./backend-server-details";

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

  public init(): void {
    this.server = this.app.listen(this.config.lbPORT, () => {
      console.log(`LB listening on ${this.config.lbPORT}`);
      console.log(`Initialized ${this.backendServers.length} backends`);
    });
  }
}