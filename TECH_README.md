# VR 热气球射击游戏 — AI 开发技术文档

> 最后更新: 2025-05-05 | 入口文件: `index.html` (40行) + 16 个 JS 模块 | Three.js ES Module + WebXR

---

## 1. 项目概览

模块化 WebXR VR 游戏。玩家乘坐气球船，用右手 AK48 射击气球，清完每波出强化卡，第二波起混入骑士，第三波解锁如来神掌大招。

- **框架**: Three.js r168 (ES Module `three.module.js`)
- **VR**: WebXR `immersive-vr` + `local-floor`
- **模型**: glTF Binary (`.glb`)，Draco 压缩，CDN 解压
- **服务**: `npx serve -l 3000 -s .` (HTTP)，PICO 无需 HTTPS
- **架构**: 16 个 ES 模块，职责单一，`js/main.js` 为总调度

---

## 2. 文件结构

```
WebXR_CeChai/
├── index.html                  # ★ 入口 HTML (40行，仅 UI 壳 + importmap)
├── css/
│   └── style.css               # 全部 CSS 样式
├── js/
│   ├── main.js                 # ★ 主调度：初始化编排 + 动画循环
│   ├── config.js               # 全部游戏常量（改参数首选文件）
│   ├── scene.js                # 渲染器/场景/相机/dolly/灯光/云朵
│   ├── sky.js                  # 日夜黄昏天空系统（预设/过渡/太阳月亮/星空）
│   ├── audio.js                # Web Audio 音效（射击/爆裂/背景音乐）
│   ├── input.js                # VR 手柄输入处理 + 控制器设置
│   ├── movement.js             # 玩家 dolly 真实移动 + 范围限制
│   ├── weapons.js              # AK48 枪支挂载 + 子弹对象池 + 射击逻辑
│   ├── balloons.js             # 气球/骑士创建 + AI 追踪 + 碰撞 + 波次 + 模型加载
│   ├── cards.js                # 强化选择卡系统（3 卡 + 超时 + 左手触碰）
│   ├── particles.js            # 粒子爆炸特效对象池
│   ├── buddhaPalm.js           # 如来神掌状态机（IDLE→AIMING→SLAMMING）
│   ├── ui.js                   # 左右手腕 Canvas UI 面板 + 调试日志
│   ├── xr.js                   # WebXR 会话管理（进入/退出/重置）
│   └── utils.js                # 共享工具函数（纹理生成/圆角矩形/云Mesh）
│
├── three.module.js             # Three.js ES Module (~1.3MB)
├── GLTFLoader.js               # 备用 GLTF 加载器
├── BufferGeometryUtils.js      # Three.js 工具
│
├── Model/                      # 3D 模型
│   ├── Ak48.glb                # 枪支 (Draco 压缩)
│   ├── 气球船.glb              # 玩家乘坐的船
│   ├── 骑士.glb                # 骑士气球
│   ├── 如来神掌.glb            # 大招模型
│   └── 火焰.glb                # 特效预留
│
├── image/                      # 贴图
│   ├── sun.png                 # 太阳 (PNG 透明)
│   ├── moon.png                # 月牙 (PNG 透明)
│   └── smile.png               # 气球笑脸
│
├── jsm/loaders/
│   ├── GLTFLoader.js
│   └── DRACOLoader.js
│
├── draco/                      # Draco WASM (离线备用)
│   ├── draco_decoder.js
│   ├── draco_decoder.wasm
│   └── draco_wasm_wrapper.js
│
└── TECH_README.md              # 本文档
```

---

## 3. 模块依赖图

```
config.js  utils.js
    ↓         ↓
scene.js ←───┘
    ↓
sky.js  particles.js  input.js
    ↓        ↓           ↓
movement.js  audio.js    │
    ↓        ↓           ↓
    └──→ weapons.js ←───┘
            ↓
        balloons.js
            ↓
        cards.js  buddhaPalm.js
            ↓         ↓
          ui.js      xr.js
            ↓         ↓
            └→ main.js ←┘  (总调度)
```

**重要**: 模块顶层代码在 import 阶段同步执行，此时 `scene`/`dolly`/`renderer` 等还是 `undefined`。所有 `scene.add()` / `dolly.add()` 调用必须放在 `init*()` 函数中，由 `main.js` 的 `initScene()` 按顺序调用。详见第 15 节。

---

## 4. 启动方式

