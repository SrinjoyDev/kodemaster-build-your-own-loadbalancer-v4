import {BEServerHealth} from "./utils/enums";
import { HttpClient } from "./utils/http-client";

export interface IBackendServerDetails {
    url: string;
    serverWeight: number;
    getStatus(): BEServerHealth;
    setStatus(status: BEServerHealth): void;
    incrementRequestsServed(): void;
    resetMetrics(): void;
}

export class BackendServerDetails implements IBackendServerDetails {
    url: string;
    serverWeight: number;
    requestsServedCount: number = 0;
    private status: BEServerHealth = BEServerHealth.UNHEALTHY;

    constructor(url: string, serverWeight: number) {
        this.url = url;
        this.serverWeight = serverWeight;
    }

    getStatus(): BEServerHealth {
        return this.status;
    }

    setStatus(status: BEServerHealth): void {
        this.status = status;
    }

    incrementRequestsServed(): void {
        this.requestsServedCount++;
    }

    resetMetrics(): void {
        this.requestsServedCount = 0;
    }

    async ping(): Promise<boolean> {
    try {
      await HttpClient.get(`${this.url}/ping`);
      this.setStatus(BEServerHealth.HEALTHY);
      return true;
    } catch (error) {
      this.setStatus(BEServerHealth.UNHEALTHY);
      console.error(`Health check failed for ${this.url}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}