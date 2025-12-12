import React, { useEffect, useState } from 'react'

function formatDate(dateString) {
  return new Date(dateString).toLocaleString()
}

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cal_items") || "[]")
    } catch {
      return []
    }
  })

  const [name, setName] = useState("")
  const [kcal, setKcal] = useState("")
  const [portion, setPortion] = useState("")
  const [meal, setMeal] = useState("Almoço")
  const [toast, setToast] = useState(null)
  const [todayFilter, setTodayFilter] = useState(true)

  useEffect(() => {
    localStorage.setItem("cal_items", JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const totalKcal = items.reduce((sum, item) => sum + Number(item.kcal), 0)

  const showToast = (msg) => setToast(msg)

  function addItem() {
    if (!name || !kcal) {
      showToast("Preencha alimento e calorias.")
      return
    }

    const newItem = {
      id: Date.now(),
      name,
      kcal: Number(kcal),
      portion,
      meal,
      time: new Date().toISOString(),
    }

    setItems([newItem, ...items])
    setName("")
    setKcal("")
    setPortion("")
    showToast("Adicionado!")
  }

  function removeItem(id) {
    if (!confirm("Remover este item?")) return

    setItems(items.filter((i) => i.id !== id))
    showToast("Removido.")
  }

  function clearToday() {
    if (!confirm("Apagar todas as entradas de hoje?")) return

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const filtered = items.filter(
      (i) => new Date(i.time).getTime() < start.getTime()
    )

    setItems(filtered)
    showToast("Entradas de hoje apagadas.")
  }

  const filteredItems = todayFilter
    ? items.filter((i) => {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        return new Date(i.time).getTime() >= start.getTime()
      })
    : items

  return (
    <div className="container">

      <header className="header">
        <div>
          <h1>Calorie Tracker</h1>
          <p className="tag">Visual Fitness — Registro Diário</p>
        </div>

        <div className="total-box">
          <span className="num">{totalKcal}</span>
          <span className="unit">kcal</span>
        </div>
      </header>

      <section className="card input-card">
        <div className="row">
          <input
            placeholder="Alimento"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="kcal"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className="row">
          <input
            placeholder="Porção (opcional)"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
          />

          <select value={meal} onChange={(e) => setMeal(e.target.value)}>
            <option>Café da manhã</option>
            <option>Almoço</option>
            <option>Jantar</option>
            <option>Lanche</option>
          </select>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={addItem}>Adicionar</button>
          <button className="btn ghost" onClick={() => { setName(''); setKcal(''); setPortion('') }}>Limpar</button>
          <button className="btn danger" onClick={clearToday}>Limpar Hoje</button>
        </div>
      </section>

      <section className="card list-card">
        <div className="list-header">
          <h2>Entradas {todayFilter ? "(Hoje)" : ""}</h2>
          <button className="btn outline" onClick={() => setTodayFilter(!todayFilter)}>
            {todayFilter ? "Mostrar Todos" : "Mostrar Hoje"}
          </button>
        </div>

        {filteredItems.length === 0 && (
          <p className="empty">Nenhum registro.</p>
        )}

        {filteredItems.map((it) => (
          <div className="entry" key={it.id}>
            <div>
              <div className="food">
                {it.name}
                {it.portion && (
                  <span className="portion"> ({it.portion})</span>
                )}
              </div>
              <div className="meta">
                {it.meal} • {formatDate(it.time)}
              </div>
            </div>

            <div className="right">
              <div className="kcal">{it.kcal} kcal</div>
              <button className="btn small danger" onClick={() => removeItem(it.id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
