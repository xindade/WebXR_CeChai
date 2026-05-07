// ==================== 玩家移动系统（dolly 真实移动） ====================
import * as THREE from 'three';
import { rightInput, leftInput } from './input.js';
import { dolly, camera } from './scene.js';
import { MOVE_SPEED, DEADZONE, BOUND_X, BOUND_Z } from './config.js';

/**
 * 每帧根据摇杆输入移动 dolly（双手柄合并，钳制在 4×8 米范围）
 */
export function handleMovement(dt) {
    let sx = rightInput.stickX, sy = rightInput.stickY;
    if (Math.abs(sx) < DEADZONE && Math.abs(sy) < DEADZONE) {
        sx = leftInput.stickX; sy = leftInput.stickY;
    }
    if (Math.abs(sx) < DEADZONE && Math.abs(sy) < DEADZONE) {
        return;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    const speed = MOVE_SPEED * dt;
    sy = -sy; // PICO 摇杆前推为负，取反
    const dx = (forward.x * sy + right.x * sx) * speed;
    const dz = (forward.z * sy + right.z * sx) * speed;
    const nx = dolly.position.x + dx;
    const nz = dolly.position.z + dz;

    dolly.position.x = Math.max(-BOUND_X, Math.min(BOUND_X, nx));
    dolly.position.z = Math.max(-BOUND_Z, Math.min(BOUND_Z, nz));
}