```bash
cd /path/to/WebXR_CeChai
npx serve -l 3000 -s .
# PICO 浏览器访问: http://<电脑IP>:3000
```

Draco 解压器默认从 CDN 加载: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
离线时改为本地: 在 `js/weapons.js` 中改 `dracoLoader.setDecoderPath('./draco/')`

---

## 5. 场景层级树

```
Scene (world space)
├── AmbientLight (ambientLight)     ← 动态天色
├── DirectionalLight (sunLight)     ← 太阳光，有阴影
├── HemisphereLight (hemiLight)     ← 半球环境光
├── balloonGroup                    ← 气球 + 骑士 (由 js/balloons.js 管理)
├── bulletGroup                     ← 子弹对象池 (20个, js/weapons.js)
├── particleGroup                   ← 粒子对象池 (50个, js/particles.js)
├── cloud meshes × 12              ← 3D 装饰云，世界空间固定
├── shipModel (气球船)             ← 玩家乘坐的船
├── buddhaPalmSkills[]             ← 飞行中的神掌 (释放时 scene.add)
└── dolly (玩家跟随组)
    ├── camera (眼高 1.6m)          ← PerspectiveCamera 72° FOV
    ├── skyDome (半径60半球)        ← 动态变色天空穹顶
    ├── starLayers[3]               ← 星空粒子 (390颗)
    ├── sunSprite                   ← 太阳精灵 (NormalBlending)
    ├── moonSprite                  ← 月牙精灵 (AdditiveBlending)
    ├── choiceCardGroup             ← 强化选择卡 (js/cards.js)
    ├── promptSprite                ← 神掌瞄准提示 (AIMING 时显示)
    ├── previewPalm                 ← 瞄准时的 2x 预览神掌
    ├── leftController / leftGrip   ← XR 左手
    │   ├── (左手神掌模型)           ← 解锁后装备
    │   └── leftDebugPanel          ← 左手腕 UI (神掌状态 + 调试日志)
    └── rightController / rightGrip ← XR 右手
        ├── AK48 模型               ← 枪支
        └── debugPanel              ← 右手腕 UI (血量/得分 + 调试日志)
```

**重要**: dolly 是玩家逻辑组，真实移动。移动钳制在 X:±2 Z:±4 (4×8 米)。

---

## 6. 日夜黄昏天空系统

### 6.1 预设表 (文件: `js/config.js`, 搜索 `skyPresets`)

| 预设 | 天空色 | 雾色 | 太阳仰角 | 月亮仰角 | 环境光强 | 星光 |
|------|--------|------|:------:|:------:|:------:|:--:|
| day | `#87CEEB` | `#87CEEB` | 50° | -30° | 1.2 | 0 |
| dusk | `#E85D26` | `#E87544` | 5° | 5° | 0.7 | 0.25 |
| night | `#0A0A28` | `#0C0C2A` | -25° | 50° | 0.35 | 1.0 |

### 6.2 过渡机制
- `applySkyTarget(name)` 仅设置 `skyTarget`（`js/sky.js`）
- `updateSkyTransition(dt)` 每帧 lerp 13+ 属性向目标值（在 `js/main.js` animate 中调用）
- 指数缓动 `ease = 1 - exp(-0.12*dt)`，约 30 秒完成 95%
- 星空 3 层叠加 (80+130+180=390 颗)，AdditiveBlending，幂分布头顶最密

### 6.3 切换方式
- HTML 按钮: ☀️白天 / 🌅黄昏 / 🌙夜晚（`js/sky.js` 中 `initSky()` 绑定）
- VR: 左手 X/Y 键循环（`js/sky.js` 中 `checkVRSkySwitch()` 处理）

---

## 7. 移动系统

真实移动 dolly。摇杆控制，钳制在 4×8 米。代码在 `js/movement.js`。

```javascript
// 文件: js/config.js
BOUND_X = 2   // ±2m 半宽
BOUND_Z = 4   // ±4m 半深
MOVE_SPEED = 3.5

// PICO 摇杆前推为负值，代码中 sy = -sy 取反
```

---

## 8. 气球战斗系统

代码在 `js/balloons.js`。配置常量在 `js/config.js`。

### 8.1 配置 (搜索 `BALLOON_COUNT`)

