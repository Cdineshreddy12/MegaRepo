module.exports = {
  apps: [
    {
      name: "crm-backend",
      script: "server.js",              // main API server
      watch: false
    },
    {
      name: "crm-consumer",
      script: "crm-consumer-runner.js", // background worker
      watch: false
    }
  ]
};
