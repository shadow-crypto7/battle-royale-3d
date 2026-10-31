import * as THREE from 'three';

// Audio Synthesizer
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playGunshot() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

function playHitSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(140, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playWinSound() {
  if (!audioCtx) return;
  [260, 330, 390, 520].forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.12 + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + idx * 0.12);
    osc.stop(audioCtx.currentTime + idx * 0.12 + 0.25);
  });
}

function lockLandscape() {
  initAudio();
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
window.addEventListener('click', lockLandscape, { once: true });
window.addEventListener('touchstart', lockLandscape, { once: true });

let currentLevel = 1;
const MAX_LEVELS = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(50, 80, 40);
dirLight.castShadow = true;
scene.add(dirLight);

// Ground
const groundGeo = new THREE.PlaneGeometry(300, 300);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d7e35 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Obstacles
const obstacles = [];
const obstacleBoxes = [];

function buildObstacles() {
  obstacles.forEach(o => scene.remove(o));
  obstacles.length = 0;
  obstacleBoxes.length = 0;

  for (let i = 0; i < 30; i++) {
    const isBuilding = Math.random() > 0.4;
    const width = isBuilding ? 6 : 2;
    const height = isBuilding ? 10 : 6;
    const depth = isBuilding ? 6 : 2;
    const mesh = new THREE.Mesh(
      isBuilding ? new THREE.BoxGeometry(width, height, depth) : new THREE.CylinderGeometry(1, 1.4, height, 8),
      new THREE.MeshLambertMaterial({ color: isBuilding ? 0x777777 : 0x5a3d28 })
    );
    const x = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    if (Math.hypot(x, z) < 22) continue;

    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);

    const box = new THREE.Box3();
    box.setFromCenterAndSize(mesh.position, new THREE.Vector3(width + 1.2, height, depth + 1.2));
    obstacleBoxes.push(box);
  }
}

// 3D Health Bar
function createHealthBar(colorHex) {
  const container = new THREE.Group();
  const bgGeo = new THREE.PlaneGeometry(1.8, 0.22);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  container.add(bg);

  const fillGeo = new THREE.PlaneGeometry(1.7, 0.16);
  const fillMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.z = 0.01;
  container.add(fill);

  container.position.y = 3.6;
  return { container, fill };
}

// Humanoid Character Builder (Head, Torso, Arms, Legs & Gun)
function createHumanoidModel(teamColorHex) {
  const root = new THREE.Group();
  const suitMat = new THREE.MeshLambertMaterial({ color: teamColorHex });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x262626 });
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.5), suitMat);
  torso.position.y = 1.6;
  torso.castShadow = true;
  root.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skinMat);
  head.position.y = 2.5;
  head.castShadow = true;
  root.add(head);

  // Helmet / Hair cap
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), darkMat);
  helmet.position.y = 2.75;
  root.add(helmet);

  // Left & Right Legs
  const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
  const leftLeg = new THREE.Mesh(legGeo, darkMat);
  leftLeg.position.set(-0.25, 0.5, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, darkMat);
  rightLeg.position.set(0.25, 0.5, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  // Left Arm
  const armGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.set(-0.68, 1.6, 0.2);
  leftArm.rotation.x = -Math.PI / 4;
  leftArm.castShadow = true;
  root.add(leftArm);

  // Right Arm (Aiming Forward)
  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.set(0.68, 1.6, 0.35);
  rightArm.rotation.x = -Math.PI / 2.2;
  rightArm.castShadow = true;
  root.add(rightArm);

  // Assault Rifle (Gun)
  const gunGroup = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 1.1), gunMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -0.65);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.2), darkMat);
  mag.position.set(0, -0.15, -0.1);

  gunGroup.add(gunBody);
  gunGroup.add(barrel);
  gunGroup.add(mag);
  gunGroup.position.set(0.45, 1.45, -0.5);
  root.add(gunGroup);

  return root;
}

let cameraYaw = 0;
let cameraPitch = 0;
const PITCH_LIMIT = 0.85;

// Player
const playerModel = createHumanoidModel(0x2563eb);
const playerBar = createHealthBar(0x38bdf8);
playerModel.add(playerBar.container);
scene.add(playerModel);

