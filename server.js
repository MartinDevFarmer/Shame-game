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
  maxHttpBufferSize: 10e6
});

const PORT = process.env.PORT || 3000;

const rooms = {};

// Multer config
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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ============================================================
// QUESTIONS (Vérité)
// type: 'solo' | 'targeted' (needs {X}) | 'choice' (needs {X1},{X2})
// gender: 'any' | 'F' | 'M' (who can receive this question)
// oppositeX: true = {X} must be opposite gender
// ============================================================
const questions = [
  { text: "Tu préfères pécho {X1} ou {X2} ?", type: 'choice', gender: 'any', oppositeX: true },
  { text: "As-tu déjà avalé du sperme ?", type: 'solo', gender: 'any' },
  { text: "Quel est ton bodycount ?", type: 'solo', gender: 'any' },
  { text: "As-tu déjà fait un plan à 3 ?", type: 'solo', gender: 'any' },
  { text: "Quels seraient les deux personnes ici présentes que tu choisirais pour un plan à 3 ?", type: 'solo', gender: 'any' },
  { text: "Quelle est ta plus grosse honte durant un rapport sexuel ?", type: 'solo', gender: 'any' },
  { text: "Quel est ton dernier mensonge ?", type: 'solo', gender: 'any' },
  { text: "À quel âge as-tu perdu ta virginité ?", type: 'solo', gender: 'any' },
  { text: "{Y} lâche une vérité sur toi (un truc banger)", type: 'reveal', gender: 'any' },
  { text: "Qu'est-ce que tu trouves le plus moche physiquement chez {X} (ses yeux, ses cheveux, ses dents...) ?", type: 'targeted', gender: 'any', oppositeX: false },
  { text: "Est-ce que lors d'une soirée bien arrosée tu pourrais pécho {X} ?", type: 'targeted', gender: 'any', oppositeX: true },
  { text: "Est-ce que tu pourrais coucher avec quelqu'un du sexe opposé dans la pièce ?", type: 'solo', gender: 'any' },
  { text: "Quel est ton plus gros fantasme ?", type: 'solo', gender: 'any' },
  { text: "Tu préfères quand ça tape dans le fond ou quand ça effleure le clitoris ?", type: 'solo', gender: 'F' },
  { text: "Tu préfères sucer ou branler ?", type: 'solo', gender: 'F' },
  { text: "Tu préfères faire un cuni ou doigter ?", type: 'solo', gender: 'M' },
  { text: "Est-ce que pour toi c'est important que la personne avec qui tu couches soit rasée ?", type: 'solo', gender: 'any' },
  { text: "As-tu déjà eu des MST ?", type: 'solo', gender: 'any' },
  { text: "As-tu déjà eu envie de te faire quelqu'un ici ?", type: 'solo', gender: 'any' },
  { text: "Tu préfères (amicalement) {X1} ou {X2} ?", type: 'choice', gender: 'any', oppositeX: false },
  { text: "Cite deux défauts (moral ou physique) de {X}.", type: 'targeted', gender: 'any', oppositeX: false },
  { text: "Quelle est la personne la plus jeune que tu t'es faite ?", type: 'solo', gender: 'any' },
  { text: "Quelle est la personne la plus vieille que tu t'es faite ?", type: 'solo', gender: 'any' },
  { text: "Combien de personnes as-tu embrassé ?", type: 'solo', gender: 'any' },
  { text: "As-tu déjà eu un orgasme ?", type: 'solo', gender: 'any' },
  { text: "Combien de fois tu te branles par semaine ?", type: 'solo', gender: 'any' },
  { text: "Est-ce que tu te doigtes toute seule ?", type: 'solo', gender: 'F' },
  { text: "As-tu déjà eu un rapport anal ?", type: 'solo', gender: 'any' },
];

