// ==================== 游戏配置常量 ====================
// 修改数值即可调整游戏参数，修改位置索引见 TECH_README.md

// ── 移动系统 ──
export const MOVE_SPEED = 3.5;           // 移动速度 (m/s)
export const DEADZONE = 0.2;             // 摇杆死区
export const BOUND_X = 2;                // X 轴移动范围 ±2m (宽4m)
export const BOUND_Z = 4;                // Z 轴移动范围 ±4m (深8m)

// ── 射击系统 ──
export const SHOOT_COOLDOWN = 150;       // 射击冷却时间 (ms)
export const BULLET_SPEED = 15;          // <-- 子弹飞行速度（米/秒）
export const BULLET_LIFE = 2;            // <-- 子弹存活时间（秒）
export const BULLET_POOL_SIZE = 20;      // 子弹对象池大小
export const BULLET_DAMAGE = 30;         // <-- 子弹伤害（每发）

// ── 气球战斗系统 ──
/*  气球参数速查表（修改下方数值即可调整）
    --------------------------------------------------
    气球数量:                      BALLOON_COUNT = 10
    气球生命值:                    BALLOON_HP = 100
    气球移动速度:                  BALLOON_SPEED = 1.0 (米/秒)
    生成距离:                      BALLOON_SPAWN_RADIUS = 15 (米)
    气球半径:                      BALLOON_RADIUS = 0.5 (米)
    打破气球得分:                  BALLOON_SCORE = 10
    子弹伤害:                      BULLET_DAMAGE = 30 (每发)
    --------------------------------------------------
*/
export const BALLOON_COUNT = 10;         // <-- 每波气球数量
export const BALLOON_HP = 100;           // <-- 气球生命值
export const BALLOON_SPEED = 0.5;        // <-- 气球移动速度（米/秒）
export const BALLOON_SPAWN_RADIUS = 15;  // <-- 生成距离玩家半径（米）
export const BALLOON_RADIUS = 0.5;       // <-- 气球半径（米）
export const BALLOON_SCORE = 10;         // <-- 打破气球得分
export const BALLOON_COLORS = [
    0xff4444, 0x44ff44, 0x4444ff, 0xffff44,
    0xff44ff, 0xff88ff, 0x88ffff
];

// ── 骑士气球配置 ──
export const KNIGHT_HP = 500;            // <-- 骑士生命值
export const KNIGHT_SCORE = 30;          // <-- 骑士得分
export const KNIGHT_SCALE = 3;           // <-- 骑士模型缩放
export const KNIGHT_RADIUS = 0.5 * KNIGHT_SCALE; // 碰撞半径随缩放变化

// ── 选择卡系统 ──
export const CHOICE_CARD_DISTANCE = 1.5; // 选择卡距离玩家（米）

// ── 粒子系统 ──
export const PARTICLE_COUNT = 50;        // 粒子对象池大小
export const PARTICLE_LIFE = 1.0;        // 粒子生命周期（秒）

// ── 气球船模型配置 ──
export const SHIP_SCALE = 14.0;          // <-- 气球船缩放
export const SHIP_POS = [-0.8, -2.5, 0.05];  // <-- 气球船位置 [X, Y, Z]
export const SHIP_ROT = [0, 1.57, 0];    // <-- 气球船旋转 [X, Y, Z]（弧度）

// ── 如来神掌配置 ──
export const BUDDHA_COOLDOWN = 8;        // <-- 技能冷却(秒)
export const AIM_TIMEOUT = 5;            // <-- 瞄准超时自动释放(秒)

// ── AK48 枪支配置 ──
export const AK48_SCALE = 0.6;           // <-- 调整枪支整体大小

// ── 玩家初始状态 ──
export const PLAYER_INITIAL_HP = 100;
export const PLAYER_INITIAL_SCORE = 50;
export const PLAYER_INITIAL_ATK = 30;

