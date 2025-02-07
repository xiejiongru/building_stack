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

// 在初始化物理世界后添加材质
const blockMaterialPhys = new CANNON.Material();
blockMaterialPhys.friction = 0.3; // 降低摩擦系数（默认0.3）
blockMaterialPhys.restitution = 0.5; // 增加弹性系数（默认0.3）

const groundMaterialPhys = new CANNON.Material();

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

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
    // 添加全局默认材质配置
    defaultContactMaterial: {
        friction: 0.1,    // 全局摩擦系数
        restitution: 0.5, // 全局弹性
        contactEquationStiffness: 1e8 // 提高碰撞硬度
    }
});

const cannonDebugger = new CannonDebugger(scene, world, {
});

 
// 创建地面
const groundGeometry = new THREE.BoxGeometry(25, 1, 25);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

const groundBody = new CANNON.Body({
    mass: 0, // 静态
    material: groundMaterialPhys, // 使用地面材质
    shape: new CANNON.Box(new CANNON.Vec3(12.5, 0.5, 12.5)),
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
    const cannonHelper = new CannonDebugger(scene, world, {
        color: 0xff0000 // 显示为红色线框
    });

    const mesh = new THREE.Mesh(blockGeometry, blockMaterial);
    mesh.position.set(-5, previousBlock.mesh.position.y + 1, 0);
    scene.add(mesh);

    // **物理引擎部分**
    const shape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5));
    const body = new CANNON.Body({
        mass: 0,  // **🚀 禁用重力**
        material: blockMaterialPhys, // 使用方块材质
        position: new CANNON.Vec3(-5, previousBlock.body.position.y + 1, 0),
        shape: shape,
        allowSleep: false, // 🔥 禁用休眠
        sleepSpeedLimit: 0.1, // 休眠速度阈值调低
        sleepTimeLimit: 1 // 休眠时间阈值调低
    });

    world.addBody(body);

    movingBlock = { mesh, body };
}

// 提高计算精度
world.solver.iterations = 20;       // 增加迭代次数（默认10）
world.solver.tolerance = 0.001;     // 降低容差
world.broadphase = new CANNON.SAPBroadphase(world); // 使用更高效的碰撞检测
world.allowSleep = false;           // 禁用自动休眠

// 设置材质间的接触属性
world.addContactMaterial(
    new CANNON.ContactMaterial(
        groundMaterialPhys,
        blockMaterialPhys,
        {
            friction: 0.2,    // 地面对方块的摩擦
            restitution: 0.5  // 弹性系数
        }
    )
);

// 放置方块（启用重力）
function placeBlock() {
    if (!movingBlock) return;

    let lastBlock = previousBlock;
    let offset = movingBlock.mesh.position.x - lastBlock.mesh.position.x;

    // 🚀 **如果错位过大，强制失败**
    if (Math.abs(offset) > 2) {
        // 🔥 关键修改：增强物理效果
        movingBlock.body.mass = 1;
        movingBlock.body.material = blockMaterialP        movingBlock.body.addEventListener('preStep', () => {
            if (movingBlock.body.velocity.x < 4) {
                movingBlock.body.velocity.x = 5 * Math.sign(offset);
            }
            if (movingBlock.body.angularVelocity.z < 6) {
                movingBlock.body.angularVelocity.z = 8 * Math.sign(offset);
            }
        });
    }
}hys;
        
        // 施加更强的速度和旋转
        movingBlock.body.velocity.set(
            5 * Math.sign(offset), // 水平速度加倍
            -3,                    // 适当降低垂直速度
            0
        );
        movingBlock.body.angularVelocity.set(
            0,
            0, 
            8 * Math.sign(offset) // 增加旋转速度
        );

        // 🔥 确保物理体被唤醒
        movingBlock.body.wakeUp();
        movingBlock.body.updateMassProperties();

        // 禁用与地面的高摩擦接触
        movingBlock.body.material.friction = 0.1;

        setTimeout(() => {
            alert("Game Over! Your score: " + score);
            resetGame();
        }, 2000);

        return;
    

    // 🚀 **正常放置方块**
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
    createBlock();



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

let lastTime = 0;
// 动画循环
function animate() {
    
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    // 物理世界更新
    // 在 world 初始化时增加碰撞检测频率
    world.step(1/60, delta, 3); // (固定时间步长, 最大步数, 迭代次数)
    cannonDebugger.update() // Update the CannonDebugger meshes

    // 移动方块（只有在未放置时才移动）
    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        if (movingBlock.body.position.x > 5 || movingBlock.body.position.x < -5) {
            direction *= -1;
        }
    }

    if (movingBlock) {
        console.log(
            "Velocity:", movingBlock.body.velocity,
            "Angular:", movingBlock.body.angularVelocity,
            "Position:", movingBlock.body.position
        );
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
    
    // 在 animate 循环中更新
    cannonHelper.update();
}

// 启动游戏
createBlock();
animate();
