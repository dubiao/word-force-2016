// ============================================================
//  得分存储工具 —— localStorage 持久化 Top 5 排行榜
//  两个模式各有一份独立排行榜
// ============================================================

export type GameMode = 'normal' | 'word';

const STORAGE_KEYS: Record<GameMode, string> = {
  normal: 'plane_game_scores',
  word: 'plane_game_scores_word',
};

function getKey(mode: GameMode): string {
  return STORAGE_KEYS[mode];
}

export interface ScoreEntry {
  name: string;
  score: number;
  /** ISO 时间戳 */
  time: number;
}

/** 获取指定模式的排行榜（最多5条，按分数降序） */
export function getLeaderboard(mode: GameMode): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(getKey(mode));
    if (!raw) return [];
    const arr: ScoreEntry[] = JSON.parse(raw);
    return arr.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * 检查分数是否能进入指定模式前5（不写入）。
 * @returns 排名（1-based），如果不在前5则返回 null。
 */
export function checkRank(score: number, mode: GameMode): number | null {
  const arr = getLeaderboard(mode);
  if (arr.length < 5) return arr.length + 1;
  const minScore = Math.min(...arr.map(e => e.score));
  if (score > minScore) {
    // 计算实际排名
    const ranked = [...arr, { score }].sort((a, b) => b.score - a.score);
    return ranked.findIndex(e => e.score === score) + 1;
  }
  return null;
}

/**
 * 尝试插入新得分。
 * @returns 排名（1-based），如果不在前5则返回 null。
 */
export function tryInsertScore(name: string, score: number, mode: GameMode): number | null {
  const arr = getLeaderboard(mode);
  const entry: ScoreEntry = { name, score, time: Date.now() };

  if (arr.length < 5) {
    arr.push(entry);
  } else {
    // 找最小分
    const minIdx = arr.reduce((best, cur, i, a) => (cur.score < a[best].score ? i : best), 0);
    if (score > arr[minIdx].score) {
      arr[minIdx] = entry;
    } else {
      return null; // 没进前5
    }
  }
  // 重新排序并保存
  const ranked = arr.sort((a, b) => b.score - a.score);
  localStorage.setItem(getKey(mode), JSON.stringify(ranked));
  // 查找刚插入条目的排名
  return ranked.findIndex(e => e.time === entry.time) + 1;
}
