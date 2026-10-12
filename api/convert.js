import https from 'https';
import http from 'http';

export const config = {
  api: {
    bodyParser: false, // Stream raw multipart/form-data directly to Gotenberg
  },
};

export default function handler(req, res) {
  // 1. Enable full CORS for both Vercel and GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.json({ error: 'Method Not Allowed' });
    return;
  }

  // 2. Determine Gotenberg target URL
  const customGotenberg = req.headers['x-gotenberg-url'] || process.env.GOTENBERG_URL;
  const targetBase = (customGotenberg ? String(customGotenberg).trim() : 'https://demo.gotenberg.dev').replace(/\/+$/, '');
  const targetUrl = new URL(`${targetBase}/forms/libreoffice/convert`);

  const client = targetUrl.protocol === 'https:' ? https : http;

  // 3. Proxy stream to Gotenberg LibreOffice Engine
  const proxyReq = client.request(
    targetUrl,
    {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'],
        ...(req.headers['content-length'] ? { 'content-length': req.headers['content-length'] } : {}),
      },
      timeout: 60000,
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 200;
      if (proxyRes.headers['content-type']) {
        res.setHeader('content-type', proxyRes.headers['content-type']);
      }
      if (proxyRes.headers['content-disposition']) {
        res.setHeader('content-disposition', proxyRes.headers['content-disposition']);
      }
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Gateway Timeout (LibreOffice conversion took longer than 60s)'));
  });

  proxyReq.on('error', (err) => {
    console.error('Gotenberg Proxy Error:', err);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.json({ error: 'LibreOffice conversion proxy failed', message: err.message });
    }
  });

  req.pipe(proxyReq);
}
