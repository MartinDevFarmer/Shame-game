const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10e6 // 10MB for image uploads
});

const PORT = process.env.PORT || 3000;

// --- Storage ---
const rooms = {}; // roomCode -> roomState

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Photo upload endpoint ---
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// --- Questions & Dares Database ---
const questions = [
  "Quel est ton plus gros mensonge que tu n'as jamais avoué ?",
  "Quelle est la chose la plus embarrassante que tu aies faite en soirée ?",
  "Quel est ton crush secret dans cette pièce ou parmi nos amis ?",
  "Quel est le truc le plus bizarre que tu as googlé récemment ?",
  "Raconte ton pire date ou rendez-vous amoureux.",
  "Quel est le message le plus gênant que tu aies envoyé par erreur ?",
  "Si tu devais classer les joueurs du plus au moins beau, quel serait ton classement ?",
  "Quelle est la chose la plus puérile que tu fais encore en secret ?",
  "Quel est ton plus gros regret amoureux ?",
  "Quelle est la chose la plus chère que tu aies cassée chez quelqu'un ?",
  "Quel est le secret que tu caches à tes parents ?",
  "Raconte la fois où tu as le plus eu honte de toi.",
  "Quel est le mensonge que tu racontes le plus souvent ?",
  "Quelle est la chose la plus folle que tu aies faite par amour ?",
  "Quel est ton guilty pleasure le plus inavouable ?",
  "Si tu devais embrasser un joueur ici, ce serait qui ?",
  "Quel est le truc le plus nul que tu aies fait pour impressionner quelqu'un ?",
  "Quelle est ta plus grande peur irrationnelle ?",
  "Quel est le pire cadeau que tu aies jamais fait ?",
  "Raconte un truc que tu as fait et dont tu n'es vraiment pas fier.",
  "Quel est ton plus gros red flag en couple ?",
  "Quelle est la chose la plus méchante que tu aies dite à quelqu'un ?",
  "Quel est le texto le plus embarrassant dans ton téléphone en ce moment ?",
  "Raconte la pire excuse bidon que tu as donnée pour annuler un plan.",
  "Quel est le truc le plus gênant que tes parents ont découvert ?",
  "Si tu devais avouer un truc à quelqu'un ici, ce serait quoi et à qui ?",
  "Quelle est la rumeur la plus folle qui a circulé sur toi ?",
  "Quel est le truc le plus ridicule pour lequel tu as pleuré ?",
  "Quelle est ta plus grosse arnaque ou ton plus gros mytho ?",
  "Raconte une histoire que tu n'as jamais racontée à personne ici."
];

const dares = [
  "Envoie le dernier selfie de ta galerie dans le groupe de tes amis.",
  "Appelle le dernier contact de ton historique et dis-lui que tu l'aimes.",
  "Fais 20 pompes maintenant.",
  "Imite un des joueurs, les autres doivent deviner qui.",
  "Poste une story Instagram avec un texte dicté par le groupe.",
  "Montre ton temps d'écran de la semaine.",
  "Laisse un joueur envoyer un message depuis ton téléphone.",
  "Fais une déclaration d'amour enflammée à la personne à ta gauche.",
  "Danse pendant 30 secondes sans musique.",
  "Montre la dernière photo de ta galerie à tout le monde.",
  "Fais un TikTok choisi par le groupe.",
  "Mange quelque chose de bizarre que le groupe choisit.",
  "Appelle un ex et mets sur haut-parleur pendant 30 secondes.",
  "Laisse un joueur choisir ta photo de profil pour 24h.",
  "Envoie 'Tu me manques' à la 5ème personne de tes contacts.",
  "Imite la personne à ta droite pendant 2 minutes.",
  "Fais un compliment gênant à chaque joueur.",
  "Montre ton historique de recherche YouTube.",
  "Parle avec un accent pendant les 3 prochains tours.",
  "Fais une battle de danse avec le joueur de ton choix.",
  "Raconte ta pire anecdote avec la voix d'un commentateur sportif.",
  "Envoie un vocal de 10 secondes en chantant à ton dernier contact WhatsApp.",
  "Fais le tour de la pièce en marchant comme un crabe.",
  "Laisse le groupe écrire un tweet/post depuis ton compte.",
  "Garde les yeux fermés pendant tout le prochain tour.",
  "Fais un discours de remerciement comme si tu recevais un Oscar.",
  "Montre la conversation la plus récente de tes DM.",
  "Échange de téléphone avec un autre joueur pendant 2 tours.",
  "Fais 10 squats en racontant ta journée.",
  "Mime ton emoji le plus utilisé, les autres doivent deviner."
];

