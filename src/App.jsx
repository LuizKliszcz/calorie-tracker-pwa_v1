/* src/App.jsx — PARTE 1/3 */
import React, { useEffect, useMemo, useState } from "react";
import { FOODS } from "./foods";
import { ACTIVITIES } from "./activities";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
// 🔥 Adicione isto AQUI:
function IconPlus() {
  return (
    <svg 
      width="18" 
      height="18" 
      viewBox="0 0 24 24"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{marginRight: 4}}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}


/* ---------------------- Helpers ---------------------- */
function fmtTime(d){ return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function fmtDayKey(d = new Date()){ // yyyy-mm-dd
  const dt = new Date(d);
  return dt.toISOString().slice(0,10);
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

/* BMR & TDEE */
function calcBMR({ sex, weightKg, heightCm, age }){
  if(!weightKg || !heightCm || !age) return 0;
  if(sex === "male") return Math.round((10*weightKg) + (6.25*heightCm) - (5*age) + 5);
  return Math.round((10*weightKg) + (6.25*heightCm) - (5*age) - 161);
}
const ACTIVITY_FACTORS = { sedentary:1.2, light:1.375, moderate:1.55, very:1.725, extra:1.9 };
function calcTDEE(bmr, activityKey){ return Math.round(bmr * (ACTIVITY_FACTORS[activityKey] || 1.2)); }

/* Activity MET calculation */
function computeActivityKcal(activity, minutes, profile){
  if(!activity || !minutes || !profile?.weightKg) return 0;
  const kcalPerMin = activity.met * profile.weightKg * 0.0175;
  return Math.round(kcalPerMin * minutes);
}

/* Persistent storage helpers */
function loadJSON(key, fallback){
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
}

/* ---------------------- App ---------------------- */
export default function App(){
  // items: mix of food items and activity items
  const [items, setItems] = useState(()=> loadJSON("cal_items", []));
  useEffect(()=> saveJSON("cal_items", items), [items]);

  // profile
  const [profile, setProfile] = useState(()=> loadJSON("user_profile", null));
  // profile form state
  const [sex, setSex] = useState(profile?.sex || "male");
  const [weight, setWeight] = useState(profile?.weightKg ? String(profile.weightKg) : "");
  const [height, setHeight] = useState(profile?.heightCm ? String(profile.heightCm) : "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [activityLevel, setActivityLevel] = useState(profile?.activity || "sedentary");

  // compute bmr/tdee from profile
  const computedBMR = useMemo(()=> {
    if(!profile) return 0;
    return calcBMR({ sex: profile.sex, weightKg: profile.weightKg, heightCm: profile.heightCm, age: profile.age });
  }, [profile]);

  const computedTDEE = useMemo(()=> {
    if(!profile) return 0;
    return calcTDEE(profile.bmr || calcBMR(profile), profile.activity || activityLevel);
  }, [profile, activityLevel]);

  // advanced goals
  // goalMode: "maintain" | "lose" | "gain"
  const [goalMode, setGoalMode] = useState(profile?.goalMode || "maintain");
  // kg per week positive number (e.g., 0.5)
  const [kgPerWeek, setKgPerWeek] = useState(profile?.kgPerWeek || 0);
  // daily adjustment (kcal) derived from kgPerWeek: dailyAdjustment = (kgPerWeek * 7700) / 7
  const dailyAdjustment = useMemo(()=> {
    const val = parseFloat(kgPerWeek) || 0;
    // if goalMode is lose -> negative adjustment
    return goalMode === "lose" ? -Math.round((val * 7700)/7) : goalMode === "gain" ? Math.round((val * 7700)/7) : 0;
  }, [kgPerWeek, goalMode]);

  // dailyTarget: TDEE + dailyAdjustment (or override)
  const [dailyTarget, setDailyTarget] = useState(()=> {
    const persisted = loadJSON("daily_target", null); 
    if(persisted) return persisted;
    if(profile?.tdee) return profile.tdee;
    return 2500;
  });

  useEffect(()=> saveJSON("daily_target", dailyTarget), [dailyTarget]);

  // feed inputs
  const [foodQuery, setFoodQuery] = useState("");
  const [foodSuggestions, setFoodSuggestions] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState("Almoço");

  // suggestions for food
  useEffect(()=>{
    if(!foodQuery || foodQuery.length < 2){ setFoodSuggestions([]); return; }
    const q = foodQuery.toLowerCase();
    setFoodSuggestions((FOODS||[]).filter(f => f.name.toLowerCase().includes(q)).slice(0,8));
  }, [foodQuery]);

  function pickFood(food){
    setSelectedFood(food);
    setFoodQuery(food.name);
    const g = food.portion || 100;
    setGrams(String(g));
    const ratio = g / (food.portion || 100);
    setKcal(String(Math.round(food.kcal * ratio)));
    setCarbs(String((food.carbs * ratio).toFixed(1)));
    setProtein(String((food.protein * ratio).toFixed(1)));
    setFat(String((food.fat * ratio).toFixed(1)));
    setFoodSuggestions([]);
  }

  function addFoodItem(){
    if(!foodQuery || !kcal) return alert("Preencha nome e calorias");
    const it = {
      id: Date.now(),
      name: foodQuery,
      grams: Number(grams) || 0,
      kcal: Number(kcal) || 0,
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      activity: false,
      meal,
      time: new Date().toISOString()
    };
    setItems(prev => [it, ...prev]);
    // update history_by_date
    pushToHistory(it);
    // clear
    setFoodQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat("");
  }

  /* ---------------- history (for charts) ---------------- */
  // history_by_date: { "2025-12-10": { foodKcal: 1200, activityKcal: 400 } , ...}
  const [historyByDate, setHistoryByDate] = useState(()=> loadJSON("history_by_date", {}));
  useEffect(()=> saveJSON("history_by_date", historyByDate), [historyByDate]);

  function pushToHistory(item){
    const key = fmtDayKey(item.time);
    setHistoryByDate(prev => {
      const clone = { ...(prev || {}) };
      const cur = clone[key] || { foodKcal:0, activityKcal:0 };
      if(item.activity) cur.activityKcal = (cur.activityKcal || 0) + (item.kcal || 0);
      else cur.foodKcal = (cur.foodKcal || 0) + (item.kcal || 0);
      clone[key] = cur;
      return clone;
    });
  }

  // ensure existing items are in history on mount (fix for existing datasets)
  useEffect(()=>{
    const byDate = {...historyByDate};
    let changed = false;
    for(const it of items){
      const key = fmtDayKey(it.time);
      if(!byDate[key]) { byDate[key] = { foodKcal:0, activityKcal:0 }; changed = true; }
      if(it.activity) {
        if(!(byDate[key].activityKcal >= it.kcal && byDate[key].activityKcal % 1 === (byDate[key].activityKcal))) {
          // we can't reliably know if already added -- skip complex checks
        }
      }
    }
    if(changed) { setHistoryByDate(byDate); }
  }, []); // one-time
/* src/App.jsx — PARTE 2/3 (cole após a PARTE 1) */

  /* ---------- totals derived ---------- */
  const totals = useMemo(() => {
    let foodKcal = 0, activityKcal = 0;
    let carbsAcc = 0, proteinAcc = 0, fatAcc = 0;
    for(const it of items){
      if(it.activity) activityKcal += (it.kcal || 0);
      else { foodKcal += (it.kcal || 0); carbsAcc += it.carbs || 0; proteinAcc += it.protein || 0; fatAcc += it.fat || 0; }
    }
    const net = foodKcal - activityKcal;
    const balance = Math.round(net - dailyTarget);
    return { foodKcal, activityKcal, netKcal: net, balance, carbs: carbsAcc.toFixed(1), protein: proteinAcc.toFixed(1), fat: fatAcc.toFixed(1) };
  }, [items, dailyTarget]);

  // When profile or kgPerWeek or goalMode changes, update dailyTarget automatically
  useEffect(()=>{
    if(!profile) return;
    const base = profile.tdee || calcTDEE(profile.bmr || calcBMR(profile), profile.activity || activityLevel);
    const target = base + dailyAdjustment;
    setDailyTarget(target);
    // persist profile changes to include goal
    const newProfile = { ...profile, goalMode, kgPerWeek, bmr: profile.bmr || calcBMR(profile), tdee: profile.tdee || base };
    setProfile(newProfile);
    saveJSON("user_profile", newProfile);
  }, [profile?.tdee, dailyAdjustment, goalMode, kgPerWeek]);

  /* ---------- Chart data helpers ---------- */
  function getLast7DaysData(){
    const arr = [];
    for(let i=6;i>=0;i--){
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = fmtDayKey(dt);
      const rec = historyByDate[key] || { foodKcal:0, activityKcal:0 };
      const net = (rec.foodKcal || 0) - (rec.activityKcal || 0);
      arr.push({ date: key, food: rec.foodKcal || 0, activity: rec.activityKcal || 0, net });
    }
    return arr;
  }

  /* ---------- Small inline chart components (using recharts) ---------- */
  function DailyBarChart({food, activity, net, meta}){
    const data = [{ name: 'Hoje', food, activity, net }];
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="food" name="Ingerido" fill="#0ea5a3" />
          <Bar dataKey="activity" name="Gasto" fill="#ff7a59" />
          <Bar dataKey="net" name="Saldo" fill="#ffd166" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function WeeklyBarChart({data}) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={d => d.slice(5)} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="food" stackId="a" name="Ingerido" fill="#0ea5a3" />
          <Bar dataKey="activity" stackId="a" name="Gasto" fill="#ff7a59" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ---------- UI render ---------- */
  return (
    <div className="ft-app">
      <header className="ft-header">
        <div className="ft-brand"><div className="ft-logo">🔥</div><div><h1>Calorie Tracker</h1><p className="muted">Dashboard • Metas Avançadas</p></div></div>
        <div className="ft-stats">
          <div className="stat"><div className="stat-num">{Math.round(totals.foodKcal)}</div><div className="muted">ingeridas</div></div>
          <div className="stat small"><div className="muted">Meta</div><div>{dailyTarget} kcal</div></div>
        </div>
      </header>

      {/* PROFILE + GOALS */}
      <div style={{maxWidth:1100, margin:"12px auto"}}>
        <div className="card" style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{minWidth:240}}>
            <div style={{fontWeight:800}}>Perfil Metabólico</div>
            <div className="muted" style={{fontSize:13}}>BMR • TDEE • Meta Avançada</div>
          </div>

          <div style={{display:"flex", gap:8, alignItems:"center", flex:1, flexWrap:"wrap"}}>
            <select className="select" value={sex} onChange={e=>setSex(e.target.value)} style={{width:140}}>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
            <input className="small" placeholder="Peso (kg)" value={weight} onChange={e=>setWeight(e.target.value.replace(/[^\d.]/g,''))}/>
            <input className="small" placeholder="Altura (cm)" value={height} onChange={e=>setHeight(e.target.value.replace(/[^\d.]/g,''))}/>
            <input className="small" placeholder="Idade" value={age} onChange={e=>setAge(e.target.value.replace(/[^\d]/g,''))}/>
            <select className="select" value={activityLevel} onChange={e=>setActivityLevel(e.target.value)} style={{width:190}}>
              <option value="sedentary">Sedentário</option>
              <option value="light">Levemente ativo</option>
              <option value="moderate">Moderado</option>
              <option value="very">Muito ativo</option>
              <option value="extra">Atleta</option>
            </select>
            <button className="btn primary" onClick={()=>{
              // compute profile then save
              const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age,10);
              if(!w || !h || !a) return alert("Preencha peso, altura e idade");
              const bmr = calcBMR({sex, weightKg:w, heightCm:h, age:a});
              const tdee = calcTDEE(bmr, activityLevel);
              const p = { sex, weightKg: w, heightCm: h, age: a, activity: activityLevel, bmr, tdee };
              setProfile(p);
              saveJSON("user_profile", p);
              setDailyTarget(tdee + dailyAdjustment); // adjust by current advanced goal
            }}>Salvar Perfil</button>

            <button className="btn ghost" onClick={()=>{ setProfile(null); localStorage.removeItem("user_profile"); setDailyTarget(2500);}}>Limpar</button>
          </div>

          <div style={{minWidth:240, textAlign:"right"}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>BMR</div><div style={{fontWeight:800,fontSize:20}}>{profile?.bmr || "—"} kcal</div>
            <div style={{fontSize:12,color:"var(--muted)", marginTop:6}}>TDEE</div><div style={{fontWeight:800,fontSize:20}}>{profile?.tdee || "—"} kcal</div>
          </div>
        </div>

        {/* Goals advanced */}
        <div style={{marginTop:12, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <div className="card" style={{flex:1}}>
            <div style={{fontWeight:800}}>Metas Avançadas</div>
            <div style={{display:"flex", gap:8, marginTop:8, alignItems:"center", flexWrap:"wrap"}}>
              <select className="select" value={goalMode} onChange={e=>setGoalMode(e.target.value)}>
                <option value="maintain">Manter peso</option>
                <option value="lose">Perder peso</option>
                <option value="gain">Ganhar peso</option>
              </select>
              <input className="small" placeholder="kg / semana (ex: 0.5)" value={kgPerWeek} onChange={e=>setKgPerWeek(e.target.value.replace(/[^\d.]/g,''))} />
              <div className="muted">Ajuste diário: {dailyAdjustment >= 0 ? `+${dailyAdjustment}` : dailyAdjustment} kcal</div>
              <button className="btn" onClick={()=> {
                // apply target
                const base = profile?.tdee || (profile ? calcTDEE(profile.bmr || calcBMR(profile), profile.activity) : 2500);
                const target = base + dailyAdjustment;
                setDailyTarget(target);
                saveJSON("daily_target", target);
                const p = {...profile, goalMode, kgPerWeek};
                setProfile(p); saveJSON("user_profile", p);
                alert(`Meta diária definida: ${target} kcal`);
              }}>Aplicar Meta</button>
            </div>
          </div>

          {/* daily summary card */}
          <div className="card" style={{minWidth:320}}>
            <div style={{fontWeight:800}}>Resumo do dia</div>
            <div style={{marginTop:8}}>
              <div className="summary-row"><div>Meta diária (aplicada)</div><div className="bold">{dailyTarget} kcal</div></div>
              <div className="summary-row"><div>Calorias ingeridas</div><div className="bold">{Math.round(totals.foodKcal)} kcal</div></div>
              <div className="summary-row"><div>Calorias gastas</div><div className="bold" style={{color:"#0ea5a3"}}>-{Math.round(totals.activityKcal)} kcal</div></div>
              <hr className="div" />
              <div className="summary-row"><div>Saldo (ingerido – gasto)</div><div className="bold">{Math.round(totals.netKcal)} kcal</div></div>
              <div className="summary-row"><div>Resultado vs meta</div>
                <div className="bold" style={{color: totals.balance < 0 ? "#16a34a" : "#dc2626"}}>{totals.balance} kcal <span className="muted small">({totals.balance < 0 ? "déficit" : "superávit"})</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- MAIN AREA: inputs / history / charts ---------- */}
      <main className="ft-container" style={{marginTop:12}}>
        <section className="left-col">
          <div className="card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{fontWeight:800}}>Adicionar alimento</div>
            </div>

            <div className="card-row" style={{marginTop:10}}>
              <label className="search"><span className="icon">🔍</span>
                <input placeholder="Procurar alimento" value={foodQuery} onChange={e=>setFoodQuery(e.target.value)} />
              </label>
              <div className="inline"><input className="small" placeholder="g" value={grams} onChange={e=>{ const v = e.target.value.replace(/[^\d.]/g,""); setGrams(v); if(selectedFood && v) { const ratio = Number(v) / (selectedFood.portion || 100); setKcal(String(Math.round(selectedFood.kcal * ratio))); setCarbs(String((selectedFood.carbs*ratio).toFixed(1))); setProtein(String((selectedFood.protein*ratio).toFixed(1))); setFat(String((selectedFood.fat*ratio).toFixed(1))); } }} /></div>
            </div>

            {foodSuggestions.length>0 && <div className="suggestions" style={{marginTop:8}}>{foodSuggestions.map((f,i)=>(<div key={i} className="suggestion" onClick={()=>pickFood(f)}><div><div className="s-name">{f.name}</div><div className="muted small-txt">{f.portion}{f.unit||"g"} • {f.kcal} kcal</div></div><div className="s-right"><div className="s-kcal">{f.kcal} kcal</div><div className="pill">C:{f.carbs} P:{f.protein}</div></div></div>))}</div>}

            <div className="card-row mt8">
              <input className="stat-input" placeholder="kcal" value={kcal} readOnly />
              <input className="stat-input" placeholder="carbs" value={carbs} readOnly />
              <input className="stat-input" placeholder="protein" value={protein} readOnly />
              <input className="stat-input" placeholder="fat" value={fat} readOnly />
            </div>

            <div className="card-row mt8">
              <select className="select" value={meal} onChange={e=>setMeal(e.target.value)}><option>Café da manhã</option><option>Almoço</option><option>Jantar</option><option>Lanche</option></select>
              <button className="btn primary" onClick={addFoodItem}><IconPlus/> Adicionar</button>
              <button className="btn ghost" onClick={()=>{ setFoodQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat(""); }}>Limpar</button>
            </div>
          </div>

          {/* recent items */}
          <div className="card mt16">
            <h3>Entradas recentes</h3>
            <div className="list">
              {items.length===0 && <div className="empty">Nenhuma entrada ainda.</div>}
              {items.map(it=>(<div className="list-item" key={it.id}><div className="li-left"><div className="avatar" style={{background: it.activity ? "linear-gradient(180deg,#ffdede,#ffb3b3)" : "linear-gradient(180deg,#cffff4,#aaf1e0)"}}>{it.name.charAt(0).toUpperCase()}</div><div><div className="li-title">{it.name} <span className="muted small-txt">• {it.activity ? `${it.minutes} min` : `${it.grams}g`}</span></div><div className="muted small-txt">{it.meal} • {fmtTime(it.time)}</div></div></div><div className="li-right"><div className="bold">{it.kcal} kcal</div><div className="muted">{it.activity ? "atividade" : `${it.carbs} / ${it.protein} / ${it.fat}`}</div><button className="btn ghost sm" onClick={()=>{ setItems(prev=> prev.filter(x=> x.id !== it.id)); }}>Remover</button></div></div>))}
            </div>
          </div>
        </section>

        <aside className="right-col">
          <div className="card">
            <h3>Gráfico diário</h3>
            <DailyBarChart food={totals.foodKcal} activity={totals.activityKcal} net={totals.netKcal} meta={dailyTarget} />
          </div>

          <div className="card mt16">
            <h3>Gráfico semanal (últimos 7 dias)</h3>
            <WeeklyBarChart data={getLast7DaysData()} />
          </div>

          <div className="card mt16">
            <h3>Quick Actions</h3>
            <div className="qa-grid">
              <button className="btn" onClick={()=>{ navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(items)); alert("Copiado JSON"); }}>Exportar JSON</button>
              <button className="btn" onClick={()=>{
                const rows = [["time","meal","name","grams","kcal","carbs","protein","fat"], ...items.map(i=>[i.time,i.meal,i.name,i.grams,i.kcal,i.carbs,i.protein,i.fat])];
                const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
                const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='calorie_export.csv'; a.click(); URL.revokeObjectURL(url);
              }}>Exportar CSV</button>
            </div>
          </div>
        </aside>
      </main>
/* src/App.jsx — PARTE 3/3 (cole no final) */

      {/* ---------------- Activity Modal / Add Activity quick form ---------------- */}
      {/* We'll provide both modal (elsewhere) and a small inline quick add here */}
      <div style={{maxWidth:1100, margin:"14px auto"}}>
        <div className="card">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{fontWeight:800}}>Adicionar Atividade</div>
          </div>

          <div style={{display:"flex", gap:8, marginTop:10, flexWrap:"wrap", alignItems:"center"}}>
            <input className="small" placeholder="Procurar atividade (ex: corrida)" value={activityQuery} onChange={e=> setActivityQuery(e.target.value)} />
            <div style={{minWidth:140}}>
              <select className="select" value={activitySelectedKey || ""} onChange={e => {
                const name = e.target.value;
                const found = ACTIVITIES.find(a=>a.name === name);
                if(found){ setSelectedActivityQuick(found); if(profile?.weightKg && activityMinutesQuick){ setActivityKcalQuick(String(computeActivityKcal(found, activityMinutesQuick, profile))); } }
              }}>
                <option value="">Escolher atividade</option>
                {ACTIVITIES.map((a,i)=> <option key={i} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <input className="small" placeholder="Minutos" value={activityMinutesQuick} onChange={e => { const v = e.target.value.replace(/[^\d]/g,""); setActivityMinutesQuick(v); if(selectedActivityQuick && profile?.weightKg){ setActivityKcalQuick(String(computeActivityKcal(selectedActivityQuick, v, profile))); } }} />
            <input className="small" placeholder="kcal (calculado)" value={activityKcalQuick} readOnly />
            <button className="btn primary" onClick={()=>{
              if(!selectedActivityQuick || !activityMinutesQuick || !activityKcalQuick) return alert("Preencha atividade e minutos");
              const it = { id:Date.now(), name: selectedActivityQuick.name, activity:true, minutes: Number(activityMinutesQuick), kcal: Number(activityKcalQuick), carbs:0, protein:0, fat:0, meal: "Atividade física", time: new Date().toISOString() };
              setItems(prev => [it, ...prev]); pushToHistory(it);
              // reset quick
              setSelectedActivityQuick(null); setActivitySelectedKey(""); setActivityMinutesQuick(""); setActivityKcalQuick("");
            }}>Adicionar</button>
          </div>
        </div>
      </div>

      <footer className="ft-footer muted">Calorie Tracker • Gráficos & Metas Avançadas</footer>
    </div>
  ); // end return

  /* ----------------- Utilities in component scope ----------------- */

  // Inline quick-activity state (declared here to avoid top-level complexity)
  // (we keep them here so the paste order works)
  const [activityQuery, setActivityQuery] = useState("");
  const [activitySuggestions, setActivitySuggestions] = useState([]);
  const [selectedActivityQuick, setSelectedActivityQuick] = useState(null);
  const [activityMinutesQuick, setActivityMinutesQuick] = useState("");
  const [activityKcalQuick, setActivityKcalQuick] = useState("");
  const [activitySelectedKey, setActivitySelectedKey] = useState("");

  // watch for activityQuery suggestions
  useEffect(()=> {
    if(!activityQuery || activityQuery.length < 2){ setActivitySuggestions([]); return; }
    const q = activityQuery.toLowerCase();
    setActivitySuggestions(ACTIVITIES.filter(a => a.name.toLowerCase().includes(q)).slice(0,8));
  }, [activityQuery]);

  // helper pushToHistory (already used above)
  function pushToHistory(item){
    const key = fmtDayKey(item.time);
    setHistoryByDate(prev => {
      const clone = {...(prev||{})};
      const cur = clone[key] || { foodKcal:0, activityKcal:0 };
      if(item.activity) cur.activityKcal = (cur.activityKcal || 0) + (item.kcal||0);
      else cur.foodKcal = (cur.foodKcal || 0) + (item.kcal||0);
      clone[key] = cur;
      saveJSON("history_by_date", clone);
      return clone;
    });
  }

  // finally close component
} // end App component
