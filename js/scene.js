// ==================== 场景核心：渲染器 / 场景 / 相机 / dolly / 灯光 / 装饰云 ====================
import * as THREE from 'three';
import { createCloudMesh, createGlowTexture } from './utils.js';
import {
    skyPresets,
    CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_HEIGHT,
    SKY_DOME_RADIUS, SKY_DOME_SEGMENTS, SKY_DOME_RINGS,
    SKY_DOME_PHI_START, SKY_DOME_PHI_LENGTH,
    SKY_DOME_THETA_START, SKY_DOME_THETA_LENGTH,
    STAR_LAYER_COUNT, STAR_BASE_COUNT, STAR_COUNT_INCREMENT,
    STAR_MIN_DIST, STAR_DIST_INCREMENT, STAR_DIST_LAYER_OFFSET,
    STAR_MIN_SIZE, STAR_SIZE_INCREMENT,
    SUN_SHADOW_MAP_SIZE, SUN_SHADOW_NEAR, SUN_SHADOW_FAR, SUN_SHADOW_BOUNDS
} from './config.js';

// ── 核心对象（模块级导出，供其他模块引用）──
export let renderer;
export let scene;
export let camera;
export let dolly;

// ── 天空穹顶（由 sky.js 驱动变色）──
export let skyDome;
export let skyDomeMat;

// ── 星空层（由 sky.js 驱动闪烁）──
export const starLayers = [];

// ── 光源 ──
export let sunLight;
export let ambientLight;
export let hemiLight;

// ── 气球笑脸贴图 ──
export const balloonTex = new THREE.Texture();
let balloonTexLoaded = false;

export function isBalloonTexLoaded() { return balloonTexLoaded; }

// ── 装饰云引用 ──
export const cloudMeshes = [];

// ── 初始化标记 ──
let initialized = false;

/**
 * 一次性初始化场景（幂等）
 */
export function initSceneCore() {
    if (initialized) return;
    initialized = true;

    // ── 渲染器 ──
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ── 场景 ──
    scene = new THREE.Scene();
    scene.background = new THREE.Color(skyPresets.day.bg);
    scene.fog = new THREE.Fog(skyPresets.day.fog, skyPresets.day.fogNear, skyPresets.day.fogFar);
    renderer.setClearColor(new THREE.Color(skyPresets.day.bg));

    // ── 相机 + dolly ──
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR);
    camera.position.set(0, CAMERA_HEIGHT, 0); // <-- 玩家眼高(米)，改这里调整身高
    dolly = new THREE.Group();
    dolly.add(camera);
    scene.add(dolly);

    // ── 天空穹顶 ──
    const skyDomeGeo = new THREE.SphereGeometry(
        SKY_DOME_RADIUS, SKY_DOME_SEGMENTS, SKY_DOME_RINGS,
        SKY_DOME_PHI_START, SKY_DOME_PHI_LENGTH,
        SKY_DOME_THETA_START, SKY_DOME_THETA_LENGTH
    );
    skyDomeMat = new THREE.MeshBasicMaterial({
        color: skyPresets.day.skyDome, side: THREE.BackSide, depthWrite: false
    });
    skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    skyDome.position.y = CAMERA_HEIGHT;
    dolly.add(skyDome);

    // ── 星空粒子（3层，由 sky.js 驱动可见性）──
    const starTex = createGlowTexture('white', 'rgba(180,200,255,0.6)', 64);
    for (let layer = 0; layer < STAR_LAYER_COUNT; layer++) {
        const starGeo = new THREE.BufferGeometry();
        const count = STAR_BASE_COUNT + layer * STAR_COUNT_INCREMENT;
        const positions = new Float32Array(count * 3);
        const twinkleData = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.pow(Math.random(), 2.5) * Math.PI * 0.48;
            const r = STAR_MIN_DIST + Math.random() * STAR_DIST_INCREMENT + layer * STAR_DIST_LAYER_OFFSET;
            positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
            positions[i * 3 + 1] = Math.cos(phi) * r + CAMERA_HEIGHT;
            positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
            twinkleData[i * 2] = Math.random() * Math.PI * 2;
            twinkleData[i * 2 + 1] = 0.3 + Math.random() * 1.5;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({
            map: starTex,
            color: 0xffffff,
            size: STAR_MIN_SIZE + layer * STAR_SIZE_INCREMENT,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const starField = new THREE.Points(starGeo, starMat);
        starField.userData = { twinkle: twinkleData, baseOpacity: 0 };
        dolly.add(starField);
        starLayers.push(starField);
    }

    // ── 太阳光（方向光）──
    sunLight = new THREE.DirectionalLight(skyPresets.day.sun, skyPresets.day.sunI);
    sunLight.position.set(skyPresets.day.sunX, skyPresets.day.sunY, skyPresets.day.sunZ);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = SUN_SHADOW_MAP_SIZE;
    sunLight.shadow.mapSize.height = SUN_SHADOW_MAP_SIZE;
    sunLight.shadow.camera.near = SUN_SHADOW_NEAR;
    sunLight.shadow.camera.far = SUN_SHADOW_FAR;
    sunLight.shadow.camera.left = -SUN_SHADOW_BOUNDS;
    sunLight.shadow.camera.right = SUN_SHADOW_BOUNDS;
    sunLight.shadow.camera.top = SUN_SHADOW_BOUNDS;
    sunLight.shadow.camera.bottom = -SUN_SHADOW_BOUNDS;
    scene.add(sunLight);

    // ── 环境光 & 半球光 ──
    ambientLight = new THREE.AmbientLight(skyPresets.day.ambient, skyPresets.day.ambientI);
    scene.add(ambientLight);
    hemiLight = new THREE.HemisphereLight(skyPresets.day.hemiSky, skyPresets.day.hemiGround, skyPresets.day.hemiI);
    scene.add(hemiLight);

    // ── 气球笑脸贴图加载 ──
    const balloonImg = new Image();
    balloonImg.onload = () => {
        balloonTex.image = balloonImg;
        balloonTex.colorSpace = THREE.SRGBColorSpace;
        balloonTex.needsUpdate = true;
        balloonTexLoaded = true;
        console.log('✅ 气球贴图加载成功: image/smile.png');
    };
    balloonImg.src = 'image/smile.png';

    // ── 装饰云朵（世界空间固定，dolly 移动产生相对运动）──
    const cloudDefs = [
        [-8, 5, -10, 1.5], [10, 6, -15, 2],
        [-5, 7, 8, 1.2],   [15, 5, 5, 1.8],
        [3, 8, -20, 2.2],  [-12, 4, 3, 1.0],
        [20, 6, -8, 1.6],  [-18, 5, -12, 1.4],
        [0, 9, 15, 2.5],   [-8, 3, -25, 1.3],
        [25, 7, 10, 1.7],  [-22, 4, -18, 1.1],
    ];
    cloudDefs.forEach(([x, y, z, s]) => {
        const cloud = createCloudMesh(x, y, z, s);
        cloudMeshes.push(cloud);
        scene.add(cloud);
    });
}

/**
 * VR 模式下关闭阴影 / 退出恢复阴影
 */
export function setShadow(enabled) {
    renderer.shadowMap.enabled = enabled;
    sunLight.castShadow = enabled;
    if (!enabled) {
        scene.traverse(obj => {
            if (obj.isMesh) obj.castShadow = false;
        });
    } else {
        sunLight.castShadow = true;
    }
}
