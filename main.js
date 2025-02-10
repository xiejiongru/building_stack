"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger'

// 全局调试器
let cannonHelper;

// 初始化场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// 光源
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// 物理材质
const blockMaterialPhys = new CANNON.Material();
blockMaterialPhys.friction = 0.3;
blockMaterialPhys.restitution = 0.5;

const groundMaterialPhys = new CANNON.Material();

// 渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;

// 物理世界
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
    defaultContactMaterial: {
        friction: 0.1,
        restitution: 0.5,
        contactEquationStiffness: 1e8
    }
});

// 地面
const groundGeometry = new THREE.BoxGeometry(25, 1, 25);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

const groundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterialPhys,
    shape: new CANNON.Box(new CANNON.Vec3(12.5, 0.5, 12.5)),
});
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

// 游戏状态
let movingBlock = null;
let previousBlock = { mesh: ground, body: groundBody };
let speed = 0.1;
let direction = 1;
let score = 0;

// 方块生成
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

// 物理参数
world.solver.iterations = 20;
world.solver.tolerance = 0.001;
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;

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

// 方块放置
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

        setTimeout(() => {
            alert("Game Over! Your score: " + score);
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
    createBlock();
}

// 事件监听
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") placeBlock();
    if (event.code === "KeyR") resetGame();
});

// 游戏重置
function resetGame() {
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    world.bodies = [];
    scene.add(ground);
    world.addBody(groundBody);
    previousBlock = { mesh: ground, body: groundBody };
    movingBlock = null;
    score = 0;
    createBlock();
}

// 动画循环
let lastTime = 0;
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

// 启动
createBlock();
animate();