const path = require('path');
const { spawn } = require('child_process');
let lingeringAgentProcess = null;

const isEnabled = () => {
  const raw = String(process.env.BROWSER_USE_VOICE_AGENT_MODE || 'true').toLowerCase();
  return ['1', 'true', 'yes', 'on', 'y'].includes(raw);
};

const extractResult = (output) => {
  const marker = '__BROWSER_USE_RESULT__';
  const lines = String(output || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith(marker)) continue;
    const jsonPart = line.slice(marker.length).trim();
    try {
      return JSON.parse(jsonPart);
    } catch {
      // keep searching earlier lines
    }
  }
  return null;
};

const runVoiceTask = async (transcript, pageContext = null) => {
  const pythonBin = process.env.BROWSER_USE_WEB_UI_PYTHON || 'python3';
  const scriptPath = path.resolve(__dirname, '..', 'tools', 'browser_use_task_runner.py');
  const maxSteps = Number(process.env.BROWSER_USE_VOICE_AGENT_MAX_STEPS || 25);
  const headless = String(process.env.BROWSER_USE_VOICE_AGENT_HEADLESS || 'false');
  const timeoutMs = Number(process.env.BROWSER_USE_VOICE_AGENT_TIMEOUT_MS || 180000);
  const keepBrowserOpen = String(process.env.BROWSER_USE_VOICE_AGENT_KEEP_BROWSER || 'true');
  const lingerSeconds = Number(process.env.BROWSER_USE_VOICE_AGENT_LINGER_SECONDS || 900);
  const startUrl = pageContext && pageContext.url ? String(pageContext.url) : '';
  const keepProcessAliveAfterResult = ['1', 'true', 'yes', 'on', 'y'].includes(
    String(process.env.BROWSER_USE_VOICE_AGENT_KEEP_PROCESS || 'true').toLowerCase()
  );

  if (lingeringAgentProcess && !lingeringAgentProcess.killed) {
    lingeringAgentProcess.kill('SIGTERM');
    lingeringAgentProcess = null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const args = [
      scriptPath,
      '--task',
      transcript,
      '--max-steps',
      String(Number.isFinite(maxSteps) ? maxSteps : 25),
      '--headless',
      headless,
      '--keep-browser-open',
      keepBrowserOpen,
      '--linger-seconds',
      String(Number.isFinite(lingerSeconds) ? Math.max(0, lingerSeconds) : 0)
    ];
    if (startUrl) {
      args.push('--start-url', startUrl);
    }

    const child = spawn(pythonBin, args, {
      cwd: path.resolve(__dirname, '..'),
      env: process.env
    });
    lingeringAgentProcess = child;

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const maybeResolveFromOutput = () => {
      if (resolved) return;
      const parsed = extractResult(`${stdout}\n${stderr}`);
      if (parsed) {
        resolved = true;
        resolve(parsed);
        if (!keepProcessAliveAfterResult && child && !child.killed) {
          child.kill('SIGTERM');
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, Math.max(5000, timeoutMs));

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
      maybeResolveFromOutput();
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
      maybeResolveFromOutput();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: 'agent_process_error',
        feedback: `Agent process failed to start: ${err.message}`
      });
    });

    child.on('close', () => {
      clearTimeout(timer);
      if (lingeringAgentProcess === child) {
        lingeringAgentProcess = null;
      }
      if (resolved) {
        return;
      }
      if (timedOut) {
        resolve({
          success: false,
          error: 'agent_timeout',
          feedback: 'Agent took too long to finish.'
        });
        return;
      }

      const parsed = extractResult(`${stdout}\n${stderr}`);
      if (parsed) {
        resolve(parsed);
        return;
      }

      resolve({
        success: false,
        error: 'agent_result_parse_failed',
        feedback: 'Agent execution did not return a valid result.'
      });
    });

  });
};

module.exports = {
  isEnabled,
  runVoiceTask
};
