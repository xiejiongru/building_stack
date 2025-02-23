//══════════════════════════ 核心引擎 ════════════════════════════
"use strict";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger'

let isDebugMode = false;
let controls; // 全局声明


//■■■■■■■■■■■■■■■■■■■■■■■ 物理系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -19.82, 0),
    defaultContactMaterial: {
        friction: 0.05,
        restitution: 0.1,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 5,
        quatNormalizeSkip: 0,
        quatNormalizeFast: false
    }
});

world.solver.iterations = 20;
world.solver.tolerance = 0.001;
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;

//■■■■■■■■■■■■■■■■■■■■■■■ 渲染系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = initCamera();

function initCamera() {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);
    return camera;
}

function initControls() {
    controls = new OrbitControls(camera, renderer.domElement);    
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    return controls;
}

//■■■■■■■■■■■■■■■■■■■■■■■ 游戏对象系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//════ 视觉子系统 ════
const visualSystem = (() => {
    const palette = {
        sky: [0xB8E2FF, 0xFFD6E8],
        ground: 0xE6E6FA,
        blocks: [0xFFB3BA, 0xFFDFBA, 0xBAFFC9, 0xBAE1FF, 0xFFB3FF, 0xD4A5A5]
    };

    // 初始化视觉系统
    function init() {
        initSky();
        initLighting();
        initGround();
    }

    function initSky() {
        scene.background = createGradientTexture();
        scene.fog = new THREE.Fog(palette.sky[0], 20, 100);
    }

    function createGradientTexture() {
        const canvas = document.createElement('canvas');
        // ...同之前的渐变代码...
        return new THREE.CanvasTexture(canvas);
    }

    function initLighting() {
        // 环境光
        scene.add(new THREE.AmbientLight(0xFFFFFF, 1.2));
        
        // 主光源
        const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        mainLight.position.set(10, 30, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048; // 提高阴影质量
        mainLight.shadow.mapSize.height = 2048;
        scene.add(mainLight);
    }

    function initGround() {
        const geometry = new THREE.BoxGeometry(25, 1, 25); // 改为立方体
        const material = new THREE.MeshToonMaterial({
            color: palette.ground,
            gradientMap: createColorGradient(palette.ground) // 添加渐变
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI/2;
        ground.position.y = -0.5;
        scene.add(ground);
        return ground;
    }

    return { init };
})();

//════ 物理子系统 ════
const physicsSystem = (() => {
    let blockMaterialPhys;
    let groundBody;

    function init() {
        createGroundBody();
        initMaterials();
    }

    function createGroundBody() {
        groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(12.5, 0.5, 12.5)),
            position: new CANNON.Vec3(0, -0.5, 0)
        });
        world.addBody(groundBody);
    }

    function initMaterials() {
        const blockMaterial = new CANNON.Material();
        const groundMaterial = new CANNON.Material();
        blockMaterialPhys = blockMaterial;
    }

    return { init, blockMaterialPhys, groundBody };
})();

//════ 游戏实体 ════
let movingBlock = null;
let previousBlock = null;

function createColorGradient(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0.2, baseColor);
    gradient.addColorStop(0.8, baseColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    return new THREE.CanvasTexture(canvas);
}
class GameBlock {
    constructor(position, isGround = false) {
        this.mesh = this.createVisual(isGround);
        this.body = this.createPhysics(position, isGround);
        this.linkEntities();
        this.updateMaterial(isDebugMode); // 将模式切换功能合并到原类中
        this.color = isGround ? 0xE6E6FA : this.getRandomColor();
    }
    updateMaterial(debugMode) {
        this.mesh.material = debugMode ? 
            new THREE.MeshBasicMaterial({ wireframe: true }) :
            new THREE.MeshToonMaterial({
                color: this.color,
                gradientMap: createColorGradient(this.color),
                shininess: 50
            });
        this.mesh.castShadow = !debugMode;
        this.mesh.receiveShadow = !debugMode;
    }

