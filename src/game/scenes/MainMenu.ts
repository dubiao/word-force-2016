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
      .text(width / 2, height / 2 - 100, '飞机打单词', {
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
      .rectangle(width / 2, height / 2 + 60, 220, 60, 0x1a6aff)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    const btnText = this.add
      .text(width / 2, height / 2 + 60, '开始游戏', {
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

    EventBus.emit('current-scene-ready', this);
  }
}
