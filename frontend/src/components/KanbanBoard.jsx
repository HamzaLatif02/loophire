import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import DeleteButton from './DeleteButton'
import ErrorBoundary from './ErrorBoundary'
import { KEYS } from '../hooks/useApplications'
import api from '../utils/api'

const COLUMNS = [
  { id: 'draft',        label: 'Draft',        color: '#7c7570' },
  { id: 'applied',      label: 'Applied',      color: '#3b82f6' },
  { id: 'interviewing', label: 'Interviewing', color: '#fd5a04' },
  { id: 'offer',        label: 'Offer',        color: '#22c55e' },
  { id: 'rejected',     label: 'Rejected',     color: '#ef4444' },
]

function fitHex(score) {
  if (score == null) return null
  if (score >= 70)   return '#22c55e'
  if (score >= 40)   return '#fd5a04'
  return '#ef4444'
}

export default function KanbanBoard({ applications }) {
  const queryClient = useQueryClient()

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = applications.filter(app => app.status === col.id)
    return acc
  }, {})

  async function handleDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const appId = parseInt(draggableId, 10)

    queryClient.setQueryData(KEYS.applications, old =>
      old?.map(app => app.id === appId ? { ...app, status: newStatus } : app)
    )

    try {
      await api.patch(`/applications/${appId}/status`, { status: newStatus })
      queryClient.invalidateQueries({ queryKey: KEYS.applications })
      queryClient.invalidateQueries({ queryKey: KEYS.analytics })
    } catch {
      queryClient.invalidateQueries({ queryKey: KEYS.applications })
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 min-h-[calc(100vh-280px)]">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            applications={grouped[col.id] || []}
          />
        ))}
      </div>
    </DragDropContext>
  )
}

function KanbanColumn({ column, applications }) {
  return (
    <div className="flex flex-col flex-shrink-0 w-[280px] sm:w-[300px]">

      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-medium text-[var(--color-text)]">{column.label}</span>
        </div>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-full">
          {applications.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 flex-1 rounded-xl p-3 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-[var(--color-surface-2)]'
                : 'bg-[var(--color-surface)]'
            }`}
          >
            {applications.map((app, index) => (
              <ErrorBoundary key={app.id} level="card">
                <KanbanCard app={app} index={index} />
              </ErrorBoundary>
            ))}
            {provided.placeholder}
            {applications.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center flex-1 min-h-[120px]">
                <p className="text-xs text-[var(--color-muted)] text-center">No applications</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

function KanbanCard({ app, index }) {
  const hex = fitHex(app.fit_score)

  return (
    <Draggable draggableId={String(app.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-[var(--color-surface-2)] rounded-lg p-3 border border-[var(--color-border)] cursor-grab active:cursor-grabbing transition-shadow ${
            snapshot.isDragging
              ? 'shadow-lg shadow-black/40 rotate-1'
              : 'hover:border-[var(--color-accent)]/40'
          }`}
        >
          {/* Fit score + drag handle */}
          <div className="flex justify-between items-start mb-2">
            {hex != null ? (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: hex, backgroundColor: hex + '22' }}
              >
                {Math.round(app.fit_score)}% fit
              </span>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">No score</span>
            )}
            <div className="flex flex-col gap-0.5 opacity-25 pl-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
                  <div className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
                </div>
              ))}
            </div>
          </div>

          {/* Company + role */}
          <p className="text-sm font-medium text-[var(--color-text)] mb-0.5 leading-tight">
            {app.company_name}
          </p>
          <p className="text-xs text-[var(--color-muted)] mb-1 leading-tight line-clamp-2">
            {app.job_title}
          </p>
          {app.cv_version_name && (
            <p className="text-xs text-[var(--color-muted)] mb-1 truncate">
              <span className="opacity-60">CV:</span> {app.cv_version_name}
            </p>
          )}
          <div className="flex gap-1 flex-wrap mb-3">
            {app.rewrite_cv && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]">CV</span>
            )}
            {app.cover_letter_generated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]">Letter</span>
            )}
            {!app.rewrite_cv && !app.cover_letter_generated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]">Fit only</span>
            )}
          </div>

          {/* Footer: date + view link + delete */}
          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-muted)] tabular-nums">
              {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center gap-2">
              <DeleteButton
                applicationId={app.id}
                className="px-1.5 py-0.5 rounded border text-xs"
              />
              <Link
                to={`/applications/${app.id}`}
                onClick={e => e.stopPropagation()}
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                View →
              </Link>
            </div>
          </div>

          {/* Interview date badge */}
          {app.interview_date && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-accent)]">
              <span>📅</span>
              <span>
                {new Date(app.interview_date).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </span>
            </div>
          )}

          {/* Notes indicator */}
          {app.notes && (
            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
              <span>📝</span>
              <span className="truncate">{app.notes.split('\n')[0]}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}
