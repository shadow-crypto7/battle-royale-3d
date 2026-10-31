import * as THREE from 'three';

let currentLevel = 1;
const MAX_LEVELS = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

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
function buildObstacles() {
  obstacles.forEach(o => scene.remove(o));
  obstacles.length = 0;
  for (let i = 0; i < 35; i++) {
    const isBuilding = Math.random() > 0.4;
    const mesh = new THREE.Mesh(
      isBuilding ? new THREE.BoxGeometry(6, 10, 6) : new THREE.CylinderGeometry(1.2, 1.6, 6, 8),
      new THREE.MeshLambertMaterial({ color: isBuilding ? 0x888888 : 0x5a3d28 })
    );
    const x = (Math.random() - 0.5) * 220;
    const z = (Math.random() - 0.5) * 220;
    if (Math.hypot(x, z) < 18) continue;
    mesh.position.set(x, isBuilding ? 5 : 3, z);
    mesh.castShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);
  }
}

// Camera Angles (Left/Right yaw & Up/Down pitch)
let cameraYaw = 0;
let cameraPitch = 0;
const PITCH_LIMIT = Math.PI / 2.5; // ~72 degrees vertical limit

const player = {
  mesh: new THREE.Group(),
  hp: 100,
  speed: 0.35,
  isAlive: true
};
const pBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.4), new THREE.MeshLambertMaterial({ color: 0x2563eb }));
pBody.position.y = 1.2;
pBody.castShadow = true;
player.mesh.add(pBody);
scene.add(player.mesh);

let allies = [];
let enemies = [];
let bullets = [];

function createAgent(isAlly, x, z) {
  const group = new THREE.Group();
  const color = isAlly ? 0x60a5fa : 0xef4444;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.4), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);
  group.position.set(x, 0, z);
  scene.add(group);
  return {
    mesh: group,
    hp: 70 + currentLevel * 10,
    isAlly,
    isAlive: true,
    lastShot: Date.now() + Math.random() * 2000
  };
}

function spawnTeams() {
  allies.forEach(a => scene.remove(a.mesh));
  enemies.forEach(e => scene.remove(e.mesh));
  allies = [];
  enemies = [];

  // Player reset
  player.mesh.position.set(0, 0, 40);
  player.hp = 100;
  player.isAlive = true;

  // 3 AI Allies (making 4 Blues total with player)
  for (let i = 0; i < 3; i++) {
    allies.push(createAgent(true, (i - 1) * 8, 48));
  }
  // 4 AI Enemies (Red Team)
  for (let i = 0; i < 4; i++) {
    enemies.push(createAgent(false, (i - 1.5) * 12, -40 - (currentLevel * 4)));
  }
  updateHUD();
}

function shoot(origin, direction, isPlayerOrAlly) {
  const bulletGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const bulletMat = new THREE.MeshBasicMaterial({ color: isPlayerOrAlly ? 0x60a5fa : 0xf87171 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(origin);
  scene.add(bullet);
  bullets.push({
    mesh: bullet,
    dir: direction.clone().normalize(),
    life: 70,
    isPlayerOrAlly
  });
}

// Controls
let moveX = 0, moveY = 0;
let lastTouchX = 0, lastTouchY = 0;
let activeTouchId = null;

const lookZone = document.getElementById('look-zone');
const moveZone = document.getElementById('move-zone');
const joyBase = document.getElementById('joystick-base');
const joyThumb = document.getElementById('joystick-thumb');

moveZone.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  joyBase.style.display = 'block';
  joyBase.style.left = `${t.clientX - 55}px`;
  joyBase.style.top = `${t.clientY - 55}px`;
  joyThumb.style.transform = `translate(0px, 0px)`;
});

moveZone.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  const rect = joyBase.getBoundingClientRect();
  const dx = t.clientX - (rect.left + 55);
  const dy = t.clientY - (rect.top + 55);
  const dist = Math.min(Math.hypot(dx, dy), 40);
  const angle = Math.atan2(dy, dx);
  moveX = (Math.cos(angle) * dist) / 40;
  moveY = (Math.sin(angle) * dist) / 40;
  joyThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
});

function resetJoystick() {
  moveX = 0;
  moveY = 0;
  joyBase.style.display = 'none';
}
moveZone.addEventListener('touchend', resetJoystick);
moveZone.addEventListener('touchcancel', resetJoystick);

// Up / Down + Left / Right Camera Look
lookZone.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  if (e.target.id === 'fire-btn') return;
  activeTouchId = t.identifier;
  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
});

lookZone.addEventListener('touchmove', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === activeTouchId) {
      const deltaX = t.clientX - lastTouchX;
      const deltaY = t.clientY - lastTouchY;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;

      cameraYaw -= deltaX * 0.005;
      cameraPitch -= deltaY * 0.005; // Up/down pitch
      cameraPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cameraPitch));
    }
  }
});

