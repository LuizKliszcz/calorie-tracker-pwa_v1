import React, { useEffect, useMemo, useState } from "react";
import { FOODS } from "./foods";
import { ACTIVITIES } from "./activities";

/* -------------------------------- Icons -------------------------------- */
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- Helpers -------------------------------- */
function fmtDate(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function calcBMR({ sex, weightKg, heightCm, age }) {
  if (!sex || !weightKg || !heightCm || !age) return 0;

  if (sex === "male")
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5);

  return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
}

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9
};

function calcTDEE(bmr, activity) {
  return Math.round(bmr * (ACTIVITY_FACTORS[activity] || 1.2));
}

function computeActivityKcal(activity, minutes, profile) {
  if (!activity || !minutes || !profile?.weightKg) return 0;
  const kcalPerMin = activity.met * profile.weightKg * 0.0175;
  return Math.round(kcalPerMin * minutes);
}

/* -------------------------------- App -------------------------------- */
export default function App() {

  /* ---------------- Foods Items ---------------- */
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal_items") || "[]"); }
    catch { return []; }
  });
  useEffect(() => localStorage.setItem("cal_items", JSON.stringify(items)), [items]);

  /* ---------------- Profile ---------------- */
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_profile") || "null"); }
    catch { return null; }
  });

  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem("user_profile") || "null");
      return p?.tdee || 2500;
    } catch { return 2500; }
  });

  /* Profile form states */
  const [sex, setSex] = useState(profile?.sex || "male");
  const [weight, setWeight] = useState(profile?.weightKg || "");
  const [height, setHeight] = useState(profile?.heightCm || "");
  const [age, setAge] = useState(profile?.age || "");
  const [activityLevel, setActivityLevel] = useState(profile?.activity || "sedentary");

  const [computedBMR, setComputedBMR] = useState(profile?.bmr || 0);
  const [computedTDEE, setComputedTDEE] = useState(profile?.tdee || 0);

  function computeProfile() {
    const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age, 10);
    if (!w || !h || !a) return alert("Preencha peso, altura e idade corretamente.");

    const bmr = calcBMR({ sex, weightKg: w, heightCm: h, age: a });
    const tdee = calcTDEE(bmr, activityLevel);

    const newProfile = {
      sex, weightKg: w, heightCm: h, age: a,
      activity: activityLevel,
      bmr, tdee,
      updatedAt: new Date().toISOString()
    };

    setProfile(newProfile);
    localStorage.setItem("user_profile", JSON.stringify(newProfile));

    setComputedBMR(bmr);
    setComputedTDEE(tdee);
    setDailyTarget(tdee);
  }

  /* ---------------- Food Input ---------------- */
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);

  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState("Almoço");

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    setSuggestions(FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6));
  }, [query]);

  function pickFood(food) {
    setSelectedFood(food);
    setQuery(food.name);
    const g = food.portion || 100;
    setGrams(g);
    recalcFood(food, g);
    setSuggestions([]);
  }

  function recalcFood(food, g) {
    const ratio = g / (food.portion || 100);
    setKcal(Math.round(food.kcal * ratio));
    setCarbs((food.carbs * ratio).toFixed(1));
    setProtein((food.protein * ratio).toFixed(1));
    setFat((food.fat * ratio).toFixed(1));
  }

  function addFood() {
    if (!query || !kcal) return;

    setItems(prev => [
      {
        id: Date.now(),
        name: query,
        grams: Number(grams) || 0,
        kcal: Number(kcal),
        carbs: Number(carbs),
        protein: Number(protein),
        fat: Number(fat),
        meal,
        time: new Date().toISOString()
      },
      ...prev
    ]);

    setQuery(""); setSelectedFood(null);
    setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat("");
  }

  /* ---------------- Activities Modal ---------------- */
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityQuery, setActivityQuery] = useState("");
  const [activitySuggestions, setActivitySuggestions] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [activityMinutes, setActivityMinutes] = useState("");
  const [activityKcal, setActivityKcal] = useState("");

  useEffect(() => {
    if (!activityQuery || activityQuery.length < 2) {
      setActivitySuggestions([]);
      return;
    }
    const q = activityQuery.toLowerCase();
    setActivitySuggestions(ACTIVITIES.filter(a => a.name.toLowerCase().includes(q)).slice(0, 6));
  }, [activityQuery]);

  function pickActivity(a) {
    setSelectedActivity(a);
    setActivityQuery(a.name);

    if (activityMinutes && profile?.weightKg) {
      const kcal = computeActivityKcal(a, activityMinutes, profile);
      setActivityKcal(String(kcal));
    }
    setActivitySuggestions([]);
  }

  function addActivity() {
    if (!selectedActivity || !activityMinutes || !activityKcal)
      return alert("Preencha atividade e duração.");

    setItems(prev => [
      {
        id: Date.now(),
        name: selectedActivity.name,
        activity: true,
        minutes: Number(activityMinutes),
        kcal: Number(activityKcal),
        carbs: 0, protein: 0, fat: 0,
        meal: "Atividade física",
        time: new Date().toISOString()
      },
      ...prev
    ]);

    setSelectedActivity(null);
    setActivityQuery("");
    setActivityMinutes("");
    setActivityKcal("");
    setShowActivityModal(false);
  }

  /* ---------------- Totals ---------------- */
  const totals = useMemo(() => {
    const acc = items.reduce((s, it) => {
      s.k += it.kcal || 0;
      s.c += it.carbs || 0;
      s.p += it.protein || 0;
      s.f += it.fat || 0;
      return s;
    }, { k: 0, c: 0, p: 0, f: 0 });
    return {
      kcal: Math.round(acc.k),
      carbs: acc.c.toFixed(1),
      protein: acc.p.toFixed(1),
      fat: acc.f.toFixed(1)
    };
  }, [items]);

  const progress = Math.min(1, totals.kcal / dailyTarget);
  /* ---------------- Return / JSX (parte 2) ---------------- */
  return (
    <div className="ft-app">
      {/* ---------- HEADER ---------- */}
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

      {/* ---------- PROFILE (top) ---------- */}
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

            <input className="small" placeholder="Peso (kg)" value={weight} onChange={e => setWeight(String(e.target.value).replace(/[^\d.]/g, ""))} />
            <input className="small" placeholder="Altura (cm)" value={height} onChange={e => setHeight(String(e.target.value).replace(/[^\d.]/g, ""))} />
            <input className="small" placeholder="Idade" value={age} onChange={e => setAge(String(e.target.value).replace(/[^\d]/g, ""))} />

            <select className="select" value={activityLevel} onChange={e => setActivityLevel(e.target.value)} style={{ width: 190 }}>
              <option value="sedentary">Sedentário (pouco exercício)</option>
              <option value="light">Levemente ativo (1–3x/sem)</option>
              <option value="moderate">Moderadamente ativo (3–5x/sem)</option>
              <option value="very">Muito ativo (6–7x/sem)</option>
              <option value="extra">Extremamente ativo / atleta</option>
            </select>

            <button className="btn primary" onClick={computeProfile} title="Calcular BMR & TDEE">Calcular</button>
            <button className="btn ghost" onClick={() => {
              // clear profile quick
              setProfile(null);
              localStorage.removeItem("user_profile");
              setSex("male"); setWeight(""); setHeight(""); setAge(""); setActivityLevel("sedentary");
              setComputedBMR(0); setComputedTDEE(0); setDailyTarget(2500);
              localStorage.removeItem("daily_target");
            }}>Limpar</button>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>Adicionar alimento</div>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Button to open activity modal */}
                <button className="btn primary" onClick={() => setShowActivityModal(true)}>+ Adicionar Atividade Física</button>
              </div>
            </div>

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
                <input className="small" placeholder="g" value={grams} onChange={e => {
                  const v = String(e.target.value).replace(/[^\d.]/g, "");
                  setGrams(v);
                  if (selectedFood && v) recalcFood(selectedFood, Number(v));
                }} />
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

              <button className="btn primary" onClick={addFood}><IconPlus/> Adicionar</button>
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
                    <div className="avatar" style={{ background: it.activity ? "linear-gradient(180deg,#ffd7c4,#ffb39a)" : "linear-gradient(180deg,var(--accent),#ffb39a)" }}>
                      {it.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="li-title">{it.name} <span className="muted small-txt">• {it.activity ? `${it.minutes} min` : `${it.grams}g`}</span></div>
                      <div className="muted small-txt">{it.meal} • {fmtDate(it.time)}</div>
                    </div>
                  </div>
                  <div className="li-right">
                    <div className="bold">{it.kcal} kcal</div>
                    <div className="muted">{it.activity ? "atividade" : `${it.carbs} / ${it.protein} / ${it.fat}`}</div>
                    <button className="btn ghost sm" onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}>Remover</button>
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
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
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
      {/* ----------------------- ACTIVITY MODAL ----------------------- */}
      {showActivityModal && (
        <div className="modal-overlay">
          <div className="modal-card">

            <h2>Adicionar Atividade Física</h2>
            <p className="muted">Selecione uma atividade e informe o tempo em minutos</p>

            {/* Activity Search */}
            <div className="modal-row">
              <input
                className="modal-input"
                placeholder="Procurar atividade (ex: corrida, jiu-jitsu, musculação)"
                value={activityQuery}
                onChange={e => setActivityQuery(e.target.value)}
              />
            </div>

            {/* Suggestions */}
            {activitySuggestions.length > 0 && (
              <div className="modal-suggestions">
                {activitySuggestions.map((a, idx) => (
                  <div className="modal-suggestion" key={idx} onClick={() => pickActivity(a)}>
                    <div>{a.name}</div>
                    <div className="muted small">MET: {a.met}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Time */}
            <div className="modal-row">
              <input
                className="modal-input small"
                placeholder="Minutos"
                value={activityMinutes}
                onChange={e => {
                  const val = String(e.target.value).replace(/[^\d]/g, "");
                  setActivityMinutes(val);

                  if (selectedActivity && profile?.weightKg) {
                    const kcal = computeActivityKcal(selectedActivity, val, profile);
                    setActivityKcal(String(kcal));
                  }
                }}
              />
              <input
                className="modal-input small"
                placeholder="Kcal"
                value={activityKcal}
                readOnly
              />
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn primary" onClick={addActivity}>Adicionar</button>
              <button className="btn ghost" onClick={() => setShowActivityModal(false)}>Cancelar</button>
            </div>

          </div>
        </div>
      )}

      <footer className="ft-footer muted">Flat Fitness • Modern • Offline-ready</footer>
    </div> // end .ft-app
  );
}
