// ==================== 共享工具函数 ====================
import * as THREE from 'three';

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
    g.addColorStop(0.15, innerColor);
    g.addColorStop(0.5, outerColor);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

/**
 * 卡通云纹理（Canvas 绘制，已废弃但保留工具函数）
 */
export function createCartoonCloudTexture(size = 512, cloudCount = 25) {
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

    const margin = size * 0.1;
    for (let i = 0; i < cloudCount; i++) {
        const cx = margin + Math.random() * (size - margin * 2);
        const cy = margin + Math.random() * (size - margin * 2);
        const r = size * 0.04 + Math.random() * size * 0.06;
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
    sunCanvas.width = 512; sunCanvas.height = 512;
    const c = sunCanvas.getContext('2d'), cx = 256, cy = 256;
    const g = c.createRadialGradient(cx, cy, 30, cx, cy, 250);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.08, 'rgba(255,255,200,1)');
    g.addColorStop(0.25, 'rgba(255,200,80,0.8)');
    g.addColorStop(0.5, 'rgba(255,140,30,0.25)');
    g.addColorStop(1, 'rgba(255,80,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(sunCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * 生成 Canvas 月牙纹理
 */
export function createMoonCanvasTexture() {
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 512; moonCanvas.height = 512;
    const c = moonCanvas.getContext('2d'), cx = 256, cy = 256, R = 200;
    const g = c.createRadialGradient(cx, cy, R * 0.12, cx, cy, R * 0.7);
    g.addColorStop(0, 'rgba(200,220,255,0.5)');
    g.addColorStop(0.5, 'rgba(140,170,220,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    const cutX = cx + R * 0.35, cutY = cy - R * 0.08, cutR = R * 0.82;
    const a1 = -Math.PI * 0.42, a2 = Math.PI * 0.42;
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
        { pos: [0, 0, 0], r: 0.8 },
        { pos: [0.6, 0.2, 0], r: 0.6 },
        { pos: [-0.6, 0.1, 0], r: 0.55 },
    ];

    spheres.forEach(s => {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(s.r, 8, 6),
            cloudMat
        );
        sphere.position.set(...s.pos);
        cloudGroup.add(sphere);
    });

    cloudGroup.position.set(x, y, z);
    cloudGroup.scale.setScalar(scale);
    return cloudGroup;
}
