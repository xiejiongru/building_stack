//══════════════════════════ 核心引擎 ════════════════════════════
"use strict";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger'

//■■■■■■■■■■■■■■■■■■■■■■■ 场景系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◇◇◇ 三维场景 ◇◇◇
const scene = new THREE.Scene();

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
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

//▨▨▨ 光照系统 ▨▨▨
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

//▨▨▨ 渲染配置 ▨▨▨
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


//■■■■■■■■■■■■■■■■■■■■■■■ 游戏对象 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//▶▶▶ 基础元素 ▶▶▶
//├─ 地面模型
const groundGeometry = new THREE.BoxGeometry(25, 1, 25);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

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
    const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x00aaff });
    
    cannonHelper = new CannonDebugger(scene, world, {
        color: 0xff0000
    });

    const mesh = new THREE.Mesh(blockGeometry, blockMaterial);
    mesh.position.set(-5, previousBlock.mesh.position.y + 1, 0);
    scene.add(mesh);

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
        movingBlock.body.updateMassProperties();
        movingBlock.body.material.friction = 0.1;

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

    if (Math.abs(offset) > 0.5) {
        movingBlock.body.angularVelocity.set(0, 0, Math.sign(offset) * 3);
    }

    previousBlock = movingBlock;
    movingBlock = null;
    score++;
    updateScore();
    createBlock();

    // 更新相机位置和目标
    camera.position.y = previousBlock.mesh.position.y + 10;
    controls.target.copy(previousBlock.mesh.position);
    controls.update();
}

//◉◉◉ 游戏重置 ◉◉◉
function resetGame() {
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    world.bodies = [];
    scene.add(ground);
    world.addBody(groundBody);
    previousBlock = { mesh: ground, body: groundBody };
    movingBlock = null;
    score = 0;
    startTime = Date.now(); // 重置开始时间
    updateScore();
    updateTimer();
    createBlock();
    startTimer(); // 启动计时器

    // 初始化相机位置和目标
    camera.position.set(0, 15, 20);
    controls.target.copy(previousBlock.mesh.position);
    controls.update();
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
let cannonHelper;  // 物理调试器

function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    world.step(1/60, delta, 3);
    cannonHelper.update();

    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        if (Math.abs(movingBlock.body.position.x) > 5) direction *= -1;
    }

    scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj !== ground) {
            const body = world.bodies.find(b => Math.abs(b.position.y - obj.position.y) < 0.1);
            if (body) {
                obj.position.copy(body.position);
                obj.quaternion.copy(body.quaternion);
            }
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

//══════════════════════════ 游戏启动 ═══════════════════════════
resetGame(); // 使用 resetGame 启动游戏，以便初始化计时器和分数
animate();