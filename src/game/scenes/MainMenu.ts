import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene {
  background: GameObjects.Rectangle;

  // 主菜单元素
  private mainElements: any[] = [];
  // 难度选择元素
  private diffElements: any[] = [];

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e);

    // 标题（始终可见）
    this.add.text(width / 2, height / 2 - 100, '飞机打飞机', {
      fontFamily: 'Arial Black', fontSize: 52, color: '#00eaff',
      stroke: '#003366', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5).setDepth(100);

    // ========== 主菜单 ==========

    // 普通模式按钮
    const btnNormalBg = this.add.rectangle(width / 2, height / 2 + 20, 220, 60, 0x1a6aff)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const btnNormalText = this.add.text(width / 2, height / 2 + 20, '普通模式', {
      fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(101);
    btnNormalBg.on('pointerover', () => { btnNormalBg.setFillStyle(0x3a8aff); btnNormalText.setStyle({ color: '#ffffaa' }); });
    btnNormalBg.on('pointerout', () => { btnNormalBg.setFillStyle(0x1a6aff); btnNormalText.setStyle({ color: '#ffffff' }); });
    btnNormalBg.on('pointerdown', () => this.scene.start('Game'));

    // 普通模式排行榜
    const rankNormalBg = this.add.rectangle(width / 2 + 140, height / 2 + 20, 140, 60, 0x1a3a5a)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const rankNormalText = this.add.text(width / 2 + 140, height / 2 + 20, '排行榜', {
      fontFamily: 'Arial Black', fontSize: 22, color: '#88ccff', align: 'center',
    }).setOrigin(0.5).setDepth(101);
    rankNormalBg.on('pointerover', () => { rankNormalBg.setFillStyle(0x2a5a8a); rankNormalText.setStyle({ color: '#aaeeff' }); });
    rankNormalBg.on('pointerout', () => { rankNormalBg.setFillStyle(0x1a3a5a); rankNormalText.setStyle({ color: '#88ccff' }); });
    rankNormalBg.on('pointerdown', () => this.scene.start('Leaderboard', { score: 0, mode: 'normal' }));

    // 单词模式按钮
    const btnWordBg = this.add.rectangle(width / 2, height / 2 + 100, 220, 60, 0x1a5a1a)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const btnWordText = this.add.text(width / 2, height / 2 + 100, '单词模式', {
      fontFamily: 'Arial Black', fontSize: 28, color: '#88ffaa', align: 'center',
    }).setOrigin(0.5).setDepth(101);
    btnWordBg.on('pointerover', () => { btnWordBg.setFillStyle(0x2a8a2a); btnWordText.setStyle({ color: '#ccffcc' }); });
    btnWordBg.on('pointerout', () => { btnWordBg.setFillStyle(0x1a5a1a); btnWordText.setStyle({ color: '#88ffaa' }); });
    // pointerdown 在文件末尾统一设置

    // 单词模式排行榜
    const rankWordBg = this.add.rectangle(width / 2 + 140, height / 2 + 100, 140, 60, 0x1a3a5a)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const rankWordText = this.add.text(width / 2 + 140, height / 2 + 100, '排行榜', {
      fontFamily: 'Arial Black', fontSize: 22, color: '#88ccff', align: 'center',
    }).setOrigin(0.5).setDepth(101);
    rankWordBg.on('pointerover', () => { rankWordBg.setFillStyle(0x2a5a8a); rankWordText.setStyle({ color: '#aaeeff' }); });
    rankWordBg.on('pointerout', () => { rankWordBg.setFillStyle(0x1a3a5a); rankWordText.setStyle({ color: '#88ccff' }); });
    rankWordBg.on('pointerdown', () => this.scene.start('Leaderboard', { score: 0, mode: 'word' }));

    this.mainElements = [btnNormalBg, btnNormalText, rankNormalBg, rankNormalText, btnWordBg, btnWordText, rankWordBg, rankWordText];

    // ========== 难度选择（初始隐藏）==========

    const diffTitle = this.add.text(width / 2, height / 2 - 60, '选择难度', {
      fontFamily: 'Arial Black', fontSize: 36, color: '#00ffaa',
      stroke: '#003322', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // 简单
    const easyBg = this.add.rectangle(width / 2, height / 2 + 20, 220, 60, 0x1a5a1a)
      .setInteractive({ useHandCursor: true }).setDepth(100).setVisible(false);
    const easyText = this.add.text(width / 2, height / 2 + 20, '简单', {
      fontFamily: 'Arial Black', fontSize: 28, color: '#88ffaa', align: 'center',
    }).setOrigin(0.5).setDepth(101).setVisible(false);
    easyBg.on('pointerover', () => { easyBg.setFillStyle(0x2a8a2a); easyText.setStyle({ color: '#ccffcc' }); });
    easyBg.on('pointerout', () => { easyBg.setFillStyle(0x1a5a1a); easyText.setStyle({ color: '#88ffaa' }); });
    easyBg.on('pointerdown', () => this.scene.start('WordGame', { difficulty: 'easy' }));

    // 中等
    const medBg = this.add.rectangle(width / 2, height / 2 + 100, 220, 60, 0x1a6aff)
      .setInteractive({ useHandCursor: true }).setDepth(100).setVisible(false);
    const medText = this.add.text(width / 2, height / 2 + 100, '中等', {
      fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(101).setVisible(false);
    medBg.on('pointerover', () => { medBg.setFillStyle(0x3a8aff); medText.setStyle({ color: '#ffffaa' }); });
    medBg.on('pointerout', () => { medBg.setFillStyle(0x1a6aff); medText.setStyle({ color: '#ffffff' }); });
    medBg.on('pointerdown', () => this.scene.start('WordGame', { difficulty: 'normal' }));

    // 困难
    const hardBg = this.add.rectangle(width / 2, height / 2 + 180, 220, 60, 0x5a1a1a)
      .setInteractive({ useHandCursor: true }).setDepth(100).setVisible(false);
    const hardText = this.add.text(width / 2, height / 2 + 180, '困难', {
      fontFamily: 'Arial Black', fontSize: 28, color: '#ff8888', align: 'center',
    }).setOrigin(0.5).setDepth(101).setVisible(false);
    hardBg.on('pointerover', () => { hardBg.setFillStyle(0x7a2a2a); hardText.setStyle({ color: '#ffcccc' }); });
    hardBg.on('pointerout', () => { hardBg.setFillStyle(0x5a1a1a); hardText.setStyle({ color: '#ff8888' }); });
    hardBg.on('pointerdown', () => this.scene.start('WordGame', { difficulty: 'hard' }));

    // 返回
    const backBg = this.add.rectangle(width / 2, height / 2 + 260, 220, 50, 0x1a3a5a)
      .setInteractive({ useHandCursor: true }).setDepth(100).setVisible(false);
    const backText = this.add.text(width / 2, height / 2 + 260, '返回', {
      fontFamily: 'Arial', fontSize: 22, color: '#88ccff', align: 'center',
    }).setOrigin(0.5).setDepth(101).setVisible(false);
    backBg.on('pointerover', () => { backBg.setFillStyle(0x2a5a8a); backText.setStyle({ color: '#aaeeff' }); });
    backBg.on('pointerout', () => { backBg.setFillStyle(0x1a3a5a); backText.setStyle({ color: '#88ccff' }); });
    backBg.on('pointerdown', () => this._showDiffSelection(false));

    this.diffElements = [diffTitle, easyBg, easyText, medBg, medText, hardBg, hardText, backBg, backText];

    // 单词模式按钮：点击后显示难度选择
    btnWordBg.on('pointerdown', () => this._showDiffSelection(true));

    EventBus.emit('current-scene-ready', this);
  }

  private _showDiffSelection(show: boolean) {
    this.mainElements.forEach(e => e.setVisible(!show));
    this.diffElements.forEach(e => e.setVisible(show));
  }
}
