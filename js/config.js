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
