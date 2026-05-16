import { EventBus } from '../EventBus';
import { Scene, GameObjects, Math as PMath } from 'phaser';

// ============================================================
//  Enemy 类 —— 敌机实体，后续可独立拆文件
// ============================================================
export class Enemy {
  scene: Scene;
  container: GameObjects.Container;
  hp: number;
  speed: number; // px/s，向下飞行速度
  width: number = 44;
  height: number = 32;
  hitWidth: number = 36;  // 包含翅膀的碰撞半宽（机身22 + 翅膀偏移5 + 翅膀半宽9）
  alive: boolean = true;

  // 射击冷却（各敌机独立，初始随机错开）
  shootCooldown: number;
  private readonly shootInterval = 3000; // ms，约 3 秒一发

  // 血条显示
  private hpBarBg: GameObjects.Rectangle;
  private hpBarFill: GameObjects.Rectangle;
  private readonly hpBarW = 40;
  private readonly hpBarH = 5;
  private readonly maxHp: number;

  constructor(scene: Scene, x: number, y: number, hp: number = 10, speed: number = 120) {
    this.scene = scene;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    // 初始冷却随机错开，避免所有敌机同时开火
    this.shootCooldown = PMath.Between(1000, 3000);

    // ---- 机身（红色色块组合，朝下飞）----
    const body = scene.add.rectangle(0, 0, this.width, this.height, 0xff4444);
    // 机头朝下的三角
    const nose = scene.add.graphics();
    nose.fillStyle(0xff8888, 1);
    nose.fillTriangle(0, this.height / 2 + 12, -9, this.height / 2, 9, this.height / 2);
    // 左翼
    const wingL = scene.add.rectangle(-this.width / 2 - 5, -4, 18, 8, 0xcc2222);
    // 右翼
    const wingR = scene.add.rectangle(this.width / 2 + 5, -4, 18, 8, 0xcc2222);
    // 尾翼
    const tail = scene.add.rectangle(0, -this.height / 2 - 5, 12, 7, 0xaa1111);

    // ---- 血条 ----
    this.hpBarBg = scene.add.rectangle(0, -this.height / 2 - 14, this.hpBarW, this.hpBarH, 0x440000);
    this.hpBarFill = scene.add.rectangle(
      -this.hpBarW / 2 + this.hpBarW / 2, // 初始居中（满血）
      -this.height / 2 - 14,
      this.hpBarW,
      this.hpBarH,
      0x00ff44,
    );

    this.container = scene.add.container(x, y, [body, nose, wingL, wingR, tail, this.hpBarBg, this.hpBarFill]);
    this.container.setDepth(8);
  }

  /** 受到伤害，返回是否已死亡 */
  takeDamage(dmg: number = 1): boolean {
    if (!this.alive) return true;
    this.hp -= dmg;
    this._updateHpBar();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    // 受击闪白
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
    });
    return false;
  }

  /** 每帧移动，返回 true 表示本帧需要开火 */
  update(dt: number): boolean {
    if (!this.alive) return false;
    this.container.y += this.speed * dt;
    // 只有进入屏幕后才开始计时射击（y > 0）
    if (this.container.y > 0) {
      this.shootCooldown -= dt * 1000;
      if (this.shootCooldown <= 0) {
        this.shootCooldown = this.shootInterval + PMath.Between(-500, 500); // ±0.5s 随机抖动
        return true;
      }
    }
    return false;
  }

  /** 销毁对象（正常移出屏幕 / 被消灭后调用） */
  destroy() {
    this.alive = false;
    this.container.destroy();
  }

  get x() {
    return this.container.x;
  }
  get y() {
    return this.container.y;
  }

  // ---- 私有：更新血条宽度 ----
  private _updateHpBar() {
    const ratio = PMath.Clamp(this.hp / this.maxHp, 0, 1);
    const newW = this.hpBarW * ratio;
    // 血条从左对齐缩小：调整 x 偏移
    this.hpBarFill.width = newW;
    this.hpBarFill.x = -this.hpBarW / 2 + newW / 2;
    // 颜色从绿→黄→红
    const color = ratio > 0.5 ? 0x00ff44 : ratio > 0.25 ? 0xffee00 : 0xff3300;
    this.hpBarFill.setFillStyle(color);
  }
}

