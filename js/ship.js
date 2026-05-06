// ==================== 船血系统：血量/死亡/重开 ====================
import { SHIP_MAX_HP, BALLOON_DAMAGE } from './config.js';

// ── 状态 ──
export let shipHp = SHIP_MAX_HP;
export let gameOverState = false;

let onRestartCardCallback = null;
let playPopSoundFn = null;

export function setOnRestartCardCallback(fn) { onRestartCardCallback = fn; }
export function setPlayPopSoundFn(fn) { playPopSoundFn = fn; }
export function resetShipHp() { shipHp = SHIP_MAX_HP; }
export function getShipHp() { return shipHp; }

/**
 * 气球撞船回调（由 main.js 注入到 balloons.js）
 */
export function onBalloonHitShip(balloon) {
    if (gameOverState) return;
    shipHp -= BALLOON_DAMAGE;
    console.log('💥 气球撞船! 船血:' + shipHp + '/' + SHIP_MAX_HP);

    // 船闪烁效果（通过 window 桥接 scene 中的 shipModel 引用）
    const ship = window.__shipModel;
    if (ship) {
        ship.traverse(child => {
            if (child.isMesh && child.material) {
                const mat = child.material;
                if (mat.emissive) {
                    mat.emissive.setHex(0xff0000);
                    mat.emissiveIntensity = 0.8;
                    setTimeout(() => {
                        if (mat.emissive) mat.emissiveIntensity = 0;
                    }, 200);
                }
            }
        });
    }

    if (playPopSoundFn) playPopSoundFn();

    if (shipHp <= 0) {
        gameOver();
    }
}

/**
 * 游戏结束
 */
export function gameOver() {
    if (gameOverState) return;
    gameOverState = true;
    console.log('💀 游戏结束! 船被摧毁');

    // 清除所有气球（通过 window 桥接）
    if (window.__clearAllBalloons) window.__clearAllBalloons();

    setTimeout(() => {
        restartLevel();
    }, 1500);
}

/**
 * 重开当前波次
 */
export function restartLevel() {
    shipHp = SHIP_MAX_HP;
    gameOverState = false;

    // 重新生成气球（保留 waveNumber）
    spawnBalloons();

    // 0.5 秒后赠送一次抽卡
    setTimeout(() => {
        if (onRestartCardCallback) onRestartCardCallback();
    }, 500);
}

// 延迟引用气球模块（避免初始化时循环依赖）
let spawnBalloons = null;
export function setSpawnBalloonsRef(fn) { spawnBalloons = fn; }
