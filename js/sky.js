// ==================== 日夜黄昏天空系统 ====================
import * as THREE from 'three';
import { skyPresets, skyCycle, DAY_SUN_AZ, SKY_TRANSITION_SPEED,
    SUN_SPRITE_SCALE, MOON_SPRITE_SCALE, SUN_DIST, MOON_DIST,
    SPRITE_OPACITY_OFFSET, SPRITE_OPACITY_RANGE,
    STAR_ROT_BASE, STAR_ROT_INCREMENT,
    STAR_OPACITY_BASE, STAR_OPACITY_INCREMENT,
    STAR_FLICKER_BASE, STAR_FLICKER_AMP,
    STAR_FLICKER_FREQ, STAR_FLICKER_LAYER_OFFSET
} from './config.js';
import {
    renderer, scene, camera, dolly,
    skyDome, skyDomeMat, starLayers,
    sunLight, ambientLight, hemiLight
} from './scene.js';
import { loadSpriteImage, createSunCanvasTexture, createMoonCanvasTexture } from './utils.js';

// ── 太阳/月亮精灵 ──
export let sunSprite, moonSprite;
export let sunSpriteMat, moonSpriteMat;

// ── 当前天空状态（每帧 lerp 到目标预设）──
export let skyTarget = 'day';
export const skyNow = {
    bg: new THREE.Color(skyPresets.day.bg),
    fog: new THREE.Color(skyPresets.day.fog),
    fogNear: 30, fogFar: 100,
    skyDome: new THREE.Color(skyPresets.day.skyDome),
    ambient: new THREE.Color(skyPresets.day.ambient),
    ambientI: skyPresets.day.ambientI,
    sun: new THREE.Color(skyPresets.day.sun),
    sunI: skyPresets.day.sunI,
    sunX: 20, sunY: 40, sunZ: 10,
    hemiSky: new THREE.Color(skyPresets.day.hemiSky),
    hemiGround: new THREE.Color(skyPresets.day.hemiGround),
    hemiI: skyPresets.day.hemiI,
    stars: 0,
    sunElev: 50, moonElev: -30, moonAz: DAY_SUN_AZ
};

// ── VR 天空切换按钮状态 ──
let prevLeftX = false, prevLeftY = false;

/**
 * VR 中左手 X/Y 切换天空（由 main.js 每帧调用）
 * @param {{ btnX: boolean, btnY: boolean }} leftBtnState
 */
export function checkVRSkySwitch(leftBtnState) {
    if (leftBtnState.btnX && !prevLeftX) cycleSky(1);
    if (leftBtnState.btnY && !prevLeftY) cycleSky(-1);
    prevLeftX = leftBtnState.btnX;
    prevLeftY = leftBtnState.btnY;
}

export function initSky() {
    // ── 太阳精灵 ──
    const sunTex = createSunCanvasTexture();
    sunSpriteMat = new THREE.SpriteMaterial({
        map: sunTex, color: 0xffffff,
        transparent: true, depthWrite: false, blending: THREE.NormalBlending, opacity: 1
    });
    sunSprite = new THREE.Sprite(sunSpriteMat);
    sunSprite.scale.set(...SUN_SPRITE_SCALE);
    dolly.add(sunSprite);

    // ── 月牙精灵 ──
    const moonTex = createMoonCanvasTexture();
    moonSpriteMat = new THREE.SpriteMaterial({
        map: moonTex, color: 0xffffff,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
    });
    moonSprite = new THREE.Sprite(moonSpriteMat);
    moonSprite.scale.set(...MOON_SPRITE_SCALE);
    dolly.add(moonSprite);

    // 尝试加载图片替换
    loadSpriteImage('image/sun.png', sunSpriteMat);
    loadSpriteImage('image/moon.png', moonSpriteMat);

    // ── HTML 时间按钮 ──
    const timeBtns = {
        day: document.getElementById('btn-day'),
        dusk: document.getElementById('btn-dusk'),
        night: document.getElementById('btn-night')
    };
    function setActiveTimeBtn(name) {
        Object.keys(timeBtns).forEach(k => timeBtns[k].classList.remove('active'));
        if (timeBtns[name]) timeBtns[name].classList.add('active');
    }
    timeBtns.day.addEventListener('click', () => { applySkyTarget('day'); setActiveTimeBtn('day'); });
    timeBtns.dusk.addEventListener('click', () => { applySkyTarget('dusk'); setActiveTimeBtn('dusk'); });
    timeBtns.night.addEventListener('click', () => { applySkyTarget('night'); setActiveTimeBtn('night'); });
}

/**
 * 设置天空过渡目标（不立即生效，由 updateSkyTransition 每帧 lerp）
 */
export function applySkyTarget(name) {
    skyTarget = name;
}

/**
 * 天空循环切换（VR 手柄 X/Y）
 */
