// ==================== 共享工具函数 ====================
import * as THREE from 'three';
import {
    GLOW_INNER_STOP, GLOW_OUTER_STOP,
    CLOUD_TEXTURE_SIZE, CLOUD_COUNT,
    CLOUD_MARGIN_RATIO, CLOUD_MIN_SIZE_RATIO, CLOUD_RANDOM_SIZE_RATIO,
    SUN_TEXTURE_SIZE, SUN_INNER_RADIUS, SUN_OUTER_RADIUS,
    MOON_TEXTURE_SIZE, MOON_CENTER, MOON_RADIUS,
    MOON_INNER_RATIO, MOON_OUTER_RATIO,
    MOON_CUT_X_RATIO, MOON_CUT_Y_RATIO, MOON_CUT_R_RATIO, MOON_CUT_ARC_RATIO,
    CLOUD_MAIN_RADIUS, CLOUD_GEOM_SEGMENTS
} from './config.js';

/**
 * Canvas 圆角矩形路径
 */
export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * 星空光点纹理（径向渐变消除方片感）
 */
export function createGlowTexture(innerColor, outerColor, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, innerColor);
    g.addColorStop(GLOW_INNER_STOP, innerColor);
    g.addColorStop(GLOW_OUTER_STOP, outerColor);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

/**
 * 卡通云纹理（Canvas 绘制，已废弃但保留工具函数）
 */
export function createCartoonCloudTexture(size = CLOUD_TEXTURE_SIZE, cloudCount = CLOUD_COUNT) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    function drawCloud(cx, cy, baseR) {
        const parts = [
            [0, 0, baseR],
            [-baseR * 0.7, -baseR * 0.3, baseR * 0.8],
            [baseR * 0.7, -baseR * 0.3, baseR * 0.9],
            [-baseR * 0.4, -baseR * 0.7, baseR * 0.7],
            [baseR * 0.4, -baseR * 0.7, baseR * 0.75],
            [0, -baseR * 0.9, baseR * 0.7],
        ];
        ctx.fillStyle = '#000000';
        parts.forEach(([dx, dy, r]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, r + 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#ffffff';
        parts.forEach(([dx, dy, r]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    const margin = size * CLOUD_MARGIN_RATIO;
    for (let i = 0; i < cloudCount; i++) {
        const cx = margin + Math.random() * (size - margin * 2);
        const cy = margin + Math.random() * (size - margin * 2);
        const r = size * CLOUD_MIN_SIZE_RATIO + Math.random() * size * CLOUD_RANDOM_SIZE_RATIO;
        drawCloud(cx, cy, r);
    }
    return new THREE.CanvasTexture(canvas);
}

/**
 * 加载精灵图片替换 Canvas 纹理
 */
export function loadSpriteImage(path, spriteMat) {
    const img = new Image();
    img.onload = () => {
        const tex = new THREE.CanvasTexture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        spriteMat.map?.dispose();
        spriteMat.map = tex;
        spriteMat.needsUpdate = true;
        console.log('✅ 已加载:', path);
    };
    img.src = path;
}

/**
 * 生成 Canvas 太阳纹理
 */
export function createSunCanvasTexture() {
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = SUN_TEXTURE_SIZE; sunCanvas.height = SUN_TEXTURE_SIZE;
    const c = sunCanvas.getContext('2d'), cx = SUN_TEXTURE_SIZE / 2, cy = SUN_TEXTURE_SIZE / 2;
    const g = c.createRadialGradient(cx, cy, SUN_INNER_RADIUS, cx, cy, SUN_OUTER_RADIUS);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.08, 'rgba(255,255,200,1)');
    g.addColorStop(0.25, 'rgba(255,200,80,0.8)');
    g.addColorStop(0.5, 'rgba(255,140,30,0.25)');
    g.addColorStop(1, 'rgba(255,80,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, SUN_TEXTURE_SIZE, SUN_TEXTURE_SIZE);
    const tex = new THREE.CanvasTexture(sunCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * 生成 Canvas 月牙纹理
 */
export function createMoonCanvasTexture() {
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = MOON_TEXTURE_SIZE; moonCanvas.height = MOON_TEXTURE_SIZE;
    const c = moonCanvas.getContext('2d'), cx = MOON_CENTER, cy = MOON_CENTER, R = MOON_RADIUS;
    const g = c.createRadialGradient(cx, cy, R * MOON_INNER_RATIO, cx, cy, R * MOON_OUTER_RATIO);
    g.addColorStop(0, 'rgba(200,220,255,0.5)');
    g.addColorStop(0.5, 'rgba(140,170,220,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, MOON_TEXTURE_SIZE, MOON_TEXTURE_SIZE);
    const cutX = cx + R * MOON_CUT_X_RATIO, cutY = cy - R * MOON_CUT_Y_RATIO, cutR = R * MOON_CUT_R_RATIO;
    const a1 = -Math.PI * MOON_CUT_ARC_RATIO, a2 = Math.PI * MOON_CUT_ARC_RATIO;
    c.fillStyle = 'rgba(232,240,255,0.92)';
    c.beginPath();
    c.arc(cx, cy, R, a1, a2);
    c.arc(cutX, cutY, cutR, a2, a1, true);
    c.closePath();
    c.fill();
    const tex = new THREE.CanvasTexture(moonCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * 装饰云朵 Mesh（世界空间固定，dolly 移动产生相对运动）
 */
export function createCloudMesh(x, y, z, scale = 1) {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const spheres = [
        { pos: [0, 0, 0], r: CLOUD_MAIN_RADIUS },
        { pos: [0.6, 0.2, 0], r: 0.6 },
        { pos: [-0.6, 0.1, 0], r: 0.55 },
    ];

    spheres.forEach(s => {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(s.r, CLOUD_GEOM_SEGMENTS[0], CLOUD_GEOM_SEGMENTS[1]),
            cloudMat
        );
        sphere.position.set(...s.pos);
        cloudGroup.add(sphere);
    });

    cloudGroup.position.set(x, y, z);
    cloudGroup.scale.setScalar(scale);
    return cloudGroup;
}