// ============================================================
// DARES (Action)
// type: 'solo' | 'duo' (needs {X} opposite gender, double validation)
// ============================================================
const dares = [
  { text: "Embrasse {X} sur la joue", type: 'duo' },
  { text: "Lèche le lobe de l'oreille de {X}", type: 'duo' },
  { text: "Fais un massage à {X} pendant les 2 prochaines questions", type: 'duo' },
  { text: "Refais la scène de Dirty Dancing avec {X}", type: 'duo' },
  { text: "Envoie une gifle à {X}", type: 'duo' },
  { text: "{X} te smack", type: 'duo' },
  { text: "Ziar pendant au moins 5 secondes {X}", type: 'duo' },
  { text: "{X} te met une fessée", type: 'duo' },
  { text: "Assieds-toi sur {X} pendant les deux prochaines questions", type: 'duo' },
  { text: "Suce le doigt de {X}", type: 'duo' },
  { text: "Fais une danse hyper gênante pendant 15 secondes", type: 'solo' },
  { text: "{X} te fait un suçon", type: 'duo' },
  { text: "Embrasse {X} dans le cou pendant 10 secondes", type: 'duo' },
  { text: "Dis une chose excitante dans l'oreille de {X}", type: 'duo' },
  { text: "Croque l'orteil de {X} (sans chaussette)", type: 'duo' },
  { text: "Juge l'odeur corporelle de {X}", type: 'duo' },
  { text: "Fais la poule pendant 10 secondes", type: 'solo' },
  { text: "Ferme les yeux et laisse-toi te faire embrasser quelque part par {X} (sois hot !!!)", type: 'duo' },
  { text: "Enlève ton pantalon pendant 3 tours", type: 'solo' },
  { text: "Fais un massage crânien à {X} pendant 3 questions", type: 'duo' },
  { text: "Imite une scène X avec {X}", type: 'duo' },
  { text: "Chante une chanson pendant 30 secondes", type: 'solo' },
  { text: "Choisis une personne du sexe opposé et fais-lui un bisou sur chaque joue", type: 'solo' },
  { text: "Lèche la jambe de {X}", type: 'duo' },
  { text: "Envoie ta puff à {X} pendant 3 questions", type: 'duo' },
  { text: "Lèche la joue de {X}", type: 'duo' },
];

// --- Helper functions ---
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (rooms[code]) return generateRoomCode();
  return code;
}

function createRoom(hostSocketId, hostName, hostGender) {
  const code = generateRoomCode();
  rooms[code] = {
    code,
    hostId: hostSocketId,
    phase: 'lobby',
    players: [{
      id: hostSocketId,
      name: hostName,
      gender: hostGender,
      setupDone: false
    }],
    secrets: {},
    usedQuestions: [],
    usedDares: [],
    currentTurn: null,
    currentChallenge: null,
    currentPartner: null, // for duo dares
    challengeTimer: null,
    turnOrder: [],
    turnIndex: 0,
    revealedSecrets: []
  };
  return rooms[code];
}

function getRoom(code) {
  return rooms[code] || null;
}

function getPlayerNames(room) {
  return room.players.map(p => ({ name: p.name, gender: p.gender }));
}

function getOppositeGender(gender) {
  return gender === 'M' ? 'F' : 'M';
}

function getPlayersOfGender(room, gender) {
  return room.players.filter(p => p.gender === gender);
}

