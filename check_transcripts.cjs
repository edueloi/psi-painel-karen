const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Edu@06051992',
  database: 'psimanager',
};

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('Banco conectado!');
  
  // 1. Mostrar as últimas sessões
  const [sessions] = await conn.query(
    'SELECT * FROM room_sessions ORDER BY created_at DESC LIMIT 5'
  );
  console.log('Últimas sessões:', JSON.stringify(sessions, null, 2));

  if (sessions.length > 0) {
    const sk = sessions[0].session_key;
    console.log('Buscando transcrições para a última sessão:', sk);
    
    const [transcripts] = await conn.query(
      'SELECT * FROM room_transcripts WHERE session_key = ? ORDER BY created_at ASC',
      [sk]
    );
    console.log('Transcrições da última sessão:', JSON.stringify(transcripts, null, 2));

    const [recordings] = await conn.query(
      'SELECT * FROM room_recordings WHERE session_key = ? ORDER BY created_at ASC',
      [sk]
    );
    console.log('Gravações da última sessão:', JSON.stringify(recordings, null, 2));
  }

  await conn.end();
}

main().catch(console.error);
