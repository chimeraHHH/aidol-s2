/**
 * 陪伴页：用户猫 × 家居坐垫静帧 → Seedance 原片 → ffmpeg 无缝循环
 */

/**
 * 图生图提示：第一张=用户猫（身份锁定），第二张=家居（场景）
 * 严禁换成别的品种/花色/脸型
 */
export const COMPANION_STILL_PROMPT = [
  'CRITICAL IDENTITY LOCK: The FIRST reference image is the ONLY allowed cat.',
  'Copy that cat exactly — fur colors, patch shapes, face markings, ear shape, eye color, nose, body type.',
  'Do NOT invent a different breed, do NOT turn it into a white Ragdoll or generic cute cat, do NOT recolor the fur.',
  'If the first photo is a tortoiseshell/calico/tabby mix, keep those exact mottled patches.',
  'The SECOND reference is the home room. Keep that room layout for a vertical 9:16 phone full-scene:',
  'cream walls, light wood floor, circular woven beige cushion in the lower-middle, cream sofa left, snake plant right, soft sunlight.',
  'Place the SAME cat from image 1 sitting upright in the CENTER of the cushion — full body from ears to paws visible.',
  'IMPORTANT SIZE: the cat must be LARGE — about 55-65% of the frame height (dominant subject on the cushion),',
  'not a tiny figure. Facing camera, soft contact shadow, 3D cartoon style matching the room lighting.',
  'Still show floor + cushion + sofa + plant around the cat. No close-up face-only crop. No UI, no text, no watermark.',
].join(' ')

export const COMPANION_VIDEO_PROMPT = [
  'Keep the exact wide full-room composition of the first frame — do not zoom into the cat face.',
  'Keep the SAME cat identity and markings; do not change fur color or face.',
  '全程保持 3D 卡通渲染插画风格，绝不写实化。',
  '小猫完全静止一动不动，全身坐在圆形垫子中心。',
  '只允许：阳光在墙面/地板的光影极缓慢明暗呼吸式浮动，2~3 粒极淡灰尘极缓慢轻浮。',
  '镜头完全静止，无推拉摇移，无特写。约 5 秒。',
  '禁止：镜头移动、推近猫脸、猫的任何动作、换成别的猫、新增物体、风格漂移。',
].join('')