```javascript
BALLOON_COUNT = 10       // 每波数量
BALLOON_HP    = 100      // 生命值
BALLOON_SPEED = 0.5      // 移速 (m/s)
BALLOON_RADIUS = 0.5     // 碰撞半径
BALLOON_SCORE = 10       // 得分
BULLET_DAMAGE = 30       // 子弹伤害
SHOOT_COOLDOWN = 150     // 射击冷却 (ms)
```

### 8.2 骑士气球

```javascript
KNIGHT_HP    = 500       // 生命值
KNIGHT_SCORE = 30        // 得分
KNIGHT_SCALE = 3         // 模型缩放
```

### 8.3 波次系统

| 波次 | 普通气球 | 骑士 | 事件 |
|:--:|:------:|:---:|------|
| 0 | 10 | 0 | 初始波 |
| 1 | 7~9 | 1~3 | 清完第1波解锁如来神掌 |
| 2+ | 7~9 | 1~3 | - |

波次由 `js/balloons.js` 中 `waveNumber` 跟踪（通过 `setWaveNumber()` 写入），sessionend 重置为 0。

### 8.4 强化选择卡
清完一波弹出 3 张卡（dolly 空间，面向玩家）: ❤️生命+100 / ⚔️攻击+20 / 🔫双弹。左手触碰选择。10 秒超时自动跳过。代码在 `js/cards.js`。

波次推进回调使用 `window.__onAfterClearChoiceCards` 全局函数（由 `js/main.js` 在 initScene 中赋值），避免 ES 模块命名空间写入兼容问题。

---

## 9. 如来神掌系统

代码在 `js/buddhaPalm.js`。配置常量在 `js/config.js`。

### 9.1 解锁
清完第 1 波（`waveNumber >= 1`）自动调用 `setBuddhaPalmReady(true)` + `attachBuddhaPalmToLeft()`。解锁逻辑在 `js/main.js` 的波次回调中。

### 9.2 状态机
```
IDLE → (按握柄①) → AIMING → (按握柄② 或 5秒超时) → SLAMMING → IDLE
```
每帧 `updateBuddhaPalmSkills(dt)` 在 `js/main.js` animate 中调用。

### 9.3 参数速查 (文件: `js/config.js`)

```javascript
BUDDHA_COOLDOWN = 8      // 冷却 (秒)
AIM_TIMEOUT = 5           // 瞄准超时 (秒)

// 左手装备 (js/buddhaPalm.js → attachBuddhaPalmToLeft)
palm.scale = 0.2                              // 大小
palm.position = (0, -0.08, 0.03)             // X左右 Y上下 Z前后
palm.rotation = (-90, 0, 0)                  // 弧度

// 预览神掌 (enterAimingMode)
previewPalm.scale = 2.0

// 释放神掌 (releaseBuddhaPalm)
palm.scale = 20.0                              // 20倍大小
fallDuration = 0.5                              // 下落时间 (秒)
killRadius = 10                                 // 碰撞半径 (米)
damage = 1000                                   // 伤害
```

### 9.4 核心逻辑
- 第一次按握柄: 锁定 `aimDirection` (当前朝向)，生成 2x 预览神掌
- 第二次按/超时: 预览转化为 20x 神掌，从锁定方向头顶 20m 落下 0.5 秒
- 落地: 半径 10m 内所有气球扣 1000 HP，≤0 即死，80 粒子爆炸
- 0.3 秒后消失，状态回 IDLE，8 秒冷却
- 左手腕 UI + 右手腕 UI 实时显示神掌状态

---

## 10. 手腕 UI 面板

### 10.1 右手腕面板
代码在 `js/ui.js` → `createDebugPanel()` / `updateDebugPanel()`。

显示内容：
- ❤️ 血量 / 🎯 得分 / ⚔️ 攻击 / 🎈 气球数 / 🔫 双弹状态
- 分隔线下方显示最近 3 条调试日志（来自 `window.__debugLog`）

面板尺寸: Canvas 512×512, 3D 面板 0.18×0.18m, 16px 字体。

### 10.2 左手腕面板
代码在 `js/ui.js` → `createLeftDebugPanel()` / `updateLeftDebugPanel()`。

显示内容：
- 🖐 神掌解锁状态 + 当前阶段
- 分隔线下方显示最近 4 条调试日志

---

## 11. 调试系统

