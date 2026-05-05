// ==================== VR 手柄输入处理 + 控制器设置 ====================
import * as THREE from 'three';
import { dolly } from './scene.js';
import { renderer } from './scene.js';

// ── 摇杆输入状态 ──
export const rightInput = { stickX: 0, stickY: 0 };
export const leftInput = { stickX: 0, stickY: 0 };

// ── 扳机状态 ──
export let rightTrigger = false;
export let leftTrigger = false;

// ── 按键状态 ──
export const leftBtnState = { trigger: false, grip: false, stickBtn: false, btnX: false, btnY: false };
export const rightBtnState = { trigger: false, grip: false, stickBtn: false, btnA: false, btnB: false };

// ── 控制器引用 ──
export let leftController = null;
export let rightController = null;
export let leftGrip = null;
export let rightGrip = null;
export const controllers = [];

// ── AK48 模型引用（由 weapons.js 设置，input 不需要知道）──
// 但 setupController 需要知道何时附加枪支 —— 由 main.js 协调

/**
 * 创建空手柄模型（激光已移除，AK48 由 weapons.js 单独附加）
 */
function createControllerModel() {
    return new THREE.Group();
}

/**
 * 初始化单个控制器（idx: 0=左, 1=右）
 * @param {number} idx - 控制器序号
 * @param {Function} onRightSetup - 右手设置回调 (grip) => {}
 * @param {Function} onLeftSetup - 左手设置回调 (grip) => {}
 */
export function setupController(idx, onRightSetup, onLeftSetup) {
    const controller = renderer.xr.getController(idx);
    const grip = renderer.xr.getControllerGrip(idx);
    const model = createControllerModel();
    grip.add(model);
    dolly.add(controller);
    dolly.add(grip);
    controllers.push(controller);

    if (idx === 1) {
        rightGrip = grip;
        rightController = controller;
        if (onRightSetup) onRightSetup(grip);
    } else {
        leftGrip = grip;
        leftController = controller;
        if (onLeftSetup) onLeftSetup(grip);
    }
}

/**
 * 每帧读取手柄输入
 */
export function updateInputs() {
    const session = renderer.xr.getSession();
    if (!session) return;
    rightInput.stickX = 0; rightInput.stickY = 0;
    leftInput.stickX = 0; leftInput.stickY = 0;
    rightTrigger = false;
    leftTrigger = false;
    Object.keys(leftBtnState).forEach(k => leftBtnState[k] = false);
    Object.keys(rightBtnState).forEach(k => rightBtnState[k] = false);

    if (!session.inputSources) return;
    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const gp = source.gamepad;
        const hand = source.handedness;
        let sx = 0, sy = 0;
        if (gp.axes.length >= 4) { sx = gp.axes[2]; sy = gp.axes[3]; }
        else if (gp.axes.length >= 2) { sx = gp.axes[0]; sy = gp.axes[1]; }

        const triggerVal = gp.buttons[0]?.value || 0;
        const trigger = triggerVal > 0.5;
        const grip = gp.buttons[1]?.pressed || false;
        const stickBtn = gp.buttons[3]?.pressed || false;

        if (hand === 'right') {
            rightInput.stickX = sx; rightInput.stickY = sy;
            rightTrigger = trigger;
            rightBtnState.trigger = trigger;
            rightBtnState.grip = grip;
            rightBtnState.stickBtn = stickBtn;
            rightBtnState.btnA = gp.buttons[4]?.pressed || false;
            rightBtnState.btnB = gp.buttons[5]?.pressed || false;
        } else if (hand === 'left') {
            leftInput.stickX = sx; leftInput.stickY = sy;
            leftTrigger = trigger;
            leftBtnState.trigger = trigger;
            leftBtnState.grip = grip;
            leftBtnState.stickBtn = stickBtn;
            leftBtnState.btnX = gp.buttons[4]?.pressed || false;
            leftBtnState.btnY = gp.buttons[5]?.pressed || false;
        }
    }
}

/**
 * 处理退出 VR（右手 A/B 键）
 */
export function handleExit() {
    const session = renderer.xr.getSession();
    if (!session) return;
    if (!session.inputSources) return;
    for (const src of session.inputSources) {
        if (!src.gamepad) continue;
        if (src.handedness === 'right') {
            const btnA = src.gamepad.buttons[4]?.pressed;
            const btnB = src.gamepad.buttons[5]?.pressed;
            if (btnA || btnB) { session.end(); break; }
        }
    }
}
