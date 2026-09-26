const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'openapi.json'), 'utf8'));

function sample(schema = {}) {
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, sample(value)]));
  }
  if (schema.type === 'array') return [sample(schema.items || {})];
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum || 1;
  if (schema.type === 'boolean') return false;
  if (schema.format === 'email') return 'user@example.com';
  return '';
}

const folders = new Map();
for (const [route, pathItem] of Object.entries(spec.paths || {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem[method];
    if (!operation) continue;
    const tag = operation.tags?.[0] || 'Other';
    if (!folders.has(tag)) folders.set(tag, []);

    const request = {
      method: method.toUpperCase(),
      header: [],
      url: { raw: '{{baseUrl}}' + route.replace(/{([^}]+)}/g, ':$1') },
    };
    const security = operation.security || spec.security || [];
    if (security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'bearerAuth'))) {
      request.auth = {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
      };
    }
    if (security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'sessionId'))) {
      request.header.push({ key: 'X-Session-Id', value: '{{sessionId}}', type: 'text' });
    }

    const schema = operation.requestBody?.content?.['application/json']?.schema;
    if (schema) {
      request.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
      request.body = {
        mode: 'raw',
        raw: JSON.stringify(sample(schema), null, 2),
        options: { raw: { language: 'json' } },
      };
    }

    const item = {
      name: operation.summary || method.toUpperCase() + ' ' + route,
      request,
      response: [],
    };
    if (route === '/api/auth/login' && method === 'post') {
      item.event = [{
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'const body = pm.response.json();',
            'if (body && body.data && body.data.token) {',
            "  pm.collectionVariables.set('token', body.data.token);",
            '}',
          ],
        },
      }];
    }
    folders.get(tag).push(item);
  }
}

const collection = {
  info: {
    name: 'Flower Shop API',
    description: 'Generated from openapi.json. Login automatically stores JWT in {{token}}.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3001', type: 'string' },
    { key: 'token', value: '', type: 'string' },
    { key: 'sessionId', value: 'postman-session-id', type: 'string' },
  ],
  item: [...folders.entries()].map(([name, item]) => ({ name, item })),
};

const output = path.join(root, 'postman_collection.json');
fs.writeFileSync(output, JSON.stringify(collection, null, 2) + '\n');
JSON.parse(fs.readFileSync(output, 'utf8'));
console.log('Postman collection generated:', path.relative(root, output));
