
import * as THREE from "three";

// ==========================================
// BATTLE ROYALE 3D - COMPLETE GAME ENGINE
// ==========================================

const container = document.getElementById("game");

if (!container) {
    throw new Error("Game container not found!");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 65, 190);

const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// ==========================================
// LIGHTING
// ==========================================

scene.add(
    new THREE.HemisphereLight(0xffffff, 0x526b36, 2)
);

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(40, 70, 30);
sunlight.castShadow = true;
scene.add(sunlight);

// ==========================================
// MATERIALS
// ==========================================

const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x477b35 }),
    player: new THREE.MeshStandardMaterial({ color: 0x2469dc }),
    skin: new THREE.MeshStandardMaterial({ color: 0xe7b58b }),
    dark: new THREE.MeshStandardMaterial({ color: 0x252a31 }),
    gun: new THREE.MeshStandardMaterial({ color: 0x30343b }),
    enemy: new THREE.MeshStandardMaterial({ color: 0xc62d24 }),
    tree: new THREE.MeshStandardMaterial({ color: 0x68452b }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x245d29 }),
    building: new THREE.MeshStandardMaterial({ color: 0xb9a58b }),
    roof: new THREE.MeshStandardMaterial({ color: 0x665044 })
};

// ==========================================
// GROUND
// ==========================================

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    materials.grass
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ==========================================
// ENVIRONMENT
// ==========================================

function createTree(x, z, scale = 1) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 3, 7),
        materials.tree
    );

    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4, 7),
        materials.leaves
    );

    leaves.position.y = 4;
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    scene.add(tree);
}

function createBuilding(x, z, w, d) {
    const building = new THREE.Group();

    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(w, 4, d),
        materials.building
    );

    walls.position.y = 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    building.add(walls);

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5),
        materials.roof
    );

    roof.position.y = 4.15;
    building.add(roof);

    building.position.set(x, 0, z);
    scene.add(building);
}

for (let i = 0; i < 75; i++) {
    const x = (Math.random() - 0.5) * 190;
    const z = (Math.random() - 0.5) * 190;

    if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;

    createTree(x, z, 0.7 + Math.random() * 0.6);
}

createBuilding(18, -15, 10, 9);
createBuilding(-23, -20, 12, 10);
createBuilding(28, 25, 13, 10);
createBuilding(-30, 25, 10, 12);

// ==========================================
// PLAYER
// ==========================================

const player = new THREE.Group();
scene.add(player);

const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.25, 0.55),
    materials.player
);

body.position.y = 1.35;
body.castShadow = true;
player.add(body);

const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12),
    materials.skin
);

head.position.y = 2.25;
head.castShadow = true;
player.add(head);

const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.85, 0.35),
    materials.dark
);

leftLeg.position.set(-0.24, 0.42, 0);
player.add(leftLeg);

const rightLeg = leftLeg.clone();
rightLeg.position.x = 0.24;
player.add(rightLeg);

const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.9, 0.3),
    materials.player
);

leftArm.position.set(-0.62, 1.4, -0.1);
player.add(leftArm);

const rightArm = leftArm.clone();
rightArm.position.x = 0.62;
player.add(rightArm);

// ==========================================
// GUN
// ==========================================

const gun = new THREE.Group();

const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 1.1),
    materials.gun
);

gunBody.position.z = -0.45;
gun.add(gunBody);

const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8),
    materials.dark
);

barrel.rotation.x = Math.PI / 2;
barrel.position.z = -1.1;
gun.add(barrel);

gun.position.set(0.55, 1.55, -0.45);
player.add(gun);

player.position.set(0, 0, 0);

// ==========================================
// ENEMIES
// ==========================================

const enemies = [];

function createEnemy(x, z) {
    const enemy = new THREE.Group();

    const enemyBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.3, 0.55),
        materials.enemy
    );

    enemyBody.position.y = 1.35;
    enemyBody.castShadow = true;
    enemy.add(enemyBody);

    const enemyHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 10),
        materials.skin
    );

    enemyHead.position.y = 2.25;
    enemy.add(enemyHead);

    const enemyLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.8, 0.3),
        materials.dark
    );

    enemyLeg.position.set(-0.23, 0.4, 0);
    enemy.add(enemyLeg);

    const secondLeg = enemyLeg.clone();
    secondLeg.position.x = 0.23;
    enemy.add(secondLeg);

    enemy.position.set(x, 0, z);

    enemy.userData.health = 100;
    enemy.userData.speed = 1 + Math.random() * 0.5;
    enemy.userData.alive = true;
    enemy.userData.attackTimer = 0;

    scene.add(enemy);
    enemies.push(enemy);
}

for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 25;

    createEnemy(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance
    );
}

// ==========================================
// GAME VARIABLES
// ==========================================

let started = false;
let gameOver = false;
let health = 100;
let yaw = 0;
let verticalVelocity = 0;
let grounded = true;
let moving = false;
let sprinting = false;
let aiming = false;
let firing = false;
let lastShot = 0;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const joystick = { x: 0, y: 0 };
const keyboardInput = { x: 0, y: 0 };

