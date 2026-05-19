const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AIzaSyBysL3yvdnojR4i23W2sBeT0t3DpLyhlDI';
const model = 'gemini-3.5-flash';
const audioPath = path.join(__dirname, 'backend/public/uploads/room-recordings/rec-1779225164674-19mgy5c6m6s.webm');

console.log('Lendo arquivo de áudio:', audioPath);
if (!fs.existsSync(audioPath)) {
  console.error('Arquivo de áudio não encontrado!');
  process.exit(1);
}

const fileData = fs.readFileSync(audioPath);
const base64Audio = fileData.toString('base64');
console.log('Tamanho do arquivo:', fileData.length, 'bytes');

const body = JSON.stringify({
  contents: [
    {
      parts: [
        {
          inline_data: { mime_type: 'audio/webm', data: base64Audio }
        },
        {
          text: 'Transcreva este áudio em português brasileiro. Retorne apenas o texto transcrito, identificando falantes se aplicável.'
        }
      ]
    }
  ]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 44443,
  path: `/v1beta/models/${model}:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

// Use standard port 443
options.port = 443;

console.log('Enviando requisição para o Gemini...');
const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Resposta do Gemini:\n', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Resposta não-JSON:\n', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('Erro na requisição:', e);
});

req.write(body);
req.end();
