module.exports = {
  apps: [
    {
      name: 'psiflux',
      script: './backend/index.js',

      // ── Memória ──────────────────────────────────────────────────────────
      // Reinicia automaticamente se passar de 400 MB (KVM 1 tem ~2 GB total)
      max_memory_restart: '400M',

      // ── Reinício automático em crash ─────────────────────────────────────
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 3000,

      // ── Node.js Garbage Collector agressivo ──────────────────────────────
      // Reduz o heap máximo para forçar GC mais frequente
      node_args: '--max-old-space-size=350 --expose-gc',

      // ── Logs ─────────────────────────────────────────────────────────────
      error_file: './logs/pm2-error.log',
      out_file:   './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Ambiente ─────────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