    createVisual(isGround) {
        const geometry = new THREE.BoxGeometry(5, 1, 5);
        const material = new THREE.MeshToonMaterial({
            color: isGround ? 0xE6E6FA : this.getRandomColor()
        });
        return new THREE.Mesh(geometry, material);
    }

    createPhysics(position, isGround) {
        const body = new CANNON.Body({
            mass: isGround ? 0 : 1,
            shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5)),
            position: new CANNON.Vec3(...position),
            material: physicsSystem.blockMaterialPhys // 修正材质引用
        });
        world.addBody(body);
        return body;
    }

    linkEntities() {
        this.mesh.userData.bodyId = this.body.id;
        this.body.userData.meshId = this.mesh.uuid;
    }

    getRandomColor() {
        const colors = visualSystem.palette.blocks;
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

//■■■■■■■■■■■■■■■■■■■■■■■ 游戏逻辑 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◈◈◈ 核心参数 ◈◈◈
let speed = 0.1;        // 方块移动速度
let direction = 1;      // 当前移动方向
let score = 0;          // 游戏得分
let startTime = Date.now(); // 游戏开始时间
let timerInterval;      // 计时器间隔
let cannonHelper;  // 物理调试器

//◉◉◉ 方块管理 ◉◉◉
function createBlock() {
    const blockGeometry = new THREE.BoxGeometry(5, 1, 5);
    const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x00aaff });
    
    cannonHelper = new CannonDebugger(scene, world, {
        color: 0xff0000,
        onInit(body, mesh) {
            mesh.material.wireframe = true; // 线框模式
        }
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
        sleepTimeLimit: 1,
        angularDamping: 0.5 // 增加角阻尼
    });

    world.addBody(body);
    movingBlock = { mesh, body };

        // 创建模型时建立关联
        mesh.userData = {
            bodyId: body.id // 关键关联
        };
        
        // 物理体反向关联
        body.userData = {
            meshId: mesh.uuid
        };
}

