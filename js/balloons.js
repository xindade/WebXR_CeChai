// ==================== 气球战斗系统：气球/骑士创建、AI、碰撞、波次、模型加载 ====================
import * as THREE from 'three';
import { scene, dolly, camera, balloonTex, isBalloonTexLoaded } from './scene.js';
import { bullets } from './weapons.js';
import { playBalloonPopSound } from './audio.js';
import { spawnParticles } from './particles.js';
import { spawnDebris } from './debris.js';
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
    CAMERA_HEIGHT,
    WAVE_BASE_SPAWN_COUNT, SPAWN_BATCH_SIZE, SPAWN_MAX_ACTIVE, SPAWN_BATCH_INTERVAL,
    BALLOON_REPEL_FORCE, BALLOON_DAMAGE,
    SHIP_COLLISION_RADIUS, SHIP_REPEL_FORCE,
    BOUND_X, BOUND_Z
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
let onBalloonShipCollision = null;

// ── 多阶段波次生成状态 ──
export let waveSpawnRemaining = 0;
export let wavePhaseTimer = 0;
let spawnBatchCooldown = 0;
let gameStartForwardAngle = null; // 首次生成时的玩家正方向

export function setPlayerStatsRef(stats) { playerStats = stats; }
export function setChoiceCardsActiveRef(ref) { choiceCardsActiveRef = ref; }
export function setWaveNumber(n) { waveNumber = n; }
export function onAllBalloonsDestroyed(fn) { onAllDestroyed = fn; }
export function setOnBalloonShipCollision(fn) { onBalloonShipCollision = fn; }

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
            window.__shipModel = shipModel; // 供 ship.js 闪烁使用
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

// ── 生成一波气球（初始化多阶段生成）──
export function spawnBalloons() {
    if (typeof _dbgShow === 'function') _dbgShow('🎈 第' + waveNumber + '波开始, 总生成' + (WAVE_BASE_SPAWN_COUNT + waveNumber * 5) + '个', '#88ffcc');
    balloons.forEach(b => disposeBalloon(b));
    balloons.length = 0;
    waveSpawnRemaining = WAVE_BASE_SPAWN_COUNT + waveNumber * 5;
    wavePhaseTimer = 0;
    spawnBatchCooldown = 0;

    // 首次生成时锁定正方向（固定玩家出生朝向，不随转头变化）
    if (gameStartForwardAngle === null) {
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        gameStartForwardAngle = Math.atan2(camDir.x, camDir.z);
    }
}

/**
 * 每帧调用：分批生成气球（多阶段方向）
 */
export function updateWaveSpawning(dt) {
    if (waveSpawnRemaining <= 0) return;

    wavePhaseTimer += dt;
    spawnBatchCooldown -= dt;

    // 判断当前阶段方向范围
    let angleRange = Math.PI * 2; // 默认全方向
    if (wavePhaseTimer < 15) {
        angleRange = Math.PI;       // 阶段1：仅前方 ±90°
    } else if (wavePhaseTimer < 30) {
        angleRange = Math.PI * 1.5; // 阶段2：前方+左右 ±135°
    } // 阶段3(30s+)：全方向

    if (spawnBatchCooldown > 0) return;

    // 计算当前活跃气球数
    const activeCount = balloons.filter(b => b.userData.active).length;
    if (activeCount >= SPAWN_MAX_ACTIVE) return;

    const playerPos = dolly.position.clone();
    const knightCount = (waveNumber >= 1) ? Math.min(KNIGHT_MAX_COUNT, 1 + Math.floor(Math.random() * KNIGHT_MAX_COUNT)) : 0;

    const batchSize = Math.min(SPAWN_BATCH_SIZE, waveSpawnRemaining);
    for (let i = 0; i < batchSize; i++) {
        let angle;
        if (angleRange < Math.PI * 2 && gameStartForwardAngle !== null) {
            // 前方限定模式：以出生时的固定朝向为基准
            angle = gameStartForwardAngle + (Math.random() - 0.5) * angleRange;
        } else {
            angle = Math.random() * Math.PI * 2;
        }
        const r = BALLOON_SPAWN_RADIUS + Math.random() * BALLOON_SPAWN_RADIUS_JITTER;
        const x = playerPos.x + Math.cos(angle) * r;
        const z = playerPos.z + Math.sin(angle) * r;
        const y = BALLOON_MIN_HEIGHT + Math.random() * BALLOON_HEIGHT_RANGE;

        const isKnight = (i < knightCount && knightCount > 0);
        if (isKnight) {
            createKnightBalloon(x, y, z);
        } else {
            createBalloon(x, y, z);
        }
        waveSpawnRemaining--;
    }

    spawnBatchCooldown = SPAWN_BATCH_INTERVAL;
}