function getRandomPlayerOfGender(room, gender, excludeNames = []) {
  const candidates = room.players.filter(p => p.gender === gender && !excludeNames.includes(p.name));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getRandomPlayer(room, excludeNames = []) {
  const candidates = room.players.filter(p => !excludeNames.includes(p.name));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickQuestion(room, currentPlayer) {
  const validQuestions = questions.filter(q => {
    if (room.usedQuestions.includes(q.text)) return false;
    if (q.gender !== 'any' && q.gender !== currentPlayer.gender) return false;
    // Check if we can fill placeholders
    if (q.type === 'choice' && q.oppositeX) {
      const opposite = getPlayersOfGender(room, getOppositeGender(currentPlayer.gender));
      if (opposite.length < 2) return false;
    }
    if (q.type === 'choice' && !q.oppositeX) {
      const others = room.players.filter(p => p.name !== currentPlayer.name);
      if (others.length < 2) return false;
    }
    if (q.type === 'targeted' && q.oppositeX) {
      const opposite = getPlayersOfGender(room, getOppositeGender(currentPlayer.gender));
      if (opposite.length < 1) return false;
    }
    if (q.type === 'targeted' && !q.oppositeX) {
      const others = room.players.filter(p => p.name !== currentPlayer.name);
      if (others.length < 1) return false;
    }
    if (q.type === 'reveal') {
      const others = room.players.filter(p => p.name !== currentPlayer.name);
      if (others.length < 1) return false;
    }
    return true;
  });

  if (validQuestions.length === 0) {
    room.usedQuestions = [];
    return pickQuestion(room, currentPlayer);
  }

  const q = validQuestions[Math.floor(Math.random() * validQuestions.length)];
  room.usedQuestions.push(q.text);

  // Fill placeholders
  let finalText = q.text;
  if (q.type === 'choice') {
    if (q.oppositeX) {
      const pool = getPlayersOfGender(room, getOppositeGender(currentPlayer.gender));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      finalText = finalText.replace('{X1}', shuffled[0].name).replace('{X2}', shuffled[1].name);
    } else {
      const pool = room.players.filter(p => p.name !== currentPlayer.name);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      finalText = finalText.replace('{X1}', shuffled[0].name).replace('{X2}', shuffled[1].name);
    }
  } else if (q.type === 'targeted') {
    if (q.oppositeX) {
      const target = getRandomPlayerOfGender(room, getOppositeGender(currentPlayer.gender));
      finalText = finalText.replace('{X}', target.name);
    } else {
      const target = getRandomPlayer(room, [currentPlayer.name]);
      finalText = finalText.replace('{X}', target.name);
    }
  } else if (q.type === 'reveal') {
    const revealer = getRandomPlayer(room, [currentPlayer.name]);
    finalText = finalText.replace('{Y}', revealer.name);
  }

  return { challengeType: 'question', text: finalText, dareType: 'solo', partnerName: null };
}

function pickDare(room, currentPlayer) {
  const validDares = dares.filter(d => {
    if (room.usedDares.includes(d.text)) return false;
    if (d.type === 'duo') {
      const opposite = getPlayersOfGender(room, getOppositeGender(currentPlayer.gender));
      if (opposite.length < 1) return false;
    }
    return true;
  });

  if (validDares.length === 0) {
    room.usedDares = [];
    return pickDare(room, currentPlayer);
  }

  const d = validDares[Math.floor(Math.random() * validDares.length)];
  room.usedDares.push(d.text);

  let finalText = d.text;
  let partnerName = null;

  if (d.type === 'duo') {
    const partner = getRandomPlayerOfGender(room, getOppositeGender(currentPlayer.gender));
    partnerName = partner.name;
    finalText = finalText.replace(/\{X\}/g, partner.name);
  }

  return { challengeType: 'dare', text: finalText, dareType: d.type, partnerName };
}

function getRandomChallenge(room, currentPlayer) {
  const isQuestion = Math.random() > 0.5;
  if (isQuestion) {
    return pickQuestion(room, currentPlayer);
  } else {
    return pickDare(room, currentPlayer);
  }
}

function getSecretForPlayer(room, playerName) {
  const secrets = room.secrets[playerName];
  if (!secrets || secrets.length === 0) return null;
  const unrevealed = secrets.filter(s =>
    !room.revealedSecrets.find(r => r.content === s.content && r.target === playerName)
  );
  if (unrevealed.length === 0) return null;
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}

function clearTimer(room) {
  if (room.challengeTimer) {
    clearTimeout(room.challengeTimer);
    room.challengeTimer = null;
  }
}

function nextTurn(room) {
  room.turnIndex = (room.turnIndex + 1) % room.turnOrder.length;
  room.currentTurn = null;
  room.currentChallenge = null;
  room.currentPartner = null;
  clearTimer(room);

  io.to(room.code).emit('start-spin', {
    players: getPlayerNames(room)
  });
}

function revealSecretOf(room, playerName) {
  const secret = getSecretForPlayer(room, playerName);
  if (secret) {
    room.revealedSecrets.push({ ...secret, target: playerName });
    io.to(room.code).emit('secret-revealed', {
      playerName,
      secret
    });
    setTimeout(() => nextTurn(room), 8000);
  } else {
    io.to(room.code).emit('challenge-timeout', { playerName });
    setTimeout(() => nextTurn(room), 4000);
  }
}

function startGame(room) {
  room.phase = 'game';
  room.turnOrder = [...room.players].sort(() => Math.random() - 0.5);
  room.turnIndex = 0;
  io.to(room.code).emit('phase-change', { phase: 'game' });
  setTimeout(() => {
    io.to(room.code).emit('start-spin', {
      players: getPlayerNames(room)
    });
  }, 1500);
}

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create-room', (data, callback) => {
    const { playerName, gender } = data;
    const room = createRoom(socket.id, playerName, gender);
    socket.join(room.code);
    callback({ success: true, roomCode: room.code, players: getPlayerNames(room) });
  });

  socket.on('join-room', (data, callback) => {
    const { roomCode, playerName, gender } = data;
    const room = getRoom(roomCode.toUpperCase());

    if (!room) return callback({ success: false, error: "Cette room n'existe pas." });
    if (room.phase !== 'lobby') return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return callback({ success: false, error: "Ce prénom est déjà pris." });
    }
    if (room.players.length >= 12) return callback({ success: false, error: "La room est pleine (max 12)." });

    room.players.push({ id: socket.id, name: playerName, gender, setupDone: false });
    socket.join(room.code);
    callback({ success: true, roomCode: room.code, players: getPlayerNames(room) });
    io.to(room.code).emit('player-joined', { players: getPlayerNames(room) });
  });

  socket.on('start-setup', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length < 2) return;

    room.phase = 'setup';
    io.to(room.code).emit('phase-change', {
      phase: 'setup',
      players: getPlayerNames(room)
    });
  });

  socket.on('submit-secret', (data, callback) => {
    const { roomCode, targetPlayer, secrets: playerSecrets } = data;
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return callback({ success: false });

    if (!room.secrets[targetPlayer]) room.secrets[targetPlayer] = [];

    playerSecrets.forEach(secret => {
      room.secrets[targetPlayer].push({
        type: secret.type,
        content: secret.content,
        submittedBy: player.name
      });
    });

    player.setupDone = true;
    callback({ success: true });

    const allDone = room.players.every(p => p.setupDone);
    io.to(room.code).emit('setup-progress', {
      done: room.players.filter(p => p.setupDone).length,
      total: room.players.length
    });

    if (allDone) {
      startGame(room);
    }
  });

  socket.on('force-start-game', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (room.phase !== 'setup') return;
    if (room.players.filter(p => p.setupDone).length < 1) return;
    startGame(room);
  });

  // Roulette result - only process ONCE per turn (ignore duplicates from other players)
  socket.on('request-spin-result', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'game') return;

    // CRITICAL: Only process if we haven't already set up this turn
    if (room.currentChallenge) return;

    const currentPlayer = room.turnOrder[room.turnIndex];
    room.currentTurn = currentPlayer;

    const challenge = getRandomChallenge(room, currentPlayer);
    room.currentChallenge = challenge;
    room.currentPartner = challenge.partnerName;

    const hasSecret = getSecretForPlayer(room, currentPlayer.name) !== null;

    io.to(room.code).emit('spin-result', {
      playerName: currentPlayer.name,
      challenge,
      canRefuse: hasSecret,
      timerSeconds: 25
    });

    // Track which phase we're in: 'player1' or 'partner'
    room.challengePhase = 'player1';

    // Auto-refuse after 25s
    room.challengeTimer = setTimeout(() => {
      if (room.currentChallenge && room.currentTurn && room.challengePhase === 'player1') {
        revealSecretOf(room, currentPlayer.name);
      }
    }, 25000);
  });

  // Player 1 accepts
  socket.on('accept-challenge', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || !room.currentTurn || room.challengePhase !== 'player1') return;
    clearTimer(room);

    const challenge = room.currentChallenge;

    // If it's a duo dare, now ask partner
    if (challenge.challengeType === 'dare' && challenge.dareType === 'duo' && challenge.partnerName) {
      room.challengePhase = 'partner';
      const partner = room.players.find(p => p.name === challenge.partnerName);
      const hasPartnerSecret = getSecretForPlayer(room, partner.name) !== null;

      io.to(room.code).emit('waiting-for-partner', {
        playerName: room.currentTurn.name,
        partnerName: challenge.partnerName,
        challenge,
        canRefuse: hasPartnerSecret,
        timerSeconds: 25
      });

      // NEW timer for partner - 25 fresh seconds
      room.challengeTimer = setTimeout(() => {
        if (room.currentChallenge && room.currentPartner && room.challengePhase === 'partner') {
          revealSecretOf(room, challenge.partnerName);
        }
      }, 25000);

    } else {
      // Solo challenge accepted - wait for host to click "next"
      room.challengePhase = 'done';
      io.to(room.code).emit('challenge-accepted', {
        playerName: room.currentTurn.name,
        challenge
      });
    }
  });

  // Partner accepts the duo dare
  socket.on('partner-accept', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || !room.currentTurn || room.challengePhase !== 'partner') return;
    clearTimer(room);
    room.challengePhase = 'done';

    io.to(room.code).emit('challenge-accepted', {
      playerName: room.currentTurn.name,
      partnerName: room.currentPartner,
      challenge: room.currentChallenge
    });
  });

  // Partner refuses the duo dare -> partner's secret revealed
  socket.on('partner-refuse', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || !room.currentPartner || room.challengePhase !== 'partner') return;
    clearTimer(room);
    room.challengePhase = 'done';
    revealSecretOf(room, room.currentPartner);
  });

  // Player 1 refuses
  socket.on('refuse-challenge', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || !room.currentTurn || room.challengePhase !== 'player1') return;
    clearTimer(room);
    room.challengePhase = 'done';
    revealSecretOf(room, room.currentTurn.name);
  });

  socket.on('next-turn', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    nextTurn(room);
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        if (room.phase === 'lobby') {
          room.players.splice(playerIndex, 1);
          io.to(room.code).emit('player-joined', { players: getPlayerNames(room) });
          if (socket.id === room.hostId) {
            io.to(room.code).emit('room-closed');
            delete rooms[code];
          }
        } else {
          io.to(room.code).emit('player-disconnected', { playerName: player.name });
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Shame Game running on port ${PORT}`);
});
