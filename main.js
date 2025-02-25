//══════════════════════════ 核心引擎 ════════════════════════════
"use strict";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
// import CannonDebugger from 'cannon-es-debugger'

//■■■■■■■■■■■■■■■■■■■■■■■ 场景系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◇◇◇ 三维场景 ◇◇◇
// ── 渐变天空背景 ──
function createGradientTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = size;
    const context = canvas.getContext('2d');
    // 创建从上到下的渐变
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#FFB3BA'); // 淡青（顶端）
    gradient.addColorStop(0.5, '#FFDFBA'); // 樱花粉（中间）
    gradient.addColorStop(1, '#BAFFC9'); // 若竹色（底部）
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, size);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

const scene = new THREE.Scene();
scene.background = createGradientTexture();

//◇◇◇ 物理世界 ◇◇◇
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
    defaultContactMaterial: {
        friction: 0.1,     // 全局默认摩擦系数
        restitution: 0.5,  // 全局弹性系数
        contactEquationStiffness: 1e8  // 碰撞计算刚度
    }
});

//◆◆◆ 物理参数 ◆◆◆
world.solver.iterations = 20;       // 解算器迭代次数（默认10）
world.solver.tolerance = 0.001;     // 解算容差
world.broadphase = new CANNON.SAPBroadphase(world);  // 使用SAP宽相位检测
world.allowSleep = false;           // 禁用自动休眠


//■■■■■■■■■■■■■■■■■■■■■■■ 渲染管线 ■■■■■■■■■■■■■■■■■■■■■■■■■■■

//▨▨▨ 相机系统 ▨▨▨
const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    100
);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);


// ── 光照系统 ──
// 环境光（柔和补光）
const ambientLight = new THREE.AmbientLight(0xFFF5E6, 2.0);
scene.add(ambientLight);

// 主方向光（暖色调，并开启阴影）
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3.0);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

//▨▨▨ 渲染配置 ▨▨▨
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 在渲染器配置中添加
renderer.physicallyCorrectLights = true; // 启用物理光照
renderer.outputEncoding = THREE.sRGBEncoding; // 启用sRGB色彩空间

//■■■■■■■■■■■■■■■■■■■■■■■ 游戏对象 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//▶▶▶ 基础元素 ▶▶▶
const randomColors = [
    0xFFB3BA, // 樱花粉
    0xBAFFC9, // 薄荷绿
    0xFFDFBA, // 奶油橙
    0xB4C5E4, // 天蓝色
    0xFFABAB, // 浅珊瑚
    0xCBAACB  // 淡紫
];

// 定义音频文件列表（相对路径）
const impactSounds = [
    "/assets/models/sound/impactWood_heavy_000.ogg",
    "/assets/models/sound/impactWood_heavy_001.ogg",
    "/assets/models/sound/impactWood_heavy_002.ogg",
    "/assets/models/sound/impactWood_heavy_003.ogg"
];

// 全局静音变量，默认声音开启
let soundMuted = false;

// 修改播放音效的函数，判断是否静音
function playRandomImpactSound() {
    if (soundMuted) return; // 如果静音，则直接返回，不播放音效
    const randomIndex = Math.floor(Math.random() * impactSounds.length);
    const audio = new Audio(impactSounds[randomIndex]);
    audio.play();
}

// 添加静音按钮（默认声音开启）
const muteButton = document.createElement('button');
muteButton.innerText = 'Mute';
muteButton.style.position = 'fixed';
muteButton.style.bottom = '20px';
muteButton.style.right = '20px';
muteButton.style.padding = '10px 20px';
muteButton.style.fontSize = '16px';
document.body.appendChild(muteButton);

// 点击按钮切换静音状态
muteButton.addEventListener('click', () => {
    soundMuted = !soundMuted;
    muteButton.innerText = soundMuted ? 'Unmute' : 'Mute';
});

//├─ 地面模型
const groundGeometry = new THREE.BoxGeometry(25, 1, 25);
const groundMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x98FB98, // 淡若竹色
    metalness: 0.2,
    roughness: 0.7
});const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// 添加边框
const groundEdges = new THREE.EdgesGeometry(groundGeometry);
const groundLine = new THREE.LineSegments(
    groundEdges,
    new THREE.LineBasicMaterial({ color: 0x000000 }) // 边框颜色（此处为黑色，可按需求调整）
);
ground.add(groundLine);