function placeBlock() {
    if (!movingBlock) return;

    let lastBlock = previousBlock;
    let offset = movingBlock.mesh.position.x - lastBlock.mesh.position.x;

    if (Math.abs(offset) > 2) {
        //▼▼▼ 增强物理表现 ▼▼▼
        movingBlock.body.applyImpulse(
            new CANNON.Vec3(50 * Math.sign(offset), 0, 0), // 增加水平冲击力
            new CANNON.Vec3(0, 3, 0) // 提升扭矩作用点
        );
        
        // 持续施加向下的力
        movingBlock.body.addEventListener('preStep', () => {
            movingBlock.body.applyForce(new CANNON.Vec3(0, -80, 0)); // 增强向下力
        });

        // 移除旧的事件监听器
        movingBlock.body.removeEventListener('preStep');

        movingBlock.body.mass = 1;
        movingBlock.body.material = blockMaterialPhys;
        
        movingBlock.body.addEventListener('preStep', () => {
            world.contacts.forEach((c) => {
                if (c.bi === movingBlock.body || c.bj === movingBlock.body) {
                    // 生成碰撞粒子效果
                    const spark = new THREE.Mesh(
                        new THREE.SphereGeometry(0.2),
                        new THREE.MeshBasicMaterial({color: 0xff0000})
                    );
                    spark.position.copy(c.ri);
                    scene.add(spark);
                    setTimeout(() => scene.remove(spark), 200);
                }   
             });
                
            if (movingBlock.body.velocity.x < 4) {
                movingBlock.body.velocity.x = 5 * Math.sign(offset);
            }
            if (movingBlock.body.angularVelocity.z < 6) {
                movingBlock.body.angularVelocity.z = 8 * Math.sign(offset);
            }
        
        // 保持水平推力
        movingBlock.body.applyForce(
            new CANNON.Vec3(0, -15, 0),
            new CANNON.Vec3(20 * Math.sign(offset), 0, 0), // 力向量
            new CANNON.Vec3(0, 0, 0) // 作用点（中心点）
        );
        
        // 增加旋转扭矩
        movingBlock.body.applyTorque(
            new CANNON.Vec3(0, 0, 25 * Math.sign(offset))
        );

        // 增加坠落加速度
        movingBlock.body.velocity.y -= 0.5; 
        // 空气阻力模拟
        movingBlock.body.velocity.x *= 0.98;
        movingBlock.body.velocity.z *= 0.98;
    });

        // 初始冲击设置
        movingBlock.body.velocity.set(
            15 * Math.sign(offset), // 水平速度提升
            -12, // 初始下落速度提升
            0
        );
        movingBlock.body.angularVelocity.set(0, 0, 15 * Math.sign(offset));

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
    // 禁用所有阻尼
    movingBlock.body.linearDamping = 0;
    movingBlock.body.angularDamping = 0;

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

    console.log("施加冲击力：", 
        `水平:${50 * Math.sign(offset)}N 垂直:-50N`
    );
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

document.getElementById('container').appendChild(renderer.domElement);


//■■■■■■■■■■■■■■■■■■■■■■■ 控制系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
//◍◍◍ 用户输入 ◍◍◍
document.addEventListener("keydown", (event) => { // 使用event参数
    if (event.code === "Space") placeBlock();
    if (event.code === "KeyR") resetGame();
    if (event.code === "F1") { 
    }
});

//■■■■■■■■■■■■■■■■■■■■■■■ 按钮事件绑定 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
document.getElementById('toggleMode').addEventListener('click', toggleRenderMode);

//■■■■■■■■■■■■■■■■■■■■■■■ 模式切换函数 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
function toggleRenderMode() {
    isDebugMode = !isDebugMode;
    
    scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj !== physicsSystem.ground) {
            if (isDebugMode) {
                obj.material = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    wireframe: true 
                });
            } else {
                if (obj instanceof GameBlock) {
                    obj.updateMaterial(false);
                }
            }
        }
    });

    // 更新按钮样式
    const btn = document.getElementById('toggleMode');
    btn.textContent = isDebugMode ? '🎮 返回卡通模式' : '🔧 进入调试模式';
    btn.style.background = isDebugMode ? 
        'linear-gradient(145deg, #4CAF50, #8BC34A)' : 
        'linear-gradient(145deg, #ff6b6b, #ff8e53)';

    // 阴影控制
    renderer.shadowMap.enabled = !isDebugMode;
    renderer.shadowMap.needsUpdate = true;
}
//■■■■■■■■■■■■■■■■■■■■■■■ 动画系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
let lastTime = 0;
let lastLogData = null; // 新增：日志缓存变量
let arrowHelper = null;

function animate(time = 0) {
    requestAnimationFrame(animate);
    
    // 计算时间差
    const delta = (time - lastTime) * 0.001;
    lastTime = time;

    // 单次物理更新
    world.step(1 / 60, delta, 3);

    if (controls) {  // ✅ 避免 controls 为空时报错
        controls.update();
    } else {
        console.warn("⚠️ controls 为空，无法更新！");  // 添加警告日志
    }

    // 同步物理与渲染
    scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.bodyId) {
            const body = world.bodies.find(b => b.id === obj.userData.bodyId);
            if (body) {
                obj.position.copy(body.position);
                obj.quaternion.copy(body.quaternion);
            }
        }
    });

    // 渲染场景
    controls.update();
    renderer.render(scene, camera);
}

    // 坠落检测
    world.bodies.forEach((body) => {
        if (body.position.y < -20) {
            // 同步移除模型
            const mesh = scene.children.find(obj => 
                obj.userData?.bodyId === body.id
            );
            
            if (mesh) {
                scene.remove(mesh);
                console.log("移除模型：", mesh.uuid);
            }
    
            // 移除物理体
            world.remove(body);
            console.log("移除物理体：", body.id);
    
            // 强制垃圾回收（仅调试用）
            if (typeof gc !== 'undefined') gc();
        }
    });

    if (world.bodies.length > 20) {
        world.bodies.slice(0, -10).forEach(body => {
            world.remove(body);
        });
    }

    if (movingBlock && movingBlock.body.mass === 0) {
        movingBlock.body.position.x += speed * direction;
        movingBlock.mesh.position.copy(movingBlock.body.position);
    }