export function cycleSky(direction = 1) {
    const idx = skyCycle.indexOf(skyTarget);
    const next = skyCycle[(idx + direction + 3) % 3];
    applySkyTarget(next);
    // 同步 HTML 按钮
    const timeBtns = {
        day: document.getElementById('btn-day'),
        dusk: document.getElementById('btn-dusk'),
        night: document.getElementById('btn-night')
    };
    Object.keys(timeBtns).forEach(k => timeBtns[k].classList.remove('active'));
    if (timeBtns[next]) timeBtns[next].classList.add('active');
}

/**
 * 每帧调用：lerp 全部天空属性向 skyPresets[skyTarget] 过渡
 */
export function updateSkyTransition(dt) {
    const p = skyPresets[skyTarget];
    const ease = 1 - Math.exp(-SKY_TRANSITION_SPEED * dt); // ~30秒完成95%过渡

    skyNow.bg.lerp(new THREE.Color(p.bg), ease);
    skyNow.fog.lerp(new THREE.Color(p.fog), ease);
    skyNow.skyDome.lerp(new THREE.Color(p.skyDome), ease);
    skyNow.ambient.lerp(new THREE.Color(p.ambient), ease);
    skyNow.sun.lerp(new THREE.Color(p.sun), ease);
    skyNow.hemiSky.lerp(new THREE.Color(p.hemiSky), ease);
    skyNow.hemiGround.lerp(new THREE.Color(p.hemiGround), ease);

    skyNow.ambientI += (p.ambientI - skyNow.ambientI) * ease;
    skyNow.sunI    += (p.sunI    - skyNow.sunI)    * ease;
    skyNow.hemiI   += (p.hemiI   - skyNow.hemiI)   * ease;
    skyNow.sunX    += (p.sunX    - skyNow.sunX)    * ease;
    skyNow.sunY    += (p.sunY    - skyNow.sunY)    * ease;
    skyNow.sunZ    += (p.sunZ    - skyNow.sunZ)    * ease;
    skyNow.fogNear += (p.fogNear - skyNow.fogNear) * ease;
    skyNow.fogFar  += (p.fogFar  - skyNow.fogFar)  * ease;
    skyNow.stars   += (p.stars   - skyNow.stars)   * ease;
    skyNow.sunElev += (p.sunElev - skyNow.sunElev) * ease;
    skyNow.moonElev += (p.moonElev - skyNow.moonElev) * ease;
    skyNow.moonAz  += (p.moonAz  - skyNow.moonAz)  * ease;

    // 应用到场景
    scene.background.copy(skyNow.bg);
    scene.fog.color.copy(skyNow.fog);
    scene.fog.near = skyNow.fogNear;
    scene.fog.far  = skyNow.fogFar;
    renderer.setClearColor(skyNow.bg);
    skyDomeMat.color.copy(skyNow.skyDome);
    ambientLight.color.copy(skyNow.ambient);
    ambientLight.intensity = skyNow.ambientI;
    sunLight.color.copy(skyNow.sun);
    sunLight.intensity = skyNow.sunI;
    sunLight.position.set(skyNow.sunX, skyNow.sunY, skyNow.sunZ);
    hemiLight.color.copy(skyNow.hemiSky);
    hemiLight.groundColor.copy(skyNow.hemiGround);
    hemiLight.intensity = skyNow.hemiI;

    // ── 太阳/月亮位置 ──
    const sunAzimuth = Math.atan2(skyNow.sunX, skyNow.sunZ);
    const D2R = Math.PI / 180;

    function placeSprite(sprite, azimuth, elevDeg, dist) {
        const el = elevDeg * D2R;
        const cosEl = Math.cos(el);
        sprite.position.x = Math.sin(azimuth) * cosEl * dist;
        sprite.position.y = Math.sin(el) * dist + 1.6;
        sprite.position.z = Math.cos(azimuth) * cosEl * dist;
    }
    placeSprite(sunSprite, sunAzimuth, skyNow.sunElev, SUN_DIST);
    placeSprite(moonSprite, skyNow.moonAz, skyNow.moonElev, MOON_DIST);

    sunSprite.material.opacity  = Math.max(0, Math.min(1, (skyNow.sunElev + SPRITE_OPACITY_OFFSET) / SPRITE_OPACITY_RANGE));
    moonSprite.material.opacity = Math.max(0, Math.min(1, (skyNow.moonElev + SPRITE_OPACITY_OFFSET) / SPRITE_OPACITY_RANGE));

    // ── 星空闪烁 + 缓慢旋转 ──
    const starsActive = skyNow.stars > 0.01;
    if (starsActive) {
        const now = performance.now() * 0.001;
        starLayers.forEach((sf, idx) => {
            sf.visible = true;
            sf.rotation.y += dt * (STAR_ROT_BASE + idx * STAR_ROT_INCREMENT);
            const base = skyNow.stars * (STAR_OPACITY_BASE + idx * STAR_OPACITY_INCREMENT);
            const flicker = STAR_FLICKER_BASE + STAR_FLICKER_AMP * Math.sin(now * STAR_FLICKER_FREQ + idx * STAR_FLICKER_LAYER_OFFSET);
            sf.material.opacity = Math.min(1, base * flicker);
        });
    } else {
        starLayers.forEach(sf => { sf.visible = false; });
    }
}
