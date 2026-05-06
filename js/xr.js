// ==================== WebXR 会话管理（进入/退出/状态重置） ====================
import { renderer, scene, setShadow } from './scene.js';
import { ak48Model, attachAK48, attachAK48ToLeft, leftHandGunEnabled, setLeftHandGunEnabled } from './weapons.js';
import { spawnBalloons, setWaveNumber } from './balloons.js';
import {
    buddhaPalmReady, buddhaPalmAttached, buddhaPalmCooldown, buddhaPalmSkills,
    setBuddhaPalmReady,
    buddhaPalmState, buddhaPalmTimer,
    attachBuddhaPalmToLeft
} from './buddhaPalm.js';
import { choiceCardsActive, choiceCardTimeout, clearChoiceCards, choiceCardGroup, extraBulletEnabled } from './cards.js';
import { hideVREntry, showVREntry } from './ui.js';
import { VR_ATTACH_GUN_DELAY, VR_SPAWN_DELAY } from './config.js';

// ── 游戏会话状态 ──
export let gameStarted = false;
export let gameWaveNumber = 0;

// ── DOM 元素 ──
const statusMsgEl = document.getElementById('status-msg');

// 用于 inject 到其他模块
export { gameWaveNumber as waveNumber };

/**
 * 进入 VR 核心函数
 * @param {boolean} isLeftHandMode - 是否启用左手持枪模式
 */
export async function enterVR(isLeftHandMode = false) {
    const enterVRBtn = document.getElementById('enter-vr-btn');
    const enterVRLeftHandBtn = document.getElementById('enter-vr-left-hand');

    if (enterVRBtn.disabled) return;
    enterVRBtn.disabled = true;
    if (enterVRLeftHandBtn) enterVRLeftHandBtn.disabled = true;
    enterVRBtn.textContent = '⏳ 启动中...';
    if (enterVRLeftHandBtn) enterVRLeftHandBtn.textContent = '⏳ 启动中...';

    try {
        if (!navigator.xr) {
            throw new Error('浏览器不支持 WebXR');
        }

        let session;
        try {
            if (navigator.xr.isSessionSupported) {
                const supported = await navigator.xr.isSessionSupported('immersive-vr');
                if (!supported) throw new Error('设备不支持VR');
            }
            session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor']
            });
        } catch (e) {
            console.log('使用 PICO 兼容模式:', e.message);
            session = await navigator.xr.requestSession('immersive-vr');
        }

        // 设置左手持枪模式
        setLeftHandGunEnabled(isLeftHandMode);
        console.log('🎮 左手持枪模式:', isLeftHandMode ? '已启用' : '未启用');

        renderer.xr.setSession(session);
        enterVRBtn.disabled = false;
        if (enterVRLeftHandBtn) enterVRLeftHandBtn.disabled = false;
        enterVRBtn.textContent = '🎈 正常开始游戏';
        if (enterVRLeftHandBtn) enterVRLeftHandBtn.textContent = '🔫 左手持枪模式';
    } catch (err) {
        statusMsgEl.innerHTML = '❌ ' + err.message;
        statusMsgEl.classList.add('error');
        enterVRBtn.disabled = false;
        if (enterVRLeftHandBtn) enterVRLeftHandBtn.disabled = false;
        enterVRBtn.textContent = '🎈 正常开始游戏';
        if (enterVRLeftHandBtn) enterVRLeftHandBtn.textContent = '🔫 左手持枪模式';
    }
}

/**
 * 注册 XR 会话事件
 */
export function registerXREvents() {
    renderer.xr.addEventListener('sessionstart', () => {
        setShadow(false);

        // 延迟附加枪支（等手柄就绪）
        setTimeout(() => { attachAK48(); }, VR_ATTACH_GUN_DELAY);
        if (leftHandGunEnabled) {
            setTimeout(() => { attachAK48ToLeft(); }, VR_ATTACH_GUN_DELAY);
        }

        // VR 开始时生成气球
        setTimeout(() => {
            if (!gameStarted) {
                gameStarted = true;
                spawnBalloons();
                console.log('🎈 气球战斗开始！');
            }
        }, VR_SPAWN_DELAY);
    });

    renderer.xr.addEventListener('sessionend', () => {
        setShadow(true);

        const enterVRBtn = document.getElementById('enter-vr-btn');
        const enterVRLeftHandBtn = document.getElementById('enter-vr-left-hand');

        if (enterVRBtn) enterVRBtn.disabled = false;
        if (enterVRLeftHandBtn) enterVRLeftHandBtn.disabled = false;
        showVREntry();
        if (statusMsgEl) statusMsgEl.style.display = 'none';

        // 重置游戏状态
        gameStarted = false;
        gameWaveNumber = 0;
        setWaveNumber(0);
        if (window.__resetShipHp) window.__resetShipHp();

        // 重置状态标志（只能通过 window.__ 桥接）
        setBuddhaPalmReady(false);
        window.__buddhaPalmAttached = false;
        window.__buddhaPalmCooldown = 0;
        setLeftHandGunEnabled(false);
        window.__ak48Attached = false;
        window.__ak48LeftAttached = false;
        window.__choiceCardsActive = false;

        if (choiceCardTimeout) { clearTimeout(choiceCardTimeout); }

        // 清除飞行中的神掌（从 scene 移除并释放资源）
        for (let i = buddhaPalmSkills.length - 1; i >= 0; i--) {
            const p = buddhaPalmSkills[i];
            p.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            scene.remove(p);
        }
        buddhaPalmSkills.length = 0;

        // 清除选择卡
        while (choiceCardGroup.children.length > 0) {
            const child = choiceCardGroup.children[0];
            if (child.material && child.material.map) child.material.map.dispose();
            if (child.material) child.material.dispose();
            if (child.geometry) child.geometry.dispose();
            choiceCardGroup.remove(child);
        }
    });
}

/**
 * 初始化 VR 进入按钮
 */
export function initVRButtons() {
    const enterVRBtn = document.getElementById('enter-vr-btn');
    const enterVRLeftHandBtn = document.getElementById('enter-vr-left-hand');

    if (enterVRBtn) enterVRBtn.onclick = () => enterVR(false);
    if (enterVRLeftHandBtn) enterVRLeftHandBtn.onclick = () => enterVR(true);
}
