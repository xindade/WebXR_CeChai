// ==================== 主入口：初始化编排 + 动画循环 ====================
import * as THREE from 'three';

// 使用 _dbgShow 报告初始化进度（由 index.html 内联脚本定义）
const _log = (msg) => { if (typeof _dbgShow === 'function') _dbgShow(msg, '#88ffcc'); };

_log('📦 main.js 已加载，导入模块中...');

// ── 核心场景 ──
import { initSceneCore, renderer, scene, camera, dolly, setShadow } from './scene.js';

// ── 天空系统 ──
import { initSky, updateSkyTransition, checkVRSkySwitch } from './sky.js';

// ── 输入系统 ──
import {
    setupController, updateInputs, handleExit,
    rightTrigger, leftTrigger, rightBtnState, leftBtnState,
    rightGrip, leftGrip
} from './input.js';

// ── 移动系统 ──
import { handleMovement } from './movement.js';

// ── 武器系统 ──
import {
    loadAK48Model, setAK48Callbacks, initBulletPool,
    attachAK48, attachAK48ToLeft, handleShooting, updateBullets,
    leftHandGunEnabled, ak48Model, ak48Attached, ak48LeftAttached
} from './weapons.js';

// ── 气球系统 ──
import {
    loadKnightModel, loadShipModel, initBalloonGroup,
    setPlayerStatsRef, setChoiceCardsActiveRef, onAllBalloonsDestroyed,
    setWaveNumber, clearAllBalloons, setOnBalloonShipCollision,
    balloons, spawnBalloons, updateBalloons, updateWaveSpawning,
    checkBulletBalloonCollisions,
    waveNumber
} from './balloons.js';

// ── 选择卡 ──
import {
    choiceCardsActive, extraBulletEnabled, choiceCardTimeout,
    choiceCardGroup, spawnChoiceCards, clearChoiceCards,
    checkLeftHandChoiceCardCollision, initChoiceCardGroup
} from './cards.js';

// ── 粒子系统 ──
import { initParticlePool, updateParticles } from './particles.js';

// ── 碎片系统 ──
import { initDebrisPool, updateDebris } from './debris.js';

// ── 如来神掌 ──
import {
    loadBuddhaPalmModel, setBuddhaPalmPlayerStatsRef, setBuddhaPalmReady,
    buddhaPalmReady, buddhaPalmAttached, buddhaPalmCooldown,
    buddhaPalmSkills, buddhaPalmState, buddhaPalmTimer,
    attachBuddhaPalmToLeft, updateBuddhaPalmSkills,
    checkBuddhaPalmTrigger, onLeftGripEdge, prevLeftGrip
} from './buddhaPalm.js';

// ── UI ──
import {
    setUIPlayerStatsRef, setUIExtraBulletRef,
    createDebugPanel, updateDebugPanel,
    createLeftDebugPanel, updateLeftDebugPanel,
    hideVREntry, showVREntry
} from './ui.js';

// ── XR 会话 ──
import { enterVR, registerXREvents, initVRButtons, gameStarted, gameWaveNumber } from './xr.js';

// ── 船血系统 ──
import { onBalloonHitShip, setOnRestartCardCallback, setSpawnBalloonsRef, setPlayPopSoundFn, resetShipHp } from './ship.js';

// ── 音效 ──
import { playBalloonPopSound } from './audio.js';

// ── 配置 ──
import { PLAYER_INITIAL_HP, PLAYER_INITIAL_SCORE, PLAYER_INITIAL_ATK } from './config.js';

// ═══════════════════════════════════════════════
// 游戏全局状态（可被子模块引用）
// ═══════════════════════════════════════════════

export const playerStats = { hp: PLAYER_INITIAL_HP, score: PLAYER_INITIAL_SCORE, atk: PLAYER_INITIAL_ATK };

// 将 playerStats 暴露到 window 供 cards.js 等使用
window.__playerStats = playerStats;

