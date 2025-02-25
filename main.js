//══════════════════════════ Core Engine ════════════════════════════
"use strict";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
// import CannonDebugger from 'cannon-es-debugger'

//■■■■■■■■■■■■■■■■■■■■■■■ Scene System ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◇◇◇ 3D Scene ◇◇◇
// ── Gradient Sky Background ──
function createGradientTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = size;
    const context = canvas.getContext('2d');
    // Create gradient from top to bottom
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#FFB3BA'); // Light cyan (top)
    gradient.addColorStop(0.5, '#FFDFBA'); // Sakura pink (middle)
    gradient.addColorStop(1, '#BAFFC9'); // Light bamboo green (bottom)
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, size);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

const scene = new THREE.Scene();
scene.background = createGradientTexture();

//◇◇◇ Physics World ◇◇◇
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
    defaultContactMaterial: {
        friction: 0.1,     // Global default friction coefficient
        restitution: 0.5,  // Global restitution coefficient
        contactEquationStiffness: 1e8  // Collision calculation stiffness
    }
});

//◆◆◆ Physics Parameters ◆◆◆
world.solver.iterations = 20;       // Solver iteration count (default 10)
world.solver.tolerance = 0.001;     // Solver tolerance
world.broadphase = new CANNON.SAPBroadphase(world);  // Use SAP broadphase detection
world.allowSleep = false;           // Disable auto sleep


//■■■■■■■■■■■■■■■■■■■■■■■ Rendering Pipeline ■■■■■■■■■■■■■■■■■■■■■■■■■■■

//▨▨▨ Camera System ▨▨▨
const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    100
);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);


// ── Lighting System ──
// Ambient Light (soft lighting)
const ambientLight = new THREE.AmbientLight(0xFFF5E6, 2.0);
scene.add(ambientLight);

// Main Directional Light (warm tone, shadow enabled)
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3.0);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

//▨▨▨ Rendering Configuration ▨▨▨
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

//■■■■■■■■■■■■■■■■■■■■■■■ Game Objects ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//▶▶▶ Basic Elements ▶▶▶
const randomColors = [
    0xFFB3BA, // Sakura pink
    0xBAFFC9, // Mint green
    0xFFDFBA, // Cream orange
    0xB4C5E4, // Sky blue
    0xFFABAB, // Light coral
    0xCBAACB  // Light purple
];

// Define audio file list (relative path)
const impactSounds = [
    "/assets/models/sound/impactWood_heavy_000.ogg",
    "/assets/models/sound/impactWood_heavy_001.ogg",
    "/assets/models/sound/impactWood_heavy_002.ogg",
    "/assets/models/sound/impactWood_heavy_003.ogg"
];

// Global mute variable, default sound on
let soundMuted = false;

// Modify the function to play sound effects, check if muted
function playRandomImpactSound() {
    if (soundMuted) return; // If muted, return directly without playing sound
    const randomIndex = Math.floor(Math.random() * impactSounds.length);
    const audio = new Audio(impactSounds[randomIndex]);
    audio.play();
}

// Add mute button (default sound on)
const muteButton = document.createElement('button');
muteButton.innerText = 'Mute';
muteButton.style.position = 'fixed';
muteButton.style.bottom = '20px';
muteButton.style.right = '20px';
muteButton.style.padding = '10px 20px';
muteButton.style.fontSize = '16px';
document.body.appendChild(muteButton);

// Click button to toggle mute state
muteButton.addEventListener('click', () => {
    soundMuted = !soundMuted;
    muteButton.innerText = soundMuted ? 'Unmute' : 'Mute';
});

//├─ Ground Model
const groundGeometry = new THREE.BoxGeometry(25, 1, 25);
const groundMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x98FB98, // Light bamboo green
    metalness: 0.2,
    roughness: 0.7
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// Add border
const groundEdges = new THREE.EdgesGeometry(groundGeometry);
const groundLine = new THREE.LineSegments(
    groundEdges,
    new THREE.LineBasicMaterial({ color: 0x000000 }) 
);
ground.add(groundLine);

//├─ Ground Physics Body
const groundBody = new CANNON.Body({
    mass: 0,                        // Static object
    material: new CANNON.Material(),// Physics material
    shape: new CANNON.Box(new CANNON.Vec3(12.5, 0.5, 12.5)),
});
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

//▶▶▶ Dynamic Elements ▶▶▶
let movingBlock = null;             // Current moving block
let previousBlock = {               // Previous placed block
    mesh: ground, 
    body: groundBody 
};

//▶▶▶ Material System ▶▶▶
//├─ Block Physics Material (friction 0.3/restitution 0.5)
const blockMaterialPhys = new CANNON.Material();
blockMaterialPhys.friction = 0.3;
blockMaterialPhys.restitution = 0.5;

//└─ Ground Physics Material
const groundMaterialPhys = new CANNON.Material();

// Ensure all physics materials are correctly added to the physics world
world.addContactMaterial(
    new CANNON.ContactMaterial(
        groundMaterialPhys,
        blockMaterialPhys,
        {
            friction: 0.2,
            restitution: 0.5
        }
    )
);

//■■■■■■■■■■■■■■■■■■■■■■■ Game Logic ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◈◈◈ Core Parameters ◈◈◈
let speed = 0.1;        // Block movement speed
let direction = 1;      // Current movement direction
let score = 0;          // Game score
let startTime = Date.now(); // Game start time
let timerInterval;      // Timer interval

