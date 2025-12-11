# Calorie Tracker PWA

Projeto completo: frontend (Vite + React), PWA (manifest + service worker) e backend Node/Express (webhook simples para WhatsApp).

## Como rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Rodar em modo desenvolvimento (abre o Vite e o servidor Express):

```bash
npm run dev
```

- O Vite roda na porta 5173 por padrão.
- O servidor Express roda na porta 3000.

3. Build para produção (frontend) e servir:

```bash
npm run build
# depois rode
npm run server
```

O servidor serve a pasta `dist` (build do Vite) e também fornece as rotas `/whatsapp` e `/sync`.

## Deploy no Vercel

1. Faça login no Vercel e conecte o repositório GitHub.
2. Configure as variáveis de ambiente se for usar Twilio:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
```
3. Deploy — o Vercel usará `npm run build` para gerar o `dist`.

## Notas
- Ícones em `public/icons/` são placeholders — substitua pelos seus ícones 192/512.
- Para produção, substitua o armazenamento em memória por um banco de dados.
- Se usar Twilio, configure o webhook para `https://<sua-url>/whatsapp`.
