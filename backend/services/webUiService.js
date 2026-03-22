const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let webUiProcess = null;
let lastStartError = '';

const getConfig = () => {
  const host = process.env.BROWSER_USE_WEB_UI_HOST || '127.0.0.1';
  const port = Number(process.env.BROWSER_USE_WEB_UI_PORT || 7788);
  const pythonBin = process.env.BROWSER_USE_WEB_UI_PYTHON || 'python3';
  const repoDir =
    process.env.BROWSER_USE_WEB_UI_DIR ||
    path.resolve(__dirname, '..', '..', 'browser-use-web-ui');
  const startupMs = Number(process.env.BROWSER_USE_WEB_UI_STARTUP_MS || 30000);

  return { host, port, pythonBin, repoDir, startupMs };
};

const getBaseUrl = () => {
  const { host, port } = getConfig();
  return `http://${host}:${port}`;
};

const checkHealth = async () => {
  const url = `${getBaseUrl()}/`;
  try {
    await axios.get(url, { timeout: 2500 });
    return { running: true, url };
  } catch {
    return { running: false, url };
  }
};

const startWebUi = async () => {
  const health = await checkHealth();
  if (health.running) {
    return { success: true, alreadyRunning: true, url: health.url };
  }

  if (webUiProcess && !webUiProcess.killed) {
    return { success: true, alreadyRunning: true, url: getBaseUrl() };
  }

  const { host, port, pythonBin, repoDir, startupMs } = getConfig();
  lastStartError = '';

  webUiProcess = spawn(pythonBin, ['webui.py', '--ip', host, '--port', String(port)], {
    cwd: repoDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  webUiProcess.stdout.on('data', (buf) => {
    const line = String(buf || '').trim();
    if (line) console.log(`[web-ui] ${line}`);
  });

  webUiProcess.stderr.on('data', (buf) => {
    const line = String(buf || '').trim();
    if (line) {
      lastStartError = line;
      console.error(`[web-ui] ${line}`);
    }
  });

  webUiProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[web-ui] exited with code ${code}`);
    }
    webUiProcess = null;
  });

  // Give it time to boot.
  const maxChecks = Math.max(1, Math.floor(startupMs / 500));
  for (let i = 0; i < maxChecks; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 500));
    // eslint-disable-next-line no-await-in-loop
    const probe = await checkHealth();
    if (probe.running) {
      return { success: true, alreadyRunning: false, url: probe.url };
    }
  }

  if (webUiProcess && !webUiProcess.killed) {
    return {
      success: true,
      starting: true,
      url: getBaseUrl()
    };
  }

  return {
    success: false,
    url: getBaseUrl(),
    error:
      lastStartError ||
      'Failed to start browser-use/web-ui. Check BROWSER_USE_WEB_UI_* environment settings.'
  };
};

const stopWebUi = async () => {
  if (!webUiProcess || webUiProcess.killed) {
    return { success: true, stopped: true };
  }

  webUiProcess.kill('SIGTERM');
  webUiProcess = null;
  return { success: true, stopped: true };
};

module.exports = {
  getBaseUrl,
  checkHealth,
  startWebUi,
  stopWebUi
};
