module.exports = {
  apps: [
    {
      name: 'shiplabel',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 80,
        DATABASE_URL: 'postgres://postgres:Abc%241243@14.224.185.1:5432/ship_partner',
        JWT_SECRET: 'shiplabel-super-secret-key-32chars!',
        NODE_OPTIONS: '--dns-result-order=ipv4first'
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};