// PM2 Ecosystem Config — ShipLabel Next.js App
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'shiplabel',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,          // tăng lên 'max' nếu muốn cluster mode
      exec_mode: 'fork',     // dùng 'cluster' nếu instances > 1
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log files (tuỳ chỉnh đường dẫn nếu cần)
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
