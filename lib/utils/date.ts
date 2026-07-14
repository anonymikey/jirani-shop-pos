export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function getDaysDifference(date1: Date, date2: Date = new Date()): number {
  const diff = date2.getTime() - date1.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return due < new Date()
}