function resetLookTouch(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === activeTouchId) {
      activeTouchId = null;
    }
  }
}
lookZone.addEventListener('touchend', resetLookTouch);
lookZone.addEventListener('touchcancel', resetLookTouch);

// Fire Button
document.getElementById('fire-btn').addEventListener('touchstart', (e) => {
  e.stopPropagation();
  if (!player.isAlive) return;
  const aimDir = new THREE.Vector3(
    -Math.sin(cameraYaw) * Math.cos(cameraPitch),
    Math.sin(cameraPitch),
    -Math.cos(cameraYaw) * Math.cos(cameraPitch)
  );
  shoot(new THREE.Vector3(player.mesh.position.x, 2, player.mesh.position.z), aimDir, true);
});

function updateHUD() {
  document.getElementById('level-display').innerText = `Level: ${currentLevel}/${MAX_LEVELS}`;
  document.getElementById('hp-display').innerText = `Player HP: ${Math.max(0, player.hp)}`;
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
    if (currentLevel < MAX_LEVELS) {
      showModal(`Level ${currentLevel} Cleared!`, 'Your 4v4 squad took the win.', `Start Level ${currentLevel + 1}`, () => {
        currentLevel++;
        buildObstacles();
        spawnTeams();
      });
    } else {
      showModal('VICTORY ROYALE!', 'You completed all 5 levels!', 'Restart Game', () => {
        currentLevel = 1;
        buildObstacles();
        spawnTeams();
      });
    }
  } else if (aliveBlues === 0) {
    showModal('Squad Eliminated', `You fell in Level ${currentLevel}.`, 'Retry Level', () => {
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
    // Movement relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const moveVector = forward.multiplyScalar(-moveY).add(right.multiplyScalar(moveX));
    player.mesh.position.add(moveVector.multiplyScalar(player.speed));

    // Update Camera position behind player with yaw & pitch
    const camDist = 6;
    const camHeight = 3.2;
    camera.position.x = player.mesh.position.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.position.y = player.mesh.position.y + camHeight - Math.sin(cameraPitch) * camDist;
    camera.position.z = player.mesh.position.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * camDist;
    camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.8, player.mesh.position.z);
  }

  // AI Allies & Enemies logic
  const now = Date.now();
  const allAgents = [...allies, ...enemies];

  allAgents.forEach(agent => {
    if (!agent.isAlive) return;

    // Target detection
    const targets = agent.isAlly ? enemies.filter(e => e.isAlive) : [player, ...allies].filter(b => b.isAlive);
    if (targets.length === 0) return;

    // Pick closest target
    let nearest = targets[0];
    let minDist = 9999;
    targets.forEach(t => {
      const d = agent.mesh.position.distanceTo(t.mesh.position);
      if (d < minDist) { minDist = d; nearest = t; }
    });

    // Move toward target
    const dir = new THREE.Vector3().subVectors(nearest.mesh.position, agent.mesh.position).normalize();
    if (minDist > 12) {
      agent.mesh.position.add(dir.clone().multiplyScalar(0.08 + currentLevel * 0.015));
    }

    // AI Shoot
    if (now - agent.lastShot > 1600 - (currentLevel * 100)) {
      agent.lastShot = now;
      shoot(
        new THREE.Vector3(agent.mesh.position.x, 1.8, agent.mesh.position.z),
        dir.add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15)),
        agent.isAlly
      );
    }
  });

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.add(b.dir.clone().multiplyScalar(1.2));
    b.life--;

    // Collision checking
    let hit = false;
    if (b.isPlayerOrAlly) {
      // Hit Enemies
      enemies.forEach(e => {
        if (e.isAlive && b.mesh.position.distanceTo(e.mesh.position) < 1.6) {
          e.hp -= 35;
          hit = true;
          if (e.hp <= 0) {
            e.isAlive = false;
            scene.remove(e.mesh);
            checkMatchState();
          }
          updateHUD();
        }
      });
    } else {
      // Hit Allies or Player
      if (player.isAlive && b.mesh.position.distanceTo(player.mesh.position) < 1.6) {
        player.hp -= 15 + currentLevel * 2;
        hit = true;
        if (player.hp <= 0) {
          player.isAlive = false;
          checkMatchState();
        }
        updateHUD();
      }
      allies.forEach(a => {
        if (a.isAlive && b.mesh.position.distanceTo(a.mesh.position) < 1.6) {
          a.hp -= 20;
          hit = true;
          if (a.hp <= 0) {
            a.isAlive = false;
            scene.remove(a.mesh);
            checkMatchState();
          }
          updateHUD();
        }
      });
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

// Start Match
buildObstacles();
spawnTeams();
animate();