### 11.1 HTML Loading 屏幕
`index.html` 内联脚本在模块加载前注册 `_dbgShow()` 函数：
- 捕获全局 `error` 事件（含模块加载失败）
- 捕获 `unhandledrejection`
- 拦截 `console.error`
- 所有信息显示在 Loading 屏幕，同时写入 `window.__debugLog[]`

### 11.2 VR 手腕日志
`window.__debugLog` 是一个环形缓冲（最多 8 条）。右手腕面板显示最近 3 条，左手腕面板显示最近 4 条。在 VR 中翻腕即可看到调试信息，无需退出。

### 11.3 关键调试标记
| 标记 | 含义 | 来源 |
|------|------|------|
| `1/6~6/6` | 初始化阶段 | `js/main.js` initScene |
| `🎴 气球清空，弹出选择卡` | 波次检测正常 | `js/main.js` onAllBalloonsDestroyed |
| `🔗 波次回调已注册` | 回调赋值成功 | `js/main.js` |
| `📤 调用波次回调...` | clearChoiceCards 调用 | `js/cards.js` |
| `🔄 触发波次推进...` | 进入波次递增逻辑 | `js/main.js` |
| `🎈 spawnBalloons 第N波` | 正在生成气球 | `js/balloons.js` |
| `⚠️ 回调未注册！` | 回调未设置（BUG） | `js/cards.js` |

---

## 12. 输入映射

| 按键 | 功能 | 处理模块 |
|------|------|----------|
| 右手扳机 | 射击 | `js/weapons.js` handleShooting |
| 左/右摇杆 | 移动 | `js/movement.js` handleMovement |
| 右手 A/B | 退出 VR | `js/input.js` handleExit |
| 左手 X | 下一天空 | `js/sky.js` checkVRSkySwitch |
| 左手 Y | 上一天空 | `js/sky.js` checkVRSkySwitch |
| 左手握柄 | 如来神掌 (①瞄准 ②释放) | `js/buddhaPalm.js` onLeftGripEdge |
| 左手扳机 | 左手模式射击 | `js/weapons.js` handleShooting |

---

## 13. 音效系统

代码在 `js/audio.js`。
- `initAudio()`: 首次射击时创建 AudioContext
- `playShootSound()`: 噪声衰减模拟枪声
- `playBalloonPopSound()`: 低频爆裂 + 高频撕裂
- `startBackgroundMusic()`: C-Dm-F-G 和弦循环

---

## 14. 关键变量索引（按文件）

| 变量 | 文件 | 用途 |
|------|------|------|
| `renderer/scene/camera/dolly` | `js/scene.js` | Three.js 核心对象 |
| `skyDome/skyDomeMat/starLayers` | `js/scene.js` | 天空穹顶 + 星空层 |
| `sunLight/ambientLight/hemiLight` | `js/scene.js` | 三光源 |
| `skyNow/skyTarget` | `js/sky.js` | 天空状态 + 目标预设 |
| `sunSprite/moonSprite` | `js/sky.js` | 太阳/月亮精灵 |
| `playerStats` | `js/main.js` | {hp, score, atk} |
| `waveNumber` | `js/balloons.js` | 波次计数 |
| `bullets/bulletPool` | `js/weapons.js` | 子弹对象池 |
| `balloons/balloonGroup` | `js/balloons.js` | 气球列表 + 父组 |
| `knightModel/shipModel` | `js/balloons.js` | 骑士/气球船模型 |
| `ak48Model` | `js/weapons.js` | AK48 枪支模型 |
| `buddhaPalmModel/Ready/State` | `js/buddhaPalm.js` | 神掌模型/解锁/状态机 |
| `buddhaPalmSkills[]` | `js/buddhaPalm.js` | 飞行中的神掌 |
| `leftController/rightController` | `js/input.js` | XR 手柄引用 |
| `leftGrip/rightGrip` | `js/input.js` | XR 手柄握持点 |
| `choiceCardsActive/extraBulletEnabled` | `js/cards.js` | 选择卡状态 |
| `choiceCardGroup` | `js/cards.js` | 选择卡父组 |

---

## 15. 架构注意事项（给 AI 的关键提示）

### 15.1 模块顶层代码限制
ES 模块顶层代码在 import 阶段同步执行。此时 `js/scene.js` 导出的 `renderer`/`scene`/`camera`/`dolly` 等还是 `undefined`（需等 `initSceneCore()` 调用后才赋值）。

**禁止**在模块顶层调用：
- `scene.add()`, `dolly.add()`, `renderer.setAnimationLoop()` 等

