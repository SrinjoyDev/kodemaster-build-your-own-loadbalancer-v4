import express from 'express';
import { Config } from './utils/config';
import { BackendServerDetails } from './backend-server-details';

Config.load();
const config = Config.getConfig();
const backendServers = config.be_servers.map(
    (s) => new BackendServerDetails(s.domain, s.weight)
);

const app = express();
const PORT = config.lbPORT;

app.get('/', (_req, res) => {
  res.send('Load Balancer v1.0');
});

app.listen(PORT, () => {
  console.log(`Load Balancer running on port ${PORT}`);
  console.log(`Initialised ${backendServers.length} backend servers with algorithm ${config.lbAlgo}`);
});