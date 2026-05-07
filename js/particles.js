// ==================== 粒子爆炸特效 ====================
import * as THREE from 'three';
import { scene } from './scene.js';
import { PARTICLE_COUNT, PARTICLE_LIFE, PARTICLE_RADIUS, PARTICLE_GEOM_SEG, PARTICLE_DAMPING } from './config.js';

export const particleGroup = new THREE.Group();
// scene.add(particleGroup) 延迟到 initParticlePool() 中调用

// 粒子对象池
export const particlePool = [];

export function initParticlePool() {
    scene.add(particleGroup); // 此时 scene 已初始化
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const geom = new THREE.SphereGeometry(PARTICLE_RADIUS, PARTICLE_GEOM_SEG, PARTICLE_GEOM_SEG);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData = { active: false, vel: new THREE.Vector3(), life: 0 };
        mesh.visible = false;
        particleGroup.add(mesh);
        particlePool.push(mesh);
    }
}

/**
 * 在指定位置生成爆炸粒子
 * @param {THREE.Vector3} position - 世界坐标位置
 * @param {number} color - 颜色色值 (hex)
 * @param {number} count - 生成数量
 */
export function spawnParticles(position, color, count = 30) {
    for (let i = 0; i < count; i++) {
        const p = particlePool.find(p => !p.userData.active);
        if (!p) break;

        p.position.copy(position);
        p.userData.active = true;
        p.userData.life = PARTICLE_LIFE;
        p.userData.vel.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        p.material.color.setHex(color);
        p.material.opacity = 1.0;
        p.visible = true;
    }
}

/**
 * 每帧更新粒子状态
 */
export function updateParticles(dt) {
    for (let i = 0; i < particlePool.length; i++) {
        const p = particlePool[i];
        if (!p.userData.active) continue;

        p.position.addScaledVector(p.userData.vel, dt);
        p.userData.vel.multiplyScalar(PARTICLE_DAMPING);
        p.userData.life -= dt;
        p.material.opacity = Math.max(0, p.userData.life / PARTICLE_LIFE);

        if (p.userData.life <= 0) {
            p.userData.active = false;
            p.visible = false;
        }
    }
}
