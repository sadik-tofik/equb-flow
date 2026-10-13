// ecosystem.config.cjs
// PM2 ecosystem configuration for EqubFlow production processes
// Runs runner and executor with node --env-file=.env

module.exports = {
  apps: [
    {
      name: 'equbflow-runner',
      script: 'apps/worker/src/runner.ts',
      interpreter: 'tsx',
      node_args: '--env-file=.env',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'equbflow-executor',
      script: 'apps/executor/src/runner.ts',
      interpreter: 'tsx',
      node_args: '--env-file=.env',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
