import { Scene, GameObjects, Math as PMath } from 'phaser';
import { checkRank, tryInsertScore } from '../storage';

// ============================================================
//  WordEnemy —— 带单词标签的敌机
// ============================================================
interface WordEnemy {
  container: GameObjects.Container;
  body: GameObjects.Rectangle;
  speed: number;
  word: string;
  nextLetterIdx: number;    // 下一个需要被击中的字母下标
  letterTexts: GameObjects.Text[];
  alive: boolean;
  hitWidth: number;
  height: number;
}

// 字母子弹
interface LetterBullet {
  obj: GameObjects.Text;
  letter: string;
  active: boolean;
}

// ============================================================
//  WordGame 场景
// ============================================================
export class WordGame extends Scene {
  // 玩家飞机
  private plane!: GameObjects.Container;
  private planeX: number = 512;
  private planeY: number = 600;
  private readonly planeSpeed: number = 400;
  private readonly planeWidth: number = 48;
  private readonly planeHeight: number = 36;

  // 字母子弹
  private letterBullets: LetterBullet[] = [];
  private readonly bulletSpeed: number = 550;
  private lastBulletTime: number = 0;
  private readonly bulletCooldownMs: number = 80;

  // 敌机
  private enemies: WordEnemy[] = [];
  private nextSpawnDelay: number = 1500;

  // 词库
  private wordPool: string[] = [];

  // 得分 & 血量
  private score: number = 0;
  private scoreText!: GameObjects.Text;
  private playerHp: number = 20;
  private readonly playerMaxHp: number = 20;
  private hpLabel!: GameObjects.Text;
  private hpBarBg!: GameObjects.Rectangle;
  private hpBarFill!: GameObjects.Rectangle;
  private readonly hpBarW: number = 150;
  private readonly hpBarH: number = 15;

  // 输入
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private isGameOver: boolean = false;

  constructor() {
    super('WordGame');
  }

  // ---- 资源加载（此场景自己加载 words.txt）----
  preload() {
    // 若 Preloader 已经加载过则跳过（cache.text 会有）
    if (!this.cache.text.has('words')) {
      this.load.text('words', 'assets/words.txt');
    }
  }

  create() {
    this.isGameOver = false;

    // 清理上一局残留
    for (const e of this.enemies) this._destroyEnemy(e);
    this.enemies = [];
    for (const b of this.letterBullets) b.obj.destroy();
    this.letterBullets = [];
    this.score = 0;
    this.playerHp = this.playerMaxHp;

    const { width, height } = this.scale;
    this.planeY = height - 100;
    this.planeX = width / 2;

    this.cameras.main.setBackgroundColor(0x05050f);

    // ---- 词库 ----
    this._loadWordPool();

    // ---- 星空背景 ----
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 100; i++) {
      starGfx.fillCircle(
        PMath.Between(0, width),
        PMath.Between(0, height - 100),
        PMath.FloatBetween(0.3, 1.8),
      );
    }
    starGfx.setDepth(0);

    // ---- 玩家飞机（青绿色）----
    const body = this.add.rectangle(0, 0, this.planeWidth, this.planeHeight, 0x00cc88);
    const nose = this.add.graphics();
    nose.fillStyle(0x88ffdd, 1);
    nose.fillTriangle(0, -this.planeHeight / 2 - 14, -10, -this.planeHeight / 2, 10, -this.planeHeight / 2);
    const wingL = this.add.rectangle(-this.planeWidth / 2 - 6, 6, 20, 10, 0x009966);
    const wingR = this.add.rectangle(this.planeWidth / 2 + 6, 6, 20, 10, 0x009966);
    const tail = this.add.rectangle(0, this.planeHeight / 2 + 6, 14, 8, 0x007755);
    this.plane = this.add.container(this.planeX, this.planeY, [body, nose, wingL, wingR, tail]);
    this.plane.setDepth(10);