//◉◉◉ Block Management ◉◉◉
function createBlock() {

    const blockGeometry = new THREE.BoxGeometry(5, 1, 5);
    
    // Use random color from Japanese color array
    const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
        const blockMaterial = new THREE.MeshBasicMaterial({
                color: randomColor,
                metalness: 0.1,
                roughness: 0.5,
                emissive: 0x333333
            });
    const mesh = new THREE.Mesh(blockGeometry, blockMaterial);
    mesh.castShadow = true;
    mesh.position.set(-5, previousBlock.mesh.position.y + 1, 0);
    scene.add(mesh);

    // Add border effect
    const blockEdges = new THREE.EdgesGeometry(blockGeometry);
    const blockLine = new THREE.LineSegments(
        blockEdges,
        new THREE.LineBasicMaterial({ color: 0x000000 }) 
    );
    mesh.add(blockLine);

    const shape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5));
    const body = new CANNON.Body({
        mass: 0,
        material: blockMaterialPhys,
        position: new CANNON.Vec3(-5, previousBlock.body.position.y + 1, 0),
        shape: shape,
        allowSleep: false,
        sleepSpeedLimit: 0.1,
        sleepTimeLimit: 1
    });

    // After creating the physics body:
    mesh.userData.physicsBody = body;

    world.addBody(body);

    movingBlock = { mesh, body };
}

function placeBlock() {
    if (!movingBlock) return;

    let lastBlock = previousBlock;
    let offset = movingBlock.mesh.position.x - lastBlock.mesh.position.x;

    if (Math.abs(offset) > 2) {
        movingBlock.body.mass = 1;
        movingBlock.body.material = blockMaterialPhys;
        movingBlock.body.updateMassProperties();

        movingBlock.body.addEventListener('preStep', () => {
            if (movingBlock.body.velocity.x < 4) {
                movingBlock.body.velocity.x = 5 * Math.sign(offset);
            }
            if (movingBlock.body.angularVelocity.z < 6) {
                movingBlock.body.angularVelocity.z = 8 * Math.sign(offset);
            }
        });

        movingBlock.body.velocity.set(5 * Math.sign(offset), -3, 0);
        movingBlock.body.angularVelocity.set(0, 0, 8 * Math.sign(offset));

        movingBlock.body.wakeUp();

        clearInterval(timerInterval); // Stop timer
        setTimeout(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            alert(`Game Over! Your score: ${score} | Time: ${elapsedTime}s`);
            resetGame();
        }, 2000);
        return;
    }

    movingBlock.body.mass = 1;
    movingBlock.body.allowSleep = false;
    movingBlock.body.wakeUp();
    movingBlock.body.velocity.set(0, -5, 0);
    movingBlock.body.updateMassProperties();
    movingBlock.body.material.friction = 0.1;

    movingBlock.body.velocity.set(0, -5, 0);
    if (Math.abs(offset) > 0.5) {
        movingBlock.body.angularVelocity.set(0, 0, Math.sign(offset) * 3);
    }

    previousBlock = movingBlock;
    movingBlock = null;
    score++;
    updateScore();
    playRandomImpactSound();
    createBlock();

    // Update camera position and target
    camera.position.y = previousBlock.mesh.position.y + 1;
    controls.target.copy(previousBlock.mesh.position);
    controls.update();
}

    scene.traverse(obj => {
        console.log("🔹 Objects in scene:", obj.type, obj.name);
    });
//◉◉◉ Game Reset ◉◉◉
function resetGame() {    
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    world.bodies = [];

    scene.add(ground);
    world.addBody(groundBody);
    previousBlock = { mesh: ground, body: groundBody };
    movingBlock = null;
    score = 0;
    startTime = Date.now();
    updateScore();
    updateTimer();

    createBlock();

    startTimer();
}

// Update score display
function updateScore() {
    document.getElementById('score').innerText = `Score: ${score}`;
}

// Update timer display
function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').innerText = `Time: ${elapsedTime}s`;
}

// Start timer
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

//■■■■■■■■■■■■■■■■■■■■■■■ Control System ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◍◍◍ User Input ◍◍◍
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") placeBlock();
    if (event.code === "KeyR") resetGame();
    if (event.code === "KeyC") {  // Press "C" to reposition camera
        camera.position.set(0, 50, 100);
        camera.lookAt(0, 0, 0);
    }
});

//◍◍◍ Camera Control ◍◍◍
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;          // Enable damping effect
controls.dampingFactor = 0.05;          // Damping coefficient
controls.screenSpacePanning = false;    // Disable screen space panning
controls.minDistance = 5;               // Minimum zoom distance
controls.maxDistance = 50;              // Maximum zoom distance
controls.maxPolarAngle = Math.PI / 2;   // Maximum pitch angle
controls.autoRotate = true;             // Auto rotate
controls.autoRotateSpeed = 0.5;         // Auto rotate speed

//■■■■■■■■■■■■■■■■■■■■■■■ Animation System ■■■■■■■■■■■■■■■■■■■■■■■■■■■
let lastTime = 0;
// let cannonHelper;  // Physics debugger

function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    world.step(1/60, delta, 3);
    // cannonHelper.update();

    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        console.log("🎥 Update block position:", movingBlock.mesh.position);
        if (Math.abs(movingBlock.body.position.x) > 5) direction *= -1;
    } else {
        console.warn("⚠️ `movingBlock` is null, cannot update position");
    }

    scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData.physicsBody) {
            obj.position.copy(obj.userData.physicsBody.position);
            obj.quaternion.copy(obj.userData.physicsBody.quaternion);
        }
    });

    controls.update();
    camera.updateProjectionMatrix(); // Ensure camera update
    renderer.render(scene, camera);
}

//══════════════════════════ Game Start ═══════════════════════════
window.addEventListener('DOMContentLoaded', () => {
        resetGame();
        animate();
    });