// 将可变状态通过 window 桥接（ES module 顶层绑定不可重新赋值）
window.__waveNumber = 0;
window.__buddhaPalmReady = false;
window.__buddhaPalmAttached = false;
window.__buddhaPalmCooldown = 0;
window.__ak48Attached = false;
window.__ak48LeftAttached = false;
window.__choiceCardsActive = false;
window.__leftHandGunEnabled = false;

// ── 加载状态管理 ──
const loadingResources = { texture: false, model: false };
let loadingHidden = false;
const loadingEl = document.getElementById('loading');

function checkAllLoaded(msg) {
    if (loadingHidden) return;
    if (msg) {
        _log('⚠️ ' + msg, '#ffaa00');
        loadingEl.innerHTML = '<div style="color:#ffaa00;">' + msg + '</div>';
        setTimeout(() => { loadingEl.style.display = 'none'; loadingHidden = true; }, 1500);
        return;
    }
    if (loadingResources.texture && loadingResources.model) {
        _log('✅ 纹理+模型就绪，关闭 Loading', '#88ff88');
        loadingHidden = true;
        loadingEl.style.display = 'none';
    }
}

function onResourceError(msg) {
    loadingEl.innerHTML = '<div style="color:#ffaa00;">' + msg + '</div>';
    setTimeout(() => { loadingEl.style.display = 'none'; loadingHidden = true; }, 2000);
}

// 最长等待 15 秒后强制关闭 loading
setTimeout(() => {
    if (!loadingHidden) onResourceError('⚠️ 加载超时，检查 HTTP 服务器是否运行中...');
}, 15000);

// 模型加载回调
setAK48Callbacks(
    () => {
        // AK48 加载完成
        _log('✅ AK48 模型加载完成', '#88ff88');
        loadingResources.model = true;
        attachAK48(); // 如果手柄已就绪则附加
        checkAllLoaded();
    },
    (progress) => {
        const pct = (progress.loaded / progress.total * 100).toFixed(1);
        document.getElementById('loading').innerHTML =
            '<div id="loading-spinner"></div><div>加载模型: ' + pct + '%</div>';
    },
    (error) => {
        _log('❌ AK48 加载失败: ' + error, '#ff4444');
        loadingResources.model = true;
        onResourceError('⚠️ 模型加载失败');
    }
);

// ═══════════════════════════════════════════════
// 初始化编排
// ═══════════════════════════════════════════════

