const store = {}; // in-memory per-deployment store (ephemeral)

module.exports = async (req, res) => {
  // Only allow POST for actions
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, message: 'Calorie Tracker API - send POST with {action,...}' });
    return;
  }

  const body = req.body || {};
  const action = body.action || 'sync';

  if (action === 'sync') {
    const { items, phone } = body;
    if (!phone) {
      res.status(400).json({ error: 'phone is required (use whatsapp:+55...)' });
      return;
    }
    store[phone] = { items: items || [], updatedAt: new Date().toISOString() };
    res.json({ ok: true, total: (store[phone].items || []).reduce((s,i)=>s+i.kcal,0) });
    return;
  }

  if (action === 'whatsapp') {
    // lightweight parser: body.text
    const text = body.text || '';
    const from = body.from || 'unknown';
    if (!store[from]) store[from] = { items: [] };
    const parts = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const added = [];
    for(const p of parts){
      const tokens = p.split(/\s+/);
      let kcal = null;
      for(let i=tokens.length-1;i>=0;i--){
        const n = tokens[i].replace(/[^0-9.]/g,'');
        if(n && !isNaN(Number(n))){ kcal = Number(n); tokens.splice(i,1); break; }
      }
      const portion = tokens.length>1 ? tokens[0] : '';
      const name = tokens.slice(1).join(' ') || tokens.join(' ');
      const item = { id: Date.now()+Math.random(), time: new Date().toISOString(), name: name||p, kcal: kcal||0, portion };
      store[from].items.push(item);
      added.push(item);
    }
    const total = store[from].items.reduce((s,i)=>s+i.kcal,0);
    res.json({ ok: true, added: added.length, sumAdded: added.reduce((s,i)=>s+i.kcal,0), total });
    return;
  }

  // default
  res.status(400).json({ error: 'unknown action' });
};
