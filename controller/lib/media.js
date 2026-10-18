export const MEDIA = [
  { id: 'sleep', name: '待机 / 睡眠', short: '睡眠', tag: '日常待机', group: 'state', description: '闭眼休息，ZZZ 轻轻浮动', duration: 5, source: '原视频 13–18 秒' },
  { id: 'wake', name: '启动 / 唤醒', short: '唤醒', tag: '设备启动', group: 'state', description: '睁开圆眼，眨眼、左右张望', duration: 8.8, source: '原视频 0–8.8 秒' },
  { id: 'weigh', name: '称重 / 开心互动', short: '称重', tag: '上秤 → 示数稳定', group: 'state', description: '眯眼、睁眼，亮起星星眼', duration: 4.2, source: '原视频 8.8–13 秒' },
  { id: 'ball', name: '追逐小黑球', short: '小黑球', tag: '游戏 01', group: 'game', description: '跟着小黑球一起动起来', duration: 80.067 },
  { id: 'fish', name: '追逐小鱼', short: '小鱼', tag: '游戏 02', group: 'game', description: '小鱼在石头间游来游去', duration: 64.167 },
  { id: 'crab', name: '追逐寄居蟹', short: '寄居蟹', tag: '游戏 03', group: 'game', description: '寻找沙滩上躲藏的小伙伴', duration: 83.5 },
  { id: 'lights', name: '追逐彩色光点', short: '彩色光点', tag: '游戏 04', group: 'game', description: '跟随移动的彩色光点', duration: 38.933 },
].map(item => ({ ...item, src: `/media/${item.id}.mp4`, poster: `/media/${item.id}.jpg` }));
export const defaultState = () => ({ media: 'sleep', paused: false, muted: true, fit: 'contain', rotation: 0, version: 'initial' });
export function validateState(input) {
  if (!input || !MEDIA.some(m => m.id === input.media) || typeof input.paused !== 'boolean' || typeof input.muted !== 'boolean' || !['contain', 'cover'].includes(input.fit) || ![0, 90, 180, 270].includes(input.rotation)) return null;
  return { media: input.media, paused: input.paused, muted: input.muted, fit: input.fit, rotation: input.rotation };
}
