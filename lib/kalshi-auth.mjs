import { constants, createSign } from 'node:crypto';

export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function kalshiSigningPath(pathOrUrl) {
  const path = pathOrUrl.startsWith('http') ? new URL(pathOrUrl).pathname : pathOrUrl.split('?')[0];
  return path.startsWith('/trade-api/') ? path : `/trade-api/v2${path.startsWith('/') ? path : `/${path}`}`;
}

export function signKalshiRequest(privateKeyPem, timestamp, method, pathOrUrl) {
  const signer = createSign('RSA-SHA256');
  signer.update(`${timestamp}${method.toUpperCase()}${kalshiSigningPath(pathOrUrl)}`);
  signer.end();
  return signer.sign({
    key: privateKeyPem,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
  }).toString('base64');
}

export function kalshiAuthHeaders({ keyId, privateKeyPem, method = 'GET', pathOrUrl, timestamp = String(Date.now()) }) {
  return {
    'KALSHI-ACCESS-KEY': keyId,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signKalshiRequest(privateKeyPem, timestamp, method, pathOrUrl),
  };
}
