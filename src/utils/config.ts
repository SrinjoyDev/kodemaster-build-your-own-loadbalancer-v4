import fs from "fs";
import path from "path";
import Joi from "joi";

export interface IBackendServerConfig {
    domain: string;
    weight: number;
}

export interface IConfig {
    lbPORT: number;
    lbAlgo: "rand" | "rr" | "wrr";
    be_servers: IBackendServerConfig[];
}

export class Config {
    private static config: IConfig | undefined;

    private static schema = Joi.object({
        lbPORT: Joi.number().port().required(),
        lbAlgo: Joi.string().valid("rand", "rr", "wrr").required(),
        be_servers: Joi.array()
            .items(
                Joi.object({
                    domain: Joi.string().uri().required(),
                    weight: Joi.number().integer().min(1).required(),
                })
            )
            .min(1)
            .required(),
    });

    static load(configPath: string = "./config.json"): void {
        try {
            const fullPath = path.join(process.cwd(), configPath);
            const fileContent = fs.readFileSync(fullPath, "utf-8");
            const parsedConfig = JSON.parse(fileContent);

            const { error, value } = this.schema.validate(parsedConfig);
            if (error) {
                console.error("Config validation error:", error.message);
                process.exit(1);
            }

            this.config = value;
        } catch (err) {
            console.error(
                "Failed to load config:",
                err instanceof Error ? err.message : String(err)
            );
            process.exit(1);
        }
    }

    static getConfig(): IConfig {
        if (!this.config) {
            throw new Error("Config not loaded. Call Config.load() first.");
        }
        return this.config;
    }
}