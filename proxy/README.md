# Посредник для YouTube

Нужен, чтобы людям не приходилось вводить свой ключ YouTube. Ключ хранится на сервере Cloudflare, ответы запоминаются на 1–6 часов, поэтому дневной лимит тратится медленно.

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → назови `notely-yt` → **Deploy**.
2. **Edit code**, удали всё и вставь содержимое `worker.js` из этой папки → **Deploy**.
3. **Settings → Variables and Secrets → Add** → тип **Secret**, имя `YT_KEY`, значение: твой ключ YouTube → **Deploy**.
4. Скопируй адрес Worker (вида `https://notely-yt.твоё-имя.workers.dev`) и вставь в `config.js` в поле `proxy`.