// ============================================================
//  Game 场景
// ============================================================
export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;

  // 玩家飞机
  plane: GameObjects.Container;
  planeX: number = 512;
  planeY: number = 700;
  readonly planeSpeed: number = 400;
  readonly planeWidth: number = 48;
  readonly planeHeight: number = 36;

  // 子弹（玩家）
  bullets: GameObjects.Rectangle[] = [];
  readonly bulletSpeed: number = 600;
  bulletCooldown: number = 0;
  readonly bulletCooldownTime: number = 100;

  // 敌机子弹
  enemyBullets: GameObjects.Rectangle[] = [];
  readonly enemyBulletSpeed: number = 220;

  // 敌机
  enemies: Enemy[] = [];
  private nextSpawnDelay: number = 1500; // 距离下次生成的倒计时 ms（初始给1.5s缓冲）

  // 得分
  score: number = 0;
  private scoreText!: GameObjects.Text;

  // 玩家血量
  readonly playerMaxHp: number = 20;
  playerHp: number = 20;
  private hpLabel!: GameObjects.Text;
  private hpBarBg!: GameObjects.Rectangle;
  private hpBarFill!: GameObjects.Rectangle;
  private readonly hpBarW: number = 150;
  private readonly hpBarH: number = 15;

  // 输入
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor() {
    super('Game');
  }

  create() {
    // ---- 清理上一局残留（防止重开时隐形敌机/子弹）----
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    for (const b of this.bullets) b.destroy();
    this.bullets = [];
    for (const eb of this.enemyBullets) eb.destroy();
    this.enemyBullets = [];
    this.score = 0;
    this.playerHp = this.playerMaxHp;

    const { width, height } = this.scale;

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x0a0a2e);

    // 根据屏幕高度动态计算玩家飞机的 Y 坐标，避免跑出屏幕底部
    this.planeY = height - 50;

    // ---- 星空背景 ----
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 80; i++) {
      const sx = PMath.Between(0, width);
      const sy = PMath.Between(0, height - 120);
      const sr = PMath.FloatBetween(0.5, 2);
      starGfx.fillCircle(sx, sy, sr);
    }

    // ---- 玩家飞机（色块组合）----
    const body = this.add.rectangle(0, 0, this.planeWidth, this.planeHeight, 0x44aaff);
    const nose = this.add.graphics();
    nose.fillStyle(0x88ddff, 1);
    nose.fillTriangle(0, -this.planeHeight / 2 - 14, -10, -this.planeHeight / 2, 10, -this.planeHeight / 2);
    const wingL = this.add.rectangle(-this.planeWidth / 2 - 6, 6, 20, 10, 0x2288dd);
    const wingR = this.add.rectangle(this.planeWidth / 2 + 6, 6, 20, 10, 0x2288dd);
    const tail = this.add.rectangle(0, this.planeHeight / 2 + 6, 14, 8, 0x1166bb);

    this.planeX = width / 2;
    this.plane = this.add.container(this.planeX, this.planeY, [body, nose, wingL, wingR, tail]);
    this.plane.setDepth(10);

    // ---- 得分文字 ----
    this.score = 0;
    this.scoreText = this.add
      .text(16, 16, 'Score: 0', {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setDepth(20);

    // ---- 玩家血条（最右边）----
    this.playerHp = this.playerMaxHp;
    const barRight = width - 16;
    const barY = 16;

    // 血量文字（右对齐，放在血条左边）
    this.hpLabel = this.add
      .text(0, 16, `HP: ${this.playerHp}/${this.playerMaxHp}`, {
        fontFamily: 'Arial',
        fontSize: 20,
        color: '#ff6666',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0.5)
      .setDepth(20);

    const barCenterX = barRight - this.hpBarW / 2;
    this.hpBarBg = this.add
      .rectangle(barCenterX, barY, this.hpBarW, this.hpBarH, 0x440000)
      .setDepth(20);
    this.hpBarFill = this.add
      .rectangle(barCenterX - this.hpBarW / 2, barY, this.hpBarW, this.hpBarH, 0x00ff44)
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.hpBarBg.setStrokeStyle(1, 0x888888);

    // 文字右边缘对齐到血条左边缘左侧 8px
    this.hpLabel.x = barCenterX - this.hpBarW / 2 - 8;

    // ---- 键盘输入 ----
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;

    // ---- 鼠标移动控制飞机水平位置 ----
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.planeX = PMath.Clamp(pointer.x, this.planeWidth / 2, width - this.planeWidth / 2);
    });

    // ---- 鼠标点击发射子弹 ----
    this.input.on('pointerdown', () => {
      this.fireBullet();
    });

    // ---- 空格键发射子弹 ----
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.fireBullet();
    });

    // ---- 初始化敌机生成 ----
    this._spawnEnemy(); // 立即生成第一架敌机
    this._resetSpawnTimer(); // 后续按正常间隔生成

    EventBus.emit('current-scene-ready', this);
  }

  // ---- 发射子弹 ----
  fireBullet() {
    const now = this.time.now;
    if (now - this.bulletCooldown < this.bulletCooldownTime) return;
    this.bulletCooldown = now;

    const bullet = this.add
      .rectangle(this.planeX, this.planeY - this.planeHeight / 2 - 10, 6, 18, 0xffee00)
      .setDepth(9);
    this.bullets.push(bullet);
  }

  // ---- 生成一架敌机 ----
  private _spawnEnemy() {
    const { width } = this.scale;
    const x = PMath.Between(40, width - 40);
    const speed = PMath.Between(40, 120); // 速度各不相同
    const hp = 10; // 以后改成动态
    const enemy = new Enemy(this, x, -40, hp, speed);
    this.enemies.push(enemy);
  }

  // ---- 重置生成计时（2～5 秒随机）----
  private _resetSpawnTimer() {
    this.nextSpawnDelay = PMath.Between(1000, 5000);
  }

  // ---- 玩家扣血 ----
  private _takePlayerDamage(dmg: number) {
    this.playerHp -= dmg;
    if (this.playerHp < 0) this.playerHp = 0;
    this._updateHpBar();
    if (this.playerHp <= 0) {
      this._gameOver();
    }
  }

  // ---- 更新玩家血条显示 ----
  private _updateHpBar() {
    const ratio = PMath.Clamp(this.playerHp / this.playerMaxHp, 0, 1);
    this.hpBarFill.width = this.hpBarW * ratio;
    const color = ratio > 0.5 ? 0x00ff44 : ratio > 0.25 ? 0xffee00 : 0xff3300;
    this.hpBarFill.setFillStyle(color);
    this.hpLabel.setText(`HP: ${this.playerHp}/${this.playerMaxHp}`);
  }

  // ---- 游戏结束 ----
  private _gameOver() {
    // 清理所有敌机子弹，避免残留
    for (const eb of this.enemyBullets) eb.destroy();
    this.enemyBullets = [];
    this.scene.start('GameOver', { score: this.score });
  }

  // ---- 爆炸效果（粒子用色块模拟）----
  private _explode(x: number, y: number) {
    const colors = [0xff8800, 0xffdd00, 0xff4400, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const size = PMath.Between(4, 10);
      const vx = PMath.FloatBetween(-120, 120);
      const vy = PMath.FloatBetween(-120, 60);
      const color = colors[PMath.Between(0, colors.length - 1)];
      const piece = this.add.rectangle(x, y, size, size, color).setDepth(15);
      this.tweens.add({
        targets: piece,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: PMath.Between(300, 600),
        ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
    }
  }

  // ---- 碰撞检测（AABB 简易矩形碰撞）----
  private _checkBulletEnemyCollision() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b || !b.active) continue;  // 已被 _checkBulletBulletCollision 销毁则跳过
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e.alive) continue;

        // 子弹中心 vs 敌机 AABB（含翅膀宽度）
        const halfW = e.hitWidth;
        const halfH = e.height / 2 + 9;
        if (Math.abs(b.x - e.x) < halfW && Math.abs(b.y - e.y) < halfH) {
          // 子弹命中
          b.destroy();
          this.bullets.splice(bi, 1);

          const dead = e.takeDamage(1);
          if (dead) {
            this._explode(e.x, e.y);
            e.destroy();
            this.enemies.splice(ei, 1);
            this.score += 100;
            this.scoreText.setText(`Score: ${this.score}`);
          }
          break; // 一颗子弹只命中一个敌机
        }
      }
    }
  }

  // ---- 玩家子弹 vs 敌机子弹碰撞（互相抵消）----
  private _checkBulletBulletCollision() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b || !b.active) continue;  // 已被其他碰撞销毁则跳过
      for (let ei = this.enemyBullets.length - 1; ei >= 0; ei--) {
        const eb = this.enemyBullets[ei];
        if (!eb || !eb.active) continue;
        // AABB 碰撞（玩家子弹 ~6px宽，敌机子弹 ~5px宽）
        if (Math.abs(b.x - eb.x) < 5.5 && Math.abs(b.y - eb.y) < 16) {
          b.destroy();
          this.bullets.splice(bi, 1);
          // splice 后 for 循环的 bi-- 会自动指向下一个有效索引，无需手动调整
          eb.destroy();
          this.enemyBullets.splice(ei, 1);
          break; // 一颗玩家子弹只能抵消一颗敌机子弹
        }
      }
    }
  }

  update(_time: number, delta: number) {
    const { width, height } = this.scale;
    const dt = delta / 1000;

    // ---- 键盘左右移动 ----
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.planeX -= this.planeSpeed * dt;
      } else if (this.cursors.right.isDown) {
        this.planeX += this.planeSpeed * dt;
      }
    }
    this.planeX = PMath.Clamp(this.planeX, this.planeWidth / 2, width - this.planeWidth / 2);
    this.plane.x = this.planeX;

    // ---- 子弹移动 ----
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= this.bulletSpeed * dt;
      if (b.y < -20) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // ---- 敌机生成计时 ----
    this.nextSpawnDelay -= delta;
    if (this.nextSpawnDelay <= 0) {
      console.log(new Date().toLocaleString(), 'spawn enemy');
      this._spawnEnemy();
      this._resetSpawnTimer();
    }

    // ---- 敌机移动 & 出界销毁 & 开火 ----
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const shouldFire = e.update(dt);
      if (shouldFire) {
        // 从敌机机头位置发射子弹（机头在机身下方）
        const eb = this.add
          .rectangle(e.x, e.y + e.height / 2 + 14, 5, 14, 0xff4400)
          .setDepth(9);
        this.enemyBullets.push(eb);
      }
      if (e.y > height + 60) {
        this._takePlayerDamage(1); // 漏掉敌机，扣一滴血
        e.destroy();
        this.enemies.splice(i, 1);
      }
    }

    // ---- 敌机子弹移动 & 命中玩家 ----
    const planeHalfW = this.planeWidth / 2 + 6;  // 含机翼
    const planeHalfH = this.planeHeight / 2 + 14; // 含机头
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      if (!eb || !eb.active) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      eb.y += this.enemyBulletSpeed * dt;
      // 飞出屏幕销毁
      if (eb.y > height + 20) {
        eb.destroy();
        this.enemyBullets.splice(i, 1);
        continue;
      }
      // 命中玩家
      if (
        Math.abs(eb.x - this.planeX) < planeHalfW &&
        Math.abs(eb.y - this.planeY) < planeHalfH
      ) {
        eb.destroy();
        this.enemyBullets.splice(i, 1);
        this._takePlayerDamage(1);
      }
    }

    // ---- 碰撞检测 ----
    this._checkBulletBulletCollision();  // 先抵消子弹，再处理其他碰撞
    this._checkBulletEnemyCollision();
  }

  changeScene() {
    this.scene.start('GameOver');
  }
}
