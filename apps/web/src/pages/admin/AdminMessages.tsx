import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { PageMeta } from '../../components/seo/PageMeta'
import { api } from '../../lib/api'
import { formatPhone, shortDate } from '../../lib/format'
import type { AdminContactMessage } from '../../types'
import { AdminPageShell } from './AdminDashboard'

const FILTER_TABS = ['unread', 'all'] as const
type MessageFilter = typeof FILTER_TABS[number]

export function AdminMessages() {
  const [filter, setFilter] = useState<MessageFilter>('unread')
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-messages', filter],
    queryFn: () =>
      api.getAdminContactMessages(filter === 'unread' ? { read: false } : {}),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markContactMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      api.replyToContactMessage(id, reply),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
  })

  const messages = data?.messages ?? []

  return (
    <>
      <PageMeta title="Messages | Admin" description="" canonical="" />
      <AdminPageShell
        title="Messages"
        intro="Review contact form submissions from clients and reply via email."
      >
        <div className="mb-6 flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === tab
                  ? 'bg-cocoa text-cream'
                  : 'bg-cream-deep text-mocha hover:bg-cream-border'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isPending && (
          <div className="grid gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-xl bg-cream-deep" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-error">Failed to load messages. Please refresh.</p>
        )}

        {!isPending && !isError && messages.length === 0 && (
          <div className="rounded-xl border border-cream-border bg-paper p-10 text-center">
            <p className="text-sm text-mocha/60">
              No {filter === 'unread' ? 'unread' : ''} messages.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {messages.map((msg) => (
            <MessageCard
              key={msg.messageId}
              msg={msg}
              onMarkRead={() => markReadMutation.mutate(msg.messageId)}
              onReply={(reply) => replyMutation.mutate({ id: msg.messageId, reply })}
              isUpdating={markReadMutation.isPending || replyMutation.isPending}
            />
          ))}
        </div>
      </AdminPageShell>
    </>
  )
}

function MessageCard({
  msg,
  onMarkRead,
  onReply,
  isUpdating,
}: {
  msg: AdminContactMessage
  onMarkRead: () => void
  onReply: (reply: string) => void
  isUpdating: boolean
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [justSent, setJustSent] = useState(false)

  function handleSendReply() {
    if (!replyText.trim()) return
    onReply(replyText.trim())
    setJustSent(true)
    setReplyOpen(false)
    setReplyText('')
    setTimeout(() => setJustSent(false), 4000)
  }

  return (
    <div
      className="rounded-xl border bg-paper shadow-soft"
      style={{
        borderColor: msg.read ? 'var(--color-cream-border, rgba(240,170,205,0.16))' : 'rgba(232,120,159,0.4)',
      }}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-espresso">{msg.name}</p>
              {!msg.read && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(232,120,159,0.15)', color: '#FFC98B' }}
                >
                  Unread
                </span>
              )}
              {msg.replied && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#8CE8AC' }}
                >
                  Replied
                </span>
              )}
              {justSent && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#8CE8AC' }}
                >
                  Reply sent!
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-mocha/65">
              {msg.email && <span>{msg.email}</span>}
              <span>{formatPhone(msg.phone)}</span>
            </div>
            {msg.services.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-cream-deep px-2 py-0.5 text-[0.65rem] font-medium text-mocha"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-espresso">{msg.message}</p>
            <p className="mt-2 text-[0.65rem] text-mocha/40">Received {shortDate(msg.createdAt)}</p>
            {msg.replied && msg.replyText && (
              <div
                className="mt-3 rounded-lg p-3 text-xs"
                style={{ background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid rgba(34,197,94,0.4)' }}
              >
                <p className="font-semibold text-mocha/70">Your reply ({shortDate(msg.repliedAt)}):</p>
                <p className="mt-1 text-mocha/80">{msg.replyText}</p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {!msg.read && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={onMarkRead}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#8CE8AC' }}
              >
                Mark Read
              </button>
            )}
            {msg.email && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setReplyOpen((v) => !v)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#A7BEFF' }}
              >
                {replyOpen ? 'Cancel' : msg.replied ? 'Reply Again' : 'Reply'}
              </button>
            )}
          </div>
        </div>
      </div>

      {replyOpen && (
        <div
          className="border-t px-5 pb-5 pt-4"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <p className="mb-2 text-xs font-semibold text-mocha/60">
            Replying to: {msg.email}
          </p>
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here… The client will receive this as an email from the salon."
            className="w-full rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={isUpdating || !replyText.trim()}
              onClick={handleSendReply}
              className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"
              style={{ background: '#1F0A15', color: '#FFF2F8' }}
            >
              {isUpdating ? 'Sending…' : 'Send Reply'}
            </button>
            <p className="text-[0.65rem] text-mocha/40">
              Client's original message will be included for context.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
