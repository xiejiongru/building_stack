"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1️⃣ 初始化场景 & 相机
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// 2️⃣ 添加光源
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// 3️⃣ 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);  // 挂载到页面

// 4️⃣ 添加控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 5️⃣ 创建地面
const groundGeometry = new THREE.BoxGeometry(5, 1, 5);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

let movingBlock;
let previousBlock = ground;  // 记录上一个方块
let speed = 0.1;
let direction = 1;
let score = 0;

// 6️⃣ 生成新的移动方块
function createBlock() {
    const blockGeometry = new THREE.BoxGeometry(5, 1, 5);
    const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x00aaff });
    movingBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    movingBlock.position.set(-5, previousBlock.position.y + 1, 0);
    scene.add(movingBlock);
}

// 7️⃣ 放置方块
function placeBlock() {
    if (!movingBlock) return;

    let lastBlock = previousBlock;
    let offset = Math.abs(movingBlock.position.x - lastBlock.position.x);

    if (offset > 2) {
        alert("Game Over! Your score: " + score);
        return;
    }

    previousBlock = movingBlock;  // 记录新方块
    movingBlock = null;
    score++;
    createBlock();  // 创建下一个
}

// 监听空格键放置方块
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        placeBlock();
    }
});

// 按 R 重新开始
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR') {
        location.reload();
    }
});

// 8️⃣ 动画循环
function animate() {
    requestAnimationFrame(animate);
    if (movingBlock) {
        movingBlock.position.x += speed * direction;
        if (movingBlock.position.x > 5 || movingBlock.position.x < -5) {
            direction *= -1;
        }
    }
    controls.update();
    renderer.render(scene, camera);
}

// 9️⃣ 启动游戏
createBlock();  // 先创建一个方块
animate();