async function initScene() {
    _log('1/6 初始化场景核心...');
    // 1. 场景核心
    initSceneCore();

    // 1b. 将各组挂入场景（此时 scene/dolly 已就绪）
    initBalloonGroup();
    initChoiceCardGroup();

    _log('2/6 初始化天空...');
    // 2. 天空
    initSky();

    _log('3/6 初始化粒子池...');
    // 3. 粒子池
    initParticlePool();

    // 3b. 碎片池
    initDebrisPool();

    // 4. 子弹池
    initBulletPool();

    // 加载纹理标记（云朵/天空等已就绪）
    loadingResources.texture = true;
    checkAllLoaded();

    _log('4/6 加载模型文件...');
    // 5. 加载模型
    loadAK48Model();
    loadKnightModel();
    loadShipModel();
    loadBuddhaPalmModel();

    _log('5/6 设置手柄...');
    // 6. 设置手柄（回调中附加 UI 面板）
    setupController(0, null, (grip) => {
        // 左手柄就绪 → 附加左手面板
        const leftPanel = createLeftDebugPanel();
        grip.add(leftPanel);
    });
    setupController(1, (grip) => {
        // 右手柄就绪 → 附加右手面板 + 尝试附加 AK48
        const panel = createDebugPanel();
        grip.add(panel);
    });

    _log('6/6 注册事件 + 启动循环...');
    // 7. 设置跨模块引用
    setPlayerStatsRef(playerStats);
    setBuddhaPalmPlayerStatsRef(playerStats);
    setUIPlayerStatsRef(playerStats);
    setChoiceCardsActiveRef(() => choiceCardsActive);
    setUIExtraBulletRef(() => extraBulletEnabled);

    // 7b. 连接船血系统
    setOnBalloonShipCollision(onBalloonHitShip);
    setSpawnBalloonsRef(spawnBalloons);
    setPlayPopSoundFn(() => playBalloonPopSound());
    window.__clearAllBalloons = clearAllBalloons;
    window.__gameWaveNumber = 0;
    window.__resetShipHp = resetShipHp;

    // 7c. 船血重开 → 赠送抽卡回调
    setOnRestartCardCallback(() => {
        console.log('🎴 重生赠送一次抽卡');
        spawnChoiceCards();
    });

    // 波次清空回调 → 弹出选择卡
    onAllBalloonsDestroyed(() => {
        if (typeof _dbgShow === 'function') _dbgShow('🎴 气球清空，弹出选择卡', '#ffdd44');
        spawnChoiceCards();
        window.__gameWaveNumber = waveNumber;
    });

    // 选择卡清除后的回调 → 推进波次 + 解锁神掌（通过 window 全局，避免模块命名空间兼容问题）
    window.__onAfterClearChoiceCards = () => {
        if (typeof _dbgShow === 'function') _dbgShow('🔄 触发波次推进...', '#ffdd44');
        setTimeout(() => {
            const wn = waveNumber + 1;
            setWaveNumber(wn);

            // 解锁如来神掌（waveNumber >= 1 即第2波起）
            if (wn >= 1 && !buddhaPalmReady) {
                setBuddhaPalmReady(true);
                setTimeout(() => attachBuddhaPalmToLeft(), 500);
                console.log('🖐️ 如来神掌已解锁！左手握柄侧键释放');
            }
            spawnBalloons();
            console.log('🎈 第' + wn + '波气球已生成（含骑士:' + (wn >= 1 ? '是' : '否') + '）');
        }, 1000);
    };
    if (typeof _dbgShow === 'function') _dbgShow('🔗 波次回调已注册', '#88ff88');

    // 8. 注册 XR 事件
    registerXREvents();

    // 9. 初始化 VR 按钮
    initVRButtons();

    // 10. 窗口 resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 11. 页面卸载清理
    window.addEventListener('beforeunload', () => {
        renderer.dispose();
        scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    });

    _log('✅ 初始化完成，等待模型加载...');
}

// ═══════════════════════════════════════════════
// 动画循环
// ═══════════════════════════════════════════════

const clock = new THREE.Clock();
let _frameCount = 0;

function animate() {
    const dt = Math.min(clock.getDelta(), 0.1);

    // 天空过渡（VR/非VR 都持续更新）
    updateSkyTransition(dt);
    updateBuddhaPalmSkills(dt);
    updateParticles(dt);
    updateDebris(dt);

    if (renderer.xr.isPresenting) {
        updateInputs();
        handleMovement(dt);

        // 波次生成
        updateWaveSpawning(dt);

        // 射击处理
        handleShooting(rightTrigger, leftTrigger);

        updateBullets(dt);
        updateBalloons(dt);
        checkBulletBalloonCollisions();
        checkLeftHandChoiceCardCollision();
        handleExit();

        // VR 天空切换（左手 X/Y）
        checkVRSkySwitch(leftBtnState);

        // 如来神掌触发
        onLeftGripEdge(leftBtnState.grip);

        // 调试面板每 5 帧更新
        _frameCount++;
        if (_frameCount % 5 === 0) {
            updateDebugPanel();
            updateLeftDebugPanel();
        }

        hideVREntry();
        const vrHintsEl = document.getElementById('vr-hints');
        if (vrHintsEl) vrHintsEl.style.display = 'none';
    } else {
        showVREntry();
        const vrHintsEl = document.getElementById('vr-hints');
        if (vrHintsEl) vrHintsEl.style.display = 'flex';
    }

    renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════
// 启动
// ═══════════════════════════════════════════════

initScene();

// 启动动画循环（必须在 initSceneCore 之后，renderer 才就绪）
renderer.setAnimationLoop(animate);
