module.exports = {
  apps: [
    {
      name: 'cognos-frontend-antigo',
      script: 'npm',
      args: 'run dev:fast',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4445
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4445
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',
      watch: false,
      restart_delay: 2000
    }
  ]
}
