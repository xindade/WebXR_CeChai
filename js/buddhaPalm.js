// ==================== 如来神掌系统（IDLE → AIMING → SLAMMING → IDLE） ====================
import * as THREE from 'three';
import { scene, dolly, camera } from './scene.js';
import { leftGrip, leftBtnState } from './input.js';
import { balloons, checkAllBalloonsDestroyed } from './balloons.js';
import { spawnParticles } from './particles.js';
import { playBalloonPopSound } from './audio.js';
import { gltfLoader } from './weapons.js';
import { BUDDHA_COOLDOWN, AIM_TIMEOUT, BALLOON_SCORE, KNIGHT_SCORE,
    BUDDHA_PROMPT_SCALE, BUDDHA_ATTACH_SCALE,
    BUDDHA_ATTACH_POS, BUDDHA_ATTACH_ROT, BUDDHA_PROMPT_POS,
    BUDDHA_PREVIEW_SCALE, BUDDHA_PREVIEW_POS,
    BUDDHA_RELEASE_SCALE, BUDDHA_RELEASE_FORWARD, BUDDHA_RELEASE_HEIGHT,
    BUDDHA_FALL_DURATION, BUDDHA_KILL_RADIUS, BUDDHA_DAMAGE,
    BUDDHA_PREVIEW_DIST, BUDDHA_PREVIEW_Y,
    BUDDHA_PARTICLE_COLOR, BUDDHA_PARTICLE_COUNT, BUDDHA_CLEANUP_DELAY
} from './config.js';

// ── 状态 ──
export let buddhaPalmModel = null;
export let buddhaPalmReady = false;
export function setBuddhaPalmReady(v) { buddhaPalmReady = v; }
export let buddhaPalmAttached = false;
export let buddhaPalmCooldown = 0;
export const buddhaPalmSkills = [];
export let buddhaPalmState = 'IDLE';    // IDLE | AIMING | SLAMMING
export let buddhaPalmTimer = 0;
export let promptSprite = null;
export let previewPalm = null;
export const aimDirection = new THREE.Vector3();

// ── 玩家状态引用 ──
let playerStatsRef = null;
export function setBuddhaPalmPlayerStatsRef(ref) { playerStatsRef = ref; }

/**
 * 创建提示文字精灵
 */
export function createPromptSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🖐️ 再按握柄释放如来神掌', 256, 55);
    ctx.fillStyle = '#aaa';
    ctx.font = '24px "Microsoft YaHei", sans-serif';
    ctx.fillText('或 5 秒后自动释放', 256, 95);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(...BUDDHA_PROMPT_SCALE);
    s.visible = false;
    return s;
}

/**
 * 加载如来神掌模型
 */
export function loadBuddhaPalmModel() {
    gltfLoader.load(
        'Model/如来神掌.glb',
        (gltf) => {
            buddhaPalmModel = gltf.scene;
            console.log('✅ 如来神掌模型加载成功');
        },
        undefined,
        () => console.warn('⚠️ 如来神掌模型未找到')
    );
}

/**
 * 装备如来神掌到左手
 */
export function attachBuddhaPalmToLeft() {
    if (!buddhaPalmModel || !leftGrip || buddhaPalmAttached) return;
    const palm = buddhaPalmModel.clone();
    palm.scale.setScalar(BUDDHA_ATTACH_SCALE);
    palm.position.set(...BUDDHA_ATTACH_POS);
    palm.rotation.set(...BUDDHA_ATTACH_ROT);
    palm.traverse(c => { if (c.isMesh) c.castShadow = true; });
    palm.userData = { isBuddhaPalm: true };
    leftGrip.add(palm);
    buddhaPalmAttached = true;
    promptSprite = createPromptSprite();
    promptSprite.position.set(...BUDDHA_PROMPT_POS);
    dolly.add(promptSprite);
    console.log('🖐️ 如来神掌已装备到左手');
}

/**
 * 进入瞄准模式（第一次按握柄）
 */
export function enterAimingMode() {
    buddhaPalmState = 'AIMING';
    buddhaPalmTimer = AIM_TIMEOUT;
    aimDirection.set(0, 0, -1).applyQuaternion(camera.quaternion);
    aimDirection.y = 0; aimDirection.normalize();

    if (buddhaPalmModel && !previewPalm) {
        previewPalm = buddhaPalmModel.clone();
        previewPalm.scale.setScalar(BUDDHA_PREVIEW_SCALE);
        previewPalm.rotation.set(-Math.PI / 2, 0, 0);
        previewPalm.traverse(c => { if (c.isMesh) c.castShadow = true; });
        previewPalm.userData = { isPreview: true };
        dolly.add(previewPalm);
    }
    if (previewPalm) {
        previewPalm.visible = true;
        previewPalm.position.set(...BUDDHA_PREVIEW_POS);
    }
    if (promptSprite) promptSprite.visible = true;
    console.log('🎯 瞄准：再按握柄释放，或' + AIM_TIMEOUT + '秒自动');
}

/**
 * 释放如来神掌（第二次按握柄 或 超时）
 */
