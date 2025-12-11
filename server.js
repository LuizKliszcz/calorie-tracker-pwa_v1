const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve frontend static (production)
app.use(express.static(path.join(__dirname, 'dist'))); // for Vite build output

// in-memory user store (replace with DB for production)
const store = {}; // { phone: { items: [...], lastTotal: 0 }}

function parseFoodLine(text){
  const parts = text.trim().split(/\s+/);
  let kcal = null;
  for(let i=parts.length-1;i>=0;i--){
    const p = parts[i].replace(/[^0-9.]/g,'');
    if(p && !isNaN(Number(p))){ kcal = Number(p); parts.splice(i,1); break; }
  }
  const portion = parts.length>1 ? parts[0] : '';
  const name = parts.slice(1).join(' ') || parts.join(' ');
  return { name: name || text, kcal: kcal||0, portion };
}

app.post('/whatsapp', (req, res) => {
  const from = req.body.From || req.body.from || 'unknown';
  const body = req.body.Body || req.body.body || '';
  if(!store[from]) store[from] = { items: [] };
  const user = store[from];

  const cmd = body.trim().toLowerCase();
  // If Twilio not configured, just respond 200
  if(!req.body || !req.body.Body){
    return res.json({ ok: true });
  }

  if(cmd === 'resumo' || cmd==='total'){
    const total = user.items.reduce((s,i)=>s+i.kcal,0);
    return res.send(`Você registrou ${user.items.length} itens. Total: ${total} kcal`);
  }

  if(cmd === 'limpar'){
    user.items = [];
    return res.send('Registros apagados.');
  }

  const lines = body.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const added = [];
  for(const line of lines){
    const parsed = parseFoodLine(line);
    const item = { id: Date.now()+Math.random(), time: new Date().toISOString(), ...parsed };
    user.items.push(item);
    added.push(item);
  }

  const sumAdded = added.reduce((s,i)=>s+i.kcal,0);
  const total = user.items.reduce((s,i)=>s+i.kcal,0);
  res.send(`${added.length} item(s) adicionados. +${sumAdded} kcal. Total hoje: ${total} kcal`);
});

app.post('/sync', (req, res) => {
  const { items, phone } = req.body;
  if(!phone) return res.status(400).json({ error: 'phone required (whatsapp:+55...)' });
  store[phone] = { items: items || [] };
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));