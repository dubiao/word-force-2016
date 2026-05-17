import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene {
  background: GameObjects.Rectangle;

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;

    // 深色背景
    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e);

    // 游戏标题
    this.add
      .text(width / 2, height / 2 - 100, '飞机打飞机', {
        fontFamily: 'Arial Black',
        fontSize: 52,
        color: '#00eaff',
        stroke: '#003366',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);

    // 开始游戏按钮
    const btnBg = this.add
      .rectangle(width / 2, height / 2 + 20, 220, 60, 0x1a6aff)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    const btnText = this.add
      .text(width / 2, height / 2 + 20, '普通模式', {
        fontFamily: 'Arial Black',
        fontSize: 28,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(101);

    // 悬浮效果
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x3a8aff);
      btnText.setStyle({ color: '#ffffaa' });
    });

    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x1a6aff);
      btnText.setStyle({ color: '#ffffff' });
    });

    btnBg.on('pointerdown', () => {
      console.log('开始游戏按钮被点击');
      this.scene.start('Game');
    });

    // ---- 单词模式按钮 ----
    const wordBtn = this.add
      .rectangle(width / 2, height / 2 + 100, 220, 60, 0x1a5a1a)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    const wordBtnText = this.add
      .text(width / 2, height / 2 + 100, '单词模式', {
        fontFamily: 'Arial Black',
        fontSize: 28,
        color: '#88ffaa',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(101);

    wordBtn.on('pointerover', () => {
      wordBtn.setFillStyle(0x2a8a2a);
      wordBtnText.setStyle({ color: '#ccffcc' });
    });
    wordBtn.on('pointerout', () => {
      wordBtn.setFillStyle(0x1a5a1a);
      wordBtnText.setStyle({ color: '#88ffaa' });
    });
    wordBtn.on('pointerdown', () => {
      this.scene.start('WordGame');
    });

    // ---- 排行榜按钮 ----
    const rankBtn = this.add
      .rectangle(width / 2, height / 2 + 180, 220, 50, 0x1a3a5a)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    const rankText = this.add
      .text(width / 2, height / 2 + 180, '排行榜', {
        fontFamily: 'Arial Black',
        fontSize: 22,
        color: '#88ccff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(101);

    rankBtn.on('pointerover', () => {
      rankBtn.setFillStyle(0x2a5a8a);
      rankText.setStyle({ color: '#aaeeff' });
    });
    rankBtn.on('pointerout', () => {
      rankBtn.setFillStyle(0x1a3a5a);
      rankText.setStyle({ color: '#88ccff' });
    });
    rankBtn.on('pointerdown', () => {
      this.scene.start('Leaderboard', { score: 0 });
    });

    EventBus.emit('current-scene-ready', this);
  }
}