    // ---- UI：得分 ----
    this.scoreText = this.add
      .text(16, 16, 'Score: 0', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff', stroke: '#000000', strokeThickness: 4 })
      .setDepth(20);

    // ---- UI：血条 ----
    const barRight = width - 16;
    this.hpLabel = this.add
      .text(0, 16, `HP: ${this.playerHp}/${this.playerMaxHp}`, {
        fontFamily: 'Arial', fontSize: 20, color: '#ff6666', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(1, 0.5).setDepth(20);
    const barCenterX = barRight - this.hpBarW / 2;
    this.hpBarBg = this.add.rectangle(barCenterX, 16, this.hpBarW, this.hpBarH, 0x440000).setDepth(20);
    this.hpBarFill = this.add.rectangle(barCenterX - this.hpBarW / 2, 16, this.hpBarW, this.hpBarH, 0x00ff44)
      .setOrigin(0, 0.5).setDepth(20);
    this.hpBarBg.setStrokeStyle(1, 0x888888);
    this.hpLabel.x = barCenterX - this.hpBarW / 2 - 8;

    // ---- 底部提示 ----
    this.add.text(width / 2, height - 20, '按字母键射击 · 鼠标/左右键移动', {
      fontFamily: 'Arial', fontSize: 14, color: '#556677', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20);

    // ---- 模式标签 ----
    this.add.text(width / 2, 16, '单词模式', {
      fontFamily: 'Arial Black', fontSize: 18, color: '#00ffaa', stroke: '#003322', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(20);

    // ---- 输入 ----
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;

    // 鼠标移动
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.planeX = PMath.Clamp(p.x, this.planeWidth / 2, width - this.planeWidth / 2);
    });

    // 字母键发射
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.isGameOver) return;
      const letter = e.key.toLowerCase();
      if (letter.length === 1 && letter >= 'a' && letter <= 'z') {
        this._fireLetter(letter);
      }
    });

    // ---- 首架敌机立即生成 ----
    this._spawnEnemy();
    this.nextSpawnDelay = PMath.Between(2000, 5000);
  }

