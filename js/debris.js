// ==================== 碎片爆炸特效（对象池）====================
import * as THREE from 'three';
import { scene } from './scene.js';
import { DEBRIS_COUNT, DEBRIS_LIFE } from './config.js';

export const debrisGroup = new THREE.Group();
// scene.add(debrisGroup) 延迟到 initDebrisPool() 中调用

export const debrisPool = [];

const sharedDebrisGeom = new THREE.TetrahedronGeometry(0.04, 0);
const sharedDebrisMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

export function initDebrisPool() {
    scene.add(debrisGroup);
    for (let i = 0; i < DEBRIS_COUNT; i++) {
        const mesh = new THREE.Mesh(sharedDebrisGeom, sharedDebrisMat);
        mesh.userData = {
            active: false,
            vel: new THREE.Vector3(),
            life: 0,
            rotVel: new THREE.Vector3()
        };
        mesh.visible = false;
        debrisGroup.add(mesh);
        debrisPool.push(mesh);
    }
}

/**
 * 在指定位置生成爆炸碎片
 * @param {THREE.Vector3} position - 世界坐标
 * @param {number} color - 颜色色值 (hex)
 * @param {number} count - 生成数量（默认 8）
 */
export function spawnDebris(position, color = 0xffaa44, count = 8) {
    for (let i = 0; i < count; i++) {
        const d = debrisPool.find(p => !p.userData.active);
        if (!d) break;

        d.position.copy(position);
        d.material.color.setHex(color);
        d.userData.active = true;
        d.userData.life = DEBRIS_LIFE;
        d.userData.vel.set(
            (Math.random() - 0.5) * 3,
            Math.random() * 3,
            (Math.random() - 0.5) * 3
        );
        d.userData.rotVel.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        d.visible = true;
    }
}

/**
 * 每帧更新碎片
 */
export function updateDebris(dt) {
    for (let i = 0; i < debrisPool.length; i++) {
        const d = debrisPool[i];
        if (!d.userData.active) continue;

        d.position.addScaledVector(d.userData.vel, dt);
        d.userData.vel.y += -4.0 * dt;  // 重力
        d.userData.vel.multiplyScalar(0.98); // 空气阻力
        d.rotation.x += d.userData.rotVel.x * dt;
        d.rotation.y += d.userData.rotVel.y * dt;
        d.rotation.z += d.userData.rotVel.z * dt;
        d.userData.life -= dt;
        d.material.opacity = Math.max(0, d.userData.life / DEBRIS_LIFE);

        if (d.userData.life <= 0) {
            d.userData.active = false;
            d.visible = false;
        }
    }
}
