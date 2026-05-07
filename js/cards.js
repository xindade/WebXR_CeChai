// ==================== 强化选择卡系统 ====================
import * as THREE from 'three';
import { dolly, camera } from './scene.js';
import { leftController } from './input.js';
import { choiceOptions, CHOICE_CARD_DISTANCE,
    UI_PANEL_WIDTH, LEFT_UI_PANEL_HEIGHT,
    PLAYER_INITIAL_HP, PLAYER_INITIAL_ATK, PLAYER_INITIAL_SCORE,
    CARD_OUTER_RADIUS, CARD_BORDER_WIDTH,
    CARD_INNER_OFFSET, CARD_INNER_RADIUS,
    CARD_TITLE_FONT, CARD_TITLE_POS, CARD_HINT_FONT, CARD_HINT_POS,
    CARD_3D_SIZE, CARD_CAM_OFFSET_Y, CARD_SPACING,
    CARD_TIMEOUT, CARD_COLLISION_RADIUS
} from './config.js';
import { roundRect } from './utils.js';

// ── 状态 ──
export let choiceCardsActive = false;
export let extraBulletEnabled = false;
export let selectedCardIndex = -1;
export let choiceCardTimeout = null;

// 全局双弹标志（供 weapons.js 读取）
window.__extraBulletEnabled = false;

export const choiceCardGroup = new THREE.Group();
// dolly.add(choiceCardGroup) 延迟到 initChoiceCardGroup() 中调用

/** 在 dolly 初始化后调用 */
export function initChoiceCardGroup() {
    dolly.add(choiceCardGroup);
}

/**
 * 创建单张选择卡 Canvas 纹理 Mesh
 */
function createChoiceCard(option, index) {
    const canvas = document.createElement('canvas');
    canvas.width = UI_PANEL_WIDTH;
    canvas.height = LEFT_UI_PANEL_HEIGHT;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `rgba(${option.color.r},${option.color.g},${option.color.b},0.9)`;
    roundRect(ctx, 0, 0, UI_PANEL_WIDTH, LEFT_UI_PANEL_HEIGHT, CARD_OUTER_RADIUS);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = CARD_BORDER_WIDTH;
    roundRect(ctx, CARD_INNER_OFFSET, CARD_INNER_OFFSET,
        UI_PANEL_WIDTH - CARD_INNER_OFFSET * 2, LEFT_UI_PANEL_HEIGHT - CARD_INNER_OFFSET * 2,
        CARD_INNER_RADIUS);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = CARD_TITLE_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(option.label, CARD_TITLE_POS[0], CARD_TITLE_POS[1]);

    ctx.font = CARD_HINT_FONT;
    ctx.fillText('← 用左手柄碰触 →', CARD_HINT_POS[0], CARD_HINT_POS[1]);

    const texture = new THREE.CanvasTexture(canvas);
    const geom = new THREE.PlaneGeometry(...CARD_3D_SIZE);
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const card = new THREE.Mesh(geom, mat);
    card.userData = {
        isChoiceCard: true,
        label: option.label,
        index: index,
        optionIndex: index,
        originalColor: { r: option.color.r, g: option.color.g, b: option.color.b },
        canvas: canvas,
        ctx: ctx,
        texture: texture
    };
    return card;
}

/**
 * 弹出 3 张选择卡
 */
export function spawnChoiceCards() {
    if (choiceCardsActive) return;
    choiceCardsActive = true;
    selectedCardIndex = -1;

    // 清除旧选择卡
    while (choiceCardGroup.children.length > 0) {
        const child = choiceCardGroup.children[0];
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
        child.geometry.dispose();
        choiceCardGroup.remove(child);
    }

    const camLocalPos = camera.position.clone();
    const camLocalDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camLocalDir.y = 0;
    if (camLocalDir.lengthSq() < 0.001) camLocalDir.set(0, 0, -1);
    camLocalDir.normalize();

    const basePos = camLocalPos.clone().add(camLocalDir.clone().multiplyScalar(CHOICE_CARD_DISTANCE));
    basePos.y = camLocalPos.y + CARD_CAM_OFFSET_Y;

    const camLocalRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    camLocalRight.y = 0;
    camLocalRight.normalize();

    const faceTarget = camLocalPos.clone();

    for (let i = 0; i < 3; i++) {
        const card = createChoiceCard(choiceOptions[i], i);
        const offset = (i - 1) * CARD_SPACING;
        card.position.copy(basePos).addScaledVector(camLocalRight, offset);
        card.lookAt(faceTarget);
        choiceCardGroup.add(card);
    }

    console.log('🎴 选择卡已生成，等待左手柄碰触...');

    if (choiceCardTimeout) clearTimeout(choiceCardTimeout);
    choiceCardTimeout = setTimeout(() => {
        if (choiceCardsActive) {
            console.log('⏱️ 选择卡超时，自动跳过进入下一轮');
            clearChoiceCards();
        }
    }, CARD_TIMEOUT);
}

// ── 清除后回调（由 main.js 注入，处理波次推进 / 神掌解锁）──
export let onAfterClearChoiceCards = null;

/**
 * 清除选择卡并触发下一波
 */
export function clearChoiceCards() {
    choiceCardsActive = false;
    if (choiceCardTimeout) {
        clearTimeout(choiceCardTimeout);
        choiceCardTimeout = null;
    }
    while (choiceCardGroup.children.length > 0) {
        const child = choiceCardGroup.children[0];
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
        child.geometry.dispose();
        choiceCardGroup.remove(child);
    }
    // 通知 main.js 推进波次（通过 window 全局回调，避免模块命名空间写入兼容问题）
    if (window.__onAfterClearChoiceCards) {
        if (typeof _dbgShow === 'function') _dbgShow('📤 调用波次回调...', '#ffdd44');
        window.__onAfterClearChoiceCards();
    } else {
        if (typeof _dbgShow === 'function') _dbgShow('⚠️ 回调未注册！', '#ff4444');
    }
}

/**
 * 检测左手柄与选择卡的碰撞
 */
export function checkLeftHandChoiceCardCollision() {
    if (!choiceCardsActive || !leftController) return;

    const leftPos = new THREE.Vector3();
    leftController.getWorldPosition(leftPos);

    for (let j = choiceCardGroup.children.length - 1; j >= 0; j--) {
        const card = choiceCardGroup.children[j];
        if (!card.userData.isChoiceCard) continue;

        const cardWorldPos = new THREE.Vector3();
        card.getWorldPosition(cardWorldPos);

        const dist = leftPos.distanceTo(cardWorldPos);
        if (dist < CARD_COLLISION_RADIUS) {
            const index = card.userData.index;
            const flags = { extraBulletEnabled: false };
            choiceOptions[index].effect(
                window.__playerStats || { hp: PLAYER_INITIAL_HP, atk: PLAYER_INITIAL_ATK, score: PLAYER_INITIAL_SCORE },
                flags
            );
            if (flags.extraBulletEnabled) {
                extraBulletEnabled = true;
                window.__extraBulletEnabled = true;
            }
            clearChoiceCards();
            return;
        }
    }
}