// --- Helper functions ---
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Make sure code doesn't already exist
  if (rooms[code]) return generateRoomCode();
  return code;
}

function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  rooms[code] = {
    code,
    hostId: hostSocketId,
    phase: 'lobby', // lobby -> setup -> game -> ended
    players: [{
      id: hostSocketId,
      name: hostName,
      setupDone: false
    }],
    // secrets[targetPlayerName] = [{type: 'photo'|'anecdote', content: '...', submittedBy: 'name'}]
    secrets: {},
    usedQuestions: [],
    usedDares: [],
    currentTurn: null,
    currentChallenge: null,
    turnOrder: [],
    turnIndex: 0,
    revealedSecrets: [] // track what's been revealed
  };
  return rooms[code];
}

function getRoom(code) {
  return rooms[code] || null;
}

function getPlayerNames(room) {
  return room.players.map(p => p.name);
}

function getRandomQuestion(room) {
  const available = questions.filter(q => !room.usedQuestions.includes(q));
  if (available.length === 0) {
    room.usedQuestions = [];
    return questions[Math.floor(Math.random() * questions.length)];
  }
  const q = available[Math.floor(Math.random() * available.length)];
  room.usedQuestions.push(q);
  return q;
}

function getRandomDare(room) {
  const available = dares.filter(d => !room.usedDares.includes(d));
  if (available.length === 0) {
    room.usedDares = [];
    return dares[Math.floor(Math.random() * dares.length)];
  }
  const d = available[Math.floor(Math.random() * available.length)];
  room.usedDares.push(d);
  return d;
}

function getRandomChallenge(room) {
  const isQuestion = Math.random() > 0.5;
  if (isQuestion) {
    return { type: 'question', text: getRandomQuestion(room) };
  } else {
    return { type: 'dare', text: getRandomDare(room) };
  }
}

