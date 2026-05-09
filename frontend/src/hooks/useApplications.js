import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'

export const KEYS = {
  applications: ['applications'],
  application:  (id) => ['applications', String(id)],
  analytics:    ['analytics'],
}

export function useApplications() {
  return useQuery({
    queryKey: KEYS.applications,
    queryFn:  async () => {
      const { data } = await api.get('/applications')
      return data
    },
  })
}

export function useApplication(id) {
  return useQuery({
    queryKey: KEYS.application(id),
    queryFn:  async () => {
      const { data } = await api.get(`/applications/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useAnalytics() {
  return useQuery({
    queryKey: KEYS.analytics,
    queryFn:  async () => {
      const { data } = await api.get('/applications/analytics')
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/applications/${id}/status`, { status }),
    onSuccess: (response, { id }) => {
      queryClient.setQueryData(KEYS.application(id), response.data)
      queryClient.invalidateQueries({ queryKey: KEYS.applications })
      queryClient.invalidateQueries({ queryKey: KEYS.analytics })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...fields }) =>
      api.patch(`/applications/${id}`, fields),
    onSuccess: (response, { id }) => {
      queryClient.setQueryData(KEYS.application(id), response.data)
    },
  })
}

export function useUpdateNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }) =>
      api.patch(`/applications/${id}/notes`, { notes }),
    onMutate: async ({ id, notes }) => {
      await queryClient.cancelQueries({ queryKey: KEYS.application(id) })
      const previous = queryClient.getQueryData(KEYS.application(id))
      queryClient.setQueryData(KEYS.application(id), (old) => old ? { ...old, notes } : old)
      return { previous }
    },
    onError: (_, { id }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(KEYS.application(id), context.previous)
      }
    },
  })
}

export function useInvalidateApplications() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: KEYS.applications })
    queryClient.invalidateQueries({ queryKey: KEYS.analytics })
  }
}