export function releaseBuddhaPalm() {
    if (!buddhaPalmModel) return;
    if (promptSprite) promptSprite.visible = false;
    if (previewPalm) { previewPalm.visible = false; }
    buddhaPalmState = 'SLAMMING';
    buddhaPalmCooldown = BUDDHA_COOLDOWN;

    const palm = buddhaPalmModel.clone();
    palm.scale.setScalar(BUDDHA_RELEASE_SCALE);
    palm.rotation.set(-Math.PI / 2, 0, 0);
    palm.traverse(c => { if (c.isMesh) c.castShadow = true; });
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);
    palm.position.copy(camWorld).addScaledVector(aimDirection, BUDDHA_RELEASE_FORWARD);
    palm.position.y += BUDDHA_RELEASE_HEIGHT;
    palm.userData = {
        isBuddhaSkill: true,
        elapsed: 0,
        startY: palm.position.y,
        targetY: camWorld.y,
        fallDuration: BUDDHA_FALL_DURATION,
        killRadius: BUDDHA_KILL_RADIUS,
        damage: BUDDHA_DAMAGE
    };
    scene.add(palm);
    buddhaPalmSkills.push(palm);
    console.log('🖐 如来神掌释放！20x从' + palm.position.y.toFixed(1) + 'm落下');
}

/**
 * 每帧更新神掌状态
 */
export function updateBuddhaPalmSkills(dt) {
    if (buddhaPalmCooldown > 0) buddhaPalmCooldown -= dt;

    // 瞄准倒计时
    if (buddhaPalmState === 'AIMING') {
        buddhaPalmTimer -= dt;
        if (previewPalm && previewPalm.visible) {
            const offset = aimDirection.clone().multiplyScalar(BUDDHA_PREVIEW_DIST);
            offset.y = BUDDHA_PREVIEW_Y;
            previewPalm.position.copy(offset);
        }
        if (promptSprite && promptSprite.visible && buddhaPalmTimer > 0) {
            const remain = Math.ceil(buddhaPalmTimer);
            const cvs = promptSprite.material.map.source.data;
            if (cvs) {
                const c = cvs.getContext('2d');
                c.fillStyle = 'rgba(0,0,0,0.7)';
                c.fillRect(0, 0, 512, 128);
                c.fillStyle = '#ffd700';
                c.font = 'bold 36px "Microsoft YaHei", sans-serif';
                c.textAlign = 'center';
                c.fillText('🖐 再按握柄释放如来神掌', 256, 55);
                c.fillStyle = '#aaa';
                c.font = '24px "Microsoft YaHei", sans-serif';
                c.fillText('或 ' + remain + ' 秒后自动释放', 256, 95);
                promptSprite.material.map.needsUpdate = true;
            }
        }
        if (buddhaPalmTimer <= 0) releaseBuddhaPalm();
    }

    // 神掌下落
    for (let i = buddhaPalmSkills.length - 1; i >= 0; i--) {
        const palm = buddhaPalmSkills[i];
        const ud = palm.userData;
        ud.elapsed += dt;

        const t = Math.min(1, ud.elapsed / ud.fallDuration);
        palm.position.y = ud.startY + (ud.targetY - ud.startY) * t;

        if (t >= 1 && !ud.landed) {
            ud.landed = true;
            palm.position.y = ud.targetY;
            const pw = new THREE.Vector3(); palm.getWorldPosition(pw);
            let killed = 0;
            balloons.forEach(b => {
                if (!b.userData.active) return;
                if (b.position.distanceTo(pw) < ud.killRadius) {
                    b.userData.hp -= ud.damage;
                    if (b.userData.hp <= 0) {
                        b.userData.active = false;
                        if (b.userData.isKnight) {
                            b.traverse(c => { if (c.isMesh) c.visible = false; });
                            if (playerStatsRef) playerStatsRef.score += KNIGHT_SCORE;
                        } else {
                            b.visible = false;
                            if (playerStatsRef) playerStatsRef.score += BALLOON_SCORE;
                        }
                        killed++;
                    }
                }
            });
            console.log('🖐 神掌击杀 ' + killed + '（20x, 半径' + BUDDHA_KILL_RADIUS + ', 伤害' + BUDDHA_DAMAGE + '）');
            spawnParticles(pw, BUDDHA_PARTICLE_COLOR, BUDDHA_PARTICLE_COUNT);
            playBalloonPopSound();
            checkAllBalloonsDestroyed();
            ud.cleanupDelay = BUDDHA_CLEANUP_DELAY;
        }

        if (ud.cleanupDelay !== undefined) {
            ud.cleanupDelay -= dt;
            if (ud.cleanupDelay <= 0) {
                palm.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
                scene.remove(palm);
                buddhaPalmSkills.splice(i, 1);
                buddhaPalmState = 'IDLE';
            }
        }
    }
}

/**
 * 检测左手握柄触发（由 main.js 每帧调用）
 */
export function checkBuddhaPalmTrigger() {
    if (!buddhaPalmReady || buddhaPalmCooldown > 0) return;
    // 由外部检查 prevLeftGrip 变化
}

export let prevLeftGrip = false;
export function onLeftGripEdge(isPressed) {
    if (!buddhaPalmReady || buddhaPalmCooldown > 0) {
        prevLeftGrip = isPressed;
        return;
    }
    if (isPressed && !prevLeftGrip) {
        if (buddhaPalmState === 'IDLE') {
            enterAimingMode();
        } else if (buddhaPalmState === 'AIMING') {
            releaseBuddhaPalm();
        }
    }
    prevLeftGrip = isPressed;
}
