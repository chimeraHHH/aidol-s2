import { useEffect, useState } from 'react'
import {
  getAvatarJobState,
  startAvatarGenerateJob,
  subscribeAvatarJob,
  clearAvatarGenerateError,
  dismissAvatarJobTip,
  type AvatarJobState,
} from '@/services/avatarGenerateJob'

export function useAvatarGenerateJob() {
  const [job, setJob] = useState<AvatarJobState>(() => getAvatarJobState())

  useEffect(() => subscribeAvatarJob(setJob), [])

  return {
    job,
    generating: job.status === 'running',
    start: startAvatarGenerateJob,
    clearError: clearAvatarGenerateError,
    dismissTip: dismissAvatarJobTip,
  }
}
