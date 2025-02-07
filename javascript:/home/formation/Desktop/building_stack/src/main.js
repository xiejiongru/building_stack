import * as THREE from 'three';
import { createScene, createCamera, createRenderer, animate } from './renderer.js';
import { createCube } from './blocks.js';
import { getRandomColor } from './utils.js';

// 创建场景
const scene = createScene();

// 创建相机
const camera = createCamera();

// 创建渲染器
const renderer = createRenderer();

// 创建方块
const cube = createCube();
scene.add(cube);

// 渲染循环
animate(renderer, scene, camera, cube);