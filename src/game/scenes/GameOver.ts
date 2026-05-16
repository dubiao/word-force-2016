import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create() {
        const score = (this.scene.settings as any).data?.score ?? 0;
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x0a0a2e);

        // 星空背景
        const gfx = this.add.graphics();
        for (let i = 0; i < 80; i++) {
            gfx.fillStyle(0xffffff, Math.random() * 0.5 + 0.1);
            gfx.fillCircle(Math.random() * width, Math.random() * height, Math.random() * 1.5 + 0.3);
        }

        this.add.text(width / 2, height / 2 - 80, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 56,
            color: '#ff4444', stroke: '#000000', strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        this.add.text(width / 2, height / 2, `Score: ${score}`, {
            fontFamily: 'Arial', fontSize: 32,
            color: '#ffffff', stroke: '#000000', strokeThickness: 5,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        const tip = this.add.text(width / 2, height / 2 + 60, '任意键继续…', {
            fontFamily: 'Arial', fontSize: 22,
            color: '#aaaaaa', stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({ targets: tip, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });

        this.input.keyboard?.on('keydown', () => this.scene.start('MainMenu'));
        this.input.once('pointerdown', () => this.scene.start('MainMenu'));

        EventBus.emit('current-scene-ready', this);
    }
}
