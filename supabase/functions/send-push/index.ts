// Supabase Edge Function: send-push
// Принимает Database Webhook от таблицы orders (INSERT/UPDATE) и шлёт push
// через FCM HTTP v1 на токены нужных сотрудников.
//
// Секреты (Supabase → Edge Functions → Secrets):
//   FCM_SERVICE_ACCOUNT  — JSON service account из Firebase (целиком, одной строкой)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — обычно уже доступны функции.
//
// Деплой: supabase functions deploy send-push --no-verify-jwt
// Триггер: Supabase → Database → Webhooks → на таблицу orders (insert, update)
//          → HTTP POST на URL этой функции.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SA = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT') || '{}')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const b64url = (buf: Uint8Array) =>
  btoa(String.fromCharCode(...buf)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const enc = (o: unknown) =>
  btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

function pemToBytes(pem: string) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: SA.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(claim)}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(SA.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  return (await res.json()).access_token as string
}

async function sendFCM(accessToken: string, token: string, title: string, body: string, data: Record<string, string>) {
  await fetch(`https://fcm.googleapis.com/v1/projects/${SA.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        android: { priority: 'HIGH', notification: { channel_id: 'default' } },
      },
    }),
  })
}

Deno.serve(async (req) => {
  try {
    const { type, record, old_record } = await req.json()
    if (!record) return new Response('no record', { status: 200 })

    let targets: string[] = [] // auth user ids
    let title = ''
    let body = ''
    const data = { orderId: String(record.id || '') }

    if (type === 'INSERT') {
      title = 'Новый заказ'
      body = `${record.no} · ${record.customer_name || ''}`.trim()
      const { data: emps } = await supabase
        .from('employees')
        .select('auth_uid, role')
        .eq('company_id', record.company_id)
      targets = (emps || []).filter((e: any) => e.role !== 'courier' && e.auth_uid).map((e: any) => e.auth_uid)
    } else if (type === 'UPDATE' && record.assigned_to && record.assigned_to !== old_record?.assigned_to) {
      title = 'Заказ на доставку'
      body = `Вам назначен ${record.no}`
      const { data: emp } = await supabase
        .from('employees')
        .select('auth_uid')
        .eq('id', record.assigned_to)
        .maybeSingle()
      if (emp?.auth_uid) targets = [emp.auth_uid]
    } else if (type === 'UPDATE' && record.status === 'delivered' && old_record?.status !== 'delivered') {
      title = 'Заказ доставлен'
      body = `${record.no} · ${record.customer_name || ''}`.trim()
      const { data: emps } = await supabase
        .from('employees')
        .select('auth_uid, role')
        .eq('company_id', record.company_id)
      targets = (emps || []).filter((e: any) => e.role !== 'courier' && e.auth_uid).map((e: any) => e.auth_uid)
    } else {
      return new Response('skip', { status: 200 })
    }

    if (!targets.length) return new Response('no targets', { status: 200 })

    const { data: tokens } = await supabase.from('push_tokens').select('token').in('user_id', targets)
    if (!tokens?.length) return new Response('no tokens', { status: 200 })

    const accessToken = await getAccessToken()
    await Promise.all(tokens.map((t: any) => sendFCM(accessToken, t.token, title, body, data)))
    return new Response(`sent ${tokens.length}`, { status: 200 })
  } catch (e) {
    return new Response(`error: ${e}`, { status: 200 })
  }
})
