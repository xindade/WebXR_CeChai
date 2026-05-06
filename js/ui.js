// ==================== 手腕 UI 面板（右手血量/得分 + 左手神掌状态） ====================
import * as THREE from 'three';
import { rightGrip, leftGrip } from './input.js';
import { balloons } from './balloons.js';
import { BALLOON_COUNT } from './config.js';
import { roundRect } from './utils.js';
import {
    buddhaPalmReady, buddhaPalmCooldown,
    buddhaPalmState, buddhaPalmTimer
} from './buddhaPalm.js';
import {
    UI_PANEL_WIDTH, UI_PANEL_HEIGHT,
    UI_PANEL_3D_WIDTH, UI_PANEL_3D_HEIGHT,
    UI_PANEL_POS_X, UI_PANEL_POS_Y, UI_PANEL_POS_Z,
    UI_PANEL_ROT_X,
    LEFT_UI_PANEL_WIDTH, LEFT_UI_PANEL_HEIGHT,
    LEFT_UI_PANEL_3D_WIDTH, LEFT_UI_PANEL_3D_HEIGHT,
    LEFT_UI_PANEL_POS_X, LEFT_UI_PANEL_POS_Y, LEFT_UI_PANEL_POS_Z,
    LEFT_UI_PANEL_ROT_X,
    UI_RADIUS, UI_BORDER, UI_INNER_OFFSET, UI_INNER_RADIUS,
    UI_TITLE_FONT, UI_TITLE_POS, UI_INFO_FONT,
    UI_INFO_START, UI_INFO_LINE_H, UI_LOG_LINES,
    LEFT_UI_RADIUS, LEFT_UI_BORDER,
    LEFT_UI_INNER_OFFSET, LEFT_UI_INNER_RADIUS,
    LEFT_UI_TITLE_FONT, LEFT_UI_TITLE_POS, LEFT_UI_INFO_FONT,
    LEFT_UI_INFO_START, LEFT_UI_INFO_LINE_H, LEFT_UI_LOG_LINES
} from './config.js';

// ── 玩家状态引用 ──
let playerStatsRef = null;
let extraBulletEnabledRef = () => false;
export function setUIPlayerStatsRef(ref) { playerStatsRef = ref; }
export function setUIExtraBulletRef(ref) { extraBulletEnabledRef = ref; }

// ── 右手腕面板 ──
let debugPanel = null;
let debugCanvas = null;
let debugCtx = null;
let debugTexture = null;

