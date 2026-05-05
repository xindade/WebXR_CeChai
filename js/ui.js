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
    debugCanvas.width = 512;
    debugCanvas.height = 512;  // 加高 256→512
    debugCtx = debugCanvas.getContext('2d');

    debugTexture = new THREE.CanvasTexture(debugCanvas);

    const panelGeo = new THREE.PlaneGeometry(0.18, 0.18);  // 加高 0.09→0.18
    const panelMat = new THREE.MeshBasicMaterial({
        map: debugTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    debugPanel = new THREE.Mesh(panelGeo, panelMat);

    debugPanel.position.set(0, 0.06, 0.04);
    debugPanel.rotation.x = -Math.PI * 0.35;

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
    roundRect(c, 0, 0, w, h, 24);
    c.fill();

    c.strokeStyle = '#00ffcc';
    c.lineWidth = 4;
    roundRect(c, 2, 2, w - 4, h - 4, 22);
    c.stroke();

    c.fillStyle = '#ff3333';
    c.font = 'bold 22px monospace';
    c.fillText('❤️ 玩家状态', 14, 36);

    c.fillStyle = '#ffffff';
    c.font = '16px monospace';   // 缩小字体 22→16
    const lines = info.split('\n');
    lines.forEach((line, i) => {
        c.fillText(line, 14, 60 + i * 20);  // 缩小行距 30→20
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
        for (let i = Math.max(0, log.length - 3); i < log.length; i++) {
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
    leftDebugCanvas.width = 512;
    leftDebugCanvas.height = 256;
    leftDebugCtx = leftDebugCanvas.getContext('2d');

    leftDebugTexture = new THREE.CanvasTexture(leftDebugCanvas);

    const panelGeo = new THREE.PlaneGeometry(0.18, 0.09);
    const panelMat = new THREE.MeshBasicMaterial({
        map: leftDebugTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    leftDebugPanel = new THREE.Mesh(panelGeo, panelMat);

    leftDebugPanel.position.set(0, 0.06, 0.04);
    leftDebugPanel.rotation.x = -Math.PI * 0.35;

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
    roundRect(c, 0, 0, w, h, 24);
    c.fill();

    c.strokeStyle = '#ff6600';
    c.lineWidth = 4;
    roundRect(c, 2, 2, w - 4, h - 4, 22);
    c.stroke();

    c.fillStyle = '#00ccff';
    c.font = 'bold 28px monospace';
    c.fillText('🎮 手柄按键', 18, 42);

    c.fillStyle = '#ffffff';
    c.font = '22px monospace';
    const lines = info.split('\n');
    lines.forEach((line, i) => {
        c.fillText(line, 18, 80 + i * 30);
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
    for (let i = Math.max(0, log.length - 4); i < log.length; i++) {
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
