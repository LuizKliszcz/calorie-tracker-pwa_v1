import React, { useState, useEffect } from "react";

export default function CalorieTrackerApp() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("calorie_items") || "[]");
    } catch (e) { return []; }
  });
  const [name, setName] = useState(""); const [kcal, setKcal] = useState(""); const [portion, setPortion] = useState(""); const [meal, setMeal] = useState("Café da manhã"); const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    localStorage.setItem("calorie_items", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const addItem = () => {
    if (!name || !kcal) return;
    const newItem = { id: Date.now(), name, kcal: Number(kcal), portion: portion || null, meal, time: new Date().toISOString() };
    setItems(prev => [newItem, ...prev]); setName(""); setKcal(""); setPortion(""); 
  };

  const removeItem = (id) => setItems(prev => prev.filter(i=>i.id!==id));
  const clearAll = () => setItems([]);
  const totalKcal = items.reduce((s,i)=>s+i.kcal,0);

  const pushToServer = async () => {
    try{
      await fetch((import.meta.env.VITE_API_BASE || '') + "/sync", {
        method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ items, phone: localStorage.getItem('cal_phone') })
      });
      alert("Sincronizado com sucesso");
    }catch(e){ alert("Erro ao sincronizar: "+e.message) }
  }

  const exportCSV = () => {
    const rows = [["time","meal","name","portion","kcal"], ...items.map(i=>[i.time,i.meal,i.name,i.portion||"",i.kcal])];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'calorie_export.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div style={{fontFamily:'Inter, system-ui, -apple-system, Roboto, "Segoe UI", Arial', padding:20, background:'#f8fafc', minHeight:'100vh'}}>
      <div style={{maxWidth:760, margin:'0 auto', background:'#fff', padding:20, borderRadius:16, boxShadow:'0 6px 18px rgba(0,0,0,0.06)'}}>
        <h1 style={{fontSize:22, marginBottom:12}}>Contador Calórico</h1>
        <div style={{display:'grid', gridTemplateColumns:'1fr 150px 150px', gap:8, marginBottom:12}}>
          <input placeholder="Nome do alimento" value={name} onChange={e=>setName(e.target.value)} style={{padding:10,border:'1px solid #e5e7eb',borderRadius:8}} />
          <input placeholder="kcal (ex: 110)" value={kcal} onChange={e=>setKcal(e.target.value)} inputMode="numeric" style={{padding:10,border:'1px solid #e5e7eb',borderRadius:8}}/>
          <input placeholder="porção (opcional)" value={portion} onChange={e=>setPortion(e.target.value)} style={{padding:10,border:'1px solid #e5e7eb',borderRadius:8}} />
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:16}}>
          <select value={meal} onChange={e=>setMeal(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #e5e7eb'}}>
            <option>Café da manhã</option><option>Almoço</option><option>Lanche</option><option>Jantar</option><option>Ceia</option><option>Suplemento</option>
          </select>
          <button onClick={addItem} style={{padding:'8px 14px', background:'#4f46e5', color:'#fff', borderRadius:8}}>Adicionar</button>
          <button onClick={pushToServer} style={{padding:'8px 14px', borderRadius:8}}>Sincronizar</button>
          <button onClick={exportCSV} style={{padding:'8px 14px', background:'#10b981', color:'#fff', borderRadius:8}}>Exportar CSV</button>
          {deferredPrompt && <button onClick={handleInstallClick} style={{marginLeft:'auto', padding:'8px 12px', borderRadius:8}}>Instalar App</button>}
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Total do dia</div>
          <div style={{fontSize:28, fontWeight:700}}>{totalKcal} kcal</div>
        </div>

        <div style={{display:'grid', gap:8}}>
          {items.length===0 && <div style={{color:'#6b7280'}}>Nenhum alimento registrado ainda.</div>}
          {items.map(it=> (
            <div key={it.id} style={{display:'flex', justifyContent:'space-between', padding:10, border:'1px solid #e6e9ef', borderRadius:8}}>
              <div>
                <div style={{fontWeight:600}}>{it.name} <span style={{fontSize:12,color:'#9ca3af'}}>({it.portion||'—'})</span></div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{it.meal} • {new Date(it.time).toLocaleString()}</div>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <div style={{fontWeight:700}}>{it.kcal} kcal</div>
                <button onClick={()=>removeItem(it.id)} style={{padding:'6px 8px', borderRadius:6, background:'#fee2e2', color:'#b91c1c'}}>Remover</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', justifyContent:'space-between', marginTop:16}}>
          <button onClick={clearAll} style={{padding:'8px 14px', borderRadius:8, background:'#dc2626', color:'#fff'}}>Limpar tudo</button>
          <div style={{fontSize:12,color:'#6b7280'}}>Dados salvos localmente no navegador</div>
        </div>
      </div>
    </div>
  );
}
