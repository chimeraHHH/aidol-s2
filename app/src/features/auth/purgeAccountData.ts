import { clearCompanionChatCache } from '@/features/home/companionChatCache'
import { purgeUserWorkspace } from '@/features/auth/accountWorkspace'
import { purgeAvatarJobForUser } from '@/services/avatarGenerateJob'

const ONBOARD_KEY = 'xiaomi.onboarding.v1'
const ANSWERS_KEY = 'xiaomi.onboardingAnswers.v1'

function removeFromJsonMap(key: string, userId: string) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, unknown>
    if (!(userId in map)) return
    delete map[userId]
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** 删除账号时清理该用户的建档标记、问答缓存、陪伴聊天、猫档案与形象 */
export function purgeAccountLocalData(userId: string): void {
  clearCompanionChatCache(userId)
  purgeUserWorkspace(userId)
  purgeAvatarJobForUser(userId)
  removeFromJsonMap(ONBOARD_KEY, userId)
  removeFromJsonMap(ANSWERS_KEY, userId)
  // 旧版聊天缓存键（若存在）
  try {
    localStorage.removeItem(`xiaomi.companionChat.${userId}`)
  } catch {
    /* ignore */
  }
}