function getSecretForPlayer(room, playerName) {
  const secrets = room.secrets[playerName];
  if (!secrets || secrets.length === 0) return null;
  // Pick one that hasn't been revealed yet
  const unrevealed = secrets.filter(s =>
    !room.revealedSecrets.find(r => r.content === s.content && r.target === playerName)
  );
  if (unrevealed.length === 0) return null;
  const secret = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  return secret;
}

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a room
  socket.on('create-room', (playerName, callback) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    callback({ success: true, roomCode: room.code, players: getPlayerNames(room) });
    console.log(`Room ${room.code} created by ${playerName}`);
  });

  // Join a room
  socket.on('join-room', (data, callback) => {
    const { roomCode, playerName } = data;
    const room = getRoom(roomCode.toUpperCase());

    if (!room) return callback({ success: false, error: "Cette room n'existe pas." });
    if (room.phase !== 'lobby') return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return callback({ success: false, error: "Ce prénom est déjà pris." });
    }
    if (room.players.length >= 12) return callback({ success: false, error: "La room est pleine (max 12)." });

    room.players.push({ id: socket.id, name: playerName, setupDone: false });
    socket.join(room.code);
    callback({ success: true, roomCode: room.code, players: getPlayerNames(room) });
    io.to(room.code).emit('player-joined', { players: getPlayerNames(room) });
    console.log(`${playerName} joined room ${room.code}`);
  });

  // Host starts setup phase
  socket.on('start-setup', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length < 2) return;

    room.phase = 'setup';
    io.to(room.code).emit('phase-change', {
      phase: 'setup',
      players: getPlayerNames(room)
    });
    console.log(`Room ${room.code} entering setup phase`);
  });

  // Player submits secrets about another player
  socket.on('submit-secret', (data, callback) => {
    const { roomCode, targetPlayer, secrets: playerSecrets } = data;
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return callback({ success: false });

    // Initialize secrets array for target if needed
    if (!room.secrets[targetPlayer]) room.secrets[targetPlayer] = [];

    // Add each secret
    playerSecrets.forEach(secret => {
      room.secrets[targetPlayer].push({
        type: secret.type, // 'photo' or 'anecdote'
        content: secret.content,
        submittedBy: player.name
      });
    });

    // Mark player as done with setup
    player.setupDone = true;

    callback({ success: true });

    // Check if all players are done
    const allDone = room.players.every(p => p.setupDone);
    io.to(room.code).emit('setup-progress', {
      done: room.players.filter(p => p.setupDone).length,
      total: room.players.length
    });

    if (allDone) {
      // Start the game!
      room.phase = 'game';
      // Randomize turn order
      room.turnOrder = [...room.players].sort(() => Math.random() - 0.5);
      room.turnIndex = 0;
      io.to(room.code).emit('phase-change', { phase: 'game' });
      // Start first spin after a short delay
      setTimeout(() => {
        io.to(room.code).emit('start-spin', {
          players: getPlayerNames(room)
        });
      }, 1500);
    }
  });

  // Roulette has finished spinning, server decides result
  socket.on('request-spin-result', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'game') return;

    // Pick current player from turn order
    const currentPlayer = room.turnOrder[room.turnIndex];
    room.currentTurn = currentPlayer;

    // Generate challenge
    const challenge = getRandomChallenge(room);
    room.currentChallenge = challenge;

    // Check if there's a secret available for this player
    const hasSecret = getSecretForPlayer(room, currentPlayer.name) !== null;

    io.to(room.code).emit('spin-result', {
      playerName: currentPlayer.name,
      challenge,
      canRefuse: hasSecret
    });
  });

  // Player accepts the challenge
  socket.on('accept-challenge', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;

    io.to(room.code).emit('challenge-accepted', {
      playerName: room.currentTurn.name,
      challenge: room.currentChallenge
    });

    // Move to next turn after a delay
    setTimeout(() => nextTurn(room), 3000);
  });

  // Player refuses -> reveal a secret
  socket.on('refuse-challenge', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const secret = getSecretForPlayer(room, room.currentTurn.name);
    if (secret) {
      room.revealedSecrets.push({ ...secret, target: room.currentTurn.name });
      io.to(room.code).emit('secret-revealed', {
        playerName: room.currentTurn.name,
        secret
      });
    }

    // Move to next turn after viewing time
    setTimeout(() => nextTurn(room), 8000);
  });

  // Next turn
  function nextTurn(room) {
    room.turnIndex = (room.turnIndex + 1) % room.turnOrder.length;
    room.currentTurn = null;
    room.currentChallenge = null;

    io.to(room.code).emit('start-spin', {
      players: getPlayerNames(room)
    });
  }

  // Continue game (host triggers next spin manually)
  socket.on('next-turn', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    nextTurn(room);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Find which room this player was in
    for (const code in rooms) {
      const room = rooms[code];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        if (room.phase === 'lobby') {
          room.players.splice(playerIndex, 1);
          io.to(room.code).emit('player-joined', { players: getPlayerNames(room) });
          // If host left, delete room
          if (socket.id === room.hostId) {
            io.to(room.code).emit('room-closed');
            delete rooms[code];
          }
        } else {
          // During game, mark as disconnected but keep
          io.to(room.code).emit('player-disconnected', { playerName: player.name });
        }
        break;
      }
    }
  });
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`Shame Game running on port ${PORT}`);
});