const healthFill = document.getElementById("healthFill");
const message = document.getElementById("message");
const playerCount = document.getElementById("players");

// ==========================================
// CAMERA
// ==========================================

function updateCamera() {
    const distance = aiming ? 3.2 : 6.5;
    const height = aiming ? 2.8 : 3.8;

    const offset = new THREE.Vector3(
        Math.sin(yaw) * distance,
        height,
        Math.cos(yaw) * distance
    );

    camera.position.copy(player.position).add(offset);

    const lookPoint = player.position.clone();
    lookPoint.y += aiming ? 1.65 : 1.5;

    lookPoint.x -= Math.sin(yaw) * 2;
    lookPoint.z -= Math.cos(yaw) * 2;

    camera.lookAt(lookPoint);
}

// ==========================================
// PLAYER MOVEMENT
// ==========================================

function movePlayer(delta) {
    const forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );

    const direction = new THREE.Vector3();

    direction.addScaledVector(
        forward,
        -joystick.y - keyboardInput.y
    );

    direction.addScaledVector(
        right,
        joystick.x + keyboardInput.x
    );

    moving = direction.lengthSq() > 0.01;

    if (moving) {
        direction.normalize();

        const speed = sprinting ? 11 : 6;

        player.position.addScaledVector(
            direction,
            speed * delta
        );

        player.rotation.y = Math.atan2(
            -direction.x,
            -direction.z
        );
    }

    player.position.x = THREE.MathUtils.clamp(
        player.position.x, -105, 105
    );

    player.position.z = THREE.MathUtils.clamp(
        player.position.z, -105, 105
    );

    verticalVelocity -= 18 * delta;
    player.position.y += verticalVelocity * delta;

    if (player.position.y <= 0) {
        player.position.y = 0;
        verticalVelocity = 0;
        grounded = true;
    }
}

// ==========================================
// SHOOTING
// ==========================================

let activeTracers = [];

function createTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        start,
        end
    ]);

    const material = new THREE.LineBasicMaterial({
        color: 0xffee77,
        transparent: true,
        opacity: 1
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    activeTracers.push({
        line,
        life: 0.09
    });
}

function shoot() {
    if (!started || gameOver) return;

    const now = performance.now();

    if (now - lastShot < 180) return;
    lastShot = now;

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );

    const targets = [];

    for (const enemy of enemies) {
        if (!enemy.userData.alive) continue;

        enemy.traverse(child => {
            if (child.isMesh) targets.push(child);
        });
    }

    const hits = raycaster.intersectObjects(targets, false);

    const start = gun.getWorldPosition(new THREE.Vector3());

    let end = start.clone().add(
        raycaster.ray.direction.clone().multiplyScalar(80)
    );

    if (hits.length > 0) {
        const hit = hits[0];
        end.copy(hit.point);

        let target = hit.object.parent;

        while (target && !enemies.includes(target)) {
            target = target.parent;
        }

        if (target && target.userData.alive) {
            target.userData.health -= 35;
            target.scale.setScalar(0.96);

            if (target.userData.health <= 0) {
                target.userData.alive = false;
                scene.remove(target);

                const remaining = enemies.filter(
                    e => e.userData.alive
                ).length;

                playerCount.textContent =
                    "ENEMIES: " + remaining;

                if (remaining === 0) {
                    gameOver = true;
                    message.textContent = "VICTORY!";
                }
            }
        }
    }

    createTracer(start, end);

    const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshBasicMaterial({
            color: 0xffbb33
        })
    );

    flash.position.copy(start);
    scene.add(flash);

    setTimeout(() => {
        scene.remove(flash);
        flash.geometry.dispose();
        flash.material.dispose();
    }, 65);
}

// ==========================================
// ENEMY AI
// ==========================================

function updateEnemies(delta) {
    for (const enemy of enemies) {
        if (!enemy.userData.alive) continue;

        const difference = new THREE.Vector3(
            player.position.x - enemy.position.x,
            0,
            player.position.z - enemy.position.z
        );

        const distance = difference.length();

        if (distance > 2.2) {
            difference.normalize();

            enemy.position.addScaledVector(
                difference,
                enemy.userData.speed * delta
            );

            enemy.rotation.y = Math.atan2(
                -difference.x,
                -difference.z
            );
        } else {
            enemy.userData.attackTimer += delta;

            if (enemy.userData.attackTimer > 1.5) {
                enemy.userData.attackTimer = 0;

                health = Math.max(0, health - 5);
                healthFill.style.width = health + "%";

                if (health <= 0) {
                    gameOver = true;
                    message.textContent = "GAME OVER";
                }
            }
        }
    }
}

// ==========================================
// TRACER ANIMATION
// ==========================================

function updateTracers(delta) {
    for (let i = activeTracers.length - 1; i >= 0; i--) {
        const tracer = activeTracers[i];

        tracer.life -= delta;

        tracer.line.material.opacity =
            Math.max(0, tracer.life / 0.09);

        if (tracer.life <= 0) {
            scene.remove(tracer.line);
            tracer.line.geometry.dispose();
            tracer.line.material.dispose();

            activeTracers.splice(i, 1);
        }
    }
}

