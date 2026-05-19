import { Scene } from 'phaser';
import { GameMode, getLeaderboard } from '../storage';

const MODE_LABELS: Record<GameMode, string> = {
  normal: '普通模式排行榜',
  word: '单词模式排行榜',
};

export class Leaderboard extends Scene {
  constructor() {
    super('Leaderboard');
  }

  create() {
    const { width, height } = this.scale;
    const data = (this.scene.settings as any).data ?? {};
    const currentScore: number = data.score ?? 0;
    const mode: GameMode = data.mode ?? 'normal';

    this.cameras.main.setBackgroundColor(0x0a0a2e);

    // ---- 星空粒子背景 ----
    this._drawStars(width, height);

    // ---- 主面板 ----
    const panelW = 480;
    const panelH = 480;
    const panelX = width / 2;
    const panelY = height / 2;

    // 面板背景
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0d1a2e, 0.92);
    panelBg.setDepth(50);

    // 面板边框（发光）
    const panelBorder = this.add.rectangle(panelX, panelY, panelW, panelH);
    panelBorder.setStrokeStyle(2, 0x00eaff, 0.6);
    panelBorder.setDepth(51);

    // 内发光线
    const innerBorder = this.add.rectangle(panelX, panelY, panelW - 8, panelH - 8);
    innerBorder.setStrokeStyle(1, 0x00eaff, 0.2);
    innerBorder.setDepth(52);

    // 标题
    this.add.text(panelX, panelY - panelH / 2 + 28, 'HALL OF FAME', {
      fontFamily: 'Arial Black', fontSize: 28,
      color: '#00eaff',
      stroke: '#003366', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(100);

    // 模式副标题
    this.add.text(panelX, panelY - panelH / 2 + 58, MODE_LABELS[mode], {
      fontFamily: 'Arial', fontSize: 18,
      color: '#00bbdd',
      stroke: '#001133', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    // 标题下划线装饰
    const line = this.add.rectangle(panelX, panelY - panelH / 2 + 82, 260, 2, 0x00eaff, 0.5);
    line.setDepth(100);

    // ---- 列表项 ----
    const entries = getLeaderboard(mode);
    const listTop = panelY - panelH / 2 + 110;
    const rowH = 58;

    if (entries.length === 0) {
      this.add.text(panelX, panelY, '暂无记录', {
        fontFamily: 'Arial', fontSize: 20,
        color: '#555577', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);
    } else {
      entries.forEach((entry, i) => {
        const y = listTop + i * rowH;
        const isTop3 = i < 3;
        const isCurrent = entry.score === currentScore && currentScore > 0;
        this._drawRow(panelX, y, panelW - 40, rowH - 6, {
          rank: i + 1,
          name: entry.name,
          score: entry.score,
          isCurrent,
          isTop3,
        }, i);
      });
    }

    // ---- 当前得分（底部单独一行）----
    const scoreY = panelY + panelH / 2 - 52;
    const scoreBg = this.add.rectangle(panelX, scoreY, panelW - 40, 36, 0x00eaff, 0.12);
    scoreBg.setDepth(100);
    this.add.text(panelX, scoreY, `本局得分  ${currentScore}`, {
      fontFamily: 'Arial Black', fontSize: 18,
      color: '#00eaff', stroke: '#001133', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);

    // ---- 底部提示 ----
    const tip = this.add.text(panelX, panelY + panelH / 2 - 16, '任意键返回主菜单', {
      fontFamily: 'Arial', fontSize: 16,
      color: '#555577', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: tip,
      alpha: 0.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // ---- 任意键返回主菜单 ----
    this.input.keyboard?.on('keydown', () => this.scene.start('MainMenu'));
    this.input.on('pointerdown', () => this.scene.start('MainMenu'));
  }

  private _drawStars(width: number, height: number) {
    const gfx = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 1.5 + 0.4;
      const alpha = Math.random() * 0.6 + 0.2;
      gfx.fillStyle(0xffffff, alpha);
      gfx.fillCircle(x, y, r);
    }
    gfx.setDepth(0);
  }

  private _drawRow(x: number, y: number, w: number, h: number, cfg: {
    rank: number; name: string; score: number; isCurrent: boolean; isTop3: boolean;
  }, delay: number) {
    // 排名颜色
    const medalColors: Record<number, number> = {
      1: 0xFFD700, // 金
      2: 0xC8C8C8, // 银
      3: 0xCD7F32, // 铜
    };
    const rowBgColor = cfg.isCurrent ? 0x00eaff : (cfg.isTop3 ? 0x1a2a3a : 0x0d1520);
    const rowBgAlpha = cfg.isCurrent ? 0.2 : (cfg.isTop3 ? 0.5 : 0.35);

    // 整行背景
    const bg = this.add.rectangle(x, y, w, h, rowBgColor, rowBgAlpha);
    bg.setDepth(80);

    // 左侧排名圆角标记
    const rankX = x - w / 2 + 36;
    const rankCircle = this.add.circle(rankX, y, 16, medalColors[cfg.rank] ?? 0x334455, cfg.isTop3 ? 1 : 0.5);
    rankCircle.setDepth(81);
    const rankText = this.add.text(rankX, y, cfg.rank.toString(), {
      fontFamily: 'Arial Black', fontSize: 14,
      color: cfg.isTop3 ? '#000000' : '#889999',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(82);

    // 名字
    const nameX = x - w / 2 + 100;
    const nameColor = cfg.isCurrent ? '#00ffee' : '#ffffff';
    const nameText = this.add.text(nameX, y, cfg.name, {
      fontFamily: 'Arial', fontSize: cfg.isTop3 ? 20 : 18,
      color: nameColor,
      stroke: '#000000', strokeThickness: cfg.isCurrent ? 3 : 2,
    }).setOrigin(0, 0.5).setDepth(82);

    // 分数（靠右对齐）
    const scoreX = x + w / 2 - 20;
    const scoreColor = cfg.isCurrent ? '#00ffee' : (cfg.isTop3 ? '#ffee88' : '#cccccc');
    const scoreText = this.add.text(scoreX, y, cfg.score.toLocaleString(), {
      fontFamily: 'Arial Black', fontSize: cfg.isTop3 ? 20 : 18,
      color: scoreColor,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(82);

    // 入场动画
    const elements = [bg, rankCircle, rankText, nameText, scoreText];
    elements.forEach(el => {
      el.setAlpha(0);
      el.setY(y + 10);
    });
    this.tweens.add({
      targets: elements,
      alpha: { from: 0, to: 1 },
      y: y,
      duration: 350,
      delay: 120 + delay * 80,
      ease: 'Back.easeOut',
    });
  }
}