  // ---- 加载词库 ----
  private _loadWordPool() {
    const raw = this.cache.text.get('words') as string | undefined;
    if (!raw) {
      // fallback：内置最小词表
      this.wordPool = ['cat', 'dog', 'fly', 'sky', 'sun', 'gun', 'war', 'jet', 'ace', 'win'];
      return;
    }
    this.wordPool = raw
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => /^[a-z]+$/.test(w) && w.length >= 2 && w.length <= 10);
  }

  // ---- 随机取一个单词 ----
  private _randomWord(): string {
    return this.wordPool[PMath.Between(0, this.wordPool.length - 1)];
  }

  // ---- 生成一架敌机 ----
  private _spawnEnemy() {
    if (this.isGameOver) return;
    const { width } = this.scale;
    const word = this._randomWord();
    const speed = PMath.Between(40, 100);
    const x = PMath.Between(60, width - 60);

    // 机身
    const eW = 44, eH = 32;
    const body = this.add.rectangle(0, 0, eW, eH, 0x4455cc);
    const nose = this.add.graphics();
    nose.fillStyle(0x8899ff, 1);
    nose.fillTriangle(0, eH / 2 + 12, -9, eH / 2, 9, eH / 2);
    const wingL = this.add.rectangle(-eW / 2 - 5, -4, 18, 8, 0x2233aa);
    const wingR = this.add.rectangle(eW / 2 + 5, -4, 18, 8, 0x2233aa);
    const tail = this.add.rectangle(0, -eH / 2 - 5, 12, 7, 0x1122aa);

    // 字母文字（居中排列在机身下方）
    const letterTexts: GameObjects.Text[] = [];
    const letterSpacing = 14;
    const totalW = (word.length - 1) * letterSpacing;
    word.split('').forEach((ch, i) => {
      const lx = -totalW / 2 + i * letterSpacing;
      const lt = this.add.text(lx, eH / 2 + 20, ch.toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#ffff00',   // 全部黄色，等待击中
        stroke: '#333300',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);
      letterTexts.push(lt);
    });

    const container = this.add.container(x, -40, [body, nose, wingL, wingR, tail, ...letterTexts]);
    container.setDepth(8);

    // 当前需要击中的第一个字母高亮
    this._highlightLetter(letterTexts, 0);

    const enemy: WordEnemy = {
      container,
      body,
      speed,
      word,
      nextLetterIdx: 0,
      letterTexts,
      alive: true,
      hitWidth: 36,
      height: eH,
    };
    this.enemies.push(enemy);
  }

  // ---- 高亮当前字母 ----
  private _highlightLetter(texts: GameObjects.Text[], idx: number) {
    texts.forEach((t, i) => {
      if (i < idx) {
        // 已击中：灰色
        t.setStyle({ color: '#555566', stroke: '#000000', strokeThickness: 1 });
      } else if (i === idx) {
        // 当前目标：亮黄色，放大
        t.setStyle({ color: '#ffee00', stroke: '#886600', strokeThickness: 3 });
        t.setFontSize(15);
      } else {
        // 未到：白色
        t.setStyle({ color: '#ffffff', stroke: '#333333', strokeThickness: 2 });
        t.setFontSize(13);
      }
    });
  }

  // ---- 发射字母子弹 ----
  private _fireLetter(letter: string) {
    const now = this.time.now;
    if (now - this.lastBulletTime < this.bulletCooldownMs) return;
    this.lastBulletTime = now;

    const bx = this.planeX;
    const by = this.planeY - this.planeHeight / 2 - 10;
    const obj = this.add.text(bx, by, letter.toUpperCase(), {
      fontFamily: 'Arial Black',
      fontSize: 16,
      color: '#00ffee',
      stroke: '#003333',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    this.letterBullets.push({ obj, letter, active: true });
  }

  // ---- 碰撞检测：字母子弹 vs 敌机 ----
  private _checkLetterCollision() {
    for (let bi = this.letterBullets.length - 1; bi >= 0; bi--) {
      const b = this.letterBullets[bi];
      if (!b.active) continue;

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e.alive) continue;

        const ex = e.container.x;
        const ey = e.container.y;
        const bx = b.obj.x;
        const by = b.obj.y;

        // AABB 碰撞检测
        if (Math.abs(bx - ex) < e.hitWidth && Math.abs(by - ey) < e.height / 2 + 30) {
          // 检查字母是否匹配
          const targetLetter = e.word[e.nextLetterIdx];
          if (b.letter === targetLetter) {
            // 匹配：消掉该字母，子弹销毁
            e.nextLetterIdx++;
            this._highlightLetter(e.letterTexts, e.nextLetterIdx);
            this.score += 10;
            this.scoreText.setText(`Score: ${this.score}`);

            // 销毁子弹
            b.obj.destroy();
            b.active = false;
            this.letterBullets.splice(bi, 1);

            // 单词全部击完 → 爆炸
            if (e.nextLetterIdx >= e.word.length) {
              this._explode(ex, ey);
              this._destroyEnemy(e);
              this.enemies.splice(ei, 1);
              this.score += 50; // 完整单词奖励
              this.scoreText.setText(`Score: ${this.score}`);
            }

            break; // 子弹已销毁，跳出内层循环
          }
          // 不匹配：子弹穿透，继续检查下一架敌机
        }
      }
    }
  }

  // ---- 销毁敌机 ----
  private _destroyEnemy(e: WordEnemy) {
    e.alive = false;
    e.container.destroy();
  }

  // ---- 爆炸效果 ----
  private _explode(x: number, y: number) {
    const colors = [0x00ffaa, 0xffdd00, 0x00eaff, 0xffffff, 0x88ff88];
    for (let i = 0; i < 14; i++) {
      const size = PMath.Between(3, 9);
      const vx = PMath.FloatBetween(-130, 130);
      const vy = PMath.FloatBetween(-130, 50);
      const color = colors[PMath.Between(0, colors.length - 1)];
      const piece = this.add.rectangle(x, y, size, size, color).setDepth(15);
      this.tweens.add({
        targets: piece, x: x + vx, y: y + vy, alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: PMath.Between(300, 600), ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
    }
  }

  // ---- 玩家扣血 ----
  private _takePlayerDamage(dmg: number) {
    this.playerHp -= dmg;
    if (this.playerHp < 0) this.playerHp = 0;
    this._updateHpBar();
    if (this.playerHp <= 0) this._gameOver();
  }

  // ---- 更新血条 ----
  private _updateHpBar() {
    const ratio = PMath.Clamp(this.playerHp / this.playerMaxHp, 0, 1);
    this.hpBarFill.width = this.hpBarW * ratio;
    const color = ratio > 0.5 ? 0x00ff44 : ratio > 0.25 ? 0xffee00 : 0xff3300;
    this.hpBarFill.setFillStyle(color);
    this.hpLabel.setText(`HP: ${this.playerHp}/${this.playerMaxHp}`);
  }

  // ---- 游戏结束 ----
  private _gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.scene.stop('GameOver');
    const rank = checkRank(this.score);
    if (rank !== null) {
      this.scene.start('NameEntry', { score: this.score, rank });
    } else {
      this.scene.start('Leaderboard', { score: this.score });
    }
  }

  // ---- 主循环 ----
  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // 键盘左右移动
    if (this.cursors) {
      if (this.cursors.left.isDown) this.planeX -= this.planeSpeed * dt;
      else if (this.cursors.right.isDown) this.planeX += this.planeSpeed * dt;
    }
    this.planeX = PMath.Clamp(this.planeX, this.planeWidth / 2, width - this.planeWidth / 2);
    this.plane.x = this.planeX;

    // 字母子弹移动
    for (let i = this.letterBullets.length - 1; i >= 0; i--) {
      const b = this.letterBullets[i];
      if (!b.active) { this.letterBullets.splice(i, 1); continue; }
      b.obj.y -= this.bulletSpeed * dt;
      if (b.obj.y < -30) {
        b.obj.destroy();
        b.active = false;
        this.letterBullets.splice(i, 1);
      }
    }

    // 敌机生成计时
    this.nextSpawnDelay -= delta;
    if (this.nextSpawnDelay <= 0) {
      this._spawnEnemy();
      this.nextSpawnDelay = PMath.Between(2000, 5000);
    }

    // 敌机移动 & 出界
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); continue; }
      e.container.y += e.speed * dt;
      if (e.container.y > height + 60) {
        this._takePlayerDamage(1);
        this._destroyEnemy(e);
        this.enemies.splice(i, 1);
      }
    }

    // 碰撞检测
    this._checkLetterCollision();
  }
}