// ==========================================
// JOYSTICK
// ==========================================

const joystickElement = document.getElementById("joystick");
const stick = document.getElementById("stick");

let joystickPointer = null;

joystickElement.addEventListener("pointerdown", event => {
    joystickPointer = event.pointerId;

    joystickElement.setPointerCapture(event.pointerId);
    updateJoystick(event);
});

joystickElement.addEventListener("pointermove", event => {
    if (event.pointerId !== joystickPointer) return;
    updateJoystick(event);
});

function updateJoystick(event) {
    const rect = joystickElement.getBoundingClientRect();

    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);

    const max = 38;
    const length = Math.hypot(x, y);

    if (length > max) {
        x = x / length * max;
        y = y / length * max;
    }

    stick.style.transform =
        `translate(${x}px, ${y}px)`;

    joystick.x = x / max;
    joystick.y = y / max;
}

function resetJoystick() {
    joystickPointer = null;
    joystick.x = 0;
    joystick.y = 0;

    stick.style.transform = "translate(0px, 0px)";
}

joystickElement.addEventListener("pointerup", resetJoystick);
joystickElement.addEventListener("pointercancel", resetJoystick);

// ==========================================
// CAMERA ROTATION
// ==========================================

let cameraPointer = null;
let previousX = 0;
let previousY = 0;

renderer.domElement.addEventListener("pointerdown", event => {
    if (!started || gameOver) return;

    if (event.clientX < window.innerWidth * 0.4) return;

    cameraPointer = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;

    renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener("pointermove", event => {
    if (event.pointerId !== cameraPointer) return;

    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;

    yaw -= dx * 0.006;

    previousY = event.clientY;
    previousX = event.clientX;
});

function stopCameraTouch(event) {
    if (event.pointerId === cameraPointer) {
        cameraPointer = null;
    }
}

renderer.domElement.addEventListener("pointerup", stopCameraTouch);
renderer.domElement.addEventListener("pointercancel", stopCameraTouch);

// ==========================================
// FIRE BUTTON
// ==========================================

const fireButton = document.getElementById("fire");

fireButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    firing = true;
    shoot();
});

fireButton.addEventListener("pointerup", () => firing = false);
fireButton.addEventListener("pointercancel", () => firing = false);
fireButton.addEventListener("pointerleave", () => firing = false);

// ==========================================
// JUMP BUTTON
// ==========================================

document.getElementById("jump").addEventListener(
    "pointerdown", event => {
        event.preventDefault();

        if (grounded && started && !gameOver) {
            verticalVelocity = 8;
            grounded = false;
        }
    }
);

// ==========================================
// SPRINT BUTTON
// ==========================================

const sprintButton = document.getElementById("sprint");

sprintButton.addEventListener("pointerdown", () => {
    sprinting = true;
});

sprintButton.addEventListener("pointerup", () => {
    sprinting = false;
});

sprintButton.addEventListener("pointercancel", () => {
    sprinting = false;
});

sprintButton.addEventListener("pointerleave", () => {
    sprinting = false;
});

// ==========================================
// AIM BUTTON
// ==========================================

const aimButton = document.getElementById("aim");

aimButton.addEventListener("pointerdown", () => {
    aiming = true;
});

aimButton.addEventListener("pointerup", () => {
    aiming = false;
});

aimButton.addEventListener("pointercancel", () => {
    aiming = false;
});

// ==========================================
// KEYBOARD
// ==========================================

const keys = {};

window.addEventListener("keydown", event => {
    keys[event.code] = true;
});

window.addEventListener("keyup", event => {
    keys[event.code] = false;
});

function keyboardMovement() {
    keyboardInput.x =
        (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0);

    keyboardInput.y =
        (keys.KeyS || keys.ArrowDown ? 1 : 0) -
        (keys.KeyW || keys.ArrowUp ? 1 : 0);

    sprinting = !!keys.ShiftLeft;

    if (keys.Space && grounded) {
        verticalVelocity = 8;
        grounded = false;
    }
}

// ==========================================
// START GAME
// ==========================================

document.getElementById("startButton").addEventListener(
    "click", () => {
        started = true;

        document.getElementById("startScreen").style.display =
            "none";

        updateCamera();
    }
);

// ==========================================
// WINDOW RESIZE
// ==========================================

window.addEventListener("resize", () => {
    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 1.5)
    );
});

// ==========================================
// MAIN GAME LOOP
// ==========================================

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (started && !gameOver) {
        keyboardMovement();

        movePlayer(delta);
        updateEnemies(delta);
        updateTracers(delta);

        if (firing) shoot();

        updateCamera();

        if (moving) {
            const swing =
                Math.sin(performance.now() * 0.012) * 0.35;

            leftLeg.rotation.x = swing;
            rightLeg.rotation.x = -swing;
            leftArm.rotation.x = -swing * 0.5;
            rightArm.rotation.x = swing * 0.5;
        } else {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
            leftArm.rotation.x = 0;
            rightArm.rotation.x = 0;
        }
    }

    renderer.render(scene, camera);
}

// ==========================================
// INITIALIZE
// ==========================================

updateCamera();
animate();