// ── 天空预设：白天 / 黄昏 / 夜晚 ──
export const DAY_SUN_AZ = Math.atan2(20, 10); // 正午太阳方位 ≈ 1.107 rad

export const skyPresets = {
    day: {
        bg: 0x87CEEB, fog: 0x87CEEB, fogNear: 30, fogFar: 100,
        skyDome: 0x87CEEB, ambient: 0xffeedd, ambientI: 1.2,
        sun: 0xfffef5, sunI: 2.5, sunX: 20, sunY: 40, sunZ: 10,
        hemiSky: 0x87CEEB, hemiGround: 0x90EE90, hemiI: 0.8,
        stars: 0,
        sunElev: 50, moonElev: -30, moonAz: DAY_SUN_AZ
    },
    dusk: {
        bg: 0xe85d26, fog: 0xe87544, fogNear: 20, fogFar: 80,
        skyDome: 0xe86830, ambient: 0xffccaa, ambientI: 0.7,
        sun: 0xff9955, sunI: 1.8, sunX: 30, sunY: 8, sunZ: 5,
        hemiSky: 0xff5511, hemiGround: 0x553322, hemiI: 0.5,
        stars: 0.25,
        sunElev: 5, moonElev: 5, moonAz: Math.atan2(30, 5) + Math.PI
    },
    night: {
        bg: 0x0a0a28, fog: 0x0c0c2a, fogNear: 15, fogFar: 60,
        skyDome: 0x0e0e30, ambient: 0x1a2a55, ambientI: 0.35,
        sun: 0x8899cc, sunI: 0.5, sunX: -10, sunY: 45, sunZ: -15,
        hemiSky: 0x0a0a3a, hemiGround: 0x0f0f1a, hemiI: 0.2,
        stars: 1.0,
        sunElev: -25, moonElev: 50, moonAz: DAY_SUN_AZ
    }
};

export const skyCycle = ['day', 'dusk', 'night'];

// ── 选择卡选项 ──
export const choiceOptions = [
    {
        label: '生命值+100',
        color: { r: 255, g: 60, b: 60 },
        effect: (stats, flags) => {
            stats.hp += 100;
            console.log('✅ 选择了：生命值+100');
        }
    },
    {
        label: '攻击力+20',
        color: { r: 255, g: 180, b: 0 },
        effect: (stats, flags) => {
            stats.atk += 20;
            console.log('✅ 选择了：攻击力+20');
        }
    },
    {
        label: '多一发子弹',
        color: { r: 60, g: 150, b: 255 },
        effect: (stats, flags) => {
            flags.extraBulletEnabled = true;
            console.log('✅ 选择了：多一发子弹');
        }
    }
];

// ── UI 面板配置 ──
export const UI_PANEL_WIDTH = 512;      // 右手腕面板画布宽度（像素）
export const UI_PANEL_HEIGHT = 512;     // 右手腕面板画布高度（像素）
export const UI_PANEL_3D_WIDTH = 0.18;    // 面板3D宽度（米）
export const UI_PANEL_3D_HEIGHT = 0.18;   // 面板3D高度（米）
export const UI_PANEL_POS_X = 0;          // 面板X位置（米）
export const UI_PANEL_POS_Y = 0.06;      // 面板Y位置（米）
export const UI_PANEL_POS_Z = 0.04;      // 面板Z位置（米）
export const UI_PANEL_ROT_X = -Math.PI * 0.35;  // 面板X轴旋转（弧度）

export const LEFT_UI_PANEL_WIDTH = 512;   // 左手腕面板画布宽度（像素）
export const LEFT_UI_PANEL_HEIGHT = 256;  // 左手腕面板画布高度（像素）
export const LEFT_UI_PANEL_3D_WIDTH = 0.18;   // 左面板3D宽度（米）
export const LEFT_UI_PANEL_3D_HEIGHT = 0.09;  // 左面板3D高度（米）
export const LEFT_UI_PANEL_POS_X = 0;     // 左面板X位置（米）
export const LEFT_UI_PANEL_POS_Y = 0.06; // 左面板Y位置（米）
export const LEFT_UI_PANEL_POS_Z = 0.04; // 左面板Z位置（米）
export const LEFT_UI_PANEL_ROT_X = -Math.PI * 0.35; // 左面板X轴旋转（弧度）