// ── 更新气球AI（含排斥+船碰撞）──
export function updateBalloons(dt) {
    const playerPos = dolly.position.clone();
    playerPos.y += CAMERA_HEIGHT;

    // 船碰撞中心（世界坐标）
    const shipCenter = shipModel ? shipModel.position.clone() : new THREE.Vector3(SHIP_POS[0], SHIP_POS[1] + 1.0, SHIP_POS[2]);
    shipCenter.y += 1.0;

    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        if (!b.userData.active) continue;

        // ── 向玩家移动 ──
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

        // ── 气球-气球排斥（O(n²)，只与更小索引互斥）──
        for (let j = 0; j < i; j++) {
            const other = balloons[j];
            if (!other.userData.active) continue;
            const dx = b.position.x - other.position.x;
            const dz = b.position.z - other.position.z;
            const distSq = dx * dx + dz * dz;
            const minDist = (b.userData.radius || BALLOON_RADIUS) + (other.userData.radius || BALLOON_RADIUS);
            if (distSq < minDist * minDist && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const force = (minDist - dist) / minDist * BALLOON_REPEL_FORCE * dt;
                const nx = dx / dist, nz = dz / dist;
                b.position.x += nx * force;
                b.position.z += nz * force;
                other.position.x -= nx * force;
                other.position.z -= nz * force;
            }
        }

        // ── 气球-船排斥（防止穿模）──
        if (shipModel) {
            const toShipX = b.position.x - shipCenter.x;
            const toShipZ = b.position.z - shipCenter.z;
            const shipDistSq = toShipX * toShipX + toShipZ * toShipZ;
            if (shipDistSq < SHIP_COLLISION_RADIUS * SHIP_COLLISION_RADIUS && shipDistSq > 0.001) {
                const shipDist = Math.sqrt(shipDistSq);
                const force = (SHIP_COLLISION_RADIUS - shipDist) / SHIP_COLLISION_RADIUS * SHIP_REPEL_FORCE * dt;
                const nx = toShipX / shipDist, nz = toShipZ / shipDist;
                b.position.x += nx * force;
                b.position.z += nz * force;

                // 气球进入船活动区域 → 触发撞船伤害
                if (shipDist < SHIP_COLLISION_RADIUS * 0.5) {
                    b.userData.active = false;
                    b.visible = false;
                    if (onBalloonShipCollision) onBalloonShipCollision(b);
                    playBalloonPopSound();
                }
            }
        }
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
                    // 碎片 + 粒子 + 音效
                    const pos = balloon.position.clone();
                    const debColor = balloon.userData.isKnight ? 0xff8844 : 0xffaa44;
                    spawnDebris(pos, debColor, balloon.userData.isKnight ? 12 : 6);
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

// ── 清除所有气球（供船血系统调用）──
export function clearAllBalloons() {
    balloons.forEach(b => disposeBalloon(b));
    balloons.length = 0;
}

// ── 波次清空检测（需生成完+杀光才触发抽卡）──
export function checkAllBalloonsDestroyed() {
    if (choiceCardsActiveRef()) return;
    if (waveSpawnRemaining > 0) return; // 还有气球没生成完
    const activeBalloons = balloons.filter(b => b.userData.active);
    if (activeBalloons.length === 0 && onAllDestroyed) {
        onAllDestroyed();
    }
}
