module.exports = {
  apps: [
    {
      name: "crm-backend",
      script: "server.js",              // main API server
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
    },
    {
      name: "crm-consumer",
      script: "crm-consumer-runner.js", // background worker (Redis streams)
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
    },
    {
      name: "crm-temporal-worker",
      script: "temporal/worker.js",     // Temporal worker
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      env: {
        TEMPORAL_ENABLED: process.env.TEMPORAL_ENABLED || "false"
      }
    },
    {
      name: "crm-temporal-bridge",
      script: "temporal/redis-to-temporal-bridge.js", // Redis to Temporal bridge
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      env: {
        TEMPORAL_ENABLED: process.env.TEMPORAL_ENABLED || "false"
      }
    }
  ]
};