// ── 天空过渡速度 ──
export const SKY_TRANSITION_SPEED = 0.12;  // 天空预设过渡速度因子

// ── 子弹外观配置 ──
export const BULLET_RADIUS = 0.02;      // 子弹半径（米）
export const BULLET_GEOM_SEGMENTS = 8;   // 子弹几何体细分段数
export const BULLET_COLOR = 0xffaa00;    // 子弹颜色
export const BULLET_EMISSIVE = 0xff4400; // 子弹自发光颜色
export const BULLET_EMISSIVE_INTENSITY = 0.8; // 子弹自发光强度

// ── 枪口位置偏移 ──
export const MUZZLE_OFFSET_X = 0;        // 枪口X偏移（米）
export const MUZZLE_OFFSET_Y = 0;        // 枪口Y偏移（米）
export const MUZZLE_OFFSET_Z = -0.2;     // 枪口Z偏移（米）

// ── 枪支旋转 ──
export const AK48_ROTATION_Y = Math.PI / 2; // 枪支Y轴旋转（弧度，90度）

// ── 相机配置 ──
export const CAMERA_FOV = 72;              // 相机视野角度（度）
export const CAMERA_NEAR = 0.1;           // 近裁剪面（米）
export const CAMERA_FAR = 200;            // 远裁剪面（米）
export const CAMERA_HEIGHT = 1.6;         // 玩家眼高（米）

// ── 天空穹顶配置 ──
export const SKY_DOME_RADIUS = 60;       // 天空穹顶半径（米）
export const SKY_DOME_SEGMENTS = 32;      // 水平分段数
export const SKY_DOME_RINGS = 16;        // 垂直分段数
export const SKY_DOME_PHI_START = 0;      // 水平起始角（弧度）
export const SKY_DOME_PHI_LENGTH = Math.PI * 2;  // 水平扫描角
export const SKY_DOME_THETA_START = 0;    // 垂直起始角（弧度）
export const SKY_DOME_THETA_LENGTH = Math.PI / 2;  // 垂直扫描角（半球）

// ── 星空配置 ──
export const STAR_LAYER_COUNT = 3;        // 星空层数
export const STAR_BASE_COUNT = 80;         // 第一层星星数量
export const STAR_COUNT_INCREMENT = 50;    // 每层增加的星星数
export const STAR_MIN_DIST = 48;          // 星星最小距离（米）
export const STAR_DIST_INCREMENT = 4;      // 每层增加的距离
export const STAR_DIST_LAYER_OFFSET = 1.5; // 层间距离偏移
export const STAR_MIN_SIZE = 0.35;       // 最小星星尺寸
export const STAR_SIZE_INCREMENT = 0.1;   // 每层增加的星星尺寸

// ── 光源配置 ──
export const SUN_SHADOW_MAP_SIZE = 2048;  // 太阳阴影贴图尺寸
export const SUN_SHADOW_NEAR = 0.5;      // 阴影相机近平面
export const SUN_SHADOW_FAR = 50;        // 阴影相机远平面
export const SUN_SHADOW_BOUNDS = 20;     // 阴影相机边界

// ── 调试配置 ──
export const DEBUG_LOG_MAX = 8;           // 调试日志最大条数
export const DEBUG_UPDATE_INTERVAL = 5;    // 调试面板更新间隔（帧数）

// ═══════════════════════════════════════════════
// 以下为抽取自各模块的硬编码数字
// ═══════════════════════════════════════════════