//├─ 地面物理体
const groundBody = new CANNON.Body({
    mass: 0,                        // 静态物体
    material: new CANNON.Material(),// 物理材质
    shape: new CANNON.Box(new CANNON.Vec3(12.5, 0.5, 12.5)),
});
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

//▶▶▶ 动态元素 ▶▶▶
let movingBlock = null;             // 当前移动方块
let previousBlock = {               // 上一个放置方块
    mesh: ground, 
    body: groundBody 
};

//▶▶▶ 材质系统 ▶▶▶
//├─ 方块物理材质（摩擦0.3/弹性0.5）
const blockMaterialPhys = new CANNON.Material();
blockMaterialPhys.friction = 0.3;
blockMaterialPhys.restitution = 0.5;

//└─ 地面物理材质
const groundMaterialPhys = new CANNON.Material();

// 确保所有物理材质都被正确地添加到物理世界中
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

//■■■■■■■■■■■■■■■■■■■■■■■ 游戏逻辑 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◈◈◈ 核心参数 ◈◈◈
let speed = 0.1;        // 方块移动速度
let direction = 1;      // 当前移动方向
let score = 0;          // 游戏得分
let startTime = Date.now(); // 游戏开始时间
let timerInterval;      // 计时器间隔

//◉◉◉ 方块管理 ◉◉◉
function createBlock() {

    const blockGeometry = new THREE.BoxGeometry(5, 1, 5);
    
    // 使用日式颜色数组中的随机颜色
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

    // 添加边框效果
    const blockEdges = new THREE.EdgesGeometry(blockGeometry);
    const blockLine = new THREE.LineSegments(
        blockEdges,
        new THREE.LineBasicMaterial({ color: 0x000000 }) // 边框颜色（可根据需要调整）
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

    // 在创建完物理体后：
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

        clearInterval(timerInterval); // 停止计时器
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

    // 更新相机位置和目标
    camera.position.y = previousBlock.mesh.position.y + 1;
    controls.target.copy(previousBlock.mesh.position);
    controls.update();
}

    scene.traverse(obj => {
        console.log("🔹 场景内物体:", obj.type, obj.name);
    });
//◉◉◉ 游戏重置 ◉◉◉
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

// 更新分数显示
function updateScore() {
    document.getElementById('score').innerText = `Score: ${score}`;
}

// 更新计时器显示
function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').innerText = `Time: ${elapsedTime}s`;
}

// 启动计时器
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

//■■■■■■■■■■■■■■■■■■■■■■■ 控制系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◍◍◍ 用户输入 ◍◍◍
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") placeBlock();
    if (event.code === "KeyR") resetGame();
    if (event.code === "KeyC") {  // 按 "C" 重新调整相机
        camera.position.set(0, 50, 100);
        camera.lookAt(0, 0, 0);
    }
});

//◍◍◍ 相机控制 ◍◍◍
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;          // 启用阻尼效果
controls.dampingFactor = 0.05;          // 阻尼系数
controls.screenSpacePanning = false;    // 禁用屏幕空间平移
controls.minDistance = 5;               // 最小缩放距离
controls.maxDistance = 50;              // 最大缩放距离
controls.maxPolarAngle = Math.PI / 2;   // 最大俯仰角
controls.autoRotate = true;             // 自动旋转
controls.autoRotateSpeed = 0.5;         // 自动旋转速度

//■■■■■■■■■■■■■■■■■■■■■■■ 动画系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
let lastTime = 0;
// let cannonHelper;  // 物理调试器

function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    world.step(1/60, delta, 3);
    // cannonHelper.update();

    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        console.log("🎥 更新方块位置:", movingBlock.mesh.position);
        if (Math.abs(movingBlock.body.position.x) > 5) direction *= -1;
    } else {
        console.warn("⚠️ `movingBlock` 为空，无法更新位置");
    }

    scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData.physicsBody) {
            obj.position.copy(obj.userData.physicsBody.position);
            obj.quaternion.copy(obj.userData.physicsBody.quaternion);
        }
    });

    controls.update();
    camera.updateProjectionMatrix(); // 确保相机更新
    renderer.render(scene, camera);
}

//══════════════════════════ 游戏启动 ═══════════════════════════
window.addEventListener('DOMContentLoaded', () => {
        resetGame();
        animate();
    });