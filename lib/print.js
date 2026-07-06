import * as Print from 'expo-print'
import { docTypeInfo, DOC_STATUS } from './constants'

const esc = (s) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Печать складского документа: системный диалог печати/«Сохранить в PDF».
export async function printDocument(doc, byName = 'Система') {
  const ti = docTypeInfo(doc.type)
  const rows = (doc.items || [])
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td>${esc(it.name)}</td><td style="text-align:right">${esc(it.qty)}</td><td>${esc(it.unit || '')}</td></tr>`,
    )
    .join('')
  const status = (DOC_STATUS[doc.status] || {}).label || doc.status
  let date = doc.createdAt
  try { date = new Date(doc.createdAt).toLocaleString('ru-RU') } catch {}
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#111;padding:24px;}
      h1{font-size:20px;margin:0 0 4px}.muted{color:#666;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}th{background:#f3f3f3}
      .foot{margin-top:24px;font-size:13px;color:#444}
    </style></head><body>
    <h1>${esc(ti.label)} № ${esc(doc.no)}</h1>
    <div class="muted">${esc(date)} · ${esc(byName)}${doc.reason ? ' · ' + esc(doc.reason) : ''}</div>
    <table><thead><tr><th>#</th><th>Наименование</th><th style="text-align:right">Кол-во</th><th>Ед.</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="foot">Позиций: ${(doc.items || []).length} · Всего: ${esc(doc.totalQty)} · Статус: ${esc(status)}</div>
    </body></html>`
  await Print.printAsync({ html })
}
