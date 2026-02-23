import express from 'express';
import { Config } from './utils/config';

Config.load();
const config = Config.getConfig();

const app = express();
const PORT = config.lbPORT;

app.get('/', (req, res) => {
  res.send('Load Balancer v1.0');
});

app.listen(PORT, () => {
  console.log(`Load Balancer running on port ${PORT}`);
});