import * as THREE from 'three';

// Safe Audio Initializer
let audioCtx = null;
function initAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}

function playGunshot() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

function playHitSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
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

// Scene setup with fallback dimensions
const width = window.innerWidth || 800;
const height = window.innerHeight || 450;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const container = document.getElementById('canvas-container');
container.innerHTML = '';
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(40, 60, 30);
scene.add(dirLight);

// Ground Plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshLambertMaterial({ color: 0x3d7e35 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Obstacles
const obstacles = [];
const obstacleBoxes = [];

function buildObstacles() {
  obstacles.forEach(o => scene.remove(o));
  obstacles.length = 0;
  obstacleBoxes.length = 0;

  for (let i = 0; i < 28; i++) {
    const isBuilding = Math.random() > 0.45;
    const w = isBuilding ? 6 : 2;
    const h = isBuilding ? 8 : 5;
    const d = isBuilding ? 6 : 2;
    const mesh = new THREE.Mesh(
      isBuilding ? new THREE.BoxGeometry(w, h, d) : new THREE.CylinderGeometry(1, 1.3, h, 8),
      new THREE.MeshLambertMaterial({ color: isBuilding ? 0x777777 : 0x5a3d28 })
    );
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    if (Math.hypot(x, z) < 20) continue;

    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    obstacles.push(mesh);

    const box = new THREE.Box3();
    box.setFromCenterAndSize(mesh.position, new THREE.Vector3(w + 1.2, h, d + 1.2));
    obstacleBoxes.push(box);
  }
}

// 3D Health Bar
function createHealthBar(colorHex) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
  );
  group.add(bg);

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.16),
    new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
  );
  fill.position.z = 0.01;
  group.add(fill);

  group.position.y = 3.4;
  return { group, fill };
}

// Humanoid Character Builder
function createHumanoidModel(teamColorHex) {
  const root = new THREE.Group();
  const suitMat = new THREE.MeshLambertMaterial({ color: teamColorHex });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.5), suitMat);
  torso.position.y = 1.6;
  root.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 2.45;
  root.add(head);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.55), darkMat);
  helmet.position.y = 2.7;
  root.add(helmet);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
  const leftLeg = new THREE.Mesh(legGeo, darkMat);
  leftLeg.position.set(-0.25, 0.5, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, darkMat);
  rightLeg.position.set(0.25, 0.5, 0);
  root.add(rightLeg);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.set(-0.65, 1.6, 0.1);
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.set(0.65, 1.6, 0.3);
  rightArm.rotation.x = -Math.PI / 2.3;
  root.add(rightArm);

  // Rifle
  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 1.1), darkMat);
  rifle.position.set(0.45, 1.45, -0.4);
  root.add(rifle);

  return root;
}

let cameraYaw = 0;
let cameraPitch = 0;
const PITCH_LIMIT = 0.85;

// Player
const playerModel = createHumanoidModel(0x2563eb);
const playerBar = createHealthBar(0x38bdf8);
playerModel.add(playerBar.group);
scene.add(playerModel);

const player = {
  mesh: playerModel,
  hp: 100,
  maxHp: 100,
  speed: 0.35,
  isAlive: true,
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
  model.add(bar.group);

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
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 6, 6),
    new THREE.MeshBasicMaterial({ color: isPlayerOrAlly ? 0x93c5fd : 0xfca5a5 })
  );
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
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

function updateRadar() {
  if (!radarCtx) return;
  radarCtx.clearRect(0, 0, 100, 100);

  const cx = 50;
  const cz = 50;
  const radarScale = 0.5;

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
  const lvl = document.getElementById('level-display');
  const hp = document.getElementById('hp-display');
  const team = document.getElementById('team-display');
  if (lvl) lvl.innerText = `Level: ${currentLevel}/${MAX_LEVELS}`;
  if (hp) hp.innerText = `Player HP: ${Math.max(0, Math.round(player.hp))}`;
  const aliveAllies = (player.isAlive ? 1 : 0) + allies.filter(a => a.isAlive).length;
  const aliveEnemies = enemies.filter(e => e.isAlive).length;
  if (team) team.innerText = `Blue: ${aliveAllies} | Red: ${aliveEnemies}`;
}

function showModal(title, desc, btnText, onAction) {
  const modal = document.getElementById('status-modal');
  if (!modal) return;
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
function animate() {
  requestAnimationFrame(animate);

  if (player.isAlive) {
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const moveVector = forward.multiplyScalar(-moveY).add(right.multiplyScalar(moveX)).multiplyScalar(player.speed);

    const nextPos = player.mesh.position.clone().add(moveVector);
    if (!collidesWithObstacle(nextPos)) {
      player.mesh.position.copy(nextPos);
    }

    player.mesh.rotation.y = cameraYaw;

    const camDist = 6;
    const camHeight = 3.2;
    camera.position.x = player.mesh.position.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.position.y = player.mesh.position.y + camHeight - Math.sin(cameraPitch) * camDist;
    camera.position.z = player.mesh.position.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.8, player.mesh.position.z);
  }

  // Health bars facing camera
  if (player.isAlive && player.healthBar) player.healthBar.group.quaternion.copy(camera.quaternion);
  allies.forEach(a => { if (a.isAlive && a.healthBar) a.healthBar.group.quaternion.copy(camera.quaternion); });
  enemies.forEach(e => { if (e.isAlive && e.healthBar) e.healthBar.group.quaternion.copy(camera.quaternion); });

  updateRadar();

  // AI Logic
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

  // Bullets
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

function handleResize() {
  const w = window.innerWidth || 800;
  const h = window.innerHeight || 450;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', handleResize);

buildObstacles();
spawnTeams();
animate();
