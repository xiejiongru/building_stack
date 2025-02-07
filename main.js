"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger'


// 初始化 THREE.js 场景 & 相机
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// 添加光源
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 平滑相机移动
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;

// 物理世界初始化
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const cannonDebugger = new CannonDebugger(scene, world, {
});

 
// 创建地面
const groundGeometry = new THREE.BoxGeometry(5, 1, 5);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

const groundBody = new CANNON.Body({
    mass: 0, // 静态
    shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5)), 
});
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

let movingBlock = null;
let previousBlock = { mesh: ground, body: groundBody };
let speed = 0.1;
let direction = 1;
let score = 0;

// 生成新的移动方块
function createBlock() {
    const blockGeometry = new THREE.BoxGeometry(5, 1, 5);
    const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x00aaff });
    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(-5, previousBlock.mesh.position.y + 1, 0);
    scene.add(block);

    // 物理方块（初始 mass = 0，不受重力影响）
    const blockBody = new CANNON.Body({
        mass: 0, // 初始静态，不受重力影响
        shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5)), 
        position: new CANNON.Vec3(-5, previousBlock.body.position.y + 1, 0),
    });
    world.addBody(blockBody);

    movingBlock = { mesh: block, body: blockBody };
}

// 放置方块（启用重力）
function placeBlock() {
    if (!movingBlock) return;

    let lastBlock = previousBlock;
    let offset = movingBlock.mesh.position.x - lastBlock.mesh.position.x;

    // 如果方块错位太多，直接失败
    if (Math.abs(offset) > 2) {
        console.log("Game Over! Your score: " + score);
        resetGame();
        return;
    }

    // 启用重力 & 质量，方块正式落下
    movingBlock.body.mass = 1;
    movingBlock.body.allowSleep = false;
    movingBlock.body.wakeUp();
    movingBlock.body.updateMassProperties();

    // **修正: 让方块倾斜 & 倒下**
    if (Math.abs(offset) > 0.5) {
        // 偏移部分
        movingBlock.body.position.x += offset * 0.5;
        movingBlock.body.quaternion.setFromEuler(0, 0, Math.sign(offset) * 0.2);
    }

    previousBlock = movingBlock;
    movingBlock = null;
    score++;
    createBlock();
}

// 监听空格键放置方块
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        placeBlock();
    }
});

// 按 R 重新开始
document.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
        resetGame();
    }
});

// 重新开始游戏
function resetGame() {
    // 清除 THREE.js 场景
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // 清空物理世界
    world.bodies = [];
    scene.add(ground);
    world.addBody(groundBody);

    // 重新初始化
    previousBlock = { mesh: ground, body: groundBody };
    movingBlock = null;
    score = 0;
    createBlock();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    // 物理世界更新
    world.step(1 / 60);
    cannonDebugger.update() // Update the CannonDebugger meshes

    // 移动方块（只有在未放置时才移动）
    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        if (movingBlock.body.position.x > 5 || movingBlock.body.position.x < -5) {
            direction *= -1;
        }
    }

    // 让 Three.js 物体跟随 Cannon.js 物理对象
    scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj !== ground) {
            let body = world.bodies.find((b) => Math.abs(b.position.y - obj.position.y) < 0.1);
            if (body) {
                obj.position.copy(body.position);
                obj.quaternion.copy(body.quaternion);
            }
        }
    });

    controls.update(); // 🔥 确保 OrbitControls 正常工作
    renderer.render(scene, camera);
}

// 启动游戏
createBlock();
animate();