const player = {
  mesh: playerModel,
  hp: 100,
  maxHp: 100,
  speed: 0.35,
  isAlive: true,
  isAlly: true,
  healthBar: playerBar
};

let allies = [];
let enemies = [];
let bullets = [];

function createAgent(isAlly, x, z) {
  const model = createHumanoidModel(isAlly ? 0x3b82f6 : 0xdc2626);
  model.position.set(x, 0, z);
  scene.add(model);

  const bar = createHealthBar(isAlly ? 0x38bdf8 : 0xef4444);
  model.add(bar.container);

  const hp = 80 + currentLevel * 10;
  return {
    mesh: model,
    hp,
    maxHp: hp,
    isAlly,
    isAlive: true,
    lastShot: Date.now() + Math.random() * 2000,
    healthBar: bar
  };
}

function spawnTeams() {
  allies.forEach(a => scene.remove(a.mesh));
  enemies.forEach(e => scene.remove(e.mesh));
  bullets.forEach(b => scene.remove(b.mesh));
  allies = [];
  enemies = [];
  bullets = [];

  player.mesh.position.set(0, 0, 35);
  player.mesh.rotation.y = 0;
  player.hp = 100;
  player.isAlive = true;
  player.healthBar.fill.scale.x = 1;

  for (let i = 0; i < 3; i++) {
    allies.push(createAgent(true, (i - 1) * 8, 42));
  }
  for (let i = 0; i < 4; i++) {
    enemies.push(createAgent(false, (i - 1.5) * 12, -35 - (currentLevel * 4)));
  }
  updateHUD();
}

function shoot(origin, direction, isPlayerOrAlly) {
  playGunshot();
  const bulletGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const bulletMat = new THREE.MeshBasicMaterial({ color: isPlayerOrAlly ? 0x93c5fd : 0xfca5a5 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(origin);
  scene.add(bullet);
  bullets.push({
    mesh: bullet,
    dir: direction.clone().normalize(),
    life: 60,
    isPlayerOrAlly
  });
}

function collidesWithObstacle(pos) {
  for (let i = 0; i < obstacleBoxes.length; i++) {
    if (obstacleBoxes[i].containsPoint(pos)) return true;
  }
  return false;
}

// Touch Handling
let moveTouchId = null;
let lookTouchId = null;
let moveX = 0, moveY = 0;
let lastLookX = 0, lastLookY = 0;

const moveZone = document.getElementById('move-zone');
const lookZone = document.getElementById('look-zone');
const joyBase = document.getElementById('joystick-base');
const joyThumb = document.getElementById('joystick-thumb');

moveZone.addEventListener('touchstart', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (moveTouchId === null) {
      moveTouchId = t.identifier;
      updateJoystick(t);
      break;
    }
  }
}, { passive: false });

moveZone.addEventListener('touchmove', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === moveTouchId) {
      updateJoystick(t);
      break;
    }
  }
}, { passive: false });

function clearMoveTouch(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === moveTouchId) {
      moveTouchId = null;
      moveX = 0;
      moveY = 0;
      joyThumb.style.transform = `translate(0px, 0px)`;
      break;
    }
  }
}
moveZone.addEventListener('touchend', clearMoveTouch);
moveZone.addEventListener('touchcancel', clearMoveTouch);

function updateJoystick(touch) {
  const rect = joyBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = touch.clientX - centerX;
  const dy = touch.clientY - centerY;
  const dist = Math.min(Math.hypot(dx, dy), 40);
  const angle = Math.atan2(dy, dx);

  moveX = (Math.cos(angle) * dist) / 40;
  moveY = (Math.sin(angle) * dist) / 40;
  joyThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
}

lookZone.addEventListener('touchstart', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target.id !== 'fire-btn' && lookTouchId === null) {
      lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
      break;
    }
  }
}, { passive: false });

lookZone.addEventListener('touchmove', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === lookTouchId) {
      const deltaX = t.clientX - lastLookX;
      const deltaY = t.clientY - lastLookY;
      lastLookX = t.clientX;
      lastLookY = t.clientY;

      cameraYaw -= deltaX * 0.006;
      cameraPitch -= deltaY * 0.006;
      cameraPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cameraPitch));
      break;
    }
  }
}, { passive: false });

