import { EventBus } from '../EventBus';
import { Scene, GameObjects, Math } from 'phaser';

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;

  // 飞机（用色块表示）
  plane: GameObjects.Container;
  planeBody: GameObjects.Rectangle;
  planeX: number = 512;
  readonly planeY: number = 700;
  readonly planeSpeed: number = 400;
  readonly planeWidth: number = 48;
  readonly planeHeight: number = 36;

  // 子弹
  bullets: GameObjects.Rectangle[] = [];
  readonly bulletSpeed: number = 600;
  bulletCooldown: number = 0;
  readonly bulletCooldownTime: number = 300; // ms，最短发射间隔

  // 输入
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x0a0a2e);

    // ---- 星空背景（简单色点装饰）----
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 80; i++) {
      const sx = Math.Between(0, width);
      const sy = Math.Between(0, height - 120);
      const sr = Math.FloatBetween(0.5, 2);
      starGfx.fillCircle(sx, sy, sr);
    }

    // ---- 飞机（色块组合）----
    // 机身
    const body = this.add.rectangle(0, 0, this.planeWidth, this.planeHeight, 0x44aaff);
    // 机头（三角形用 Graphics 绘制）
    const nose = this.add.graphics();
    nose.fillStyle(0x88ddff, 1);
    nose.fillTriangle(0, -this.planeHeight / 2 - 14, -10, -this.planeHeight / 2, 10, -this.planeHeight / 2);
    // 左翼
    const wingL = this.add.rectangle(-this.planeWidth / 2 - 6, 6, 20, 10, 0x2288dd);
    // 右翼
    const wingR = this.add.rectangle(this.planeWidth / 2 + 6, 6, 20, 10, 0x2288dd);
    // 尾翼
    const tail = this.add.rectangle(0, this.planeHeight / 2 + 6, 14, 8, 0x1166bb);

    this.planeX = width / 2;
    this.plane = this.add.container(this.planeX, this.planeY, [body, nose, wingL, wingR, tail]);
    this.plane.setDepth(10);

    // ---- 键盘输入 ----
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;

    // ---- 鼠标移动控制飞机水平位置 ----
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.planeX = Math.Clamp(pointer.x, this.planeWidth / 2, width - this.planeWidth / 2);
    });

    // ---- 鼠标点击发射子弹 ----
    this.input.on('pointerdown', () => {
      this.fireBullet();
    });

    // ---- 空格键发射子弹 ----
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.fireBullet();
    });

    EventBus.emit('current-scene-ready', this);
  }

  fireBullet() {
    const now = this.time.now;
    if (now - this.bulletCooldown < this.bulletCooldownTime) return;
    this.bulletCooldown = now;

    const bullet = this.add
      .rectangle(this.planeX, this.planeY - this.planeHeight / 2 - 10, 6, 18, 0xffee00)
      .setDepth(9);
    this.bullets.push(bullet);
  }

  update(_time: number, delta: number) {
    const { width } = this.scale;
    const dt = delta / 1000; // 转为秒

    // ---- 键盘左右移动 ----
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.planeX -= this.planeSpeed * dt;
      } else if (this.cursors.right.isDown) {
        this.planeX += this.planeSpeed * dt;
      }
    }

    // 限制飞机不超出边界
    this.planeX = Math.Clamp(this.planeX, this.planeWidth / 2, width - this.planeWidth / 2);
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
  }

  changeScene() {
    this.scene.start('GameOver');
  }
}
