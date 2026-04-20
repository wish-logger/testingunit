const { ClusterManager } = require("discord-hybrid-sharding");
const shcl = require("@impulsedev/shcl");
require("dotenv").config();

const manager = new ClusterManager("./index.js", {
  totalShards: "auto",
  shardsPerCluster: 2,
  totalClusters: "auto",
  mode: "process",
  token: process.env.TOKEN,
});

manager.on("clusterCreate", (cluster) => {
  console.log(shcl.blue(`[Cluster] New Cluster Created - ID: ${cluster.id}`));
});

manager.spawn({ timeout: -1 });