function clearLookTouch(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === lookTouchId) {
      lookTouchId = null;
      break;
    }
  }
}
lookZone.addEventListener('touchend', clearLookTouch);
lookZone.addEventListener('touchcancel', clearLookTouch);

// Fire Button (Positioned at Gun Tip)
const fireBtn = document.getElementById('fire-btn');
fireBtn.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  if (!player.isAlive) return;

  const aimDir = new THREE.Vector3(
    -Math.sin(cameraYaw) * Math.cos(cameraPitch),
    Math.sin(cameraPitch),
    -Math.cos(cameraYaw) * Math.cos(cameraPitch)
  ).normalize();

  const spawnPos = player.mesh.position.clone().add(new THREE.Vector3(0, 1.45, 0)).add(aimDir.clone().multiplyScalar(1.5));
  shoot(spawnPos, aimDir, true);
}, { passive: false });

// Mini-map Radar
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');

function updateRadar() {
  radarCtx.clearRect(0, 0, 100, 100);

  const cx = 50;
  const cz = 50;
  const radarScale = 0.55;

  radarCtx.fillStyle = '#00ff88';
  radarCtx.beginPath();
  radarCtx.arc(cx, cz, 4, 0, Math.PI * 2);
  radarCtx.fill();

  radarCtx.fillStyle = '#60a5fa';
  allies.forEach(a => {
    if (!a.isAlive) return;
    const dx = (a.mesh.position.x - player.mesh.position.x) * radarScale;
    const dz = (a.mesh.position.z - player.mesh.position.z) * radarScale;
    if (Math.hypot(dx, dz) < 45) {
      radarCtx.beginPath();
      radarCtx.arc(cx + dx, cz + dz, 3, 0, Math.PI * 2);
      radarCtx.fill();
    }
  });

  radarCtx.fillStyle = '#ef4444';
  enemies.forEach(e => {
    if (!e.isAlive) return;
    const dx = (e.mesh.position.x - player.mesh.position.x) * radarScale;
    const dz = (e.mesh.position.z - player.mesh.position.z) * radarScale;
    if (Math.hypot(dx, dz) < 45) {
      radarCtx.beginPath();
      radarCtx.arc(cx + dx, cz + dz, 3, 0, Math.PI * 2);
      radarCtx.fill();
    }
  });
}

function updateHUD() {
  document.getElementById('level-display').innerText = `Level: ${currentLevel}/${MAX_LEVELS}`;
  document.getElementById('hp-display').innerText = `Player HP: ${Math.max(0, Math.round(player.hp))}`;
  const aliveAllies = (player.isAlive ? 1 : 0) + allies.filter(a => a.isAlive).length;
  const aliveEnemies = enemies.filter(e => e.isAlive).length;
  document.getElementById('team-display').innerText = `Blue: ${aliveAllies} | Red: ${aliveEnemies}`;
}

function showModal(title, desc, btnText, onAction) {
  const modal = document.getElementById('status-modal');
  document.getElementById('status-title').innerText = title;
  document.getElementById('status-desc').innerText = desc;
  const btn = document.getElementById('status-btn');
  btn.innerText = btnText;
  btn.onclick = () => {
    modal.style.display = 'none';
    onAction();
  };
  modal.style.display = 'flex';
}

function checkMatchState() {
  const aliveEnemies = enemies.filter(e => e.isAlive).length;
  const aliveBlues = (player.isAlive ? 1 : 0) + allies.filter(a => a.isAlive).length;

  if (aliveEnemies === 0) {
    playWinSound();
    if (currentLevel < MAX_LEVELS) {
      showModal(`Level ${currentLevel} Cleared!`, 'Squad wiped the enemy team.', `Start Level ${currentLevel + 1}`, () => {
        currentLevel++;
        buildObstacles();
        spawnTeams();
      });
    } else {
      showModal('VICTORY ROYALE!', 'You conquered all 5 levels!', 'Play Again', () => {
        currentLevel = 1;
        buildObstacles();
        spawnTeams();
      });
    }
  } else if (aliveBlues === 0) {
    showModal('Squad Eliminated', `Defeated in Level ${currentLevel}.`, 'Retry Level', () => {
      spawnTeams();
    });
  }
}

// Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (player.isAlive) {
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const moveVector = forward.multiplyScalar(-moveY).add(right.multiplyScalar(moveX)).multiplyScalar(player.speed);

    const nextPos = player.mesh.position.clone().add(moveVector);
    if (!collidesWithObstacle(nextPos)) {
      player.mesh.position.copy(nextPos);
    }

    // Rotate player mesh toward camera direction
    player.mesh.rotation.y = cameraYaw;

    const camDist = 6;
    const camHeight = 3.2;
    camera.position.x = player.mesh.position.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.position.y = player.mesh.position.y + camHeight - Math.sin(cameraPitch) * camDist;
    camera.position.z = player.mesh.position.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.8, player.mesh.position.z);
  }

  // Billboard health bars
  if (player.isAlive) player.healthBar.container.quaternion.copy(camera.quaternion);
  allies.forEach(a => { if (a.isAlive) a.healthBar.container.quaternion.copy(camera.quaternion); });
  enemies.forEach(e => { if (e.isAlive) e.healthBar.container.quaternion.copy(camera.quaternion); });

  updateRadar();

  // AI Behavior
  const now = Date.now();
  const allAgents = [...allies, ...enemies];

  allAgents.forEach(agent => {
    if (!agent.isAlive) return;

    const targets = agent.isAlly ? enemies.filter(e => e.isAlive) : [player, ...allies].filter(b => b.isAlive);
    if (targets.length === 0) return;

    let nearest = targets[0];
    let minDist = 9999;
    targets.forEach(t => {
      const d = agent.mesh.position.distanceTo(t.mesh.position);
      if (d < minDist) { minDist = d; nearest = t; }
    });

    const dir = new THREE.Vector3().subVectors(nearest.mesh.position, agent.mesh.position).normalize();

    // Look at target
    agent.mesh.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;

    if (minDist > 14) {
      const step = dir.clone().multiplyScalar(0.09 + currentLevel * 0.015);
      const nextAgentPos = agent.mesh.position.clone().add(step);
      if (!collidesWithObstacle(nextAgentPos)) {
        agent.mesh.position.copy(nextAgentPos);
      }
    }

    if (now - agent.lastShot > 1700 - (currentLevel * 100)) {
      agent.lastShot = now;
      shoot(
        agent.mesh.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
        dir.add(new THREE.Vector3((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12)),
        agent.isAlly
      );
    }
  });

  // Bullet Updates
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.add(b.dir.clone().multiplyScalar(1.3));
    b.life--;

    let hit = false;

    if (collidesWithObstacle(b.mesh.position)) {
      hit = true;
    }

    if (!hit) {
      if (b.isPlayerOrAlly) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.isAlive && b.mesh.position.distanceTo(e.mesh.position) < 2.0) {
            e.hp -= 40;
            playHitSound();
            e.healthBar.fill.scale.x = Math.max(0.01, e.hp / e.maxHp);
            hit = true;
            if (e.hp <= 0) {
              e.isAlive = false;
              scene.remove(e.mesh);
              checkMatchState();
            }
            updateHUD();
            break;
          }
        }
      } else {
        if (player.isAlive && b.mesh.position.distanceTo(player.mesh.position) < 2.0) {
          player.hp -= 15 + currentLevel * 2;
          playHitSound();
          player.healthBar.fill.scale.x = Math.max(0.01, player.hp / player.maxHp);
          hit = true;
          if (player.hp <= 0) {
            player.isAlive = false;
            checkMatchState();
          }
          updateHUD();
        }
        if (!hit) {
          for (let k = 0; k < allies.length; k++) {
            const a = allies[k];
            if (a.isAlive && b.mesh.position.distanceTo(a.mesh.position) < 2.0) {
              a.hp -= 25;
              playHitSound();
              a.healthBar.fill.scale.x = Math.max(0.01, a.hp / a.maxHp);
              hit = true;
              if (a.hp <= 0) {
                a.isAlive = false;
                scene.remove(a.mesh);
                checkMatchState();
              }
              updateHUD();
              break;
            }
          }
        }
      }
    }

    if (hit || b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

buildObstacles();
spawnTeams();
animate();
