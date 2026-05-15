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
  alive: boolean = true;

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

  /** 每帧移动 */
  update(dt: number) {
    if (!this.alive) return;
    this.container.y += this.speed * dt;
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
  readonly planeY: number = 700;
  readonly planeSpeed: number = 400;
  readonly planeWidth: number = 48;
  readonly planeHeight: number = 36;

  // 子弹
  bullets: GameObjects.Rectangle[] = [];
  readonly bulletSpeed: number = 600;
  bulletCooldown: number = 0;
  readonly bulletCooldownTime: number = 100;

  // 敌机
  enemies: Enemy[] = [];
  private nextSpawnDelay: number = 0; // 距离下次生成的倒计时 ms

  // 得分
  score: number = 0;
  private scoreText!: GameObjects.Text;

  // 输入
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x0a0a2e);

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

    // ---- 初始化第一次敌机生成计时 ----
    this._resetSpawnTimer();

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
    const x = PMath.Between(30, width - 30);
    const speed = PMath.Between(80, 200); // 速度各不相同
    const hp = 10; // 以后改成动态
    const enemy = new Enemy(this, x, -40, hp, speed);
    this.enemies.push(enemy);
  }

  // ---- 重置生成计时（2～5 秒随机）----
  private _resetSpawnTimer() {
    this.nextSpawnDelay = PMath.Between(1000, 5000);
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
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e.alive) continue;

        // 子弹中心 vs 敌机 AABB
        const halfW = e.width / 2 + 3;
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

    // ---- 敌机移动 & 出界销毁 ----
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.y > height + 60) {
        e.destroy();
        this.enemies.splice(i, 1);
      }
    }
    if (this.enemies.length === 0) {
      console.log(new Date().toLocaleString(), 'no enemy left, spawn one');
      this._spawnEnemy();
    }

    // ---- 碰撞检测 ----
    this._checkBulletEnemyCollision();
  }

  changeScene() {
    this.scene.start('GameOver');
  }
}
