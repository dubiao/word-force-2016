import { Scene } from 'phaser';
import { tryInsertScore } from '../storage';

export class NameEntry extends Scene {
  constructor() {
    super('NameEntry');
  }

  create() {
    const { width, height } = this.scale;
    const score = (this.scene.settings as any).data?.score ?? 0;
    const rank = (this.scene.settings as any).data?.rank ?? 0;

    this.cameras.main.setBackgroundColor(0x0a0a2e);

    // ---- 标题：恭喜进入排行榜 ----
    this.add.text(width / 2, height / 2 - 160, 'NEW HIGH SCORE!', {
      fontFamily: 'Arial Black', fontSize: 42,
      color: '#ffdd00', stroke: '#aa7700', strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    this.add.text(width / 2, height / 2 - 110, `第 ${rank} 名 · ${score} 分`, {
      fontFamily: 'Arial', fontSize: 26,
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    // ---- 提示文字 ----
    this.add.text(width / 2, height / 2 - 55, '请输入你的名字', {
      fontFamily: 'Arial', fontSize: 20,
      color: '#aaaaaa', stroke: '#000000', strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    // ---- HTML 输入框 ----
    const inputEl = this.add
      .dom(width / 2, height / 2)
      .createElement('input', {
        type: 'text',
        id: 'name-input',
        maxlength: '10',
        placeholder: '你的名字',
        autocomplete: 'off',
      });

    const el = inputEl.node as HTMLInputElement;
    el.style.cssText = [
      'width: 240px',
      'padding: 10px 16px',
      'font-size: 22px',
      'font-family: Arial, sans-serif',
      'text-align: center',
      'border: 2px solid #00eaff',
      'border-radius: 8px',
      'background: #0d1a2e',
      'color: #ffffff',
      'outline: none',
      'box-shadow: 0 0 16px #00eaff66',
      'letter-spacing: 2px',
    ].join(';');

    // 聚焦
    setTimeout(() => el.focus(), 100);

    // ---- 提交按钮 ----
    const btn = this.add
      .dom(width / 2, height / 2 + 70)
      .createElement('button', {}, '提交成绩 →');

    const btnEl = btn.node as HTMLButtonElement;
    btnEl.style.cssText = [
      'width: 240px',
      'padding: 10px 16px',
      'font-size: 20px',
      'font-family: Arial Black, sans-serif',
      'border: none',
      'border-radius: 8px',
      'background: linear-gradient(135deg, #00eaff, #0066ff)',
      'color: #ffffff',
      'cursor: pointer',
      'box-shadow: 0 4px 20px #00eaff55',
      'letter-spacing: 1px',
    ].join(';');

    // 按钮悬浮效果（通过 DOM 事件模拟）
    btnEl.addEventListener('mouseover', () => {
      btnEl.style.background = 'linear-gradient(135deg, #33eeff, #3388ff)';
    });
    btnEl.addEventListener('mouseout', () => {
      btnEl.style.background = 'linear-gradient(135deg, #00eaff, #0066ff)';
    });

    // 提交：验证 → 保存 → 跳转排行榜
    let submitted = false;
    const submit = () => {
      if (submitted) return;
      if (!el.value.trim()) {
        el.style.borderColor = '#ff4444';
        el.style.boxShadow = '0 0 16px #ff444466';
        el.focus();
        return;
      }
      submitted = true;
      tryInsertScore(el.value.trim(), score);
      this.scene.start('Leaderboard', { score, rank });
    };

    btnEl.addEventListener('click', submit);

    // 回车提交
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') submit();
    });
  }
}
