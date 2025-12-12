import React, { useEffect, useMemo, useState } from "react";
import { FOODS } from "./foods"; // mantém seu foods.js em src/

/* ---------- Helper icons (inline) ---------- */
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ---------- Utility: format time ---------- */
function fmtDate(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------- BMR & TDEE calculation functions ---------- */
function calcBMR({ sex, weightKg, heightCm, age }) {
  // Mifflin-St Jeor
  if (!weightKg || !heightCm || !age) return 0;
  if (sex === "male") {
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }
}
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9
};
function calcTDEE(bmr, activityKey) {
  const f = ACTIVITY_FACTORS[activityKey] || 1.2;
  return Math.round(bmr * f);
}

/* ---------- MAIN APP ---------- */
export default function App() {
  // ---------- APP DATA: items ----------
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal_items") || "[]"); }
    catch { return []; }
  });

  // ---------- PROFILE (saved in localStorage) ----------
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_profile") || "null"); }
    catch { return null; }
  });

  // If profile has tdee -> default dailyTarget, otherwise fallback 2500
  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem("user_profile") || "null");
      return p && p.tdee ? Number(p.tdee) : 2500;
    } catch { return 2500; }
  });

  // ---------- INPUTS for food ----------
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState("Almoço");

  useEffect(() => localStorage.setItem("cal_items", JSON.stringify(items)), [items]);

  // ---------- totals ----------
  const totals = useMemo(() => {
    const t = items.reduce((s, it) => {
      s.k += Number(it.kcal || 0);
      s.c += Number(it.carbs || 0);
      s.p += Number(it.protein || 0);
      s.f += Number(it.fat || 0);
      return s;
    }, { k: 0, c: 0, p: 0, f: 0 });
    return { kcal: Math.round(t.k), carbs: +t.c.toFixed(1), protein: +t.p.toFixed(1), fat: +t.f.toFixed(1) };
  }, [items]);

  // ---------- suggestions ----------
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const filtered = (FOODS || []).filter(f => f.name.toLowerCase().includes(q));
    setSuggestions(filtered.slice(0, 6));
  }, [query]);

  function pickFood(food) {
    setSelectedFood(food);
    setQuery(food.name);
    const defaultPortion = food.portion || 100;
    setGrams(String(defaultPortion));
    recalc(food, defaultPortion);
    setSuggestions([]);
  }

  function recalc(food, g) {
    if (!food) return;
    const ratio = Number(g) / Number(food.portion || 100);
    setKcal(String(Math.round(food.kcal * ratio)));
    setCarbs(String((food.carbs * ratio).toFixed(1)));
    setProtein(String((food.protein * ratio).toFixed(1)));
    setFat(String((food.fat * ratio).toFixed(1)));
  }

  function onGrams(e) {
    const v = e.target.value.replace(/[^\d.]/g, "");
    setGrams(v);
    if (selectedFood && v) recalc(selectedFood, v);
  }

  function addItem() {
    if (!query || !kcal) return;
    const it = {
      id: Date.now(),
      name: query,
      grams: Number(grams) || 0,
      kcal: Number(kcal) || 0,
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      meal,
      time: new Date().toISOString()
    };
    setItems(prev => [it, ...prev]);
    // reset
    setQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat("");
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // ---------- PROFILE FORM state (local inputs) ----------
  const [sex, setSex] = useState(profile?.sex || "male");
  const [weight, setWeight] = useState(profile?.weightKg ? String(profile.weightKg) : "");
  const [height, setHeight] = useState(profile?.heightCm ? String(profile.heightCm) : "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [activity, setActivity] = useState(profile?.activity || "sedentary");
  const [computedBMR, setComputedBMR] = useState(profile?.bmr || 0);
  const [computedTDEE, setComputedTDEE] = useState(profile?.tdee || 0);

  // compute & save profile
  function computeProfileAndSave() {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageNum = parseInt(age, 10);

    if (!weightKg || !heightCm || !ageNum) {
      alert("Preencha peso, altura e idade corretamente.");
      return;
    }

    const bmr = Math.round(calcBMR({ sex, weightKg, heightCm, age: ageNum }));
    const tdee = calcTDEE(bmr, activity);

    const newProfile = {
      sex, weightKg, heightCm, age: ageNum, activity, bmr, tdee, updatedAt: new Date().toISOString()
    };

    setProfile(newProfile);
    localStorage.setItem("user_profile", JSON.stringify(newProfile));
    setComputedBMR(bmr);
    setComputedTDEE(tdee);

    // update app daily target automatically to TDEE
    setDailyTarget(tdee);
    // save daily target separately as convenience
    localStorage.setItem("daily_target", String(tdee));
  }

  // load dailyTarget from localStorage when app mounts
  useEffect(() => {
    try {
      const dt = localStorage.getItem("daily_target");
      if (dt) setDailyTarget(Number(dt));
    } catch {}
  }, []);

  // progress relative to dailyTarget
  const progress = Math.min(1, totals.kcal / (dailyTarget || 1));

  // quick reset profile
  function clearProfile() {
    setProfile(null);
    localStorage.removeItem("user_profile");
    setSex("male"); setWeight(""); setHeight(""); setAge(""); setActivity("sedentary");
    setComputedBMR(0); setComputedTDEE(0);
    setDailyTarget(2500);
    localStorage.removeItem("daily_target");
  }

  return (
    <div className="ft-app">
      {/* ---------- HEADER + PROFILE (top) ---------- */}
      <header className="ft-header">
        <div className="ft-brand">
          <div className="ft-logo">🔥</div>
          <div>
            <h1>Calorie Tracker</h1>
            <p className="muted">Registro rápido • Visual Flat</p>
          </div>
        </div>

        <div className="ft-stats">
          <div className="stat">
            <div className="stat-num">{totals.kcal}</div>
            <div className="muted">consumidas</div>
          </div>
          <div className="stat small">
            <div className="muted">Meta</div>
            <div>{dailyTarget} kcal</div>
          </div>
        </div>
      </header>

      {/* ---------- PROFILE CARD (top, option B) ---------- */}
      <div style={{ maxWidth: 1100, margin: "12px auto" }}>
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 800 }}>Seu Perfil Metabólico</div>
            <div className="muted" style={{ fontSize: 13 }}>Calcule BMR & TDEE (meta diária)</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
            <select className="select" value={sex} onChange={e => setSex(e.target.value)} style={{ width: 140 }}>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>

            <input className="small" placeholder="Peso (kg)" value={weight} onChange={e => setWeight(e.target.value.replace(/[^\d.]/g, ""))} />
            <input className="small" placeholder="Altura (cm)" value={height} onChange={e => setHeight(e.target.value.replace(/[^\d.]/g, ""))} />
            <input className="small" placeholder="Idade" value={age} onChange={e => setAge(e.target.value.replace(/[^\d]/g, ""))} />

            <select className="select" value={activity} onChange={e => setActivity(e.target.value)} style={{ width: 190 }}>
              <option value="sedentary">Sedentário (pouco exercício)</option>
              <option value="light">Levemente ativo (1–3x/sem)</option>
              <option value="moderate">Moderadamente ativo (3–5x/sem)</option>
              <option value="very">Muito ativo (6–7x/sem)</option>
              <option value="extra">Extremamente ativo / atleta</option>
            </select>

            <button className="btn primary" onClick={computeProfileAndSave} title="Calcular BMR & TDEE">Calcular</button>
            <button className="btn ghost" onClick={clearProfile}>Limpar</button>
          </div>

          <div style={{ minWidth: 240, textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Gasto Basal (BMR)</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{computedBMR || "—"} kcal</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>TDEE (meta diária estimada)</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{computedTDEE || "—"} kcal</div>
          </div>
        </div>
      </div>

      {/* ---------- MAIN LAYOUT ---------- */}
      <main className="ft-container">
        {/* LEFT: inputs & recent entries */}
        <section className="left-col">
          <div className="card">
            <div className="card-row">
              <label className="search">
                <span className="icon"><IconSearch/></span>
                <input
                  placeholder="Procurar alimento (ex: arroz, frango, morango)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </label>

              <div className="inline">
                <input className="small" placeholder="g" value={grams} onChange={onGrams} />
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="suggestion" onClick={() => pickFood(s)}>
                    <div>
                      <div className="s-name">{s.name}</div>
                      <div className="muted small-txt">{s.portion}{s.unit||"g"} • {s.kcal} kcal</div>
                    </div>
                    <div className="s-right">
                      <div className="s-kcal">{s.kcal} kcal</div>
                      <div className="pill">C:{s.carbs} P:{s.protein}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card-row mt8">
              <input className="stat-input" placeholder="kcal" value={kcal} readOnly />
              <input className="stat-input" placeholder="carbs" value={carbs} readOnly />
              <input className="stat-input" placeholder="protein" value={protein} readOnly />
              <input className="stat-input" placeholder="fat" value={fat} readOnly />
            </div>

            <div className="card-row mt8">
              <select value={meal} onChange={e => setMeal(e.target.value)} className="select">
                <option>Café da manhã</option>
                <option>Almoço</option>
                <option>Jantar</option>
                <option>Lanche</option>
              </select>

              <button className="btn primary" onClick={addItem}><IconPlus/> Adicionar</button>
              <button className="btn ghost" onClick={() => { setQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat(""); }}>Limpar</button>
            </div>

            <div className="progress-area">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="progress-text">{Math.round(progress * 100)}%</div>
            </div>
          </div>

          <div className="card mt16">
            <h3>Entradas recentes</h3>
            <div className="list">
              {items.length === 0 && <div className="empty">Nenhuma entrada ainda.</div>}
              {items.map(it => (
                <div className="list-item" key={it.id}>
                  <div className="li-left">
                    <div className="avatar">{it.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="li-title">{it.name} <span className="muted small-txt">• {it.grams}g</span></div>
                      <div className="muted small-txt">{it.meal} • {fmtDate(it.time)}</div>
                    </div>
                  </div>
                  <div className="li-right">
                    <div className="bold">{it.kcal} kcal</div>
                    <div className="muted">{it.carbs} / {it.protein} / {it.fat}</div>
                    <button className="btn ghost sm" onClick={() => removeItem(it.id)}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: summary & quick actions */}
        <aside className="right-col">
          <div className="card">
            <h3>Resumo do dia</h3>
            <div className="summary">
              <div className="summary-row"><div>Calorias</div><div className="bold">{totals.kcal} kcal</div></div>
              <div className="summary-row"><div>Carboidratos</div><div className="bold">{totals.carbs} g</div></div>
              <div className="summary-row"><div>Proteínas</div><div className="bold">{totals.protein} g</div></div>
              <div className="summary-row"><div>Gorduras</div><div className="bold">{totals.fat} g</div></div>
            </div>
            <div className="spacer" />
            <div className="meta muted">Meta diária: {dailyTarget} kcal</div>
          </div>

          <div className="card mt16">
            <h3>Quick Actions</h3>
            <div className="qa-grid">
              <button className="btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(items)); alert("Copiado JSON para clipboard"); }}>Exportar JSON</button>
              <button className="btn" onClick={() => {
                const rows = [["time","meal","name","grams","kcal","carbs","protein","fat"], ...items.map(i => [i.time,i.meal,i.name,i.grams,i.kcal,i.carbs,i.protein,i.fat])];
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'calorie_export.csv'; a.click();
                URL.revokeObjectURL(url);
              }}>Exportar CSV</button>
              <button className="btn" onClick={() => { if(confirm("Limpar todas as entradas?")) { setItems([]); } }}>Limpar Hoje</button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="ft-footer muted">Flat Fitness • Modern • Offline-ready</footer>
    </div>
  );
}
