module.exports = {
  apps: [
    {
      name: 'web-mini-manager',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 9527,
      },
    },
  ],
};