export function createDebugPanel() {
    debugCanvas = document.createElement('canvas');
    debugCanvas.width = UI_PANEL_WIDTH;
    debugCanvas.height = UI_PANEL_HEIGHT;
    debugCtx = debugCanvas.getContext('2d');

    debugTexture = new THREE.CanvasTexture(debugCanvas);

    const panelGeo = new THREE.PlaneGeometry(UI_PANEL_3D_WIDTH, UI_PANEL_3D_HEIGHT);
    const panelMat = new THREE.MeshBasicMaterial({
        map: debugTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    debugPanel = new THREE.Mesh(panelGeo, panelMat);

    debugPanel.position.set(UI_PANEL_POS_X, UI_PANEL_POS_Y, UI_PANEL_POS_Z);
    debugPanel.rotation.x = UI_PANEL_ROT_X;

    drawDebugPanel('初始化中...');
    return debugPanel;
}

function drawDebugPanel(info) {
    if (!debugCtx) return;
    const c = debugCtx;
    const w = debugCanvas.width;
    const h = debugCanvas.height;

    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.82)';
    roundRect(c, 0, 0, w, h, UI_RADIUS);
    c.fill();

    c.strokeStyle = '#00ffcc';
    c.lineWidth = UI_BORDER;
    roundRect(c, UI_INNER_OFFSET, UI_INNER_OFFSET, w - UI_INNER_OFFSET * 2, h - UI_INNER_OFFSET * 2, UI_INNER_RADIUS);
    c.stroke();

    c.fillStyle = '#ff3333';
    c.font = UI_TITLE_FONT;
    c.fillText('❤️ 玩家状态', UI_TITLE_POS[0], UI_TITLE_POS[1]);

    c.fillStyle = '#ffffff';
    c.font = UI_INFO_FONT;
    const lines = info.split('\n');
    lines.forEach((line, i) => {
        c.fillText(line, UI_INFO_START[0], UI_INFO_START[1] + i * UI_INFO_LINE_H);
    });

    if (debugTexture) debugTexture.needsUpdate = true;
}

export function updateDebugPanel() {
    if (!rightGrip || !debugPanel) return;
    if (!playerStatsRef) return;

    const activeBalloons = balloons.filter(b => b.userData.active).length;
    const extraStr = extraBulletEnabledRef() ? '✅' : '❌';
    let lines = [
        `❤️ 血量 ${playerStatsRef.hp}`,
        `🎯 得分 ${playerStatsRef.score}`,
        `⚔️ 攻击 ${playerStatsRef.atk}`,
        `🎈 气球 ${activeBalloons}/${BALLOON_COUNT}`,
        `🔫 双弹 ${extraStr}`,
    ];
    // 追加 VR 调试日志（后 3 条，显示在右手腕）
    const log = window.__debugLog || [];
    if (log.length > 0) {
        lines.push('---');
        for (let i = Math.max(0, log.length - UI_LOG_LINES); i < log.length; i++) {
            lines.push(log[i].substring(0, 24));
        }
    }
    const info = lines.join('\n');

    drawDebugPanel(info);
}

// ── 左手腕面板 ──
let leftDebugPanel = null;
let leftDebugCanvas = null;
let leftDebugCtx = null;
let leftDebugTexture = null;

export function createLeftDebugPanel() {
    leftDebugCanvas = document.createElement('canvas');
    leftDebugCanvas.width = LEFT_UI_PANEL_WIDTH;
    leftDebugCanvas.height = LEFT_UI_PANEL_HEIGHT;
    leftDebugCtx = leftDebugCanvas.getContext('2d');

    leftDebugTexture = new THREE.CanvasTexture(leftDebugCanvas);

    const panelGeo = new THREE.PlaneGeometry(LEFT_UI_PANEL_3D_WIDTH, LEFT_UI_PANEL_3D_HEIGHT);
    const panelMat = new THREE.MeshBasicMaterial({
        map: leftDebugTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    leftDebugPanel = new THREE.Mesh(panelGeo, panelMat);

    leftDebugPanel.position.set(LEFT_UI_PANEL_POS_X, LEFT_UI_PANEL_POS_Y, LEFT_UI_PANEL_POS_Z);
    leftDebugPanel.rotation.x = LEFT_UI_PANEL_ROT_X;

    drawLeftDebugPanel('初始化中...');
    return leftDebugPanel;
}

function drawLeftDebugPanel(info) {
    if (!leftDebugCtx) return;
    const c = leftDebugCtx;
    const w = leftDebugCanvas.width;
    const h = leftDebugCanvas.height;

    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.82)';
    roundRect(c, 0, 0, w, h, LEFT_UI_RADIUS);
    c.fill();

    c.strokeStyle = '#ff6600';
    c.lineWidth = LEFT_UI_BORDER;
    roundRect(c, LEFT_UI_INNER_OFFSET, LEFT_UI_INNER_OFFSET,
        w - LEFT_UI_INNER_OFFSET * 2, h - LEFT_UI_INNER_OFFSET * 2,
        LEFT_UI_INNER_RADIUS);
    c.stroke();

    c.fillStyle = '#00ccff';
    c.font = LEFT_UI_TITLE_FONT;
    c.fillText('🎮 手柄按键', LEFT_UI_TITLE_POS[0], LEFT_UI_TITLE_POS[1]);

    c.fillStyle = '#ffffff';
    c.font = LEFT_UI_INFO_FONT;
    const lines = info.split('\n');
    lines.forEach((line, i) => {
        c.fillText(line, LEFT_UI_INFO_START[0], LEFT_UI_INFO_START[1] + i * LEFT_UI_INFO_LINE_H);
    });

    if (leftDebugTexture) leftDebugTexture.needsUpdate = true;
}

export function updateLeftDebugPanel() {
    if (!leftGrip || !leftDebugPanel) return;

    const cdSec = Math.max(0, buddhaPalmCooldown).toFixed(1);
    const unlockStr = buddhaPalmReady ? '✅ 已解锁' : '🔒 未解锁';
    let aimStr = '';
    if (buddhaPalmState === 'AIMING') {
        aimStr = `🎯 瞄准中 ${Math.ceil(buddhaPalmTimer)}秒`;
    } else if (buddhaPalmState === 'SLAMMING') {
        aimStr = '🖐 神掌释放中!';
    } else if (buddhaPalmState === 'IDLE' && buddhaPalmCooldown > 0) {
        aimStr = `⏳ 冷却 ${cdSec}秒`;
    } else if (buddhaPalmReady) {
        aimStr = '🟢 握柄释放';
    }
    let lines = [
        `🖐 ${unlockStr}`,
        `   ${aimStr}`,
        `──────────────`,
    ];
    // 追加 VR 调试日志（后 4 条）
    const log = window.__debugLog || [];
    for (let i = Math.max(0, log.length - LEFT_UI_LOG_LINES); i < log.length; i++) {
        lines.push(log[i].substring(0, 24));
    }
    const info = lines.join('\n');

    drawLeftDebugPanel(info);
}

// ── 2D HTML UI 辅助 ──
export function getDOMElement(id) {
    return document.getElementById(id);
}

export function showVREntry() {
    const el = document.getElementById('vr-entry');
    if (el) el.style.display = 'block';
}

export function hideVREntry() {
    const el = document.getElementById('vr-entry');
    if (el) el.style.display = 'none';
}
