// ==================== AK48 武器 + 子弹系统 ====================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { scene } from './scene.js';
import { rightController, leftController, rightGrip, leftGrip } from './input.js';
import { initAudio, playShootSound } from './audio.js';
import {
    SHOOT_COOLDOWN, BULLET_SPEED, BULLET_LIFE,
    BULLET_POOL_SIZE, AK48_SCALE
} from './config.js';

// ── 模型引用 ──
export let ak48Model = null;
export let ak48Attached = false;
export let ak48LeftAttached = false;

// ── 是否需要左手模式 ──
export let leftHandGunEnabled = false;
export function setLeftHandGunEnabled(v) { leftHandGunEnabled = v; window.__leftHandGunEnabled = v; }

// ── 子弹系统 ──
export const bullets = [];
export const bulletGroup = new THREE.Group();
// scene.add(bulletGroup) 延迟到 initBulletPool() 中调用（此时 scene 才初始化完毕）

const sharedBulletGeom = new THREE.SphereGeometry(0.02, 8, 8);
const sharedBulletMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff4400,
    emissiveIntensity: 0.8
});

export const bulletPool = [];

// ── 加载器 ──
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── 加载状态回调 ──
let onAK48Loaded = null;
let onLoadProgress = null;
let onLoadError = null;

export function setAK48Callbacks(onLoaded, onProgress, onError) {
    onAK48Loaded = onLoaded;
    onLoadProgress = onProgress;
    onLoadError = onError;
}

/**
 * 加载 AK48 模型（Draco 压缩）
 */
export function loadAK48Model() {
    gltfLoader.load(
        'Model/Ak48.glb',
        (gltf) => {
            console.log('✅ Ak48.glb 加载成功');
            ak48Model = gltf.scene;
            ak48Model.scale.set(1, 1, 1);
            ak48Model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            if (onAK48Loaded) onAK48Loaded();
        },
        (progress) => {
            if (onLoadProgress && progress.total > 0) {
                onLoadProgress(progress);
            }
        },
        (error) => {
            console.error('❌ 模型加载失败:', error);
            if (onLoadError) onLoadError(error);
        }
    );
}

// ── 子弹对象池 ──
export function initBulletPool() {
    scene.add(bulletGroup); // 此时 scene 已初始化
    for (let i = 0; i < BULLET_POOL_SIZE; i++) {
        const mesh = new THREE.Mesh(sharedBulletGeom, sharedBulletMat);
        mesh.userData = { active: false, vel: new THREE.Vector3(), life: 0 };
        mesh.visible = false;
        bulletGroup.add(mesh);
        bulletPool.push(mesh);
    }
}

function acquireBullet() {
    for (let i = 0; i < bulletPool.length; i++) {
        if (!bulletPool[i].userData.active) return bulletPool[i];
    }
    return null;
}

/**
 * 发射子弹（主弹 + 可选额外弹）
 */
export function shootBullet(controller) {
    fireOneBullet(controller);
    if (window.__extraBulletEnabled) {
        setTimeout(() => fireOneBullet(controller), 50);
    }
}

function fireOneBullet(controller) {
    const bullet = acquireBullet();
    if (!bullet) return;

    initAudio();
    playShootSound();

    // 发射口在控制器本地坐标系中的位置
    const muzzleLocal = new THREE.Vector3(0, 0, -0.2);
    const origin = muzzleLocal.clone().applyMatrix4(controller.matrixWorld);
    const quat = controller.getWorldQuaternion(new THREE.Quaternion());

    // 俯仰偏移（本地空间计算，避免角度串扰）
    const bulletPitch = -30 * Math.PI / 180; // 负=向下低头
    const localPitchQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(bulletPitch, 0, 0)
    );
    const finalQuat = quat.clone().multiply(localPitchQuat);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(finalQuat);

    bullet.position.copy(origin);
    bullet.userData.active = true;
    bullet.userData.vel.copy(dir.normalize().multiplyScalar(BULLET_SPEED));
    bullet.userData.life = BULLET_LIFE;
    bullet.visible = true;
    bullets.push(bullet);
}

/**
 * 每帧更新子弹
 */
export function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.position.x += b.userData.vel.x * dt;
        b.position.y += b.userData.vel.y * dt;
        b.position.z += b.userData.vel.z * dt;
        b.userData.life -= dt;

        if (b.userData.life <= 0 || b.position.y < 0 || b.position.y > 30) {
            b.userData.active = false;
            b.visible = false;
            bullets.splice(i, 1);
        }
    }
}

// ── AK48 附加到右手柄 ──
export function attachAK48() {
    if (!ak48Model || !rightGrip || ak48Attached) return;

    const gunInstance = ak48Model.clone();
    gunInstance.scale.set(AK48_SCALE, AK48_SCALE, AK48_SCALE);
    gunInstance.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
    });

    gunInstance.position.set(0, -0.1, 0.01);   // <-- 位置 XYZ（米）
    gunInstance.rotation.x = -20;               // <-- X轴旋转
    gunInstance.rotation.y = Math.PI / 2;       // <-- Y轴旋转 90度（枪管朝前）

    rightGrip.add(gunInstance);
    ak48Attached = true;
    console.log('AK48 已成功附加到右手柄');
}

// ── AK48 附加到左手柄 ──
export function attachAK48ToLeft() {
    if (!ak48Model || !leftGrip || ak48LeftAttached) return;

    const gunInstance = ak48Model.clone();
    gunInstance.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
    });

    gunInstance.position.set(0, -0.1, 0.01);
    gunInstance.rotation.x = -20;
    gunInstance.rotation.y = -90 * Math.PI / 180;
    // 左手镜像
    gunInstance.scale.x = -AK48_SCALE;
    gunInstance.scale.y = AK48_SCALE;
    gunInstance.scale.z = AK48_SCALE;

    leftGrip.add(gunInstance);
    ak48LeftAttached = true;
    console.log('AK48 已成功附加到左手柄');
}

// ── 射击冷却 ──
let lastRightShootTime = 0;
let lastLeftShootTime = 0;

export function handleShooting(rightTriggerVal, leftTriggerVal) {
    const now = performance.now();

    if (rightController && rightTriggerVal) {
        if (now - lastRightShootTime > SHOOT_COOLDOWN) {
            shootBullet(rightController);
            lastRightShootTime = now;
        }
    }

    if (leftHandGunEnabled && leftController && leftTriggerVal) {
        if (now - lastLeftShootTime > SHOOT_COOLDOWN) {
            shootBullet(leftController);
            lastLeftShootTime = now;
        }
    }
}

// ── 龙骑加载器引用暴露 ──
export { gltfLoader, dracoLoader };
