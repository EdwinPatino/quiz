const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ─── PREGUNTAS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { q: "¿Cómo se denomina el ataque que usa correos falsos para robar credenciales?", opts: ["Malware","Phishing","Spoofing","Keylogging"], ans: 1, cat: "🎣 ATAQUES" },
  { q: "¿Qué significa el acrónimo MFA en seguridad informática?", opts: ["Master File Access","Multi-Factor Authentication","Main Firewall Agent","Managed File Archive"], ans: 1, cat: "🔑 AUTENTICACIÓN" },
  { q: "¿Cuál es la diferencia clave entre 2FA y MFA?", opts: ["No hay diferencia","2FA usa 2 factores; MFA usa 2 o más","MFA es menos seguro","2FA es más moderno"], ans: 1, cat: "🔑 AUTENTICACIÓN" },
  { q: "¿Qué triada representa los pilares de la ciberseguridad?", opts: ["CPR","CIA (Confidencialidad, Integridad, Disponibilidad)","VPN, IDS, EDR","Auth, Cifrado, Backup"], ans: 1, cat: "📘 FUNDAMENTOS" },
  { q: "¿Qué es un 'vector de ataque'?", opts: ["Un antivirus","Vía que usa el atacante para vulnerar un sistema","Usuario con privilegios","Un firewall"], ans: 1, cat: "⚔️ ATAQUES" },
  { q: "¿Qué describe la 'superficie de ataque'?", opts: ["El tamaño del servidor","Total de puntos de entrada vulnerables","El nombre del ataque","La clave de cifrado"], ans: 1, cat: "📘 FUNDAMENTOS" },
  { q: "¿Cómo se llama el proceso de configurar un sistema de forma segura?", opts: ["Hardening","Backup","Routing","Port Scanning"], ans: 0, cat: "🛡️ DEFENSA" },
  { q: "¿Qué busca la 'ingeniería social' en ciberseguridad?", opts: ["Explotar código","Manipular personas para obtener acceso","Configurar firewalls","Actualizar sistemas"], ans: 1, cat: "🧠 HUMANO" },
  { q: "¿Qué es un exploit?", opts: ["Un antivirus avanzado","Una debilidad del sistema","Código que aprovecha una vulnerabilidad para ejecutar acciones no autorizadas","Un usuario admin"], ans: 2, cat: "⚔️ ATAQUES" },
  { q: "Una vulnerabilidad Zero-Day es aquella que...", opts: ["Existe hace años","Es conocida y tiene parche","Es desconocida para el fabricante y no tiene parche","Solo afecta hardware"], ans: 2, cat: "🔴 AVANZADO" },
  { q: "Un ataque DDoS impacta principalmente qué pilar de la triada CIA?", opts: ["Confidencialidad","Integridad","Disponibilidad","Autenticación"], ans: 2, cat: "⚔️ ATAQUES" },
  { q: "¿Qué principio establece el modelo Zero Trust?", opts: ["Confiar en la red interna","Nunca confiar, siempre verificar","Solo confiar en admins","No usar contraseñas"], ans: 1, cat: "🛡️ DEFENSA" },
  { q: "¿Cuál es la mejor defensa contra phishing?", opts: ["Mover el mouse","Filtros de correo + MFA + capacitación","Conectar un USB","Apagar la pantalla"], ans: 1, cat: "🛡️ DEFENSA" },
  { q: "¿Para qué sirve una VPN?", opts: ["Es un virus","Crea un túnel cifrado para proteger el tráfico","Es un tipo de router","Es un cable especial"], ans: 1, cat: "🌐 REDES" },
  { q: "¿Qué tecnología protege endpoints contra amenazas avanzadas?", opts: ["EDR (Endpoint Detection & Response)","Un cable Ethernet","Un Switch","Un teclado mecánico"], ans: 0, cat: "🛡️ DEFENSA" },
];

const TIME_PER_Q    = 12; // segundos por pregunta
const REVEAL_WAIT   = 4000; // ms mostrando respuesta correcta antes de siguiente

// ─── ESTADO EN MEMORIA ────────────────────────────────────────────────────────
// rooms[code] = { code, hostId, hostName, players[], state, currentQ, scores{}, answered{}, timers[] }
const rooms = {};

function genCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function buildScoreboard(room) {
  return room.players
    .map(p => ({ id: p.id, name: p.name, score: room.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);
}

function sendQuestion(room) {
  clearRoomTimers(room);
  const q = QUESTIONS[room.currentQ];

  io.to(room.code).emit('question', {
    q: q.q, opts: q.opts, cat: q.cat,
    index: room.currentQ,
    total: QUESTIONS.length,
    time: TIME_PER_Q,
  });

  // Auto-reveal when time is up
  const t = setTimeout(() => revealAnswer(room), TIME_PER_Q * 1000);
  room.timers.push(t);
}

function revealAnswer(room) {
  clearRoomTimers(room);
  const q = QUESTIONS[room.currentQ];
  io.to(room.code).emit('reveal-answer', {
    correctAnswer: q.ans,
    correctText: q.opts[q.ans],
    scoreboard: buildScoreboard(room),
  });

  const t = setTimeout(() => {
    room.currentQ++;
    if (room.currentQ >= QUESTIONS.length) {
      room.state = 'results';
      io.to(room.code).emit('game-over', { scoreboard: buildScoreboard(room) });
    } else {
      room.answered = {};
      sendQuestion(room);
    }
  }, REVEAL_WAIT);
  room.timers.push(t);
}

function clearRoomTimers(room) {
  room.timers.forEach(t => clearTimeout(t));
  room.timers = [];
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`+ connect  ${socket.id}`);

  // HOST: Crear sala
  socket.on('create-room', ({ name }) => {
    let code;
    do { code = genCode(); } while (rooms[code]);

    rooms[code] = {
      code, hostId: socket.id, hostName: name,
      players: [],
      state: 'lobby',   // lobby | playing | results
      currentQ: 0,
      scores: {}, answered: {}, timers: [],
    };

    socket.join(code);
    socket.data.code = code;
    socket.data.name = name;
    socket.data.isHost = true;

    socket.emit('room-created', { code, hostName: name });
    console.log(`  room [${code}] created by ${name}`);
  });

  // PLAYER: Unirse a sala
  socket.on('join-room', ({ code, name }) => {
    const room = rooms[code];
    if (!room)               return socket.emit('join-error', 'Sala no encontrada 🔍');
    if (room.state !== 'lobby') return socket.emit('join-error', 'El juego ya comenzó ⚡');
    if (room.players.length >= 20) return socket.emit('join-error', 'Sala llena (máx 20)');
    if (room.players.find(p => p.name.toLowerCase() === name.toLowerCase()))
      return socket.emit('join-error', 'Ese nombre ya está en uso');

    room.players.push({ id: socket.id, name });
    room.scores[socket.id] = 0;

    socket.join(code);
    socket.data.code = code;
    socket.data.name = name;
    socket.data.isHost = false;

    socket.emit('joined-room', { code, hostName: room.hostName, players: room.players });
    socket.to(code).emit('player-joined', { players: room.players });
    console.log(`  ${name} joined [${code}]`);
  });

  // HOST: Iniciar juego
  socket.on('start-game', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length === 0) return socket.emit('join-error', 'Necesitas al menos 1 jugador');
    room.state = 'playing';
    room.currentQ = 0;
    room.answered = {};
    Object.keys(room.scores).forEach(k => room.scores[k] = 0);
    sendQuestion(room);
  });

  // PLAYER: Responder
  socket.on('answer', ({ answer }) => {
    const room = rooms[socket.data.code];
    if (!room || room.state !== 'playing') return;
    if (room.answered[socket.id]) return;

    room.answered[socket.id] = true;
    const q = QUESTIONS[room.currentQ];
    const correct = answer === q.ans;
    if (correct) room.scores[socket.id]++;

    socket.emit('answer-ack', { correct, correctAnswer: q.ans, correctText: q.opts[q.ans] });

    // Actualizar scoreboard en vivo para todos
    io.to(room.code).emit('scores-live', { scoreboard: buildScoreboard(room) });

    // Si todos respondieron → revelar ya
    const all = room.players.every(p => room.answered[p.id]);
    if (all) revealAnswer(room);
  });

  // HOST: Reiniciar misma sala
  socket.on('restart-game', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id) return;
    room.state = 'playing';
    room.currentQ = 0;
    room.answered = {};
    room.players.forEach(p => room.scores[p.id] = 0);
    sendQuestion(room);
  });

  // Desconexión
  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    if (room.hostId === socket.id) {
      // Host se fue → avisar a todos y limpiar sala
      clearRoomTimers(room);
      io.to(code).emit('host-disconnected');
      delete rooms[code];
      console.log(`  room [${code}] closed (host left)`);
    } else {
      // Jugador se fue
      room.players = room.players.filter(p => p.id !== socket.id);
      delete room.scores[socket.id];
      io.to(code).emit('player-left', { players: room.players });
      console.log(`  ${socket.data.name} left [${code}]`);
    }
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀  CyberQuiz corriendo en http://localhost:${PORT}\n`);
});
