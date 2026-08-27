import api from './api'

export async function getActivityTimeline({
  page = 1,
  limit = 10,
  type = 'all',
  from = null,
  to = null,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (type && type !== 'all') {
    params.append('type', type)
  }

  if (from) {
    params.append('from', from)
  }

  if (to) {
    params.append('to', to)
  }

  const response = await api.get(`/activity-timeline?${params.toString()}`)

  return response.data
}