// ── 气球几何体/材质 (balloons.js) ──
export const BALLOON_GEOM_SEGMENTS = 16;
export const BALLOON_MAT_ROUGHNESS = 0.3;
export const BALLOON_MAT_METALNESS = 0.1;
export const BALLOON_EMISSIVE_I = 0.15;
export const BALLOON_EMISSIVE_HIT = 0.5;
export const BALLOON_HIT_DURATION = 100;

// ── 气球生成参数 (balloons.js) ──
export const BALLOON_MIN_HEIGHT = 1.5;
export const BALLOON_HEIGHT_RANGE = 3;
export const BALLOON_SPAWN_ANGLE_JITTER = 0.5;
export const BALLOON_SPAWN_RADIUS_JITTER = 3;

// ── 气球浮动动画 (balloons.js) ──
export const BALLOON_FLOAT_FREQ = 0.003;
export const BALLOON_FLOAT_AMP = 0.002;

// ── 碰撞检测 (balloons.js) ──
export const BALLOON_COLLISION_BUFFER = 0.05;

// ── 骑士气球 (balloons.js) ──
export const KNIGHT_MAX_COUNT = 3;

// ── 枪支悬挂 (weapons.js) ──
export const AK48_RIGHT_POS = [0, -0.1, 0.01];
export const AK48_RIGHT_ROT_X = -20;
export const AK48_LEFT_POS = [0, -0.1, 0.01];
export const AK48_LEFT_ROT_X = -20;
export const AK48_LEFT_ROT_Y = 90;

// ── 子弹系统 (weapons.js) ──
export const EXTRA_BULLET_DELAY = 50;
export const BULLET_PITCH_DEG = 30;
export const BULLET_MAX_HEIGHT = 30;

// ── 粒子系统 (particles.js) ──
export const PARTICLE_RADIUS = 0.01;
export const PARTICLE_GEOM_SEG = 4;
export const PARTICLE_DAMPING = 0.98;

// ── 如来神掌 (buddhaPalm.js) ──
export const BUDDHA_PROMPT_SCALE = [2, 0.5, 1];
export const BUDDHA_ATTACH_SCALE = 0.2;
export const BUDDHA_ATTACH_POS = [0, -0.08, 0.03];
export const BUDDHA_ATTACH_ROT = [-90, 0, 0];
export const BUDDHA_PROMPT_POS = [0, 1.8, -1.5];
export const BUDDHA_PREVIEW_SCALE = 2.0;
export const BUDDHA_PREVIEW_POS = [0, 0.5, -4];
export const BUDDHA_RELEASE_SCALE = 20.0;
export const BUDDHA_RELEASE_FORWARD = 3.0;
export const BUDDHA_RELEASE_HEIGHT = 20;
export const BUDDHA_FALL_DURATION = 0.5;
export const BUDDHA_KILL_RADIUS = 10;
export const BUDDHA_DAMAGE = 1000;
export const BUDDHA_PREVIEW_DIST = 4;
export const BUDDHA_PREVIEW_Y = 0.5;
export const BUDDHA_PARTICLE_COLOR = 0xffdd44;
export const BUDDHA_PARTICLE_COUNT = 80;
export const BUDDHA_CLEANUP_DELAY = 0.3;

// ── 太阳/月亮精灵 (sky.js) ──
export const SUN_SPRITE_SCALE = [8, 8, 1];
export const MOON_SPRITE_SCALE = [5, 5, 1];
export const SUN_DIST = 45;
export const MOON_DIST = 42;
export const SPRITE_OPACITY_OFFSET = 3;
export const SPRITE_OPACITY_RANGE = 8;

// ── 星空动画 (sky.js) ──
export const STAR_ROT_BASE = 0.015;
export const STAR_ROT_INCREMENT = 0.01;
export const STAR_OPACITY_BASE = 0.7;
export const STAR_OPACITY_INCREMENT = 0.15;
export const STAR_FLICKER_BASE = 0.85;
export const STAR_FLICKER_AMP = 0.15;
export const STAR_FLICKER_FREQ = 1.7;
export const STAR_FLICKER_LAYER_OFFSET = 2.1;

