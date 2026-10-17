import { resetAvatarJobUi } from '@/services/avatarGenerateJob'
import {
  getActiveUserId,
  resetUserWorkspaceToDefaults,
  writeAvatarForUser,
} from '@/features/auth/accountWorkspace'

/** 清空当前账号自定义陪伴背景 → 回退官方默认场景 */
export function clearCustomCatAvatarStorage(): void {
  writeAvatarForUser(getActiveUserId(), null)
}

/** 当前账号：猫咪档案 / 陪伴状态 / 称重记录恢复种子默认 */
export function resetCatStoreToSeed(): void {
  resetUserWorkspaceToDefaults(getActiveUserId())
}

/**
 * 新建账号专用：仅重置该 userId 的默认背景 + 档案/陪伴/测量，不碰其他账号。
 */
export function resetWorkspaceForNewAccount(userId: string): void {
  resetUserWorkspaceToDefaults(userId)
  resetAvatarJobUi()
}