//■■■■■■■■■■■■■■■■■■■■■■■ 调试系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
    scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj !== ground) {
            const body = world.bodies.find(b => Math.abs(b.position.y - obj.position.y) < 0.1);
            if (body) {
                obj.position.copy(body.position);
                obj.quaternion.copy(body.quaternion);
            }
        if (obj.userData?.body) {
            obj.position.copy(obj.userData.body.position);
            obj.quaternion.copy(obj.userData.body.quaternion);
        }
        }
    });
    

    controls.update();
    renderer.render(scene, camera);
    
    // 添加调试日志
    console.log("当前物理体数量：", world.bodies.length);
    console.log("当前场景物体数量：", scene.children.length);
    // 在animate循环中添加
    console.log("模型位置：", movingBlock.mesh.position);
    console.log("物理位置：", movingBlock.body.position);

    if (movingBlock) {
        //▼▼▼ 精确比较三维向量 ▼▼▼
        const currentPosition = movingBlock.body.position.clone();
        const currentVelocity = movingBlock.body.velocity.clone();
        const currentRotation = movingBlock.body.angularVelocity.clone();

        const isChanged = 
            !lastLogData ||
            !currentPosition.equals(lastLogData.position) ||
            !currentVelocity.equals(lastLogData.velocity) ||
            !currentRotation.equals(lastLogData.rotation);

        if (isChanged) {
            console.log("位置：", currentPosition);
            console.log("速度：", currentVelocity);
            console.log("旋转：", currentRotation);
            lastLogData = {
                position: currentPosition,
                velocity: currentVelocity,
                rotation: currentRotation
            };
        }
    }
    
//══════════════════════════ 游戏启动 ═══════════════════════════
// 修改初始化流程
function initializeGame() {

    controls = initControls();
    console.log("🎮 controls 初始化成功:", controls);

    // 渲染器配置
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);

    // 初始化系统
    visualSystem.init();
    physicsSystem.init();

    // 创建初始方块
    previousBlock = new GameBlock([0, -0.5, 0], true);
    createBlock();
    
    // 启动动画循环
    animate();
    console.log("camera 是否已初始化:", camera);
    console.log("renderer 是否已初始化:", renderer);

}


function initDebugger() {
    cannonHelper = new CannonDebugger(scene, world, {
        color: 0xff0000,
        onInit(body, mesh) {
            mesh.material.wireframe = true;
            mesh.userData.bodyId = body.id;
        }
    });
    cannonHelper.visible = false;
}

initializeGame();
animate(0); 

//■■■■■■■■■■■■■■■■■■■■■■■ 调试系统 ■■■■■■■■■■■■■■■■■■■■■■■■■■■
let lastLog = {
    position: null,
    velocity: null,
    rotation: null
};

function smartLog(data) {
    const shouldLog = 
        JSON.stringify(data.position) !== JSON.stringify(lastLog.position) ||
        JSON.stringify(data.velocity) !== JSON.stringify(lastLog.velocity) ||
        JSON.stringify(data.rotation) !== JSON.stringify(lastLog.rotation);

    if (shouldLog) {
        console.log("位置：", data.position);
        console.log("速度：", data.velocity);
        console.log("旋转：", data.rotation);
        lastLog = { ...data };
    }
}

// 在animate循环中使用
if (movingBlock) {
    smartLog({
        position: movingBlock.body.position,
        velocity: movingBlock.body.velocity,
        rotation: movingBlock.body.angularVelocity
    });
}
