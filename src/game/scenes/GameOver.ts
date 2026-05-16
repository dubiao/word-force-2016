import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText: Phaser.GameObjects.Text;
    scoreText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameOver');
    }

    create() {
        const data: { score?: number } = (this.scene.settings as any).data || {};
        const score = data.score ?? 0;

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x0a0a2e);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);

        this.gameOverText = this.add.text(512, 300, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ff4444',
            stroke: '#000000', strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        this.scoreText = this.add.text(512, 380, `Score: ${score}`, {
            fontFamily: 'Arial', fontSize: 36, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        const tip = this.add.text(512, 450, 'Any key or click to restart', {
            fontFamily: 'Arial', fontSize: 24, color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setDepth(100);

        // 闪烁提示
        this.tweens.add({
            targets: tip,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        // 任意键或点击均可重启
        this.input.keyboard?.on('keydown', () => {
            this.scene.start('MainMenu');
        });
        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene() {
        this.scene.start('MainMenu');
    }
}