// ── 选择卡绘制 (cards.js) ──
export const CARD_OUTER_RADIUS = 32;
export const CARD_BORDER_WIDTH = 8;
export const CARD_INNER_OFFSET = 4;
export const CARD_INNER_RADIUS = 28;
export const CARD_TITLE_FONT = 'bold 48px sans-serif';
export const CARD_TITLE_POS = [256, 140];
export const CARD_HINT_FONT = '28px sans-serif';
export const CARD_HINT_POS = [256, 190];

// ── 选择卡3D (cards.js) ──
export const CARD_3D_SIZE = [0.5, 0.3];
export const CARD_CAM_OFFSET_Y = -0.2;
export const CARD_SPACING = 0.55;
export const CARD_TIMEOUT = 10000;
export const CARD_COLLISION_RADIUS = 0.4;

// ── VR 初始化延迟 (xr.js) ──
export const VR_ATTACH_GUN_DELAY = 100;
export const VR_SPAWN_DELAY = 500;

// ── 输入阈值 (input.js) ──
export const TRIGGER_THRESHOLD = 0.5;

// ── UI 右手腕面板 (ui.js) ──
export const UI_RADIUS = 24;
export const UI_BORDER = 4;
export const UI_INNER_OFFSET = 2;
export const UI_INNER_RADIUS = 22;
export const UI_TITLE_FONT = 'bold 22px monospace';
export const UI_TITLE_POS = [14, 36];
export const UI_INFO_FONT = '16px monospace';
export const UI_INFO_START = [14, 60];
export const UI_INFO_LINE_H = 20;
export const UI_LOG_LINES = 3;

// ── UI 左手腕面板 (ui.js) ──
export const LEFT_UI_RADIUS = 24;
export const LEFT_UI_BORDER = 4;
export const LEFT_UI_INNER_OFFSET = 2;
export const LEFT_UI_INNER_RADIUS = 22;
export const LEFT_UI_TITLE_FONT = 'bold 28px monospace';
export const LEFT_UI_TITLE_POS = [18, 42];
export const LEFT_UI_INFO_FONT = '22px monospace';
export const LEFT_UI_INFO_START = [18, 80];
export const LEFT_UI_INFO_LINE_H = 30;
export const LEFT_UI_LOG_LINES = 4;

// ── 光晕纹理 (utils.js) ──
export const GLOW_INNER_STOP = 0.15;
export const GLOW_OUTER_STOP = 0.5;

// ── 卡通云纹理 (utils.js) ──
export const CLOUD_TEXTURE_SIZE = 512;
export const CLOUD_COUNT = 25;
export const CLOUD_MARGIN_RATIO = 0.1;
export const CLOUD_MIN_SIZE_RATIO = 0.04;
export const CLOUD_RANDOM_SIZE_RATIO = 0.06;

// ── 太阳纹理 (utils.js) ──
export const SUN_TEXTURE_SIZE = 512;
export const SUN_INNER_RADIUS = 30;
export const SUN_OUTER_RADIUS = 250;

// ── 月亮纹理 (utils.js) ──
export const MOON_TEXTURE_SIZE = 512;
export const MOON_CENTER = 256;
export const MOON_RADIUS = 200;
export const MOON_INNER_RATIO = 0.12;
export const MOON_OUTER_RATIO = 0.7;
export const MOON_CUT_X_RATIO = 0.35;
export const MOON_CUT_Y_RATIO = 0.08;
export const MOON_CUT_R_RATIO = 0.82;
export const MOON_CUT_ARC_RATIO = 0.42;

// ── 3D 装饰云 (utils.js) ──
export const CLOUD_MAIN_RADIUS = 0.8;
export const CLOUD_OFFSETS = [[0.6, 0.2, 0.6], [-0.6, 0.1, 0.55]];
export const CLOUD_GEOM_SEGMENTS = [8, 6];
