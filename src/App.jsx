// ------------------------------
// App.jsx (PARTE 1/3)
// ------------------------------

import React, { useState, useEffect, useMemo } from "react";
import { FOODS } from "./foods";
import { ACTIVITIES } from "./activities";

// Recharts
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


// ======================================
// ICONES
// ======================================

function IconPlus() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6 }}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6 }}
    >
      <circle cx="11" cy="11" r="6"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}


// ======================================
// HELPERS
// ======================================

function fmtDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);  // yyyy-mm-dd
}

function fmtTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function loadJSON(key, def) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}

function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// Cálculo BMR / TDEE
function calcBMR({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return 0;
  if (sex === "male") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9
};

function calcTDEE(bmr, level) {
  return Math.round(bmr * (ACTIVITY_FACTORS[level] || 1.2));
}

// Kcal gastas por atividade (usando MET)
function calcActivityKcal(activity, minutes, weight) {
  if (!activity || !minutes || !weight) return 0;
  const kcalMin = activity.met * weight * 0.0175;
  return Math.round(kcalMin * minutes);
}


// ======================================
// COMPONENTE PRINCIPAL
// ======================================

export default function App() {

  // --------------------------
  // STATE — LISTA DE ITENS
  // --------------------------
  const [items, setItems] = useState(() => loadJSON("items", []));

  useEffect(() => {
    saveJSON("items", items);
  }, [items]);


  // --------------------------
  // HISTÓRICO POR DIA
  // --------------------------
  const [history, setHistory] = useState(() =>
    loadJSON("history", {})
  );

  useEffect(() => saveJSON("history", history), [history]);


  function addToHistory(entry) {
    const key = fmtDateKey(entry.time);
    setHistory(prev => {
      const h = { ...prev };
      const today = h[key] || { foodK: 0, actK: 0 };
      if (entry.activity) today.actK += entry.kcal;
      else today.foodK += entry.kcal;
      h[key] = today;
      return h;
    });
  }


  // --------------------------
  // PERFIL METABÓLICO
  // --------------------------
  const [profile, setProfile] = useState(() =>
    loadJSON("profile", {
      sex: "male",
      weightKg: 80,
      heightCm: 170,
      age: 30,
      level: "sedentary"
    })
  );

  const bmr = useMemo(() => calcBMR(profile), [profile]);
  const tdee = useMemo(() => calcTDEE(bmr, profile.level), [bmr, profile.level]);


  // --------------------------
  // METAS AVANÇADAS
  // --------------------------
  const [goalMode, setGoalMode] = useState("maintain");
  const [kgPerWeek, setKgPerWeek] = useState("0");

  const dailyAdjust = useMemo(() => {
    const kg = parseFloat(kgPerWeek) || 0;
    if (goalMode === "lose") return -Math.round((kg * 7700) / 7);
    if (goalMode === "gain") return Math.round((kg * 7700) / 7);
    return 0;
  }, [goalMode, kgPerWeek]);

  const dailyTarget = tdee + dailyAdjust;


  // --------------------------
  // ADD FOOD INPUTS
  // --------------------------
  const [foodQuery, setFoodQuery] = useState("");
  const [foodSuggestions, setFoodSuggestions] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState("Almoço");


  // --------------------------
  // SUGESTÕES DE ALIMENTOS
  // --------------------------
  useEffect(() => {
    if (foodQuery.length < 2) return setFoodSuggestions([]);
    const q = foodQuery.toLowerCase();
    setFoodSuggestions(
      FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8)
    );
  }, [foodQuery]);

  // --------------------------
  // Funções utilitárias: pickFood, recalc, addFood
  // --------------------------
  function pickFood(food) {
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

  function onGramsChange(val) {
    const clean = String(val).replace(/[^\d.]/g, "");
    setGrams(clean);
    if (selectedFood && clean) {
      const ratio = Number(clean) / (selectedFood.portion || 100);
      setKcal(String(Math.round(selectedFood.kcal * ratio)));
      setCarbs(String((selectedFood.carbs * ratio).toFixed(1)));
      setProtein(String((selectedFood.protein * ratio).toFixed(1)));
      setFat(String((selectedFood.fat * ratio).toFixed(1)));
    }
  }

  function addFood() {
    if (!foodQuery || !kcal) return alert("Preencha nome e calorias");
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
    addToHistory(it);
    // reset
    setFoodQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat("");
  }

  // --------------------------
  // Totals (food vs activity)
  // --------------------------
  const totals = useMemo(() => {
    let foodK = 0, actK = 0, c = 0, p = 0, f = 0;
    for (const it of items) {
      if (it.activity) actK += (it.kcal || 0);
      else { foodK += (it.kcal || 0); c += it.carbs || 0; p += it.protein || 0; f += it.fat || 0; }
    }
    const net = Math.round(foodK - actK);
    const balance = Math.round(net - (dailyTarget || tdee || 0));
    return {
      foodK,
      actK,
      net,
      balance,
      carbs: c.toFixed(1),
      protein: p.toFixed(1),
      fat: f.toFixed(1)
    };
  }, [items, dailyTarget, tdee]);

  // --------------------------
  // Charts (Recharts components)
  // --------------------------
  function DailyBarChart({ food, activity, net, meta }) {
    const data = [{ name: "Hoje", Ingerido: food, Gasto: activity, Saldo: net }];
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Ingerido" fill="#0ea5a3" />
          <Bar dataKey="Gasto" fill="#ff7a59" />
          <Bar dataKey="Saldo" fill="#ffd166" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function WeeklyBarChart({ data }) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
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

  function getLast7Days() {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = fmtDateKey(dt);
      const rec = history[key] || { foodK: 0, actK: 0 };
      arr.push({ date: key, food: rec.foodK || 0, activity: rec.actK || 0, net: (rec.foodK || 0) - (rec.actK || 0) });
    }
    return arr;
  }

  // --------------------------
  // JSX - layout principal
  // --------------------------
  return (
    <div className="ft-app">
      {/* HEADER */}
      <header className="ft-header">
        <div className="ft-brand">
          <div className="ft-logo">🔥</div>
          <div>
            <h1>Calorie Tracker</h1>
            <p className="muted">Registro • Metas • Gráficos</p>
          </div>
        </div>

        <div className="ft-stats">
          <div className="stat">
            <div className="stat-num">{Math.round(totals.foodK)}</div>
            <div className="muted">ingeridas</div>
          </div>
          <div className="stat small">
            <div className="muted">Meta</div>
            <div>{dailyTarget} kcal</div>
          </div>
        </div>
      </header>

      {/* PROFILE & GOALS */}
      <div style={{ maxWidth: 1100, margin: "12px auto" }}>
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 800 }}>Perfil Metabólico</div>
            <div className="muted" style={{ fontSize: 13 }}>BMR & TDEE</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <select className="select" value={profile.sex} onChange={e => { setProfile({ ...profile, sex: e.target.value }); }}>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>

            <input className="small" placeholder="Peso (kg)" value={profile.weightKg} onChange={e => setProfile({ ...profile, weightKg: Number(e.target.value || 0) })} />
            <input className="small" placeholder="Altura (cm)" value={profile.heightCm} onChange={e => setProfile({ ...profile, heightCm: Number(e.target.value || 0) })} />
            <input className="small" placeholder="Idade" value={profile.age} onChange={e => setProfile({ ...profile, age: Number(e.target.value || 0) })} />

            <select className="select" value={profile.level} onChange={e => setProfile({ ...profile, level: e.target.value })}>
              <option value="sedentary">Sedentário</option>
              <option value="light">Levemente ativo</option>
              <option value="moderate">Moderadamente ativo</option>
              <option value="very">Muito ativo</option>
              <option value="extra">Atleta</option>
            </select>

            <button className="btn primary" onClick={() => {
              // save profile computed fields
              const computedB = calcBMR(profile);
              const computedT = calcTDEE(computedB, profile.level);
              const p = { ...profile, bmr: computedB, tdee: computedT };
              setProfile(p);
              saveJSON("profile", p);
            }}>Salvar Perfil</button>

            <button className="btn ghost" onClick={() => { setProfile({ sex: "male", weightKg: 80, heightCm: 170, age: 30, level: "sedentary" }); saveJSON("profile", null); }}>Reset</button>
          </div>

          <div style={{ minWidth: 240, textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>BMR</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{bmr || "—"} kcal</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>TDEE</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{tdee || "—"} kcal</div>
          </div>
        </div>

        {/* Goals card & summary */}
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>Metas Avançadas</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select className="select" value={goalMode} onChange={e => setGoalMode(e.target.value)}>
                <option value="maintain">Manter peso</option>
                <option value="lose">Perder peso</option>
                <option value="gain">Ganhar peso</option>
              </select>

              <input className="small" placeholder="kg / semana" value={kgPerWeek} onChange={e => setKgPerWeek(e.target.value.replace(/[^\d.]/g, ""))} />

              <div className="muted">Ajuste diário: {dailyAdjust >= 0 ? `+${dailyAdjust}` : dailyAdjust} kcal</div>

              <button className="btn" onClick={() => {
                const target = (profile.tdee || tdee) + dailyAdjust;
                saveJSON("dailyTarget", target);
                alert(`Meta diária aplicada: ${target} kcal`);
              }}>Aplicar</button>
            </div>
          </div>

          <div className="card" style={{ minWidth: 320 }}>
            <div style={{ fontWeight: 800 }}>Resumo do dia</div>
            <div style={{ marginTop: 8 }}>
              <div className="summary-row"><div>Meta diária</div><div className="bold">{dailyTarget} kcal</div></div>
              <div className="summary-row"><div>Ingerido</div><div className="bold">{Math.round(totals.foodK)} kcal</div></div>
              <div className="summary-row"><div>Gasto</div><div className="bold" style={{ color: "#0ea5a3" }}>-{Math.round(totals.actK)} kcal</div></div>
              <hr className="div" />
              <div className="summary-row"><div>Saldo (ingerido - gasto)</div><div className="bold">{Math.round(totals.net)} kcal</div></div>
              <div className="summary-row"><div>Vs Meta</div><div className="bold" style={{ color: totals.balance < 0 ? "#16a34a" : "#dc2626" }}>{totals.balance} kcal <span className="muted small">{totals.balance < 0 ? "déficit" : "superávit"}</span></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <main className="ft-container">
        {/* LEFT: input + recent */}
        <section className="left-col">
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>Adicionar alimento</div>
            </div>

            <div className="card-row" style={{ marginTop: 10 }}>
              <label className="search"><span className="icon"><IconSearch/></span>
                <input placeholder="Procurar alimento" value={foodQuery} onChange={e => setFoodQuery(e.target.value)} />
              </label>

              <div className="inline">
                <input className="small" placeholder="g" value={grams} onChange={e => onGramsChange(e.target.value)} />
              </div>
            </div>

            {foodSuggestions.length > 0 && <div className="suggestions" style={{ marginTop: 8 }}>{foodSuggestions.map((f, i) => (<div key={i} className="suggestion" onClick={() => pickFood(f)}><div><div className="s-name">{f.name}</div><div className="muted small-txt">{f.portion}{f.unit||"g"} • {f.kcal} kcal</div></div><div className="s-right"><div className="s-kcal">{f.kcal} kcal</div><div className="pill">C:{f.carbs} P:{f.protein}</div></div></div>))}</div>}

            <div className="card-row mt8">
              <input className="stat-input" placeholder="kcal" value={kcal} readOnly />
              <input className="stat-input" placeholder="carbs" value={carbs} readOnly />
              <input className="stat-input" placeholder="protein" value={protein} readOnly />
              <input className="stat-input" placeholder="fat" value={fat} readOnly />
            </div>

            <div className="card-row mt8">
              <select value={meal} onChange={e => setMeal(e.target.value)} className="select"><option>Café da manhã</option><option>Almoço</option><option>Jantar</option><option>Lanche</option></select>
              <button className="btn primary" onClick={addFood}><IconPlus/>Adicionar</button>
              <button className="btn ghost" onClick={() => { setFoodQuery(""); setSelectedFood(null); setGrams(""); setKcal(""); setCarbs(""); setProtein(""); setFat(""); }}>Limpar</button>
            </div>
            </div>
          </div>

          {/* LISTA DE ENTRADAS */}
          <div className="card mt16">
            <h3>Entradas recentes</h3>

            <div className="list">
              {items.length === 0 && (
                <div className="empty">Nenhum registro ainda.</div>
              )}

              {items.map(it => (
                <div className="list-item" key={it.id}>
                  <div className="li-left">
                    <div
                      className="avatar"
                      style={{
                        background: it.activity
                          ? "linear-gradient(180deg,#ffdede,#ffb3b3)"
                          : "linear-gradient(180deg,#cffff4,#aaf1e0)"
                      }}
                    >
                      {it.activity ? "🏃" : "🍽️"}
                    </div>

                    <div>
                      <div className="li-title">
                        {it.name}
                        <span className="muted small-txt">
                          {" "}
                          • {it.activity ? `${it.minutes} min` : `${it.grams} g`}
                        </span>
                      </div>
                      <div className="muted small-txt">
                        {it.meal} • {fmtTime(it.time)}
                      </div>
                    </div>
                  </div>

                  <div className="li-right">
                    <div className="bold">{it.kcal} kcal</div>
                    <button
                      className="btn ghost sm"
                      onClick={() =>
                        setItems(prev => prev.filter(x => x.id !== it.id))
                      }
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: GRÁFICOS */}
        <aside className="right-col">
          <div className="card">
            <h3>Gráfico diário</h3>
            <DailyBarChart
              food={totals.foodK}
              activity={totals.actK}
              net={totals.net}
              meta={dailyTarget}
            />
          </div>

          <div className="card mt16">
            <h3>Últimos 7 dias</h3>
            <WeeklyBarChart data={getLast7Days()} />
          </div>
        </aside>
      </main>

      {/* =========================
          ADD ATIVIDADE FÍSICA
         ========================= */}
      <div style={{ maxWidth: 1100, margin: "16px auto" }}>
        <div className="card">
          <div style={{ fontWeight: 800 }}>Adicionar atividade física</div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <select
              className="select"
              onChange={e => {
                const act = ACTIVITIES.find(a => a.name === e.target.value);
                if (!act) return;
                const minutes = 30;
                const kcalAct = calcActivityKcal(
                  act,
                  minutes,
                  profile.weightKg
                );

                const entry = {
                  id: Date.now(),
                  name: act.name,
                  activity: true,
                  minutes,
                  kcal: kcalAct,
                  meal: "Atividade física",
                  time: new Date().toISOString()
                };

                setItems(prev => [entry, ...prev]);
                addToHistory(entry);
              }}
            >
              <option value="">Selecionar atividade</option>
              {ACTIVITIES.map((a, i) => (
                <option key={i} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>

            <span className="muted small-txt">
              (considera 30 min padrão — ajuste depois se quiser)
            </span>
          </div>
        </div>
      </div>

      <footer className="ft-footer muted">
        Calorie Tracker • Controle calórico avançado • PWA ready
      </footer>
    </div>
  );
}