**正确做法**：将这些调用放在 `init*()` 函数中，由 `js/main.js` → `initScene()` 在 `initSceneCore()` 之后按顺序调用。

### 15.2 跨模块可变状态
ES 模块 `import` 的绑定是**只读**的。外部模块无法直接给导入的 `let` 变量赋值。

**解决方案**：
- 使用 `setter 函数`：如 `setWaveNumber(n)`, `setBuddhaPalmReady(v)`, `setLeftHandGunEnabled(v)`
- 使用 `window.__` 全局变量：如 `window.__onAfterClearChoiceCards`, `window.__debugLog`
- 使用对象引用：如 `playerStats` 是对象，可以直接修改属性 `playerStats.hp += 100`

### 15.3 动态 import
`import('./cards.js')` 在 PICO 浏览器上设置模块命名空间属性可能不兼容。回调注册改为直接使用 `window.__onAfterClearChoiceCards = () => {...}`。

---

## 16. 代码定位速查

| 需要修改 | 文件 | 搜索关键词 |
|----------|------|-----------|
| 全部游戏常量 | `js/config.js` | `BALLOON_COUNT`, `AK48_SCALE` |
| 天空预设 | `js/config.js` | `skyPresets` |
| 天空过渡速度 | `js/sky.js` | `exp(-0.12` |
| 天空逻辑 | `js/sky.js` | `updateSkyTransition` |
| 气球数量/HP | `js/config.js` | `BALLOON_COUNT` |
| 骑士属性 | `js/config.js` | `KNIGHT_HP` |
| 神掌全部参数 | `js/config.js` | `BUDDHA_COOLDOWN`, `AIM_TIMEOUT` |
| 神掌逻辑 | `js/buddhaPalm.js` | `enterAimingMode`, `releaseBuddhaPalm` |
| 神掌装备位置 | `js/buddhaPalm.js` | `palm.position.set` |
| 神掌下落/伤害 | `js/buddhaPalm.js` | `fallDuration`, `killRadius`, `damage` |
| 气球船位置 | `js/config.js` | `SHIP_POS`, `SHIP_SCALE` |
| 玩家眼高 | `js/scene.js` | `camera.position.set(0, 1.6` |
| 移动范围 | `js/config.js` | `BOUND_X` |
| 枪支参数 | `js/weapons.js` | `AK48_SCALE`, `gunInstance.position` |
| 子弹参数 | `js/config.js` + `js/weapons.js` | `BULLET_SPEED`, `SHOOT_COOLDOWN` |
| 解锁神掌条件 | `js/main.js` | `wn >= 1 && !buddhaPalmReady` |
| 波次推进逻辑 | `js/main.js` | `__onAfterClearChoiceCards` |
| 星空分布 | `js/scene.js` | `Math.pow(Math.random(), 2.5)` |
| 手腕 UI | `js/ui.js` | `updateDebugPanel`, `updateLeftDebugPanel` |
| 输入处理 | `js/input.js` | `updateInputs` |
| VR 会话管理 | `js/xr.js` | `enterVR`, `registerXREvents` |

---

## 17. 给 AI 的提示词模板

```
这是一个模块化的 Three.js WebXR VR 射击游戏。
入口: index.html (40行) → js/main.js (总调度)。

架构: 16 个 ES 模块，js/main.js 导入全部模块并编排初始化 + 动画循环。
场景核心对象 (renderer/scene/camera/dolly) 在 js/scene.js 创建。
配置常量在 js/config.js。

重要约束:
1. 模块顶层代码执行时 scene/dolly 还是 undefined，所有 .add() 必须在 init*() 中
2. 跨模块可变状态用 setter 函数或 window.__ 全局变量（import 绑定只读）
3. 启动: npx serve -l 3000 -s .
4. PICO 浏览器: PicoBrowser/3.3.54 Chrome/105

文件索引:
- 改参数 → js/config.js
- 改场景 → js/scene.js
- 改天空 → js/sky.js
- 改射击/子弹 → js/weapons.js
- 改气球/骑士/波次 → js/balloons.js
- 改选择卡 → js/cards.js
- 改神掌 → js/buddhaPalm.js
- 改UI面板 → js/ui.js
- 改输入/移动 → js/input.js + js/movement.js
- 改VR会话 → js/xr.js
- 改音效 → js/audio.js
- 改工具函数 → js/utils.js
```
