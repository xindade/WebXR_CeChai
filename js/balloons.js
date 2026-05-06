// ==================== 气球战斗系统：气球/骑士创建、AI、碰撞、波次、模型加载 ====================
import * as THREE from 'three';
import { scene, dolly, camera, balloonTex, isBalloonTexLoaded } from './scene.js';
import { bullets } from './weapons.js';
import { playBalloonPopSound } from './audio.js';
import { spawnParticles } from './particles.js';
import { gltfLoader } from './weapons.js';
import {
    BALLOON_COUNT, BALLOON_HP, BALLOON_SPEED, BALLOON_SPAWN_RADIUS,
    BALLOON_RADIUS, BALLOON_SCORE, BALLOON_COLORS,
    BALLOON_GEOM_SEGMENTS, BALLOON_MAT_ROUGHNESS, BALLOON_MAT_METALNESS,
    BALLOON_EMISSIVE_I, BALLOON_EMISSIVE_HIT, BALLOON_HIT_DURATION,
    BALLOON_MIN_HEIGHT, BALLOON_HEIGHT_RANGE,
    BALLOON_SPAWN_ANGLE_JITTER, BALLOON_SPAWN_RADIUS_JITTER,
    BALLOON_FLOAT_FREQ, BALLOON_FLOAT_AMP,
    BALLOON_COLLISION_BUFFER,
    KNIGHT_HP, KNIGHT_SCORE, KNIGHT_SCALE, KNIGHT_RADIUS, KNIGHT_MAX_COUNT,
    SHIP_SCALE, SHIP_POS, SHIP_ROT,
    CAMERA_HEIGHT
} from './config.js';

// ── 气球列表 ──
export const balloons = [];
export const balloonGroup = new THREE.Group();
// scene.add(balloonGroup) 延迟到 initBalloonGroup() 中调用

// ── 模型 ──
export let knightModel = null;
export let shipModel = null;

// ── 玩家状态引用（由 main.js 注入）──
export let playerStats = null;
export let waveNumber = 0;

// ── 外部状态引用 ──
let choiceCardsActiveRef = () => false;
let onAllDestroyed = null;

export function setPlayerStatsRef(stats) { playerStats = stats; }
export function setChoiceCardsActiveRef(ref) { choiceCardsActiveRef = ref; }
export function setWaveNumber(n) { waveNumber = n; }
export function onAllBalloonsDestroyed(fn) { onAllDestroyed = fn; }

/** 在 scene 初始化后调用，将 balloonGroup 挂入场景 */
export function initBalloonGroup() {
    scene.add(balloonGroup);
}

// ── 加载骑士模型 ──
export function loadKnightModel() {
    gltfLoader.load(
        'Model/骑士.glb',
        (gltf) => {
            knightModel = gltf.scene;
            console.log('✅ 骑士模型加载成功');
        },
        undefined,
        () => console.warn('⚠️ 骑士模型未找到')
    );
}

// ── 加载气球船模型 ──
export function loadShipModel() {
    gltfLoader.load(
        'Model/气球船.glb',
        (gltf) => {
            console.log('✅ 气球船.glb 加载成功');
            shipModel = gltf.scene;
            shipModel.scale.setScalar(SHIP_SCALE);
            shipModel.position.set(...SHIP_POS);
            shipModel.rotation.set(...SHIP_ROT);
            shipModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(shipModel);
        },
        (progress) => {
            if (progress.total > 0) {
                console.log('气球船 加载: ' + (progress.loaded / progress.total * 100).toFixed(1) + '%');
            }
        },
        (error) => {
            console.warn('⚠️ 气球船.glb 未找到，跳过气球船模型');
        }
    );
}

// ── 创建普通气球 ──
function createBalloon(x, y, z) {
    const geom = new THREE.SphereGeometry(BALLOON_RADIUS, BALLOON_GEOM_SEGMENTS, BALLOON_GEOM_SEGMENTS);
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const mat = new THREE.MeshStandardMaterial({
        map: isBalloonTexLoaded() ? balloonTex : null,
        color: color,
        roughness: BALLOON_MAT_ROUGHNESS,
        metalness: BALLOON_MAT_METALNESS,
        emissive: color,
        emissiveIntensity: BALLOON_EMISSIVE_I
    });
    const balloon = new THREE.Mesh(geom, mat);
    balloon.position.set(x, y, z);
    balloon.castShadow = true;
    balloon.userData = {
        active: true, hp: BALLOON_HP, maxHp: BALLOON_HP,
        isKnight: false, radius: BALLOON_RADIUS
    };
    balloonGroup.add(balloon);
    balloons.push(balloon);
    return balloon;
}

