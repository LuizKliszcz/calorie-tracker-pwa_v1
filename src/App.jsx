import React, { useEffect, useMemo, useState } from "react";
import { FOODS } from "./foods"; // keep your foods.js in src/

// Simple friendly SVG icons (inline)
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

// format date small
function fmtDate(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal_items") || "[]"); }
    catch { return []; }
  });

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

  // totals
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

  // suggestions (simple)
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

  const DAILY_TARGET = 2500;
  const progress = Math.min(1, totals.kcal / DAILY_TARGET);

  return (
    <div className="ft-app">
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
            <div className="muted">kcal</div>
          </div>
          <div className="stat small">
            <div className="muted">Meta</div>
            <div>{DAILY_TARGET} kcal</div>
          </div>
        </div>
      </header>

      <main className="ft-container">
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
            <div className="meta muted">Meta diária: {DAILY_TARGET} kcal</div>
          </div>

          <div className="card mt16">
            <h3>Quick Actions</h3>
            <div className="qa-grid">
              <button className="btn">Adicionar Refeição</button>
              <button className="btn">Exportar CSV</button>
              <button className="btn">Limpar Hoje</button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="ft-footer muted">Flat Fitness • Modern • Offline-ready</footer>
    </div>
  );
}
