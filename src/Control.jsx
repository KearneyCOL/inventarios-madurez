import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer } from "recharts";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PASSWORD = "kearney2025";

const DIMS = [
  { key: "estrategia",      label: "Estrategia",      num: "01" },
  { key: "caracterizacion", label: "Caracterización", num: "02" },
  { key: "procesos",        label: "Procesos",         num: "03" },
  { key: "roles",           label: "Roles",            num: "04" },
  { key: "herramientas",    label: "Herramientas",     num: "05" },
  { key: "indicadores",     label: "Indicadores",      num: "06" },
  { key: "abastecimiento",  label: "Abastecimiento",   num: "07" },
];

const LEVEL_LABELS = ["", "Básico", "Emergente", "Robusto", "End-to-End", "Pivote"];
const LEVEL_COLORS = ["", "#78716C", "#D97706", "#2563EB", "#7C3AED", "#059669"];

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;font-family:'Outfit',system-ui,sans-serif;}
body{margin:0;background:#F7F5F2;color:#1A1A18;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#D9D5CF;border-radius:99px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp .4s cubic-bezier(.22,1,.36,1) both;}
.fade-up-1{animation:fadeUp .4s .06s cubic-bezier(.22,1,.36,1) both;}
.fade-up-2{animation:fadeUp .4s .12s cubic-bezier(.22,1,.36,1) both;}
.fade-up-3{animation:fadeUp .4s .18s cubic-bezier(.22,1,.36,1) both;}
.fade-up-4{animation:fadeUp .4s .24s cubic-bezier(.22,1,.36,1) both;}
.spin{animation:spin .8s linear infinite;}
.row-hover{transition:background .12s;cursor:pointer;}
.row-hover:hover{background:rgba(232,37,31,0.04)!important;}
.btn-action{transition:all .15s cubic-bezier(.22,1,.36,1);}
.btn-action:hover{transform:translateY(-1px);opacity:.88;}
.nav-item{transition:all .15s;cursor:pointer;border-radius:10px;}
.nav-item:hover{background:rgba(232,37,31,0.07)!important;}
.nav-item.active{background:rgba(232,37,31,0.12)!important;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getLevelLabel(v) { return LEVEL_LABELS[Math.round(v)] || "—"; }
function getLevelColor(v) { return LEVEL_COLORS[Math.round(v)] || "#78716C"; }
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ScoreBadge({ v, sm }) {
  if (!v) return <span style={{ color: "#444", fontSize: sm ? 11 : 13 }}>—</span>;
  const c = getLevelColor(v);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: sm ? "2px 7px" : "3px 10px", borderRadius: 99,
      background: c + "18", border: `1px solid ${c}40`,
      fontSize: sm ? 10 : 12, fontWeight: 700, color: c,
    }}>
      <span style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: "50%", background: c }} />
      {parseFloat(v).toFixed(1)}
    </span>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  function attempt() {
    if (pw === PASSWORD) onLogin();
    else setErr(true);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "#F7F5F2",
    }}>
      <div className="fade-up" style={{
        width: 360, padding: "48px 40px",
        background: "#FFFFFF", borderRadius: 20,
        border: "1px solid #E8E4DF",
        boxShadow: "0 40px 100px rgba(0,0,0,0.08)",
      }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
            background: "linear-gradient(135deg,#E8251F,#B91A15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 8px 24px rgba(232,37,31,0.25)",
          }}>🛡️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A18" }}>Admin Panel</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Kearney · Inventarios Madurez</div>
        </div>

        <input
          type="password" placeholder="Contraseña"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10, marginBottom: 8,
            background: "#F7F5F2", border: `1.5px solid ${err ? "#E8251F" : "#E8E4DF"}`,
            color: "#1A1A18", fontSize: 14, outline: "none",
          }}
        />
        {err && <div style={{ fontSize: 11, color: "#E8251F", marginBottom: 12 }}>Contraseña incorrecta</div>}

        <button onClick={attempt} className="btn-action" style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg,#E8251F,#B91A15)",
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(232,37,31,0.25)",
        }}>Entrar →</button>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay }) {
  return (
    <div className={`fade-up-${delay}`} style={{
      background: "#FFFFFF", borderRadius: 16, padding: "22px 24px",
      border: "1px solid #E8E4DF",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: color || "#1A1A18", letterSpacing: "-.02em", lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, fontSize: 18,
          background: (color || "#E8251F") + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ evaluacion, respuestas, onClose }) {
  const resps = respuestas.filter(r => r.evaluacion_id === evaluacion.id);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)", padding: 24,
    }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 680, maxHeight: "85vh",
        background: "#FFFFFF", borderRadius: 20,
        border: "1px solid #E8E4DF",
        boxShadow: "0 40px 80px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 28px", borderBottom: "1px solid #F0EDE9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A18" }}>
              {evaluacion.direccion || "Sin dirección"}
              {evaluacion.rol ? <span style={{ color: "#AAA", fontWeight: 500 }}> · {evaluacion.rol}</span> : ""}
            </div>
            <div style={{ fontSize: 11, color: "#BBB", marginTop: 3 }}>
              {formatDate(evaluacion.created_at)} · {resps.length} respuestas
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreBadge v={evaluacion.score_global} />
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #E8E4DF",
              background: "#F7F5F2", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        {/* Scores por dimensión */}
        <div style={{
          padding: "16px 28px", borderBottom: "1px solid #F0EDE9",
          display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0,
        }}>
          {DIMS.map(d => (
            <div key={d.key} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 8,
              background: "#F7F5F2", border: "1px solid #E8E4DF",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#BBB" }}>{d.num}</span>
              <span style={{ fontSize: 11, color: "#888" }}>{d.label}</span>
              <ScoreBadge v={evaluacion[`score_${d.key}`]} sm />
            </div>
          ))}
        </div>

        {/* Respuestas por dimensión */}
        <div style={{ overflow: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
          {DIMS.map(d => {
            const dimResps = resps.filter(r => r.dimension_key === d.key);
            if (dimResps.length === 0) return null;
            return (
              <div key={d.key}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#E8251F",
                  textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {d.num} · {d.label}
                  <ScoreBadge v={evaluacion[`score_${d.key}`]} sm />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {dimResps.map(r => {
                    const c = getLevelColor(r.valor);
                    return (
                      <div key={r.subdimension_id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 14px", borderRadius: 10,
                        background: "#F7F5F2", border: "1px solid #EEEBE6",
                      }}>
                        <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>
                          {r.subdimension_id}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 80, height: 5, borderRadius: 99,
                            background: "#E8E4DF", overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", width: `${(r.valor / 5) * 100}%`,
                              background: c, borderRadius: 99,
                            }} />
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: c,
                            background: c + "18", padding: "2px 8px", borderRadius: 99,
                            border: `1px solid ${c}30`,
                          }}>{r.valor} · {getLevelLabel(r.valor)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {resps.length === 0 && (
            <div style={{ textAlign: "center", color: "#AAA", fontSize: 13, padding: "32px 0" }}>
              Esta evaluación no tiene respuestas registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MONITOR TAB ──────────────────────────────────────────────────────────────
function MonitorTab({ evaluaciones, respuestas, selected, setSelected, onDelete, loading }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [detail, setDetail] = useState(null);

  const avgScore = evaluaciones.length
    ? (evaluaciones.reduce((a, e) => a + (e.score_global || 0), 0) / evaluaciones.length).toFixed(2)
    : null;

  const completas = evaluaciones.filter(e =>
    respuestas.filter(r => r.evaluacion_id === e.id).length === 35
  ).length;

  const filtered = evaluaciones
    .filter(e => {
      const q = search.toLowerCase();
      return !q || (e.direccion || "").toLowerCase().includes(q) || (e.rol || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === "string") { va = va?.toLowerCase(); vb = vb?.toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 3, opacity: sortBy === col ? 1 : 0.3, fontSize: 9 }}>
      {sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const COL = "36px 1fr 1fr 80px 55px 55px 55px 55px 55px 55px 110px 36px 36px";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard icon="📋" label="Total evaluaciones" value={evaluaciones.length} delay={1} />
        <StatCard icon="⭐" label="Score promedio" value={avgScore || "—"} color="#D97706" delay={2} />
        <StatCard icon="📊" label="Respuestas totales" value={respuestas.length} color="#2563EB" delay={3} />
        <StatCard icon="✅" label="Completas (35 resp)" value={completas} color="#059669" delay={4} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          placeholder="Buscar por dirección o rol..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            background: "#FFFFFF", border: "1px solid #E8E4DF",
            color: "#1A1A18", fontSize: 13, outline: "none",
          }}
        />
        {selected.length > 0 && (
          <button onClick={() => onDelete(selected)} className="btn-action" style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid #E8251F40",
            background: "#E8251F18", color: "#E8251F",
            fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>🗑 Eliminar ({selected.length})</button>
        )}
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E8E4DF", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: COL, padding: "12px 20px",
          background: "#FBF9F7", borderBottom: "1px solid #E8E4DF", gap: 8, alignItems: "center" }}>
          <input type="checkbox"
            checked={selected.length === filtered.length && filtered.length > 0}
            onChange={() => selected.length === filtered.length ? setSelected([]) : setSelected(filtered.map(e => e.id))}
            style={{ cursor: "pointer" }}
          />
          {[{l:"Dirección",c:"direccion"},{l:"Rol",c:"rol"},{l:"Global",c:"score_global"}].map(h => (
            <div key={h.c} onClick={() => toggleSort(h.c)}
              style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase",
                letterSpacing: ".1em", cursor: "pointer", userSelect: "none" }}>
              {h.l}<SortIcon col={h.c} />
            </div>
          ))}
          {DIMS.map(d => (
            <div key={d.key} style={{ fontSize: 9, fontWeight: 700, color: "#BBB",
              textTransform: "uppercase", letterSpacing: ".06em" }}>{d.num}</div>
          ))}
          <div onClick={() => toggleSort("created_at")}
            style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase",
              letterSpacing: ".1em", cursor: "pointer", userSelect: "none" }}>
            Fecha<SortIcon col="created_at" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999" }}></div>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div className="spin" style={{ display: "inline-block", width: 22, height: 22,
              border: "2px solid #333", borderTopColor: "#E8251F", borderRadius: "50%" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#555", fontSize: 13 }}>
            No hay evaluaciones aún
          </div>
        ) : filtered.map((e, i) => (
          <div key={e.id} className="row-hover"
            style={{
              display: "grid", gridTemplateColumns: COL,
              padding: "13px 20px", gap: 8, alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid #F0EDE9" : "none",
              background: selected.includes(e.id) ? "rgba(232,37,31,0.04)" : "transparent",
              cursor: "default",
            }}>
            <input type="checkbox" checked={selected.includes(e.id)}
              onChange={() => setSelected(s => s.includes(e.id) ? s.filter(x => x !== e.id) : [...s, e.id])}
              style={{ cursor: "pointer" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.direccion || <span style={{ color: "#CCC" }}>Sin dirección</span>}
            </div>
            <div style={{ fontSize: 12, color: "#888", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.rol || <span style={{ color: "#CCC" }}>Sin rol</span>}
            </div>
            <ScoreBadge v={e.score_global} />
            {DIMS.map(d => <ScoreBadge key={d.key} v={e[`score_${d.key}`]} sm />)}
            <div style={{ fontSize: 11, color: "#AAA" }}>{formatDate(e.created_at)}</div>
            <button
              onClick={() => onDelete([e.id])}
              className="btn-action"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #E8251F30",
                background: "#E8251F10", color: "#E8251F", fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              title="Eliminar"
            >🗑</button>
            <button
              onClick={() => setDetail(e)}
              className="btn-action"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #2563EB30",
                background: "#2563EB10", color: "#2563EB", fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              title="Ver respuestas"
            >👁</button>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#444" }}>
          {filtered.length} evaluaciones · {selected.length} seleccionadas
        </div>
      )}

      {detail && (
        <DetailModal
          evaluacion={detail}
          respuestas={respuestas}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsTab({ evaluaciones }) {
  const [filterDir, setFilterDir] = useState("Todas");
  const DIRS = ["Todas", ...Array.from(new Set(evaluaciones.map(e => e.direccion).filter(Boolean)))];

  const filtered = filterDir === "Todas" ? evaluaciones : evaluaciones.filter(e => e.direccion === filterDir);

  // Score distribution
  const distData = [1,2,3,4,5].map(v => ({
    name: ["Básico","Emergente","Robusto","E2E","Pivote"][v-1],
    count: filtered.filter(e => Math.round(e.score_global) === v).length,
    color: ["#78716C","#D97706","#2563EB","#7C3AED","#059669"][v-1],
  }));

  // Avg score by dimension
  const dimData = DIMS.map(d => {
    const vals = filtered.map(e => e[`score_${d.key}`]).filter(Boolean);
    const avg = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : 0;
    return { name: d.num+" "+d.label.slice(0,10), avg, color: avg>=4?"#059669":avg>=3?"#2563EB":avg>=2?"#D97706":"#E8251F" };
  });

  // Heatmap by direccion x dim
  const allDirs = Array.from(new Set(evaluaciones.map(e => e.direccion).filter(Boolean)));
  const heatmap = allDirs.map(dir => {
    const evals = evaluaciones.filter(e => e.direccion === dir);
    const row = { dir, count: evals.length };
    DIMS.forEach(d => {
      const vals = evals.map(e => e[`score_${d.key}`]).filter(Boolean);
      row[d.key] = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)) : null;
    });
    return row;
  });

  const heatColor = (v) => {
    if (!v) return "#F3F2F0";
    if (v >= 4) return "#05966920";
    if (v >= 3) return "#2563EB20";
    if (v >= 2) return "#D9770620";
    return "#E8251F20";
  };
  const heatText = (v) => {
    if (!v) return "#BBB";
    if (v >= 4) return "#059669";
    if (v >= 3) return "#2563EB";
    if (v >= 2) return "#D97706";
    return "#E8251F";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {DIRS.map(d => (
          <button key={d} onClick={() => setFilterDir(d)} style={{
            padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1.5px solid ${filterDir===d?"#E8251F":"#E8E4DF"}`,
            background: filterDir===d?"#E8251F18":"#FFFFFF",
            color: filterDir===d?"#E8251F":"#999",
          }}>{d}</button>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Distribution */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E8E4DF", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#BBB", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
            Distribución por Nivel Global
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#AAA" }} />
              <YAxis tick={{ fontSize: 9, fill: "#AAA" }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, "Evaluaciones"]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" radius={[6,6,0,0]}>
                {distData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg by dimension */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E8E4DF", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#BBB", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
            Score Promedio por Dimensión
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dimData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EDE9" />
              <XAxis type="number" domain={[0,5]} tick={{ fontSize: 9, fill: "#AAA" }} tickCount={6} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 8.5, fill: "#888" }} width={80} />
              <Tooltip formatter={(v) => [v+" / 5", "Score"]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="avg" radius={[0,6,6,0]} barSize={12}>
                {dimData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      {heatmap.length > 0 && (
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E8E4DF", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#BBB", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
            Heatmap por Dirección × Dimensión
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#BBB", fontWeight: 600, fontSize: 10 }}>Dirección</th>
                  <th style={{ padding: "4px 8px", color: "#BBB", fontWeight: 600, fontSize: 10 }}>N</th>
                  {DIMS.map(d => <th key={d.key} style={{ padding: "4px 6px", color: "#BBB", fontWeight: 600, fontSize: 9, textAlign: "center" }}>{d.num}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => (
                  <tr key={row.dir}>
                    <td style={{ padding: "5px 8px", fontWeight: 600, color: "#1A1A18", fontSize: 12, whiteSpace: "nowrap" }}>{row.dir}</td>
                    <td style={{ padding: "5px 8px", color: "#AAA", fontSize: 11, textAlign: "center" }}>{row.count}</td>
                    {DIMS.map(d => (
                      <td key={d.key} style={{
                        padding: "5px 8px", textAlign: "center", borderRadius: 8,
                        background: heatColor(row[d.key]),
                        color: heatText(row[d.key]),
                        fontWeight: 700, fontSize: 12, minWidth: 38,
                      }}>{row[d.key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── LINKS TAB ────────────────────────────────────────────────────────────────
function LinksTab() {
  const [links, setLinks] = useState([]);
  const [copied, setCopied] = useState(null);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const BASE = window.location.origin.includes("admin")
    ? window.location.origin.replace("admin.", "")
    : "https://inventarios-madurez.vercel.app";

  useEffect(() => {
    supabase.from("links").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setLinks(data || []); setLoadingLinks(false); });
  }, []);

  async function generate() {
    const id = Math.random().toString(36).slice(2, 10).toUpperCase();
    const newLink = { id, url: `${BASE}?ref=${id}`, created_at: new Date().toISOString() };
    const { data } = await supabase.from("links").insert([{ id, url: newLink.url }]).select();
    setLinks(l => [data?.[0] || newLink, ...l]);
  }

  async function deleteLink(id) {
    await supabase.from("links").delete().eq("id", id);
    setLinks(l => l.filter(x => x.id !== id));
  }

  function copy(url, id) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#E8251F" }}>Links de acceso</div>
          <div style={{ fontSize: 12, color: "#AAA", marginTop: 3 }}>Genera links únicos para compartir la evaluación</div>
        </div>
        <button onClick={generate} className="btn-action" style={{
          padding: "11px 22px", borderRadius: 11, border: "none",
          background: "linear-gradient(135deg,#E8251F,#B91A15)",
          color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(232,37,31,0.35)",
        }}>+ Generar link</button>
      </div>

      <div style={{ padding: "16px 20px", borderRadius: 12, background: "#FFFFFF",
        border: "1px solid #E8E4DF", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>🌐</span>
        <div>
          <div style={{ fontSize: 10, color: "#BBB", fontWeight: 700, marginBottom: 2 }}>URL BASE</div>
          <div style={{ fontSize: 13, color: "#999", fontFamily: "monospace" }}>{BASE}</div>
        </div>
      </div>

      {links.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", background: "#FFFFFF",
          borderRadius: 16, border: "1px dashed #E8E4DF" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 14, color: "#AAA" }}>No hay links generados aún</div>
          <div style={{ fontSize: 12, color: "#CCC", marginTop: 4 }}>Haz click en "Generar link" para crear uno</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {links.map(link => (
            <div key={link.id} className="fade-up" style={{
              padding: "18px 20px", borderRadius: 14,
              background: "#FFFFFF", border: "1px solid #E8E4DF",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: "#E8251F18", border: "1px solid #E8251F30",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#E8251F",
                    background: "#E8251F18", padding: "2px 8px", borderRadius: 99 }}>
                    REF: {link.id}
                  </span>
                  <span style={{ fontSize: 10, color: "#BBB" }}>{formatDate(link.created_at || link.created)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#AAA", fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.url}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => copy(link.url, link.id)} className="btn-action" style={{
                  padding: "8px 16px", borderRadius: 9, border: "1px solid #E8E4DF",
                  background: copied === link.id ? "#059669" : "#F7F5F2",
                  color: copied === link.id ? "#fff" : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s",
                }}>{copied === link.id ? "✓ Copiado" : "📋 Copiar"}</button>
                <button onClick={() => deleteLink(link.id)}
                  className="btn-action" style={{
                    padding: "8px 12px", borderRadius: 9, border: "1px solid #E8251F30",
                    background: "#E8251F10", color: "#E8251F", fontSize: 12, cursor: "pointer",
                  }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DOWNLOADS TAB ────────────────────────────────────────────────────────────
function DownloadsTab({ evaluaciones, respuestas }) {
  const [downloading, setDownloading] = useState(null);
  const [filterDir, setFilterDir] = useState("Todas");
  const [filterRol, setFilterRol] = useState("Todos");

  const DIRS = ["Todas", ...Array.from(new Set(evaluaciones.map(e => e.direccion).filter(Boolean)))];
  const ROLES = ["Todos", ...Array.from(new Set(evaluaciones.map(e => e.rol).filter(Boolean)))];

  const filtered = evaluaciones.filter(e =>
    (filterDir === "Todas" || e.direccion === filterDir) &&
    (filterRol === "Todos"  || e.rol      === filterRol)
  );

  function dlAgregado() {
    const evaluaciones = filtered;
    setDownloading("all");
    setTimeout(() => {
      const rows = evaluaciones.map(e => ({
        "ID": e.id, "Dirección": e.direccion || "", "Rol": e.rol || "",
        "Fecha": formatDate(e.created_at),
        "Score Global": e.score_global || "", "Nivel Global": getLevelLabel(e.score_global),
        ...Object.fromEntries(DIMS.map(d => [`${d.num} ${d.label}`, e[`score_${d.key}`] || ""])),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch:36 },{wch:20},{wch:20},{wch:18},{wch:22},{wch:14},{wch:14},...Array(7).fill({wch:16})];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");

      const ws2 = XLSX.utils.json_to_sheet(respuestas.map(r => ({
        "Evaluacion ID": r.evaluacion_id, "Sub-dimensión": r.subdimension_id,
        "Dimensión": r.dimension_key, "Valor": r.valor, "Nivel": getLevelLabel(r.valor),
        "Fecha": formatDate(r.created_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws2, "Respuestas Detalle");
      XLSX.writeFile(wb, `Inventarios_Madurez_${new Date().toISOString().slice(0,10)}.xlsx`);
      setDownloading(null);
    }, 600);
  }

  function dlIndividual(e) {
    setDownloading(e.id);
    setTimeout(() => {
      const resps = respuestas.filter(r => r.evaluacion_id === e.id);
      const ws1 = XLSX.utils.json_to_sheet([
        { Campo: "ID", Valor: e.id },
        { Campo: "Dirección", Valor: e.direccion || "" },
        { Campo: "Rol", Valor: e.rol || "" },
        { Campo: "Fecha", Valor: formatDate(e.created_at) },
        { Campo: "Score Global", Valor: e.score_global || "" },
        { Campo: "Nivel Global", Valor: getLevelLabel(e.score_global) },
        ...DIMS.map(d => ({ Campo: `Score ${d.label}`, Valor: e[`score_${d.key}`] || "" })),
      ]);
      ws1["!cols"] = [{ wch: 22 }, { wch: 36 }];
      const ws2 = XLSX.utils.json_to_sheet(resps.map(r => ({
        "Sub-dimensión": r.subdimension_id, "Dimensión": r.dimension_key,
        "Valor": r.valor, "Nivel": getLevelLabel(r.valor),
      })));
      ws2["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
      XLSX.utils.book_append_sheet(wb, ws2, "Respuestas");
      const nombre = (e.direccion || e.rol || e.id.slice(0, 8)).replace(/\s+/g, "_");
      XLSX.writeFile(wb, `Eval_${nombre}_${new Date().toISOString().slice(0,10)}.xlsx`);
      setDownloading(null);
    }, 400);
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#BBB", textTransform: "uppercase", letterSpacing: ".08em" }}>Filtrar:</div>
        <select value={filterDir} onChange={e => setFilterDir(e.target.value)} style={{
          padding: "7px 12px", borderRadius: 9, border: "1px solid #E8E4DF",
          background: "#FFFFFF", fontSize: 12, color: "#1A1A18", cursor: "pointer",
        }}>
          {DIRS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterRol} onChange={e => setFilterRol(e.target.value)} style={{
          padding: "7px 12px", borderRadius: 9, border: "1px solid #E8E4DF",
          background: "#FFFFFF", fontSize: 12, color: "#1A1A18", cursor: "pointer",
        }}>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        {(filterDir !== "Todas" || filterRol !== "Todos") && (
          <span style={{ fontSize: 11, color: "#E8251F", fontWeight: 600 }}>{filtered.length} evaluaciones filtradas</span>
        )}
      </div>

      {/* Agregado */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #E8E4DF", borderRadius: 18,
        padding: "28px 32px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#E8251F", marginBottom: 6 }}>📦 Descarga agregada</div>
          <div style={{ fontSize: 12, color: "#AAA", lineHeight: 1.7 }}>
            Todas las evaluaciones en un Excel con dos hojas:<br/>
            <span style={{ color: "#888" }}>Evaluaciones (resumen) + Respuestas Detalle</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#059669", background: "#05966918", padding: "3px 10px",
              borderRadius: 99, border: "1px solid #05966930" }}>{filtered.length} evaluaciones</span>
            <span style={{ fontSize: 11, color: "#2563EB", background: "#2563EB18", padding: "3px 10px",
              borderRadius: 99, border: "1px solid #2563EB30" }}>{respuestas.length} respuestas</span>
          </div>
        </div>
        <button onClick={dlAgregado} className="btn-action" disabled={filtered.length === 0} style={{
          padding: "13px 26px", borderRadius: 12, border: "none", whiteSpace: "nowrap",
          background: filtered.length === 0 ? "#2A2A28" : "linear-gradient(135deg,#059669,#047857)",
          color: evaluaciones.length === 0 ? "#444" : "#fff",
          fontWeight: 700, fontSize: 13, cursor: filtered.length === 0 ? "not-allowed" : "pointer",
          boxShadow: filtered.length === 0 ? "none" : "0 4px 14px rgba(5,150,105,0.35)",
        }}>{downloading === "all" ? "⏳ Generando..." : "⬇ Descargar Excel"}</button>
      </div>

      {/* Individuales */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#BBB", textTransform: "uppercase",
        letterSpacing: ".1em", marginBottom: 14 }}>Descargas individuales</div>

      {filtered.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#AAA", fontSize: 13,
          background: "#FFFFFF", borderRadius: 16, border: "1px dashed #E8E4DF" }}>
          No hay evaluaciones para descargar
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(e => (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px", borderRadius: 12,
              background: "#FFFFFF", border: "1px solid #E8E4DF",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                background: "#2563EB18", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.direccion || "Sin dirección"}{e.rol ? ` · ${e.rol}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                  <ScoreBadge v={e.score_global} sm />
                  <span style={{ fontSize: 11, color: "#BBB" }}>
                    {respuestas.filter(r => r.evaluacion_id === e.id).length}/35 resp.
                  </span>
                  <span style={{ fontSize: 11, color: "#BBB" }}>{formatDate(e.created_at)}</span>
                </div>
              </div>
              <button onClick={() => dlIndividual(e)} className="btn-action" style={{
                padding: "8px 16px", borderRadius: 9, border: "1px solid #2563EB40",
                background: "#2563EB18", color: "#2563EB",
                fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>{downloading === e.id ? "⏳..." : "⬇ Excel"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ count, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)",
    }}>
      <div className="fade-up" style={{
        width: 360, background: "#FFFFFF", borderRadius: 18,
        border: "1px solid #E8E4DF", padding: "32px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.12)",
      }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 16 }}>🗑️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A18", textAlign: "center", marginBottom: 8 }}>
          ¿Eliminar {count} evaluación{count > 1 ? "es" : ""}?
        </div>
        <div style={{ fontSize: 12, color: "#AAA", textAlign: "center", marginBottom: 28, lineHeight: 1.7 }}>
          Esta acción no se puede deshacer. Se eliminarán también todas las respuestas asociadas.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} className="btn-action" style={{
            flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E8E4DF",
            background: "#F7F5F2", color: "#999", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={onConfirm} className="btn-action" style={{
            flex: 1, padding: "11px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#E8251F,#B91A15)",
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ControlApp() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("monitor");
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: evals }, { data: resps }] = await Promise.all([
      supabase.from("evaluaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("respuestas").select("*"),
    ]);
    setEvaluaciones(evals || []);
    setRespuestas(resps || []);
    setLoading(false);
  }

  useEffect(() => { if (authed) fetchData(); }, [authed]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function doDelete() {
    const ids = confirmDelete;
    setConfirmDelete(null);
    try {
      console.log("🗑 Intentando borrar ids:", ids);

      const res1 = await supabase.from("respuestas").delete().in("evaluacion_id", ids);
      console.log("Borrar respuestas →", res1);
      if (res1.error) { showToast("Error respuestas: " + res1.error.message, "error"); return; }

      const res2 = await supabase.from("evaluaciones").delete().in("id", ids);
      console.log("Borrar evaluaciones →", res2);
      if (res2.error) { showToast("Error evaluaciones: " + res2.error.message, "error"); return; }

      // Verificar que realmente se borraron
      const { data: check } = await supabase.from("evaluaciones").select("id").in("id", ids);
      console.log("Registros que siguen existiendo:", check);
      if (check && check.length > 0) {
        showToast("No se pudieron borrar (verifica permisos RLS en Supabase)", "error");
        await fetchData();
        return;
      }

      setSelected([]);
      await fetchData();
      showToast(`${ids.length} evaluación${ids.length > 1 ? "es" : ""} eliminada${ids.length > 1 ? "s" : ""}`);
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const TABS = [
    { id: "monitor",   icon: "📊", label: "Monitoreo" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "links",     icon: "🔗", label: "Links" },
    { id: "downloads", icon: "⬇",  label: "Descargas" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#F7F5F2" }}>

      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: "#FFFFFF",
        borderRight: "1px solid #E8E4DF",
        display: "flex", flexDirection: "column", padding: "24px 16px",
      }}>
        <div style={{ marginBottom: 32, padding: "0 8px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8251F" }}>⚡ Admin Panel</div>
          <div style={{ fontSize: 10, color: "#BBB", marginTop: 2 }}>Kearney · Inventarios</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                color: tab === t.id ? "#E8251F" : "#999",
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </div>
          ))}
        </div>

        <button onClick={fetchData} className="btn-action" style={{
          padding: "12px 12px", borderRadius: 10, border: "none",
          background: loading ? "#D1D0CB" : "linear-gradient(135deg,#E8251F,#B91A15)",
          color: "#fff", fontSize: 13,
          fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: loading ? "none" : "0 4px 14px rgba(232,37,31,0.35)",
        }}>
          <span className={loading ? "spin" : ""} style={{ display: "inline-block", fontSize: 15 }}>🔄</span>
          {loading ? "Cargando..." : "Actualizar datos"}
        </button>

        <button onClick={() => setAuthed(false)} className="btn-action" style={{
          marginTop: 8, padding: "10px 12px", borderRadius: 10,
          border: "1px solid #E8E4DF", background: "transparent",
          color: "#BBB", fontSize: 12, cursor: "pointer",
        }}>🚪 Cerrar sesión</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#E8251F", letterSpacing: "-.02em" }}>
            {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
          </div>
          <div style={{ fontSize: 12, color: "#AAA", marginTop: 3 }}>
            {tab === "monitor" && "Vista general de todas las evaluaciones registradas"}
            {tab === "links" && "Genera y gestiona links de acceso al diagnóstico"}
            {tab === "analytics" && "Visualizaciones y comparativas por dirección"}
            {tab === "downloads" && "Descarga evaluaciones en formato Excel"}
          </div>
        </div>

        {tab === "monitor" && (
          <MonitorTab
            evaluaciones={evaluaciones} respuestas={respuestas}
            selected={selected} setSelected={setSelected}
            onDelete={ids => setConfirmDelete(ids)} loading={loading}
          />
        )}
        {tab === "analytics" && <AnalyticsTab evaluaciones={evaluaciones} />}
        {tab === "links" && <LinksTab />}
        {tab === "downloads" && <DownloadsTab evaluaciones={evaluaciones} respuestas={respuestas} />}
      </div>

      {confirmDelete && (
        <ConfirmModal count={confirmDelete.length} onConfirm={doDelete} onCancel={() => setConfirmDelete(null)} />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          padding: "12px 20px", borderRadius: 12,
          background: toast.type === "error" ? "#E8251F" : "#059669",
          color: "#fff", fontWeight: 600, fontSize: 13,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          animation: "fadeIn .3s ease",
        }}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}
    </div>
  );
}