// ── 创建骑士气球 ──
function createKnightBalloon(x, y, z) {
    if (!knightModel) return createBalloon(x, y, z);
    const knight = knightModel.clone();
    knight.scale.setScalar(KNIGHT_SCALE);
    knight.position.set(x, y, z);
    knight.traverse(child => { if (child.isMesh) child.castShadow = true; });
    knight.userData = {
        active: true, hp: KNIGHT_HP, maxHp: KNIGHT_HP,
        isKnight: true, radius: KNIGHT_RADIUS
    };
    balloonGroup.add(knight);
    balloons.push(knight);
    return knight;
}

// ── 销毁气球 ──
function disposeBalloon(b) {
    if (b.userData.isKnight) {
        b.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    } else {
        b.geometry.dispose();
        b.material.dispose();
    }
    balloonGroup.remove(b);
}

// ── 生成一波气球 ──
export function spawnBalloons() {
    if (typeof _dbgShow === 'function') _dbgShow('🎈 spawnBalloons 第' + waveNumber + '波, 骑士=' + (waveNumber >= 1), '#88ffcc');
    balloons.forEach(b => disposeBalloon(b));
    balloons.length = 0;

    const knightCount = (waveNumber >= 1)
        ? Math.min(KNIGHT_MAX_COUNT, 1 + Math.floor(Math.random() * KNIGHT_MAX_COUNT))
        : 0;
    const normalCount = BALLOON_COUNT - knightCount;

    const playerPos = dolly.position.clone();
    const indices = Array.from({ length: BALLOON_COUNT }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const knightIndices = new Set(indices.slice(0, knightCount));

    for (let i = 0; i < BALLOON_COUNT; i++) {
        const angle = (Math.PI * 2 / BALLOON_COUNT) * i + Math.random() * BALLOON_SPAWN_ANGLE_JITTER;
        const r = BALLOON_SPAWN_RADIUS + Math.random() * BALLOON_SPAWN_RADIUS_JITTER;
        const x = playerPos.x + Math.cos(angle) * r;
        const z = playerPos.z + Math.sin(angle) * r;
        const y = BALLOON_MIN_HEIGHT + Math.random() * BALLOON_HEIGHT_RANGE;
        if (knightIndices.has(i)) {
            createKnightBalloon(x, y, z);
        } else {
            createBalloon(x, y, z);
        }
    }
}

// ── 更新气球AI ──
export function updateBalloons(dt) {
    const playerPos = dolly.position.clone();
    playerPos.y += CAMERA_HEIGHT;

    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        if (!b.userData.active) continue;

        const dir = new THREE.Vector3().subVectors(playerPos, b.position).normalize();
        b.position.x += dir.x * BALLOON_SPEED * dt;
        b.position.y += dir.y * BALLOON_SPEED * dt;
        b.position.z += dir.z * BALLOON_SPEED * dt;

        if (!b.userData.isKnight) {
            b.lookAt(playerPos);
            b.rotateY(-Math.PI / 2);
        } else {
            b.lookAt(playerPos);
        }

        b.position.y += Math.sin(performance.now() * BALLOON_FLOAT_FREQ + i) * BALLOON_FLOAT_AMP;
    }
}

// ── 子弹碰撞检测 ──
export function checkBulletBalloonCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = balloons.length - 1; j >= 0; j--) {
            const balloon = balloons[j];
            if (!balloon.userData.active) continue;

            const hitRadius = balloon.userData.radius || BALLOON_RADIUS;
            const dist = bullet.position.distanceTo(balloon.position);
            if (dist < hitRadius + BALLOON_COLLISION_BUFFER) {
                balloon.userData.hp -= (playerStats ? playerStats.atk : 30);

                if (!balloon.userData.isKnight && balloon.material.emissiveIntensity !== undefined) {
                    balloon.material.emissiveIntensity = BALLOON_EMISSIVE_HIT;
                    setTimeout(() => {
                        if (balloon.userData) balloon.material.emissiveIntensity = BALLOON_EMISSIVE_I;
                    }, BALLOON_HIT_DURATION);
                }

                if (balloon.userData.hp <= 0) {
                    balloon.userData.active = false;
                    if (balloon.userData.isKnight) {
                        balloon.traverse(c => { if (c.isMesh) c.visible = false; });
                    } else {
                        balloon.visible = false;
                    }
                    if (playerStats) {
                        playerStats.score += balloon.userData.isKnight ? KNIGHT_SCORE : BALLOON_SCORE;
                    }
                    playBalloonPopSound();
                }
                bullet.userData.active = false;
                bullet.visible = false;
                bullets.splice(i, 1);

                checkAllBalloonsDestroyed();
                break;
            }
        }
    }
}

// ── 波次清空检测 ──
export function checkAllBalloonsDestroyed() {
    if (choiceCardsActiveRef()) return;
    const activeBalloons = balloons.filter(b => b.userData.active);
    if (activeBalloons.length === 0 && onAllDestroyed) {
        onAllDestroyed();
    }
}
