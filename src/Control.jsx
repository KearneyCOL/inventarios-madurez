import React, { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
// XLSX loaded dynamically to avoid chunk initialization conflict
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";

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

const LEVEL_LABELS = ["", "Básico", "Emergente", "Robusto", "Avanzado", "Líder"];
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
.row-hover:hover{background:rgba(120,35,220,0.04)!important;}
.btn-action{transition:all .15s cubic-bezier(.22,1,.36,1);}
.btn-action:hover{transform:translateY(-1px);opacity:.88;}
.nav-item{transition:all .15s;cursor:pointer;border-radius:10px;}
.nav-item:hover{background:rgba(120,35,220,0.07)!important;}
.nav-item.active{background:rgba(120,35,220,0.12)!important;}
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

function ScoreBadge({ v, sm, pct }) {
  if (!v && pct != null) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      padding: sm?"2px 6px":"3px 9px", borderRadius:99,
      background:"#F3F2F0", fontSize: sm?10:12, color:"#888", fontWeight:600 }}>
      {pct}%
    </span>
  );
  if (!v) return <span style={{ color: "#CCC", fontSize: sm ? 11 : 13 }}>—</span>;
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
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzIiIGZpbGw9Im5vbmUiPjx0ZXh0IHg9IjUwJSIgeT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSInR2lsbCBTYW5zJywnVHJlYnVjaGV0IE1TJywnSGVsdmV0aWNhIE5ldWUnLEhlbHZldGljYSxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmb250LXdlaWdodD0iNTAwIiBmaWxsPSIjMUUxRTFFIiBsZXR0ZXItc3BhY2luZz0iNCI+S0VBUk5FWTwvdGV4dD48L3N2Zz4=" alt="Kearney" style={{ height:28, display:"block", margin:"0 auto 12px", maxWidth:"100%" }}/>
          <div style={{ fontSize:11, fontWeight:700, color:"#7823DC", letterSpacing:".12em", textTransform:"uppercase", textAlign:"center" }}>Inventarios · Admin</div>
        </div>

        <input
          type="password" placeholder="Contraseña"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10, marginBottom: 8,
            background: "#F7F5F2", border: `1.5px solid ${err ? "#7823DC" : "#E8E4DF"}`,
            color: "#1A1A18", fontSize: 14, outline: "none",
          }}
        />
        {err && <div style={{ fontSize: 11, color: "#7823DC", marginBottom: 12 }}>Contraseña incorrecta</div>}

        <button onClick={attempt} className="btn-action" style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg,#7823DC,#5A1AA0)",
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(120,35,220,0.25)",
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
          background: (color || "#7823DC") + "18",
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
                  fontSize: 11, fontWeight: 700, color: "#7823DC",
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
function MonitorTab({ evaluaciones, respuestas, empresas=[], selected, setSelected, onDelete, loading }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [detail, setDetail] = useState(null);

  // Calcular score efectivo desde respuestas si score_global es null
  const effectiveScore = (e) => {
    if (e.score_global) return e.score_global;
    const eResps = respuestas.filter(r => r.evaluacion_id === e.id);
    if (!eResps.length) return null;
    const dimScores = DIMS.map(d => {
      const vals = eResps.filter(r => r.dimension_key === d.key).map(r => r.valor).filter(Boolean);
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    }).filter(Boolean);
    return dimScores.length ? dimScores.reduce((a,b)=>a+b,0)/dimScores.length : null;
  };

  const scores = evaluaciones.map(effectiveScore).filter(Boolean);
  const avgScore = scores.length
    ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2)
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

  const COL = "36px 120px 1fr 1fr 80px 55px 55px 55px 55px 55px 55px 110px 36px 36px";

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
            padding: "10px 18px", borderRadius: 10, border: "1px solid #7823DC40",
            background: "#7823DC18", color: "#7823DC",
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
          <div style={{ fontSize:9.5, fontWeight:700, color:"#CCC", padding:"4px 8px" }}>Empresa</div>
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
        {loading && filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div className="spin" style={{ display: "inline-block", width: 22, height: 22,
              border: "2px solid #333", borderTopColor: "#7823DC", borderRadius: "50%" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#AAA", fontSize: 13 }}>
            {search ? "Sin resultados para esa búsqueda" : "No hay evaluaciones aún"}
          </div>
        ) : filtered.map((e, i) => (
          <div key={e.id} className="row-hover"
            style={{
              display: "grid", gridTemplateColumns: COL,
              padding: "13px 20px", gap: 8, alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid #F0EDE9" : "none",
              background: selected.includes(e.id) ? "rgba(120,35,220,0.04)" : "transparent",
              cursor: "default",
            }}>
            <input type="checkbox" checked={selected.includes(e.id)}
              onChange={() => setSelected(s => s.includes(e.id) ? s.filter(x => x !== e.id) : [...s, e.id])}
              style={{ cursor: "pointer" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7823DC",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              background: "#F0E8FF", borderRadius: 6, padding: "3px 7px" }}>
              {empresas.find(emp=>emp.id===e.empresa_id)?.nombre || <span style={{color:"#CCC"}}>—</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.direccion || <span style={{ color: "#CCC" }}>Sin dirección</span>}
            </div>
            <div style={{ fontSize: 12, color: "#888", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.rol || <span style={{ color: "#CCC" }}>Sin rol</span>}
            </div>
            {(() => {
              const eResps = respuestas.filter(r => r.evaluacion_id === e.id);
              const pct = e.score_global ? null : Math.round((eResps.length / 35) * 100);
              const dimScores = DIMS_META.reduce((acc, d) => {
                const vals = eResps.filter(r => r.dimension_key === d.key);
                acc[d.key] = vals.length > 0
                  ? parseFloat((vals.reduce((s,r)=>s+r.valor,0)/vals.length).toFixed(2)) : null;
                return acc;
              }, {});
              const globalScore = e.score_global ||
                (Object.values(dimScores).filter(Boolean).length > 0
                  ? parseFloat((Object.values(dimScores).filter(Boolean).reduce((a,b)=>a+b,0)/Object.values(dimScores).filter(Boolean).length).toFixed(2))
                  : null);
              return (<>
                <div style={{textAlign:"center"}}>
                  {globalScore
                    ? <ScoreBadge v={globalScore}/>
                    : pct > 0
                      ? <span style={{fontSize:11,fontWeight:700,color:"#7823DC",background:"#F0E8FF",padding:"2px 7px",borderRadius:99}}>{pct}%</span>
                      : <span style={{color:"#CCC"}}>—</span>
                  }
                </div>
                {DIMS_META.map(d => {
                  const v = e[`score_${d.key}`] || dimScores[d.key];
                  return (
                    <div key={d.key} style={{textAlign:"center"}}>
                      {v ? <ScoreBadge v={v} sm/> : <span style={{color:"#CCC",fontSize:11}}>—</span>}
                    </div>
                  );
                })}
              </>);
            })()}
            <div style={{ fontSize: 11, color: "#AAA" }}>
              {formatDate(e.created_at)}
              {!e.score_global && (() => {
                const n = respuestas.filter(r => r.evaluacion_id === e.id).length;
                return n > 0 ? (
                  <div style={{ marginTop:3, height:3, borderRadius:99, background:"#E8E4DF", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.round(n/35*100)}%`, background:"#7823DC", borderRadius:99 }}/>
                  </div>
                ) : null;
              })()}
            </div>
            <button
              onClick={() => onDelete([e.id])}
              className="btn-action"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #7823DC30",
                background: "#7823DC10", color: "#7823DC", fontSize: 14,
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

// ─── SHARED DIMS META (with icons + sub-dimension labels for gaps) ────────────
const DIMS_META = [
  { key:"estrategia",      label:"Estrategia de Gestión",   num:"01", icon:"🎯",
    subs:["Objetivos & trade-offs","Políticas por canal","Diseño de red","Gobernanza S&OP","Riesgos y resiliencia"] },
  { key:"caracterizacion", label:"Caracterización",          num:"02", icon:"🏷️",
    subs:["Segmentación ABC/XYZ","Atributos & trazabilidad","Ciclo de vida y SLOB","Ubicación y propiedad","Retornos y condición"] },
  { key:"procesos",        label:"Procesos",                 num:"03", icon:"⚙️",
    subs:["Planeación & reposición","Asignación omnicanal","Ejecución física","Control & exactitud","Excepciones y retornos"] },
  { key:"roles",           label:"Roles y Responsabilidades",num:"04", icon:"👥",
    subs:["Modelo operativo & RACI","Interfaces clave","Gestión de terceros","Capacidades y formación","Incentivos & accountability"] },
  { key:"herramientas",    label:"Herramientas",             num:"05", icon:"🔧",
    subs:["Arquitectura core","Herramientas de planificación","Visibilidad & trazabilidad","Datos & analítica","Automatización"] },
  { key:"indicadores",     label:"Indicadores",              num:"06", icon:"📊",
    subs:["Servicio al cliente","Eficiencia & capital","Exactitud & pérdidas","Salud del inventario","Cumplimiento & riesgo"] },
  { key:"abastecimiento",  label:"Abastecimiento",           num:"07", icon:"📦",
    subs:["Dispositivos","CPE/routers/STB","SIM/eSIM & kits","Accesorios","Repuestos/refurb/swap"] },
];

const LV_META = [
  { v:1, label:"Básico",     c:"#78716C", bg:"#FAFAF8" },
  { v:2, label:"Emergente",  c:"#D97706", bg:"#FFFBEB" },
  { v:3, label:"Robusto",    c:"#2563EB", bg:"#EFF6FF" },
  { v:4, label:"Avanzado", c:"#7C3AED", bg:"#F5F3FF" },
  { v:5, label:"Líder",     c:"#059669", bg:"#ECFDF5" },
];

function lvMeta(v) { return LV_META[Math.max(0,Math.round(v)-1)] || LV_META[0]; }
function avgArr(arr) {
  const a = arr.filter(x => x != null && !isNaN(x));
  return a.length ? parseFloat((a.reduce((s,x)=>s+x,0)/a.length).toFixed(2)) : null;
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsCard({ children, style={} }) {
  return (
    <div style={{ background:"#FFFFFF", borderRadius:16, border:"1px solid #E8E4DF",
      padding:"22px 24px", ...style }}>{children}</div>
  );
}
function AnalyticsLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase",
    letterSpacing:".14em", marginBottom:14 }}>{children}</div>;
}
function MiniBar({ value, max=5, color="#7823DC" }) {
  return (
    <div style={{ height:5, background:"#F0EDE9", borderRadius:99, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${Math.min(100,(value/max)*100)}%`,
        background:color, borderRadius:99, transition:"width .5s" }} />
    </div>
  );
}

function AnalyticsTab({ evaluaciones, respuestas }) {
  const [filterDir, setFilterDir] = useState([]);
  const [filterRol, setFilterRol] = useState([]);
  const [filterLvl, setFilterLvl] = useState([]);
  const [viewDim,   setViewDim]   = useState(null);
  const [sortDim,   setSortDim]   = useState("score_global");
  const [sortAsc,   setSortAsc]   = useState(false);
  const [gapsView,  setGapsView]  = useState("critical"); // "critical"|"moderate"|"roadmap"

  const allDirs = useMemo(() => [...new Set(evaluaciones.map(e=>e.direccion).filter(Boolean))].sort(), [evaluaciones]);
  const allRols = useMemo(() => [...new Set(evaluaciones.map(e=>e.rol).filter(Boolean))].sort(), [evaluaciones]);

  function toggle(arr, setArr, val) { setArr(a => a.includes(val) ? a.filter(x=>x!==val) : [...a, val]); }

  // Enriquecer evaluaciones con scores calculados desde respuestas si score_global es null
  const enriched = useMemo(() => evaluaciones.map(e => {
    if (e.score_global) return e;
    const eResps = respuestas.filter(r => r.evaluacion_id === e.id);
    if (!eResps.length) return e;
    const dimScores = DIMS_META.reduce((acc, d) => {
      const vals = eResps.filter(r => r.dimension_key === d.key);
      acc[`score_${d.key}`] = vals.length > 0
        ? parseFloat((vals.reduce((s,r)=>s+(r.valor||0),0)/vals.length).toFixed(2)) : null;
      return acc;
    }, {});
    const dVals = Object.values(dimScores).filter(Boolean);
    const score_global = dVals.length
      ? parseFloat((dVals.reduce((a,b)=>a+b,0)/dVals.length).toFixed(2)) : null;
    return { ...e, ...dimScores, score_global };
  }), [evaluaciones, respuestas]);

  const filtered = useMemo(() => enriched.filter(e => {
    if (filterDir.length && !filterDir.includes(e.direccion)) return false;
    if (filterRol.length && !filterRol.includes(e.rol)) return false;
    if (filterLvl.length && !filterLvl.includes(Math.round(e.score_global))) return false;
    return true;
  }), [enriched, filterDir, filterRol, filterLvl]);

  const hasFilters = filterDir.length || filterRol.length || filterLvl.length;
  const RED = "#7823DC";

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const globalAvg = avgArr(filtered.map(e=>e.score_global));
  const dimAvgs   = DIMS_META.map(d => ({ ...d, score: avgArr(filtered.map(e=>e[`score_${d.key}`])) }));
  const strongest = [...dimAvgs].filter(d=>d.score).sort((a,b)=>b.score-a.score)[0];
  const weakest   = [...dimAvgs].filter(d=>d.score).sort((a,b)=>a.score-b.score)[0];
  const spread    = strongest && weakest ? parseFloat((strongest.score-weakest.score).toFixed(1)) : null;

  // ── Distribution ──────────────────────────────────────────────────────────
  const distData = LV_META.map(l => ({
    ...l,
    count: filtered.filter(e=>Math.round(e.score_global)===l.v).length,
    pct: filtered.length ? Math.round(filtered.filter(e=>Math.round(e.score_global)===l.v).length/filtered.length*100) : 0,
  }));

  // ── Radar ─────────────────────────────────────────────────────────────────
  const radarData = dimAvgs.map(d => ({ dim: d.label, value: d.score||0, fullMark:5 }));

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const heatmap = allDirs.map(dir => {
    const rows = filtered.filter(e=>e.direccion===dir);
    const r = { dir, n: rows.length };
    DIMS_META.forEach(d => { r[d.key] = avgArr(rows.map(e=>e[`score_${d.key}`])); });
    r.global = avgArr(rows.map(e=>e.score_global));
    return r;
  }).filter(r=>r.n>0);

  // ── By Role ────────────────────────────────────────────────────────────────
  const byRole = allRols.map(rol => {
    const rows = filtered.filter(e=>e.rol===rol);
    return { rol, n: rows.length, score: avgArr(rows.map(e=>e.score_global)) };
  }).filter(r=>r.n>0).sort((a,b)=>(b.score||0)-(a.score||0));

  // ── Timeline ───────────────────────────────────────────────────────────────
  const timeline = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      if (!e.created_at) return;
      const mo = e.created_at.slice(0,7);
      if (!map[mo]) map[mo] = [];
      map[mo].push(e.score_global||0);
    });
    return Object.entries(map).sort().map(([mo, vals]) => ({
      mo: mo.replace("-","·"),
      avg: parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)),
      n: vals.length,
    }));
  }, [filtered]);

  // ── Gaps Analysis (aggregate across all filtered evaluaciones) ─────────────
  const gapsData = useMemo(() => {
    // For each sub-dimension, average the scores across evaluaciones
    // A "gap" exists when avg score ≤ 3
    const subScores = {};
    DIMS_META.forEach(d => {
      d.subs.forEach((subLabel, idx) => {
        const subKey = `${d.key}_sub${idx}`;
        // Find respuestas for this sub-dim by dimension_key + position
        // We use respuestas filtered by evaluacion_id of filtered evals
        const filteredIds = new Set(filtered.map(e=>e.id));
        const subResps = respuestas.filter(r =>
          filteredIds.has(r.evaluacion_id) && r.dimension_key === d.key
        );
        // group by evaluacion_id, take the idx-th response for this dim
        const evalGroups = {};
        subResps.forEach(r => {
          if (!evalGroups[r.evaluacion_id]) evalGroups[r.evaluacion_id] = [];
          evalGroups[r.evaluacion_id].push(r);
        });
        const vals = Object.values(evalGroups)
          .map(arr => arr.sort((a,b)=>a.subdimension_id?.localeCompare(b.subdimension_id))[idx]?.valor)
          .filter(Boolean);
        const avg = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null;
        subScores[subKey] = { dim: d, subLabel, avg, idx };
      });
    });

    // Also compute from dim-level scores when respuestas unavailable
    // Supplement with dimension-level data
    const gaps = [];
    DIMS_META.forEach(d => {
      const dimScore = avgArr(filtered.map(e=>e[`score_${d.key}`]));
      if (dimScore && dimScore <= 3) {
        gaps.push({
          key: d.key,
          dimLabel: d.label,
          dimNum: d.num,
          dimIcon: d.icon,
          score: dimScore,
          gap: parseFloat((5-dimScore).toFixed(1)),
          n: filtered.filter(e=>e[`score_${d.key}`]).length,
        });
      }
    });
    return gaps.sort((a,b)=>a.score-b.score);
  }, [filtered, respuestas]);

  const critGaps = gapsData.filter(g=>g.score<=2);
  const modGaps  = gapsData.filter(g=>g.score>2&&g.score<=3);

  // ── Ranking ────────────────────────────────────────────────────────────────
  const ranking = [...filtered].sort((a,b) => {
    const va = a[sortDim]||0, vb = b[sortDim]||0;
    return sortAsc ? va-vb : vb-va;
  }).slice(0,10);

  // ── Drilldown ─────────────────────────────────────────────────────────────
  const drillDim  = viewDim ? DIMS_META.find(d=>d.key===viewDim) : null;
  const drillData = drillDim ? allDirs.map(dir => {
    const rows = filtered.filter(e=>e.direccion===dir);
    return { dir, score: avgArr(rows.map(e=>e[`score_${drillDim.key}`])) };
  }).filter(r=>r.score) : [];

  const PILL = (active, onClick, label, color) => (
    <button key={label} onClick={onClick} style={{
      padding:"5px 13px", borderRadius:99, fontSize:11, fontWeight:600, cursor:"pointer",
      border:`1.5px solid ${active?(color||RED):"#E8E4DF"}`,
      background: active?(color||RED)+"18":"#FFFFFF",
      color: active?(color||RED):"#999", transition:"all .15s",
    }}>{label}</button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* ═══ FILTER BAR ═══ */}
      <AnalyticsCard style={{ padding:"18px 22px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:20, alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:9.5, fontWeight:700, color:"#CCC", textTransform:"uppercase", letterSpacing:".12em", marginBottom:7 }}>Dirección</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {allDirs.map(d => PILL(filterDir.includes(d),()=>toggle(filterDir,setFilterDir,d),d))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9.5, fontWeight:700, color:"#CCC", textTransform:"uppercase", letterSpacing:".12em", marginBottom:7 }}>Rol</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {allRols.map(r => PILL(filterRol.includes(r),()=>toggle(filterRol,setFilterRol,r),r))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9.5, fontWeight:700, color:"#CCC", textTransform:"uppercase", letterSpacing:".12em", marginBottom:7 }}>Nivel Global</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {LV_META.map(l => PILL(filterLvl.includes(l.v),()=>toggle(filterLvl,setFilterLvl,l.v),l.label,l.c))}
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
            <div style={{ fontSize:20, fontWeight:900, color: hasFilters?RED:"#1A1A18", lineHeight:1, letterSpacing:"-.02em" }}>
              {filtered.length}<span style={{ fontSize:11, fontWeight:500, color:"#AAA" }}> / {evaluaciones.length}</span>
            </div>
            {hasFilters && (
              <button onClick={()=>{ setFilterDir([]); setFilterRol([]); setFilterLvl([]); }} style={{
                padding:"4px 12px", borderRadius:99, fontSize:10, fontWeight:700, cursor:"pointer",
                border:`1px solid ${RED}40`, background:RED+"10", color:RED,
              }}>✕ Limpiar</button>
            )}
          </div>
        </div>
      </AnalyticsCard>

      {filtered.length === 0 ? (
        <AnalyticsCard>
          <div style={{ textAlign:"center", padding:"48px 0", color:"#AAA", fontSize:13 }}>
            {!evaluaciones.length ? "No hay evaluaciones registradas aún." : "Sin evaluaciones con los filtros activos."}
          </div>
        </AnalyticsCard>
      ) : (<>


      {/* ═══ KPIs ═══ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"⭐", label:"Score Global Prom.", value: globalAvg?.toFixed(2)||"—", color: globalAvg?lvMeta(globalAvg).c:"#AAA" },
          { icon:"💪", label:"Dimensión más fuerte", value: strongest?.label||"—", sub: strongest?.score?.toFixed(1), color:"#059669" },
          { icon:"⚠️", label:"Dimensión más débil",  value: weakest?.label||"—",   sub: weakest?.score?.toFixed(1),   color:RED },
          { icon:"📐", label:"Dispersión (max−min)", value: spread!=null?`${spread} pts`:"—", color: spread>=2?RED:spread>=1?"#D97706":"#059669" },
        ].map((k,i) => (
          <AnalyticsCard key={i} style={{ padding:"18px 20px" }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:9.5, fontWeight:700, color:"#CCC", textTransform:"uppercase", letterSpacing:".12em", marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:k.sub?15:22, fontWeight:900, color:k.color, lineHeight:1.2, letterSpacing:"-.02em" }}>{k.value}</div>
            {k.sub && <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{k.sub} / 5</div>}
          </AnalyticsCard>
        ))}
      </div>

      {/* ═══ ROW: Distribución + Radar ═══ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <AnalyticsCard>
          <AnalyticsLabel>Distribución por Nivel Global</AnalyticsLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {distData.map(l => (
              <div key={l.v} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:76, fontSize:11, fontWeight:600, color:l.c, flexShrink:0 }}>{l.label}</div>
                <MiniBar value={l.count} max={Math.max(...distData.map(x=>x.count),1)} color={l.c} />
                <div style={{ fontSize:13, fontWeight:800, color:l.c, width:22, textAlign:"right", flexShrink:0 }}>{l.count}</div>
                <div style={{ fontSize:10, color:"#CCC", width:32, flexShrink:0 }}>{l.pct}%</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:14, paddingTop:12, borderTop:"1px solid #F0EDE9" }}>
            {distData.filter(l=>l.count>0).map(l => (
              <div key={l.v} style={{ padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700,
                background:l.c+"18", color:l.c, border:`1px solid ${l.c}30` }}>
                {l.label} · {l.pct}%
              </div>
            ))}
          </div>
        </AnalyticsCard>

        <AnalyticsCard>
          <AnalyticsLabel>Radar de Madurez Promedio</AnalyticsLabel>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top:10, right:30, bottom:10, left:30 }}>
              <PolarGrid stroke="#F0EDE9" />
              <PolarAngleAxis dataKey="dim" tick={{ fill:"#AAA", fontSize:9, fontWeight:600 }} />
              <PolarRadiusAxis angle={90} domain={[0,5]} tick={{ fontSize:7, fill:"#CCC" }} tickCount={6} />
              <Radar dataKey="value" stroke={RED} fill={RED} fillOpacity={0.1} strokeWidth={2.5} />
              <Tooltip formatter={v=>[`${v} / 5`,"Score"]} contentStyle={{ borderRadius:8, fontSize:11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </AnalyticsCard>
      </div>

      {/* ═══ ROW: Dimensiones + Por Rol ═══ */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>
        <AnalyticsCard>
          <AnalyticsLabel>Score por Dimensión {drillDim?`— ${drillDim.label}`:"(clic para desglosar)"}</AnalyticsLabel>
          {drillDim ? (
            <>
              <button onClick={()=>setViewDim(null)} style={{ fontSize:11, color:RED, background:"none", border:"none", cursor:"pointer", marginBottom:12, fontWeight:600, padding:0 }}>← Volver</button>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {drillData.sort((a,b)=>(b.score||0)-(a.score||0)).map(r => {
                  const l = lvMeta(r.score);
                  return (
                    <div key={r.dir} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:100, fontSize:11, fontWeight:600, color:"#555", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.dir}</div>
                      <MiniBar value={r.score} color={l.c} />
                      <div style={{ fontSize:12, fontWeight:800, color:l.c, flexShrink:0, width:28, textAlign:"right" }}>{r.score?.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...dimAvgs].sort((a,b)=>(b.score||0)-(a.score||0)).map(d => {
                const l = d.score ? lvMeta(d.score) : null;
                return (
                  <div key={d.key} onClick={()=>setViewDim(d.key)} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"7px 10px", borderRadius:10, transition:"background .12s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F7F5F2"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:20, fontSize:13, flexShrink:0 }}>{d.icon}</div>
                    <div style={{ width:24, fontSize:9, fontWeight:700, color:"#CCC", flexShrink:0 }}>{d.num}</div>
                    <div style={{ width:110, fontSize:11, fontWeight:600, color:"#555", flexShrink:0 }}>{d.label}</div>
                    <MiniBar value={d.score||0} color={l?.c||"#E8E4DF"} />
                    <div style={{ fontSize:12, fontWeight:800, color:l?.c||"#CCC", flexShrink:0, width:28, textAlign:"right" }}>{d.score?.toFixed(1)||"—"}</div>
                    <div style={{ fontSize:9, color:"#CCC", width:10 }}>›</div>
                  </div>
                );
              })}
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard>
          <AnalyticsLabel>Score por Rol</AnalyticsLabel>
          {byRole.length === 0 ? <div style={{ color:"#CCC", fontSize:12, textAlign:"center", paddingTop:24 }}>Sin datos</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {byRole.map(r => {
                const l = r.score ? lvMeta(r.score) : null;
                return (
                  <div key={r.rol} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:82, fontSize:11, fontWeight:600, color:"#555", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.rol}</div>
                    <MiniBar value={r.score||0} color={l?.c||"#E8E4DF"} />
                    <div style={{ fontSize:12, fontWeight:800, color:l?.c||"#CCC", flexShrink:0, width:28, textAlign:"right" }}>{r.score?.toFixed(1)||"—"}</div>
                    <div style={{ fontSize:9, color:"#CCC", width:22, flexShrink:0, textAlign:"right" }}>n={r.n}</div>
                  </div>
                );
              })}
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* ═══ HEATMAP ═══ */}
      {heatmap.length > 0 && (
        <AnalyticsCard>
          <AnalyticsLabel>Heatmap Dirección × Dimensión</AnalyticsLabel>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"3px 3px", fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"4px 8px", color:"#CCC", fontSize:9.5, fontWeight:700 }}>Dirección</th>
                  <th style={{ padding:"4px 8px", color:"#CCC", fontSize:9.5, fontWeight:700, textAlign:"center" }}>n</th>
                  <th style={{ padding:"4px 8px", color:"#CCC", fontSize:9.5, fontWeight:700, textAlign:"center", background:"#F7F5F2", borderRadius:6 }}>⭐ Global</th>
                  {DIMS_META.map(d=>(
                    <th key={d.key} onClick={()=>setViewDim(viewDim===d.key?null:d.key)}
                      style={{ padding:"4px 8px", color:viewDim===d.key?RED:"#CCC", fontSize:9, fontWeight:700, textAlign:"center", cursor:"pointer", whiteSpace:"nowrap" }}
                      title={d.label}>{d.num} {d.icon}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.sort((a,b)=>(b.global||0)-(a.global||0)).map(row=>(
                  <tr key={row.dir}>
                    <td style={{ padding:"6px 8px", fontWeight:700, color:"#1A1A18", fontSize:12, whiteSpace:"nowrap" }}>{row.dir}</td>
                    <td style={{ padding:"6px 8px", color:"#AAA", fontSize:11, textAlign:"center" }}>{row.n}</td>
                    <td style={{ padding:"6px 8px", textAlign:"center", borderRadius:8, background: row.global?lvMeta(row.global).c+"22":"#F3F2F0", color:row.global?lvMeta(row.global).c:"#CCC", fontWeight:800, fontSize:13, minWidth:44 }}>
                      {row.global?.toFixed(1)||"—"}
                    </td>
                    {DIMS_META.map(d=>{
                      const v=row[d.key]; const l=v?lvMeta(v):null;
                      return (
                        <td key={d.key} onClick={()=>setViewDim(d.key)} title={`${row.dir} · ${d.label}: ${v?.toFixed(1)||"—"}`}
                          style={{ padding:"6px 8px", textAlign:"center", borderRadius:8, background:l?l.c+"22":"#F3F2F0", color:l?l.c:"#CCC", fontWeight:700, fontSize:12, minWidth:42, cursor:"pointer", outline:viewDim===d.key?`2px solid ${RED}`:"none" }}>
                          {v?.toFixed(1)||"—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
            {LV_META.map(l=>(
              <div key={l.v} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#AAA" }}>
                <div style={{ width:10, height:10, borderRadius:3, background:l.c+"30", border:`1px solid ${l.c}50` }}/>
                {l.label}
              </div>
            ))}
          </div>
        </AnalyticsCard>
      )}

      {/* ═══ TIMELINE ═══ */}
      {timeline.length >= 2 && (
        <AnalyticsCard>
          <AnalyticsLabel>Evolución Score Promedio (por mes)</AnalyticsLabel>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={timeline} margin={{ left:-10, right:20, top:8, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="mo" tick={{ fontSize:10, fill:"#AAA" }} />
              <YAxis domain={[0,5]} tick={{ fontSize:9, fill:"#AAA" }} tickCount={6} />
              <Tooltip formatter={(v,n,p)=>[`${v} / 5  (n=${p.payload.n})`,"Score promedio"]} contentStyle={{ borderRadius:8, fontSize:11 }} />
              <Line type="monotone" dataKey="avg" stroke={RED} strokeWidth={2.5} dot={{ r:4, fill:RED }} activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsCard>
      )}

      {/* ═══ BRECHAS & ROADMAP ═══ */}
      <AnalyticsCard>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <AnalyticsLabel>Análisis de Brechas y Hoja de Ruta</AnalyticsLabel>
          <div style={{ display:"flex", gap:6 }}>
            {[
              { id:"critical", label:`🚨 Críticas`, count: critGaps.length, c:"#DC2626" },
              { id:"moderate", label:`⚡ Moderadas`, count: modGaps.length, c:"#D97706" },
              { id:"roadmap",  label:"🗺️ Hoja de Ruta", count: null, c:"#059669" },
            ].map(t=>(
              <button key={t.id} onClick={()=>setGapsView(t.id)} style={{
                padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                border:`1.5px solid ${gapsView===t.id?t.c:"#E8E4DF"}`,
                background: gapsView===t.id?t.c+"15":"#FAFAFA",
                color: gapsView===t.id?t.c:"#AAA", transition:"all .15s",
                display:"flex", alignItems:"center", gap:5,
              }}>
                {t.label}
                {t.count !== null && (
                  <span style={{
                    background: gapsView===t.id ? t.c : "#E8E4DF",
                    color: gapsView===t.id ? "#fff" : "#888",
                    borderRadius:99, fontSize:10, fontWeight:800,
                    padding:"1px 7px", minWidth:18, textAlign:"center",
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {gapsView === "critical" && (
          critGaps.length === 0
            ? <div style={{ textAlign:"center", color:"#AAA", fontSize:13, padding:"32px 0" }}>✅ No hay brechas críticas en la selección actual</div>
            : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {critGaps.map(g=>{
                  const l = lvMeta(g.score);
                  return (
                    <div key={g.key} style={{
                      background:"linear-gradient(135deg,#FFF5F5,#FFF8F8)",
                      border:"1.5px solid #FECACA", borderRadius:16, padding:"18px 20px",
                      boxShadow:"0 2px 8px rgba(220,38,38,0.08)",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:18 }}>{g.dimIcon}</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                            <span style={{ fontSize:9, fontWeight:700, color:"#DC2626", background:"#FEE2E2", padding:"2px 7px", borderRadius:99 }}>{g.dimNum}</span>
                            <span style={{ fontSize:12, fontWeight:800, color:"#1A1A18" }}>{g.dimLabel}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:l.c+"18", color:l.c, border:`1px solid ${l.c}30` }}>{l.label}</span>
                            <span style={{ fontSize:11, fontWeight:800, color:"#DC2626" }}>Score: {g.score.toFixed(1)}/5</span>
                          </div>
                        </div>
                        <div style={{ textAlign:"center", flexShrink:0 }}>
                          <div style={{ fontSize:22, fontWeight:900, color:"#DC2626", lineHeight:1 }}>{g.n}</div>
                          <div style={{ fontSize:9, color:"#AAA", fontWeight:600 }}>evals</div>
                        </div>
                      </div>
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:10, color:"#AAA" }}>Nivel actual</span>
                          <span style={{ fontSize:10, fontWeight:800, color:"#DC2626" }}>+{g.gap.toFixed(1)} hasta Líder</span>
                        </div>
                        <div style={{ height:8, background:"#FEE2E2", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${(g.score/5)*100}%`, background:`linear-gradient(90deg,#DC2626,#EF4444)`, borderRadius:99, transition:"width .6s ease" }} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:3 }}>
                        {[1,2,3,4,5].map(v=>(
                          <div key={v} style={{ flex:1, height:4, borderRadius:99, background: v<=Math.round(g.score)?l.c:"#F0EDE9" }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {gapsView === "moderate" && (
          modGaps.length === 0
            ? <div style={{ textAlign:"center", color:"#AAA", fontSize:13, padding:"32px 0" }}>Sin brechas moderadas</div>
            : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {modGaps.map(g=>{
                  const l = lvMeta(g.score);
                  return (
                    <div key={g.key} style={{ background:"#FFFBF0", border:"1px solid #FDE68A", borderRadius:14, padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:18 }}>{g.dimIcon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1A1A18" }}>{g.dimLabel}</div>
                          <div style={{ fontSize:9.5, color:"#AAA" }}>{g.dimNum} · n={g.n}</div>
                        </div>
                        <span style={{ padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:l.c+"18", color:l.c }}>{g.score.toFixed(1)}</span>
                      </div>
                      <div style={{ height:5, background:"#F0EDE9", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(g.score/5)*100}%`, background:l.c, borderRadius:99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {gapsView === "roadmap" && (
          gapsData.length === 0
            ? <div style={{ textAlign:"center", color:"#AAA", fontSize:13, padding:"32px 0" }}>Sin brechas identificadas</div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {[
                  { t:"Corto Plazo",  sub:"0–6 meses",    c:"#DC2626", bg:"#FEF2F2", bdr:"#FECACA", icon:"🚀", items: critGaps.slice(0,4) },
                  { t:"Mediano Plazo",sub:"6–12 meses",   c:"#D97706", bg:"#FFFBEB", bdr:"#FDE68A", icon:"⚡", items: [...critGaps.slice(4),...modGaps.slice(0,3)].slice(0,4) },
                  { t:"Largo Plazo",  sub:"12–24 meses",  c:"#059669", bg:"#ECFDF5", bdr:"#A7F3D0", icon:"🏆", items: modGaps.slice(3,7) },
                ].map(ph=>(
                  <div key={ph.t} style={{ borderRadius:14, border:`1.5px solid ${ph.bdr}`, background:ph.bg, overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${ph.bdr}`, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15 }}>{ph.icon}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:800, color:ph.c }}>{ph.t}</div>
                        <div style={{ fontSize:9.5, color:ph.c, opacity:.7 }}>{ph.sub}</div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                      {ph.items.length > 0 ? ph.items.map((g,j)=>(
                        <div key={j} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:14 }}>{g.dimIcon}</span>
                          <span style={{ fontSize:11, color:"#555", flex:1 }}>{g.dimLabel}</span>
                          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
                            background:lvMeta(g.score).c+"18", color:lvMeta(g.score).c }}>{g.score.toFixed(1)}</span>
                        </div>
                      )) : <div style={{ fontSize:11, color:"#AAA", fontStyle:"italic" }}>Sin brechas en este horizonte</div>}
                    </div>
                  </div>
                ))}
              </div>
        )}
      </AnalyticsCard>

      {/* ═══ RANKING ═══ */}
      <AnalyticsCard>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <AnalyticsLabel>Ranking Top 10</AnalyticsLabel>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {["score_global",...DIMS_META.map(d=>`score_${d.key}`)].map(k=>(
              <button key={k} onClick={()=>{ if(sortDim===k) setSortAsc(a=>!a); else{ setSortDim(k); setSortAsc(false); }}} style={{
                padding:"4px 10px", borderRadius:8, fontSize:9.5, fontWeight:600, cursor:"pointer",
                border:`1px solid ${sortDim===k?RED:"#E8E4DF"}`,
                background: sortDim===k?RED+"12":"#FAFAFA",
                color: sortDim===k?RED:"#AAA",
              }}>
                {k==="score_global"?"Global":DIMS_META.find(d=>`score_${d.key}`===k)?.num||k}
                {sortDim===k?(sortAsc?"↑":"↓"):""}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {ranking.map((e,i)=>{
            const l = e.score_global?lvMeta(e.score_global):null;
            return (
              <div key={e.id} style={{ display:"grid", gridTemplateColumns:"22px 1fr 100px 80px", alignItems:"center", gap:12,
                padding:"8px 12px", borderRadius:10, background:i===0?"#FFF8F7":"#FAFAF8",
                border:`1px solid ${i===0?"#FDDCDA":"#F0EDE9"}` }}>
                <div style={{ fontSize:11, fontWeight:800, color:i===0?RED:"#CCC" }}>#{i+1}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1A1A18" }}>
                    {e.direccion||"—"}<span style={{ fontWeight:400, color:"#AAA" }}> · {e.rol||"—"}</span>
                  </div>
                  <div style={{ fontSize:9.5, color:"#CCC", marginTop:1 }}>{e.created_at?.slice(0,10)||""}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <MiniBar value={e[sortDim]||0} color={l?.c||"#E8E4DF"} />
                  <span style={{ fontSize:12, fontWeight:800, color:l?.c||"#CCC", flexShrink:0, width:26, textAlign:"right" }}>{e[sortDim]?.toFixed(1)||"—"}</span>
                </div>
                {l && <span style={{ padding:"3px 8px", borderRadius:99, fontSize:9.5, fontWeight:700, background:l.c+"18", color:l.c, border:`1px solid ${l.c}30`, textAlign:"center", whiteSpace:"nowrap" }}>{l.label}</span>}
              </div>
            );
          })}
        </div>
      </AnalyticsCard>

    </>)}
    </div>
  );
}


// ─── LINKS TAB ────────────────────────────────────────────────────────────────
// ─── INDUSTRIAS ───────────────────────────────────────────────────────────────
const INDUSTRIAS = ["Telecomunicaciones","Farmacéutica","Oil & Gas","Manufactura","CPG"];
const DEFAULT_DIRS  = {"Telecomunicaciones": ["Supply Chain", "Ingeniería", "Implementación", "OyM", "UMM", "UMC"], "Farmacéutica": ["Supply Chain", "Manufactura", "Calidad y Regulatorio", "Comercial", "Distribución"], "Oil & Gas": ["Supply Chain", "Operaciones", "Mantenimiento", "Proyectos CAPEX", "HSEQ", "Procura"], "Manufactura": ["Supply Chain", "Producción", "Mantenimiento", "Calidad", "Comercial", "Logística"], "CPG": ["Supply Chain", "Manufactura", "Comercial / Trade", "Logística", "Marketing", "Finanzas"]};
const DEFAULT_ROLES_CC = {"Telecomunicaciones": ["Director", "Gerente", "Jefe", "Ingeniero", "Analista"], "Farmacéutica": ["Director", "Gerente", "Jefe / Coordinador", "Especialista", "Analista"], "Oil & Gas": ["Superintendente", "Gerente", "Supervisor", "Ingeniero Senior", "Ingeniero", "Analista"], "Manufactura": ["Gerente de Planta", "Gerente", "Jefe / Supervisor", "Ingeniero", "Técnico", "Analista"], "CPG": ["Director", "Gerente", "Jefe / Coordinador", "Analista Senior", "Analista"]};

// ─── TAG EDITOR (reusable pill-based list editor) ────────────────────────────
function TagEditor({ tags, onChange, color="#7823DC", placeholder="+ Agregar" }) {
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(null); // index being edited
  const [editVal, setEditVal] = useState("");

  function addTag() {
    const v = input.trim();
    if (!v || tags.includes(v)) { setInput(""); return; }
    onChange([...tags, v]);
    setInput("");
  }

  function removeTag(i) { onChange(tags.filter((_,j)=>j!==i)); }

  function startEdit(i) { setEditing(i); setEditVal(tags[i]); }
  function saveEdit(i) {
    const v = editVal.trim();
    if (!v) { removeTag(i); } else { const t=[...tags]; t[i]=v; onChange(t); }
    setEditing(null);
  }

  function moveTag(i, dir) {
    const t = [...tags];
    const j = i + dir;
    if (j < 0 || j >= t.length) return;
    [t[i], t[j]] = [t[j], t[i]];
    onChange(t);
  }

  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:7, alignItems:"center" }}>
      {tags.map((tag,i) => (
        editing === i ? (
          <input key={i} autoFocus value={editVal}
            onChange={e=>setEditVal(e.target.value)}
            onBlur={()=>saveEdit(i)}
            onKeyDown={e=>{ if(e.key==="Enter") saveEdit(i); if(e.key==="Escape") setEditing(null); }}
            style={{ padding:"5px 10px", borderRadius:99, border:`2px solid ${color}`, fontSize:11.5, fontWeight:600,
              color:"#1A1A18", background:"#fff", outline:"none", width:140 }}
          />
        ) : (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px",
            borderRadius:99, background:(color+"15"), border:`1.5px solid ${color+"40"}`,
            fontSize:11.5, fontWeight:600, color:"#1A1A18" }}>
            <button onClick={()=>moveTag(i,-1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#BBB",padding:"0 1px",lineHeight:1 }} title="Subir">↑</button>
            <button onClick={()=>moveTag(i,+1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#BBB",padding:"0 1px",lineHeight:1 }} title="Bajar">↓</button>
            <span onClick={()=>startEdit(i)} style={{ cursor:"text" }}>{tag}</span>
            <button onClick={()=>removeTag(i)}
              style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#BBB",padding:"0 0 0 2px",lineHeight:1 }}>×</button>
          </div>
        )
      ))}
      <div style={{ display:"flex", alignItems:"center", gap:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"||e.key===",") { e.preventDefault(); addTag(); }}}
          placeholder={placeholder}
          style={{ padding:"5px 12px", borderRadius:"99px 0 0 99px", border:`1.5px solid ${color+"40"}`,
            borderRight:"none", fontSize:11, color:"#555", background:"#FAFAF8",
            outline:"none", width:140 }}
        />
        <button onClick={addTag}
          style={{ padding:"5px 12px", borderRadius:"0 99px 99px 0", border:`1.5px solid ${color}`,
            background:color, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", lineHeight:1.5 }}>
          +
        </button>
      </div>
    </div>
  );
}


// ─── EMPRESA INPUT FIELD (module-level to prevent focus loss) ─────────────────
function EmpresaInputField({ label, fieldKey, placeholder, type="text", form, setForm, formErr, setFormErr }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10.5, fontWeight:700, color:"#555", marginBottom:5, display:"flex", justifyContent:"space-between" }}>
        <span>{label}</span>
        {formErr[fieldKey] && <span style={{ color:"#7823DC", fontSize:10 }}>{formErr[fieldKey]}</span>}
      </div>
      <input
        value={form[fieldKey]}
        onChange={e => { setForm(p=>(({...p,[fieldKey]:e.target.value})));setFormErr(p=>(({...p,[fieldKey]:undefined})));}}
        placeholder={placeholder} type={type}
        style={{ width:"100%", padding:"9px 12px", borderRadius:9,
          border:`1.5px solid ${formErr[fieldKey]?"#7823DC":"#E8E4DF"}`,
          fontSize:12.5, color:"#1A1A18", background:"#FAFAF8", outline:"none", boxSizing:"border-box" }}
      />
    </div>
  );
}

// ─── SUBS META ────────────────────────────────────────────────────────────────
const SUBS_META = [
  {id:"e1",  dim:"Estrategia",      label:"Objetivos & trade-offs",        desc:"Servicio, costo, capital de trabajo"},
  {id:"e2",  dim:"Estrategia",      label:"Políticas por canal",           desc:"B2B/B2C, SS/ROP"},
  {id:"e3",  dim:"Estrategia",      label:"Diseño de red",                 desc:"CDC, tiendas, hubs"},
  {id:"e4",  dim:"Estrategia",      label:"Gobernanza S&OP",               desc:"S&OP/S&OE, Comercial, Finanzas"},
  {id:"e5",  dim:"Estrategia",      label:"Riesgos y resiliencia",         desc:"Disrupciones, fraude, regulación"},
  {id:"c1",  dim:"Caracterización", label:"Segmentación ABC/XYZ",          desc:"Categoría, criticidad, valor-volumen"},
  {id:"c2",  dim:"Caracterización", label:"Atributos & trazabilidad",      desc:"Serial/IMEI, lotes, caducidad"},
  {id:"c3",  dim:"Caracterización", label:"Ciclo de vida y SLOB",          desc:"SLOB, lanzamientos, fin de vida"},
  {id:"c4",  dim:"Caracterización", label:"Ubicación y propiedad",         desc:"Consignación, 3PL, tiendas, técnicos"},
  {id:"c5",  dim:"Caracterización", label:"Retornos y condición",          desc:"Nuevo, refurb, swap, scrap"},
  {id:"p1",  dim:"Procesos",        label:"Planeación & reposición",       desc:"DRP, min-max, MEIO"},
  {id:"p2",  dim:"Procesos",        label:"Asignación omnicanal",          desc:"ATP/CTP, reservas"},
  {id:"p3",  dim:"Procesos",        label:"Ejecución física",              desc:"Recepción, almacenaje, picking"},
  {id:"p4",  dim:"Procesos",        label:"Control & exactitud",           desc:"Conteos cíclicos, shrinkage"},
  {id:"p5",  dim:"Procesos",        label:"Excepciones y retornos",        desc:"RMA, devoluciones, reparación"},
  {id:"r1",  dim:"Roles",           label:"Modelo operativo & RACI",       desc:"Dueños de proceso E2E"},
  {id:"r2",  dim:"Roles",           label:"Interfaces clave",              desc:"Comercial, Finanzas, Operaciones, TI"},
  {id:"r3",  dim:"Roles",           label:"Gestión de terceros",           desc:"OEM, 3PL, distribuidores, dealers"},
  {id:"r4",  dim:"Roles",           label:"Capacidades y formación",       desc:"Planificación, analítica, operación"},
  {id:"r5",  dim:"Roles",           label:"Incentivos & accountability",   desc:"SLAs, KPIs, consecuencias"},
  {id:"h1",  dim:"Herramientas",    label:"Arquitectura core",             desc:"ERP/OMS/WMS e integración"},
  {id:"h2",  dim:"Herramientas",    label:"Herramientas de planificación", desc:"APS/DRP, pronóstico, S&OP"},
  {id:"h3",  dim:"Herramientas",    label:"Visibilidad & trazabilidad",    desc:"Serialización, RFID, track&trace"},
  {id:"h4",  dim:"Herramientas",    label:"Datos & analítica",             desc:"Lakehouse, BI, modelos, calidad"},
  {id:"h5",  dim:"Herramientas",    label:"Automatización",                desc:"RPA, APIs/EDI, alertas, movilidad"},
  {id:"i1",  dim:"Indicadores",     label:"Servicio al cliente",           desc:"Fill rate, OTIF, backorders, NPS"},
  {id:"i2",  dim:"Indicadores",     label:"Eficiencia & capital",          desc:"Rotación, DIO, capital de trabajo"},
  {id:"i3",  dim:"Indicadores",     label:"Exactitud & pérdidas",          desc:"Accuracy, shrinkage, ajustes"},
  {id:"i4",  dim:"Indicadores",     label:"Salud del inventario",          desc:"Aging, SLOB, write-offs, DOH"},
  {id:"i5",  dim:"Indicadores",     label:"Cumplimiento & riesgo",         desc:"Fraude, auditoría, regulatorio"},
  {id:"ab1", dim:"Abastecimiento",  label:"Dispositivos",                  desc:"Smartphones/tablets: lanzamiento-rampa-EOL"},
  {id:"ab2", dim:"Abastecimiento",  label:"CPE/routers/STB",               desc:"Proyectos, bundles, reposición de fallas"},
  {id:"ab3", dim:"Abastecimiento",  label:"SIM/eSIM & kits",               desc:"Alto volumen, bajo valor, control fraude"},
  {id:"ab4", dim:"Abastecimiento",  label:"Accesorios",                    desc:"Amplia variedad, moda, obsolescencia"},
  {id:"ab5", dim:"Abastecimiento",  label:"Repuestos/refurb/swap",         desc:"Circularidad, garantías, niveles de servicio"},
];

// ─── EMPRESAS TAB ─────────────────────────────────────────────────────────────
function EmpresasTab({ empresas, evaluaciones, onRefresh, showToast }) {
  const [view,        setView]       = useState("list");
  const [editing,     setEditing]    = useState(null);
  const [saving,      setSaving]     = useState(false);
  const [editingSubs, setEditingSubs]= useState(false);
  const [subsData,    setSubsData]   = useState({});
  const [savingSubs,  setSavingSubs] = useState(false);
  const [form,        setForm]       = useState({ nombre:"", codigo:"", industria:"Telecomunicaciones", color_primary:"#7823DC", color_dark:"#5A1AA0", logo_url:"", direcciones: DEFAULT_DIRS["Telecomunicaciones"], roles: DEFAULT_ROLES_CC["Telecomunicaciones"] });
  const [formErr,     setFormErr]    = useState({});
  const PURPLE = "#7823DC";

  function startNew() {
    setForm({ nombre:"", codigo:"", industria:"Telecomunicaciones", color_primary:"#7823DC", color_dark:"#5A1AA0", logo_url:"" });
    setEditing(null); setView("new"); setEditingSubs(false);
  }
  function startEdit(emp) {
    const ind = emp.industria||"Telecomunicaciones";
    setForm({ nombre:emp.nombre, codigo:emp.codigo, industria:ind, color_primary:emp.color_primary||"#7823DC", color_dark:emp.color_dark||"#5A1AA0", logo_url:emp.logo_url||"",
      direcciones: emp.direcciones || DEFAULT_DIRS[ind]  || [],
      roles:       emp.roles       || DEFAULT_ROLES_CC[ind] || [],
    });
    setEditing(emp); setView("edit"); setEditingSubs(false);
  }

  async function loadSubs(emp) {
    const { data } = await supabase.from("subs_custom").select("*").eq("empresa_id", emp.id);
    const map = {};
    SUBS_META.forEach(sm => { map[sm.id] = { q:"", label:"", desc:"" }; });
    (data||[]).forEach(s => { map[s.sub_id] = { q:s.q||"", label:s.label||"", desc:s.descripcion||"" }; });
    setSubsData(map); setEditing(emp); setEditingSubs(true); setView("edit");
  }

  function validateForm() {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = "Requerido";
    if (!form.codigo.trim()) errs.codigo = "Requerido";
    if (!/^[A-Z0-9\-_]{2,20}$/i.test(form.codigo.trim())) errs.codigo = "Solo letras, números y guiones";
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function saveEmpresa() {
    if (!validateForm()) return;
    setSaving(true);
    const payload = { nombre:form.nombre.trim(), codigo:form.codigo.trim().toUpperCase(), industria:form.industria, color_primary:form.color_primary, color_dark:form.color_dark, logo_url:form.logo_url.trim()||null, direcciones:form.direcciones||null, roles:form.roles||null };
    let err;
    if (editing) { ({ error:err } = await supabase.from("empresas").update(payload).eq("id", editing.id)); }
    else         { ({ error:err } = await supabase.from("empresas").insert([payload])); }
    setSaving(false);
    if (err) { showToast("Error: " + err.message, "error"); return; }
    showToast(editing ? "Empresa actualizada" : "Empresa creada");
    await onRefresh(); setView("list");
  }

  async function saveSubs() {
    if (!editing) return;
    setSavingSubs(true);
    const rows = SUBS_META
      .filter(sm => subsData[sm.id]?.q || subsData[sm.id]?.label || subsData[sm.id]?.desc)
      .map(sm => ({ empresa_id:editing.id, sub_id:sm.id, q:subsData[sm.id]?.q||null, label:subsData[sm.id]?.label||null, descripcion:subsData[sm.id]?.desc||null }));
    if (rows.length > 0) {
      const { error:err } = await supabase.from("subs_custom").upsert(rows, { onConflict:"empresa_id,sub_id" });
      if (err) { showToast("Error: " + err.message, "error"); setSavingSubs(false); return; }
    }
    showToast("Preguntas guardadas"); setSavingSubs(false); setEditingSubs(false);
  }

  async function deleteEmpresa(emp) {
    if (!window.confirm("Eliminar " + emp.nombre + "? Se borran sus preguntas custom.")) return;
    await supabase.from("empresas").delete().eq("id", emp.id);
    showToast("Empresa eliminada"); await onRefresh();
  }

  const evalCount = (id) => evaluaciones.filter(e => e.empresa_id === id).length;
  const INDUSTRIA_ICONS = { "Telecomunicaciones":"📡","Farmacéutica":"💊","Oil & Gas":"🛢️","Manufactura":"🏭","CPG":"🛒" };

  // ── SUBS EDIT VIEW ──────────────────────────────────────────────────────────
  if (editingSubs && editing) {
    const dims = [...new Set(SUBS_META.map(s=>s.dim))];
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <button onClick={()=>setEditingSubs(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#AAA", padding:4 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#1A1A18" }}>Preguntas · {editing.nombre}</div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>Deja vacío para usar el texto por defecto del modelo (o de la industria {editing.industria}).</div>
          </div>
          <button onClick={saveSubs} disabled={savingSubs} style={{ padding:"9px 22px", borderRadius:99, background:editing.color_primary||PURPLE, color:"#fff", border:"none", fontSize:12.5, fontWeight:700, cursor:"pointer", opacity:savingSubs?0.6:1 }}>
            {savingSubs ? "Guardando..." : "Guardar preguntas"}
          </button>
        </div>
        {dims.map(dim => (
          <div key={dim} style={{ background:"#fff", borderRadius:14, border:"1px solid #E8E4DF", marginBottom:16, overflow:"hidden" }}>
            <div style={{ padding:"12px 20px", background:"#F7F5F2", borderBottom:"1px solid #E8E4DF", fontSize:11, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:".08em" }}>{dim}</div>
            <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
              {SUBS_META.filter(s=>s.dim===dim).map(sm => (
                <div key={sm.id} style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:12, alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1A1A18", marginBottom:3 }}>{sm.label}</div>
                    <div style={{ fontSize:9.5, color:"#AAA", marginBottom:4 }}>{sm.desc}</div>
                    <div style={{ fontSize:9, color:"#CCC", fontFamily:"monospace" }}>{sm.id}</div>
                  </div>
                  <textarea value={subsData[sm.id]?.q||""} onChange={e=>setSubsData(p=>(({...p,[sm.id]:{...p[sm.id],q:e.target.value}})))}
                    placeholder={`Seleccione el nivel (1-5) en: ${sm.label}...`}
                    rows={2}
                    style={{ width:"100%", padding:"8px 11px", borderRadius:8, border:"1.5px solid #E8E4DF", fontSize:11.5, color:"#1A1A18", background:"#FAFAF8", outline:"none", resize:"vertical", lineHeight:1.5, boxSizing:"border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── NEW / EDIT FORM ─────────────────────────────────────────────────────────
  if (view === "new" || (view === "edit" && !editingSubs)) return (
    <div style={{ maxWidth:480 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
        <button onClick={()=>setView("list")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#AAA", padding:4 }}>←</button>
        <div style={{ fontSize:16, fontWeight:800, color:"#1A1A18" }}>{editing ? "Editar: "+editing.nombre : "Nueva empresa"}</div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E4DF", padding:"28px" }}>
        <div style={{ height:8, borderRadius:6, marginBottom:24, background:`linear-gradient(90deg,${form.color_primary},${form.color_dark})` }}/>
        <EmpresaInputField label="Nombre de la empresa" fieldKey="nombre" placeholder="Ej: Claro Colombia" form={form} setForm={setForm} formErr={formErr} setFormErr={setFormErr}/>
        <EmpresaInputField label="Código de acceso" fieldKey="codigo" placeholder="Ej: CLARO-2025" form={form} setForm={setForm} formErr={formErr} setFormErr={setFormErr}/>
        <div style={{ fontSize:10, color:"#AAA", marginTop:-10, marginBottom:16 }}>Solo letras, números y guiones. Ej: CLARO-2025</div>

        {/* Industria selector */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10.5, fontWeight:700, color:"#555", marginBottom:8 }}>Industria</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
            {INDUSTRIAS.map(ind => (
              <button key={ind} onClick={()=>setForm(p=>(({...p, industria:ind, direcciones: p.direcciones?.length ? p.direcciones : DEFAULT_DIRS[ind]||[], roles: p.roles?.length ? p.roles : DEFAULT_ROLES_CC[ind]||[] })))}
                style={{ padding:"10px 6px", borderRadius:10, border:`2px solid ${form.industria===ind?form.color_primary||PURPLE:"#E8E4DF"}`,
                  background:form.industria===ind?(form.color_primary||PURPLE)+"15":"#FAFAFA",
                  color:form.industria===ind?form.color_primary||PURPLE:"#888",
                  fontSize:10, fontWeight:700, cursor:"pointer", textAlign:"center", lineHeight:1.4 }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{INDUSTRIA_ICONS[ind]||"🏢"}</div>
                <div>{ind}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:"#9B59D6", marginTop:8, background:"#F0E8FF", borderRadius:8, padding:"6px 10px" }}>
            💡 Las preguntas del diagnóstico se adaptarán automáticamente a la industria seleccionada.
          </div>
        </div>

        <EmpresaInputField label="URL del logo (opcional)" fieldKey="logo_url" placeholder="https://..." form={form} setForm={setForm} formErr={formErr} setFormErr={setFormErr}/>
        {/* ── Direcciones & Roles editor ─────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:"#555" }}>Direcciones</div>
            <button onClick={()=>setForm(p=>({...p, direcciones: DEFAULT_DIRS[p.industria]||[]}))}
              style={{ fontSize:9.5, color:"#9B59D6", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
              ↺ Restablecer por industria
            </button>
          </div>
          <TagEditor
            tags={form.direcciones||[]}
            onChange={tags=>setForm(p=>({...p, direcciones:tags}))}
            color={form.color_primary||"#7823DC"}
            placeholder="+ Agregar dirección"
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:"#555" }}>Roles</div>
            <button onClick={()=>setForm(p=>({...p, roles: DEFAULT_ROLES_CC[p.industria]||[]}))}
              style={{ fontSize:9.5, color:"#9B59D6", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
              ↺ Restablecer por industria
            </button>
          </div>
          <TagEditor
            tags={form.roles||[]}
            onChange={tags=>setForm(p=>({...p, roles:tags}))}
            color={form.color_primary||"#7823DC"}
            placeholder="+ Agregar rol"
          />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[["Color principal","color_primary"],["Color oscuro","color_dark"]].map(([lbl,key])=>(
            <div key={key}>
              <div style={{ fontSize:10.5, fontWeight:700, color:"#555", marginBottom:5 }}>{lbl}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={form[key]} onChange={e=>setForm(p=>(({...p,[key]:e.target.value})))}
                  style={{ width:36, height:36, borderRadius:8, border:"1.5px solid #E8E4DF", cursor:"pointer", padding:2 }}/>
                <input value={form[key]} onChange={e=>setForm(p=>(({...p,[key]:e.target.value})))}
                  style={{ flex:1, padding:"9px 12px", borderRadius:9, border:"1.5px solid #E8E4DF", fontSize:12, color:"#1A1A18", background:"#FAFAF8", outline:"none" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={()=>setView("list")} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1.5px solid #E8E4DF", background:"#FAFAFA", color:"#555", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancelar</button>
        <button onClick={saveEmpresa} disabled={saving} style={{ flex:2, padding:"11px 0", borderRadius:10, background:form.color_primary||PURPLE, border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1, boxShadow:`0 4px 14px ${form.color_primary||PURPLE}50` }}>
          {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear empresa"}
        </button>
      </div>
    </div>
  );

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:12, color:"#AAA" }}>{empresas.length} empresa{empresas.length!==1?"s":""} registrada{empresas.length!==1?"s":""}</div>
        <button onClick={startNew} style={{ padding:"9px 20px", borderRadius:99, background:PURPLE, color:"#fff", border:"none", fontSize:12.5, fontWeight:700, cursor:"pointer", boxShadow:"0 3px 10px rgba(120,35,220,0.3)" }}>+ Nueva empresa</button>
      </div>
      {empresas.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E4DF", padding:"60px 40px", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:16 }}>🏢</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1A1A18", marginBottom:6 }}>Sin empresas registradas</div>
          <div style={{ fontSize:12, color:"#AAA", marginBottom:24 }}>Crea la primera empresa para habilitar el acceso multi-cliente</div>
          <button onClick={startNew} style={{ padding:"10px 24px", borderRadius:99, background:PURPLE, color:"#fff", border:"none", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>+ Crear empresa</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {empresas.map(emp => (
            <div key={emp.id} style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E4DF", overflow:"hidden" }}>
              <div style={{ height:5, background:`linear-gradient(90deg,${emp.color_primary||PURPLE},${emp.color_dark||"#5A1AA0"})` }}/>
              <div style={{ padding:"20px 22px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#1A1A18", marginBottom:4 }}>{emp.nombre}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"#fff", background:emp.color_primary||PURPLE, padding:"3px 10px", borderRadius:99 }}>{emp.codigo}</span>
                      <span style={{ fontSize:10, color:"#888", background:"#F0E8FF", padding:"3px 10px", borderRadius:99 }}>{INDUSTRIA_ICONS[emp.industria]||"🏢"} {emp.industria||"Telco"}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:emp.color_primary||PURPLE }}/>
                    <div style={{ width:18, height:18, borderRadius:4, background:emp.color_dark||"#5A1AA0" }}/>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                  <div style={{ background:"#F7F5F2", borderRadius:9, padding:"9px 12px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Evaluaciones</div>
                    <div style={{ fontSize:20, fontWeight:900, color:"#1A1A18", letterSpacing:"-.02em" }}>{evalCount(emp.id)}</div>
                  </div>
                  <div style={{ background:"#F7F5F2", borderRadius:9, padding:"9px 12px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Creada</div>
                    <div style={{ fontSize:11, fontWeight:600, color:"#555" }}>{new Date(emp.created_at).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"})}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>startEdit(emp)} style={{ flex:1, padding:"8px 0", borderRadius:9, fontSize:11.5, fontWeight:700, cursor:"pointer", border:"1.5px solid #E8E4DF", background:"#FAFAFA", color:"#555" }}>✏️ Editar</button>
                  <button onClick={()=>loadSubs(emp)} style={{ flex:1, padding:"8px 0", borderRadius:9, fontSize:11.5, fontWeight:700, cursor:"pointer", border:`1.5px solid ${emp.color_primary||PURPLE}40`, background:(emp.color_primary||PURPLE)+"12", color:emp.color_primary||PURPLE }}>💬 Preguntas</button>
                  <button onClick={()=>{ navigator.clipboard.writeText(emp.codigo); showToast("Código copiado"); }} style={{ padding:"8px 12px", borderRadius:9, fontSize:11.5, cursor:"pointer", border:"1.5px solid #E8E4DF", background:"#FAFAFA", color:"#AAA" }}>📋</button>
                  <button onClick={()=>deleteEmpresa(emp)} style={{ padding:"8px 12px", borderRadius:9, fontSize:11.5, cursor:"pointer", border:"1.5px solid #fee2e2", background:"#fff5f5", color:"#ef4444" }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


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
          <div style={{ fontSize: 18, fontWeight: 800, color: "#7823DC" }}>Links de acceso</div>
          <div style={{ fontSize: 12, color: "#AAA", marginTop: 3 }}>Genera links únicos para compartir la evaluación</div>
        </div>
        <button onClick={generate} className="btn-action" style={{
          padding: "11px 22px", borderRadius: 11, border: "none",
          background: "linear-gradient(135deg,#7823DC,#5A1AA0)",
          color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(120,35,220,0.35)",
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
                background: "#7823DC18", border: "1px solid #7823DC30",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7823DC",
                    background: "#7823DC18", padding: "2px 8px", borderRadius: 99 }}>
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
                    padding: "8px 12px", borderRadius: 9, border: "1px solid #7823DC30",
                    background: "#7823DC10", color: "#7823DC", fontSize: 12, cursor: "pointer",
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

  async function dlAgregado() {
    const evaluaciones = filtered;
    setDownloading("all");
    const XLSX = await import("xlsx");
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

  async function dlIndividual(e) {
    setDownloading(e.id);
    const XLSX = await import("xlsx");
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
          <span style={{ fontSize: 11, color: "#7823DC", fontWeight: 600 }}>{filtered.length} evaluaciones filtradas</span>
        )}
      </div>

      {/* Agregado */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #E8E4DF", borderRadius: 18,
        padding: "28px 32px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#7823DC", marginBottom: 6 }}>📦 Descarga agregada</div>
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

// ─── REPORT TAB ───────────────────────────────────────────────────────────────
function ReportTab({ evaluaciones, respuestas }) {
  const [filterDir, setFilterDir] = useState([]);
  const [filterRol, setFilterRol] = useState([]);
  const [titulo,    setTitulo]    = useState("Diagnóstico de Madurez de Inventarios");
  const [subtitulo, setSubtitulo] = useState("Kearney · Supply Chain Assessment");
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState({
    portada:       true,
    resumen_kpis:  true,
    distribucion:  true,
    heatmap:       true,
    por_rol:       true,
    brechas_crit:  true,
    brechas_mod:   true,
    roadmap:       true,
    ranking:       true,
  });

  const SECTION_LABELS = {
    portada:       { icon:"🎨", label:"Portada",                  desc:"Portada con título, fecha y resumen ejecutivo" },
    resumen_kpis:  { icon:"⭐", label:"KPIs Ejecutivos",          desc:"Score global, dispersión, dimensión fuerte/débil" },
    distribucion:  { icon:"📊", label:"Distribución por Nivel",   desc:"Cuántas evaluaciones hay en cada nivel de madurez" },
    heatmap:       { icon:"🌡️", label:"Heatmap Dirección × Dim.", desc:"Tabla de scores promedio por dirección y dimensión" },
    por_rol:       { icon:"👤", label:"Score por Rol",            desc:"Comparativa de madurez por rol del evaluador" },
    brechas_crit:  { icon:"🚨", label:"Brechas Críticas",         desc:"Dimensiones en nivel 1–2, acción inmediata" },
    brechas_mod:   { icon:"⚡", label:"Brechas Moderadas",        desc:"Dimensiones en nivel 3, potencial de mejora" },
    roadmap:       { icon:"🗺️", label:"Hoja de Ruta",             desc:"Plan de acción en 3 horizontes temporales" },
    ranking:       { icon:"🏆", label:"Ranking de Evaluaciones",  desc:"Top evaluaciones ordenadas por score global" },
  };

  const allDirs = useMemo(() => [...new Set(evaluaciones.map(e=>e.direccion).filter(Boolean))].sort(), [evaluaciones]);
  const allRols = useMemo(() => [...new Set(evaluaciones.map(e=>e.rol).filter(Boolean))].sort(), [evaluaciones]);

  function toggleDir(d) { setFilterDir(a => a.includes(d)?a.filter(x=>x!==d):[...a,d]); }
  function toggleRol(r) { setFilterRol(a => a.includes(r)?a.filter(x=>x!==r):[...a,r]); }
  function toggleSection(k) { setSections(s => ({ ...s, [k]: !s[k] })); }

  const filtered = useMemo(() => evaluaciones.filter(e => {
    if (filterDir.length && !filterDir.includes(e.direccion)) return false;
    if (filterRol.length && !filterRol.includes(e.rol)) return false;
    return true;
  }), [evaluaciones, filterDir, filterRol]);

  function avgArr(arr) {
    const a = arr.filter(x=>x!=null&&!isNaN(x));
    return a.length ? parseFloat((a.reduce((s,x)=>s+x,0)/a.length).toFixed(2)) : null;
  }

  function lvColor(v) {
    if (!v) return "#AAA";
    const r = Math.round(v);
    return ["#78716C","#D97706","#2563EB","#7C3AED","#059669"][r-1]||"#AAA";
  }
  function lvLabel(v) {
    return ["","Básico","Emergente","Robusto","Avanzado","Líder"][Math.round(v)]||"—";
  }

  async function generatePDF() {
    setGenerating(true);
    try {
      // Load jsPDF dynamically
      if (!window.jspdf) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const W = 210, H = 297;
      const RED = [232, 37, 31], DARK = [17, 17, 16], MID = [107, 104, 96], LIGHT = [200, 198, 192];
      const now = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" });

      // ── helpers ──────────────────────────────────────────────────────────
      function setFont(weight="normal", size=10, color=DARK) {
        doc.setFont("helvetica", weight);
        doc.setFontSize(size);
        doc.setTextColor(...color);
      }
      function rect(x,y,w,h,r,fillRGB) {
        doc.setFillColor(...fillRGB);
        doc.roundedRect(x,y,w,h,r,r,"F");
      }
      function hline(y, color=[232,228,224]) {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.3);
        doc.line(16, y, W-16, y);
      }
      function pill(x, y, text, bgRGB, textRGB) {
        setFont("bold", 7.5, textRGB);
        const tw = doc.getTextWidth(text);
        doc.setFillColor(...bgRGB);
        doc.roundedRect(x-2, y-3.5, tw+4, 5.5, 1.5, 1.5, "F");
        doc.text(text, x, y);
      }
      function miniBar(x, y, value, max, color, barW=40) {
        doc.setFillColor(235,233,228);
        doc.roundedRect(x, y, barW, 2.5, 1, 1, "F");
        if (value && max) {
          doc.setFillColor(...color);
          doc.roundedRect(x, y, Math.max(1.5, (value/max)*barW), 2.5, 1, 1, "F");
        }
      }
      function newPage(header=true) {
        doc.addPage();
        if (header) {
          rect(0, 0, W, 14, 0, RED);
          setFont("bold", 9, [255,255,255]);
          doc.text(titulo, 16, 9.5);
          setFont("normal", 7.5, [255,200,200]);
          doc.text(now, W-16, 9.5, { align:"right" });
        }
        return 20;
      }
      function checkY(y, needed=30) {
        if (y + needed > H - 20) return newPage();
        return y;
      }

      // ── data ─────────────────────────────────────────────────────────────
      const globalAvg = avgArr(filtered.map(e=>e.score_global));
      const dimAvgs = DIMS_META.map(d => ({ ...d, score: avgArr(filtered.map(e=>e[`score_${d.key}`])) }));
      const strongest = [...dimAvgs].filter(d=>d.score).sort((a,b)=>b.score-a.score)[0];
      const weakest   = [...dimAvgs].filter(d=>d.score).sort((a,b)=>a.score-b.score)[0];
      const spread    = strongest&&weakest ? parseFloat((strongest.score-weakest.score).toFixed(1)) : null;
      const LV_NAMES  = ["","Básico","Emergente","Robusto","Avanzado","Líder"];
      const LV_COLORS_RGB = [[120,113,108],[217,119,6],[37,99,235],[124,58,237],[5,150,105]];

      const gapsData = DIMS_META.map(d => {
        const sc = avgArr(filtered.map(e=>e[`score_${d.key}`]));
        if (!sc || sc > 3) return null;
        return { ...d, score:sc, gap:parseFloat((5-sc).toFixed(1)), n:filtered.filter(e=>e[`score_${d.key}`]).length };
      }).filter(Boolean).sort((a,b)=>a.score-b.score);
      const critGaps = gapsData.filter(g=>g.score<=2);
      const modGaps  = gapsData.filter(g=>g.score>2);

      const byRoleData = [...new Set(filtered.map(e=>e.rol).filter(Boolean))].map(rol=>{
        const rows = filtered.filter(e=>e.rol===rol);
        return { rol, n:rows.length, score:avgArr(rows.map(e=>e.score_global)) };
      }).filter(r=>r.score).sort((a,b)=>b.score-a.score);

      const heatDirs = [...new Set(filtered.map(e=>e.direccion).filter(Boolean))].sort();
      const heatRows = heatDirs.map(dir => {
        const rows = filtered.filter(e=>e.direccion===dir);
        const r = { dir, n:rows.length, global:avgArr(rows.map(e=>e.score_global)) };
        DIMS_META.forEach(d => { r[d.key] = avgArr(rows.map(e=>e[`score_${d.key}`])); });
        return r;
      });

      const distData = [1,2,3,4,5].map(v => ({
        v, label: LV_NAMES[v],
        count: filtered.filter(e=>Math.round(e.score_global)===v).length,
        color: LV_COLORS_RGB[v-1],
      }));

      // ══════════════════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════════════════
      if (sections.portada) {
        // Red hero
        rect(0, 0, W, 110, 0, RED);
        // Dot grid pattern
        doc.setFillColor(255,255,255);
        for (let gx = 10; gx < W; gx += 14) {
          for (let gy = 10; gy < 110; gy += 14) {
            doc.circle(gx, gy, 0.4, "F");
          }
        }
        // Decorative circles
        doc.setFillColor(255,255,255);
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.circle(W-20, 20, 60, "F");
        doc.circle(30, 95, 35, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Logo area
        rect(16, 16, 42, 9, 3, [200,20,15]);
        setFont("bold", 9, [255,255,255]);
        doc.text("KEARNEY", 37, 21.5, { align:"center" });

        // Title
        setFont("bold", 28, [255,255,255]);
        const titleLines = doc.splitTextToSize(titulo, W-40);
        let ty = 48;
        titleLines.forEach(line => { doc.text(line, 16, ty); ty += 11; });

        setFont("normal", 12, [255,200,200]);
        doc.text(subtitulo, 16, ty+4);

        // Date pill
        doc.setFillColor(255,255,255);
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.roundedRect(14, ty+12, 70, 8, 2, 2, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));
        setFont("bold", 8, [255,255,255]);
        doc.text(`📅 ${now}`, 18, ty+17);

        // Summary box
        rect(16, 118, W-32, 44, 6, [255,248,248]);
        doc.setDrawColor(232,37,31);
        doc.setLineWidth(0.5);
        doc.roundedRect(16, 118, W-32, 44, 6, 6);

        setFont("bold", 8, MID);
        doc.text("RESUMEN EJECUTIVO", 24, 128);
        hline(131, [255,220,218]);

        // KPI boxes on cover
        const kpis = [
          { label:"Evaluaciones", value: String(filtered.length) },
          { label:"Score Global", value: globalAvg?.toFixed(1)||"—" },
          { label:"Nivel", value: globalAvg?LV_NAMES[Math.round(globalAvg)]||"—":"—" },
          { label:"Dispersión", value: spread!=null?`${spread}pts`:"—" },
        ];
        kpis.forEach((k,i) => {
          const kx = 24 + i*(W-48)/4;
          rect(kx, 134, (W-48)/4-4, 20, 4, [255,241,241]);
          setFont("bold", 16, RED);
          doc.text(k.value, kx+((W-48)/4-4)/2, 146, { align:"center" });
          setFont("normal", 7, MID);
          doc.text(k.label, kx+((W-48)/4-4)/2, 152, { align:"center" });
        });

        // Filtros usados
        let fy = 170;
        if (filterDir.length || filterRol.length) {
          setFont("bold", 8, MID);
          doc.text("Filtros aplicados:", 16, fy); fy += 6;
          if (filterDir.length) {
            setFont("normal", 7.5, MID);
            doc.text(`Dirección: ${filterDir.join(", ")}`, 20, fy); fy += 5;
          }
          if (filterRol.length) {
            setFont("normal", 7.5, MID);
            doc.text(`Rol: ${filterRol.join(", ")}`, 20, fy); fy += 5;
          }
        }

        // Sections included
        setFont("bold", 8, MID);
        doc.text("Secciones incluidas:", 16, Math.max(fy+4,178));
        const included = Object.entries(sections).filter(([,v])=>v&&k!=="portada").map(([k])=>SECTION_LABELS[k]?.label||k);
        setFont("normal", 7.5, MID);
        const incText = included.join("  ·  ");
        const incLines = doc.splitTextToSize(incText, W-32);
        incLines.forEach((line,i) => doc.text(line, 16, Math.max(fy+4,178)+6+i*4.5));

        // Footer on cover
        rect(0, H-14, W, 14, 0, [30,30,28]);
        setFont("normal", 7.5, [150,148,144]);
        doc.text(`Confidencial · Generado ${now} · ${filtered.length} evaluaciones incluidas`, W/2, H-6, { align:"center" });
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE: KPIs EJECUTIVOS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.resumen_kpis) {
        let y = newPage();
        setFont("bold", 16, RED);
        doc.text("KPIs Ejecutivos", 16, y); y += 4;
        hline(y); y += 8;

        // 4 big KPI boxes
        const kpiBox = (x, bw, icon, label, value, sub, rgb) => {
          rect(x, y, bw-3, 28, 5, [248,246,243]);
          doc.setDrawColor(...rgb, 60);
          doc.setLineWidth(0.5);
          doc.roundedRect(x, y, bw-3, 28, 5, 5);
          setFont("normal", 11, []);
          doc.setTextColor(...rgb);
          doc.text(icon, x+5, y+9);
          setFont("bold", 18, rgb);
          doc.text(value, x+(bw-3)/2, y+19, { align:"center" });
          setFont("normal", 7, MID);
          doc.text(label, x+(bw-3)/2, y+25, { align:"center" });
          if (sub) {
            setFont("normal", 6.5, LIGHT);
            doc.text(sub, x+(bw-3)/2, y+28.5, { align:"center" });
          }
        };
        const bw = (W-32)/4;
        kpiBox(16, bw, "⭐", "Score Global Prom.", globalAvg?.toFixed(2)||"—", `${filtered.length} evaluaciones`, RED);
        kpiBox(16+bw, bw, "💪", "Dimensión más fuerte", strongest?.num||"—", strongest?.label, [5,150,105]);
        kpiBox(16+bw*2, bw, "⚠️", "Dimensión más débil", weakest?.num||"—", weakest?.label, [220,38,38]);
        kpiBox(16+bw*3, bw, "📐", "Dispersión", spread!=null?`${spread}`:"-", "max − min (pts)", spread>=2?RED:spread>=1?[217,119,6]:[5,150,105]);
        y += 36;

        // Dim scores row
        setFont("bold", 9, DARK);
        doc.text("Score promedio por dimensión", 16, y); y += 6;
        DIMS_META.forEach((d,i) => {
          const sc = dimAvgs.find(x=>x.key===d.key)?.score;
          const rgb = sc ? LV_COLORS_RGB[Math.round(sc)-1] : [180,178,174];
          const dx = 16 + i*(W-32)/7;
          const dw = (W-32)/7 - 3;
          rect(dx, y, dw, 22, 4, [248,246,243]);
          setFont("bold", 7, rgb);
          doc.text(d.num, dx+dw/2, y+6, { align:"center" });
          setFont("bold", 13, rgb);
          doc.text(sc?.toFixed(1)||"—", dx+dw/2, y+15, { align:"center" });
          miniBar(dx+2, y+18, sc||0, 5, rgb, dw-4);
        });
        y += 30;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE: DISTRIBUCIÓN
      // ══════════════════════════════════════════════════════════════════════
      if (sections.distribucion) {
        let y = checkY(999); // force new page for this section
        y = newPage(); 
        setFont("bold", 16, RED);
        doc.text("Distribución por Nivel de Madurez", 16, y); y += 4;
        hline(y); y += 10;

        const maxCount = Math.max(...distData.map(d=>d.count), 1);
        const barAreaH = 60;
        const barW = (W-60) / 5;

        distData.forEach((l, i) => {
          const bx = 30 + i * barW;
          const bh = l.count > 0 ? Math.max(4, (l.count/maxCount)*barAreaH) : 0;
          // Bar BG
          doc.setFillColor(240,238,233);
          doc.roundedRect(bx, y, barW-4, barAreaH, 3, 3, "F");
          // Bar fill
          if (bh > 0) {
            doc.setFillColor(...l.color);
            doc.roundedRect(bx, y+barAreaH-bh, barW-4, bh, 3, 3, "F");
          }
          // Count on top
          setFont("bold", 12, l.color);
          doc.text(String(l.count), bx+(barW-4)/2, y+barAreaH-bh-2, { align:"center" });
          // Label
          setFont("bold", 7.5, l.color);
          doc.text(l.label, bx+(barW-4)/2, y+barAreaH+7, { align:"center" });
          // Pct
          setFont("normal", 7, MID);
          doc.text(`${l.pct}%`, bx+(barW-4)/2, y+barAreaH+13, { align:"center" });
        });
        y += barAreaH + 20;

        // Pill summary
        distData.filter(d=>d.count>0).forEach(l => {
          pill(16, y, `${l.label}: ${l.count} eval. (${l.pct}%)`, [...l.color, 0.15].slice(0,3), l.color);
          y += 7;
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE: HEATMAP
      // ══════════════════════════════════════════════════════════════════════
      if (sections.heatmap && heatRows.length > 0) {
        let y = newPage();
        setFont("bold", 16, RED);
        doc.text("Heatmap Dirección × Dimensión", 16, y); y += 4;
        hline(y); y += 8;

        const cols = ["Dirección","n","Global",...DIMS_META.map(d=>d.num)];
        const colW  = [42, 10, 18, ...Array(7).fill((W-32-42-10-18)/7)];
        let cx = 16;

        // Header row
        rect(16, y, W-32, 7, 2, [248,246,243]);
        cols.forEach((col,i) => {
          setFont("bold", 7, MID);
          doc.text(col, cx+colW[i]/2, y+4.8, { align:"center" });
          cx += colW[i];
        });
        y += 8;

        heatRows.sort((a,b)=>(b.global||0)-(a.global||0)).forEach(row => {
          y = checkY(y, 10);
          cx = 16;
          // Dir
          setFont("bold", 8, DARK);
          doc.text(row.dir, cx+2, y+4.8);
          cx += colW[0];
          // n
          setFont("normal", 7.5, MID);
          doc.text(String(row.n), cx+colW[1]/2, y+4.8, { align:"center" });
          cx += colW[1];
          // Global
          const gl = row.global ? LV_COLORS_RGB[Math.round(row.global)-1] : [200,198,192];
          rect(cx, y+0.5, colW[2]-1, 6.5, 2, [...gl].map(c=>Math.min(255,c+200)));
          setFont("bold", 8, gl);
          doc.text(row.global?.toFixed(1)||"—", cx+colW[2]/2, y+4.8, { align:"center" });
          cx += colW[2];
          // Dims
          DIMS_META.forEach(d => {
            const v = row[d.key];
            const rgb = v ? LV_COLORS_RGB[Math.round(v)-1] : [200,198,192];
            if (v) {
              rect(cx+0.5, y+0.5, colW[3]-1, 6.5, 2, [...rgb].map(c=>Math.min(255,c+200)));
            }
            setFont(v?"bold":"normal", v?8:7, v?rgb:LIGHT);
            doc.text(v?.toFixed(1)||"—", cx+colW[3]/2, y+4.8, { align:"center" });
            cx += colW[3];
          });
          hline(y+8, [240,238,233]);
          y += 9;
        });

        // Legend
        y += 6;
        setFont("bold", 7, MID);
        doc.text("Referencia de colores:", 16, y); y += 5;
        ["#1","Básico","#2","Emergente","#3","Robusto","#4","Avanzado","#5","Líder"].forEach((lbl,i) => {
          if (i%2===0) return;
          const lx = 16 + Math.floor(i/2)*42;
          const rgb = LV_COLORS_RGB[Math.floor(i/2)];
          doc.setFillColor(...rgb.map(c=>Math.min(255,c+200)));
          doc.roundedRect(lx-1, y-3.5, 40, 5, 1.5, 1.5, "F");
          setFont("bold", 7, rgb);
          doc.text(lbl, lx+20, y, { align:"center" });
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // POR ROL
      // ══════════════════════════════════════════════════════════════════════
      if (sections.por_rol && byRoleData.length > 0) {
        let y = newPage();
        setFont("bold", 16, RED);
        doc.text("Score Promedio por Rol", 16, y); y += 4;
        hline(y); y += 10;

        byRoleData.forEach((r,i) => {
          y = checkY(y, 12);
          const sc = r.score;
          const rgb = sc ? LV_COLORS_RGB[Math.round(sc)-1] : [180,178,174];
          setFont("bold", 8, rgb);
          doc.text(`#${i+1}`, 16, y+3);
          setFont("bold", 10, DARK);
          doc.text(r.rol, 26, y+3);
          setFont("normal", 8, MID);
          doc.text(`n=${r.n}`, 110, y+3);
          miniBar(120, y, sc||0, 5, rgb, 55);
          setFont("bold", 11, rgb);
          doc.text(sc?.toFixed(2)||"—", W-16, y+3, { align:"right" });
          hline(y+7, [240,238,233]);
          y += 10;
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // BRECHAS CRÍTICAS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.brechas_crit) {
        let y = newPage();
        rect(0, 0, W, 14, 0, RED); // override header to red
        setFont("bold", 9, [255,255,255]);
        doc.text(titulo, 16, 9.5);
        setFont("bold", 16, RED);
        y = 20;
        doc.text("🚨 Brechas Críticas — Nivel 1–2", 16, y); y += 4;
        hline(y); y += 6;
        setFont("normal", 9, MID);
        doc.text(`${critGaps.length} dimensiones en estado básico o emergente. Acción inmediata recomendada.`, 16, y); y += 8;

        if (critGaps.length === 0) {
          rect(16, y, W-32, 14, 4, [236,253,245]);
          setFont("bold", 9, [5,150,105]);
          doc.text("✅  No se identificaron brechas críticas en la selección actual", W/2, y+9, { align:"center" });
          y += 20;
        } else {
          critGaps.forEach(g => {
            y = checkY(y, 28);
            const rgb = LV_COLORS_RGB[Math.round(g.score)-1];
            rect(16, y, W-32, 24, 4, [255,248,248]);
            doc.setDrawColor(254,202,202);
            doc.roundedRect(16, y, W-32, 24, 4, 4);
            // Icon + title
            setFont("bold", 11, DARK);
            doc.text(`${g.dimIcon}  ${g.dimLabel}`, 22, y+8);
            // Score badge
            rect(W-50, y+3, 32, 7, 3, [...rgb].map(c=>Math.min(255,c+200)));
            setFont("bold", 8, rgb);
            doc.text(`${g.score.toFixed(1)} · ${lvLabel(g.score)}`, W-34, y+7.5, { align:"center" });
            // Gap
            setFont("bold", 8, [220,38,38]);
            doc.text(`+${g.gap.toFixed(1)} niveles de brecha`, 22, y+15);
            // Minibar
            miniBar(22, y+18.5, g.score, 5, rgb, W-52);
            setFont("normal", 7, MID);
            doc.text(`${g.n} evaluaciones promediadas`, W-16, y+22, { align:"right" });
            y += 28;
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // BRECHAS MODERADAS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.brechas_mod) {
        let y = newPage();
        setFont("bold", 16, [217,119,6]);
        doc.text("⚡ Brechas Moderadas — Nivel 3", 16, y); y += 4;
        hline(y,[254,230,138]); y += 8;

        if (modGaps.length === 0) {
          setFont("normal", 10, MID);
          doc.text("Sin brechas moderadas identificadas.", 16, y);
        } else {
          modGaps.forEach(g => {
            y = checkY(y, 22);
            const rgb = LV_COLORS_RGB[Math.round(g.score)-1];
            rect(16, y, W-32, 18, 4, [255,251,240]);
            doc.setDrawColor(253,230,138);
            doc.roundedRect(16, y, W-32, 18, 4, 4);
            setFont("bold", 10, DARK);
            doc.text(`${g.dimIcon}  ${g.dimLabel}`, 22, y+7);
            miniBar(22, y+11, g.score, 5, rgb, W-52);
            setFont("bold", 8, rgb);
            doc.text(`${g.score.toFixed(1)} / 5`, W-16, y+8, { align:"right" });
            setFont("normal", 7, MID);
            doc.text(`n=${g.n}`, W-16, y+15, { align:"right" });
            y += 22;
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // ROADMAP
      // ══════════════════════════════════════════════════════════════════════
      if (sections.roadmap && gapsData.length > 0) {
        let y = newPage();
        setFont("bold", 16, RED);
        doc.text("🗺️ Hoja de Ruta Priorizada", 16, y); y += 4;
        hline(y); y += 8;

        const phases = [
          { t:"🚀 Corto Plazo",   sub:"0–6 meses",    rgb:[220,38,38],  bgRGB:[255,242,242], items:critGaps.slice(0,4) },
          { t:"⚡ Mediano Plazo", sub:"6–12 meses",   rgb:[217,119,6],  bgRGB:[255,251,235], items:[...critGaps.slice(4),...modGaps.slice(0,3)].slice(0,4) },
          { t:"🏆 Largo Plazo",   sub:"12–24 meses",  rgb:[5,150,105],  bgRGB:[236,253,245], items:modGaps.slice(3,7) },
        ];
        const colW2 = (W-38)/3;
        phases.forEach((ph,pi) => {
          const px = 16 + pi*(colW2+3);
          rect(px, y, colW2, 12, 4, ph.bgRGB);
          doc.setDrawColor(...ph.rgb,80);
          doc.roundedRect(px, y, colW2, 12, 4, 4);
          setFont("bold", 9, ph.rgb);
          doc.text(ph.t, px+5, y+6);
          setFont("normal", 7, [...ph.rgb].map(c=>Math.min(200,c+40)));
          doc.text(ph.sub, px+5, y+10.5);
        });
        y += 16;

        const maxItems = Math.max(...phases.map(p=>p.items.length));
        for (let row=0; row < maxItems; row++) {
          y = checkY(y, 14);
          phases.forEach((ph,pi) => {
            const px = 16 + pi*(colW2+3);
            const g = ph.items[row];
            if (!g) return;
            const rgb = LV_COLORS_RGB[Math.round(g.score)-1];
            rect(px, y, colW2, 11, 3, [250,249,247]);
            setFont("bold", 8.5, DARK);
            doc.text(`${g.dimIcon} ${g.dimLabel}`, px+4, y+5);
            miniBar(px+4, y+7, g.score, 5, rgb, colW2-18);
            setFont("bold", 8, rgb);
            doc.text(g.score.toFixed(1), px+colW2-4, y+5, { align:"right" });
          });
          y += 14;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // RANKING
      // ══════════════════════════════════════════════════════════════════════
      if (sections.ranking) {
        let y = newPage();
        setFont("bold", 16, RED);
        doc.text("🏆 Ranking de Evaluaciones", 16, y); y += 4;
        hline(y); y += 8;

        const sorted = [...filtered].sort((a,b)=>(b.score_global||0)-(a.score_global||0)).slice(0,15);
        // Header
        rect(16, y, W-32, 7, 2, [248,246,243]);
        setFont("bold", 7.5, MID);
        const RCols = [[16,"#",8],[26,"Dirección",50],[78,"Rol",36],[116,"Score",18],[136,"Nivel",28],[166,"Fecha",30]];
        RCols.forEach(([cx,lbl])=>{ doc.text(lbl, cx, y+4.8); });
        y += 8;

        sorted.forEach((e,i) => {
          y = checkY(y, 10);
          const rgb = e.score_global ? LV_COLORS_RGB[Math.round(e.score_global)-1] : [180,178,174];
          if (i===0) rect(16, y-0.5, W-32, 9, 2, [255,248,248]);
          setFont("bold", 8, i===0?RED:MID);
          doc.text(`#${i+1}`, 16, y+4.5);
          setFont(i<3?"bold":"normal", 8, DARK);
          doc.text((e.direccion||"—").slice(0,22), 26, y+4.5);
          setFont("normal", 8, MID);
          doc.text((e.rol||"—").slice(0,18), 78, y+4.5);
          setFont("bold", 9, rgb);
          doc.text(e.score_global?.toFixed(2)||"—", 116, y+4.5);
          rect(136, y+0.5, 28, 6, 2, [...rgb].map(c=>Math.min(255,c+200)));
          setFont("bold", 7, rgb);
          doc.text(lvLabel(e.score_global), 136+14, y+4.5, { align:"center" });
          setFont("normal", 7, LIGHT);
          doc.text(e.created_at?.slice(0,10)||"—", 166, y+4.5);
          hline(y+8.5,[240,238,233]);
          y += 10;
        });
      }

      // ── Page numbers ──────────────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let p=1; p<=totalPages; p++) {
        doc.setPage(p);
        if (p > 1 || !sections.portada) {
          setFont("normal", 7, LIGHT);
          doc.text(`Página ${p} de ${totalPages}`, W-16, H-5, { align:"right" });
          setFont("normal", 7, LIGHT);
          doc.text("Confidencial · Kearney · Diagnóstico de Madurez de Inventarios", 16, H-5);
        }
      }

      const fname = `Reporte_Madurez_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fname);
    } catch(err) {
      console.error("PDF error:", err);
      alert("Error generando PDF: " + err.message);
    }
    setGenerating(false);
  }

  const RED  = "#7823DC";
  const secCount = Object.values(sections).filter(Boolean).length;

  return (
    <div style={{ display:"flex", gap:24 }}>

      {/* ── LEFT: Config panel ── */}
      <div style={{ width:320, flexShrink:0, display:"flex", flexDirection:"column", gap:16 }}>

        {/* Título y subtítulo */}
        <div style={{ background:"#FFFFFF", borderRadius:16, border:"1px solid #E8E4DF", padding:"22px 20px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".14em", marginBottom:14 }}>
            Contenido del reporte
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:"#555", marginBottom:5 }}>Título</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} style={{
              width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid #E8E4DF",
              fontSize:12, color:"#1A1A18", background:"#FAFAF8", outline:"none",
            }}/>
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:600, color:"#555", marginBottom:5 }}>Subtítulo</div>
            <input value={subtitulo} onChange={e=>setSubtitulo(e.target.value)} style={{
              width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid #E8E4DF",
              fontSize:12, color:"#1A1A18", background:"#FAFAF8", outline:"none",
            }}/>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ background:"#FFFFFF", borderRadius:16, border:"1px solid #E8E4DF", padding:"22px 20px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".14em", marginBottom:14 }}>Datos a incluir</div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:"#555", marginBottom:7 }}>Dirección</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {allDirs.map(d=>(
                <button key={d} onClick={()=>toggleDir(d)} style={{
                  padding:"4px 11px", borderRadius:99, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${filterDir.includes(d)?RED:"#E8E4DF"}`,
                  background:filterDir.includes(d)?RED+"18":"#FAFAFA",
                  color:filterDir.includes(d)?RED:"#999",
                }}>{d}</button>
              ))}
              {!allDirs.length && <div style={{ fontSize:11, color:"#CCC" }}>Sin datos</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:600, color:"#555", marginBottom:7 }}>Rol</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {allRols.map(r=>(
                <button key={r} onClick={()=>toggleRol(r)} style={{
                  padding:"4px 11px", borderRadius:99, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${filterRol.includes(r)?RED:"#E8E4DF"}`,
                  background:filterRol.includes(r)?RED+"18":"#FAFAFA",
                  color:filterRol.includes(r)?RED:"#999",
                }}>{r}</button>
              ))}
              {!allRols.length && <div style={{ fontSize:11, color:"#CCC" }}>Sin datos</div>}
            </div>
          </div>
          <div style={{ marginTop:12, padding:"9px 12px", borderRadius:9, background:"#F7F5F2",
            fontSize:11, fontWeight:600, color:"#555", display:"flex", justifyContent:"space-between" }}>
            <span>Evaluaciones incluidas</span>
            <span style={{ color:RED, fontWeight:800 }}>{filtered.length}</span>
          </div>
        </div>

        {/* Secciones checklist */}
        <div style={{ background:"#FFFFFF", borderRadius:16, border:"1px solid #E8E4DF", padding:"22px 20px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".14em", marginBottom:14 }}>
            Secciones del PDF
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {Object.entries(SECTION_LABELS).map(([k,s])=>(
              <label key={k} style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer",
                padding:"8px 10px", borderRadius:10,
                background: sections[k]?"#FFF8F7":"#FAFAF8",
                border:`1px solid ${sections[k]?"#FDDCDA":"#F0EDE9"}`,
                transition:"all .15s" }}>
                <input type="checkbox" checked={!!sections[k]} onChange={()=>toggleSection(k)}
                  style={{ marginTop:1, accentColor:RED, cursor:"pointer" }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: sections[k]?"#1A1A18":"#AAA" }}>
                    {s.icon} {s.label}
                  </div>
                  <div style={{ fontSize:10, color:"#CCC", marginTop:2, lineHeight:1.4 }}>{s.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#AAA" }}>{secCount} sección{secCount!==1?"es":""} seleccionada{secCount!==1?"s":""}</span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setSections(Object.fromEntries(Object.keys(SECTION_LABELS).map(k=>[k,true])))} style={{
                fontSize:10, color:RED, background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:"2px 4px" }}>Todas</button>
              <button onClick={()=>setSections(Object.fromEntries(Object.keys(SECTION_LABELS).map(k=>[k,false])))} style={{
                fontSize:10, color:"#AAA", background:"none", border:"none", cursor:"pointer", padding:"2px 4px" }}>Ninguna</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Preview + Generate ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14 }}>

        {/* PDF Preview card */}
        <div style={{ background:"#FFFFFF", borderRadius:16, border:"1px solid #E8E4DF",
          overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.06)" }}>
          {/* Cover preview */}
          <div style={{ background:"linear-gradient(150deg,#5A1AA0 0%,#7823DC 55%,#C01010 100%)",
            padding:"32px 28px 28px", position:"relative", overflow:"hidden" }}>
            {/* dot grid */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",
              backgroundSize:"20px 20px", pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase",
                letterSpacing:".18em", marginBottom:10 }}>Vista previa · Portada</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFFFFF", lineHeight:1.25, letterSpacing:"-.02em",
                marginBottom:6, maxWidth:380 }}>{titulo||"Sin título"}</div>
              <div style={{ fontSize:13, color:"rgba(255,200,200,.9)", marginBottom:16 }}>{subtitulo}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { l:"Evaluaciones", v:filtered.length },
                  { l:"Score Global", v:avgArr(filtered.map(e=>e.score_global))?.toFixed(2)||"—" },
                  { l:"Secciones PDF", v:secCount },
                ].map(k=>(
                  <div key={k.l} style={{ background:"rgba(255,255,255,.15)", borderRadius:10,
                    padding:"8px 14px", textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:"#FFF" }}>{k.v}</div>
                    <div style={{ fontSize:9.5, color:"rgba(255,200,200,.8)", marginTop:2 }}>{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sections included list */}
          <div style={{ padding:"20px 24px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".14em", marginBottom:12 }}>
              Secciones incluidas en el PDF
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {Object.entries(sections).filter(([,v])=>v).map(([k])=>(
                <div key={k} style={{ padding:"4px 11px", borderRadius:99, fontSize:11, fontWeight:600,
                  background:"#F7F5F2", border:"1px solid #E8E4DF", color:"#555" }}>
                  {SECTION_LABELS[k]?.icon} {SECTION_LABELS[k]?.label}
                </div>
              ))}
              {!secCount && <div style={{ fontSize:12, color:"#CCC" }}>Selecciona al menos una sección</div>}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generatePDF} disabled={generating || filtered.length===0 || secCount===0}
          style={{
            padding:"18px", borderRadius:14, border:"none", width:"100%",
            background: (generating||filtered.length===0||secCount===0)
              ? "#E8E4DF"
              : "linear-gradient(135deg,#7823DC,#5A1AA0)",
            color: (generating||filtered.length===0||secCount===0)?"#AAA":"#FFFFFF",
            fontWeight:800, fontSize:15, cursor: generating||filtered.length===0||secCount===0?"not-allowed":"pointer",
            boxShadow: generating?"none":"0 8px 24px rgba(120,35,220,0.35)",
            transition:"all .2s", letterSpacing:"-.01em",
          }}>
          {generating ? "⏳ Generando PDF..." : "⬇ Generar y Descargar PDF"}
        </button>

        {filtered.length === 0 && (
          <div style={{ textAlign:"center", fontSize:12, color:"#AAA" }}>
            Selecciona al menos una dirección o rol para incluir datos
          </div>
        )}
        {filtered.length > 0 && secCount === 0 && (
          <div style={{ textAlign:"center", fontSize:12, color:"#AAA" }}>
            Selecciona al menos una sección para generar el PDF
          </div>
        )}
      </div>
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
            background: "linear-gradient(135deg,#7823DC,#5A1AA0)",
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
  const [tab, setTab] = useState("empresas");
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [empresas, setEmpresas]           = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  async function fetchDataSilent() {
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("evaluaciones").select("*").order("created_at", { ascending: false }),
        supabase.from("respuestas").select("*"),
        supabase.from("empresas").select("*").order("created_at", { ascending: false }),
      ]);
      if (!r1.error) setEvaluaciones(r1.data || []);
      if (!r2.error) setRespuestas(r2.data || []);
      if (!r3.error) setEmpresas(r3.data || []);
    } catch(e) { console.error("fetchDataSilent:", e); }
  }

  async function fetchData() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const timeout = setTimeout(() => { setLoading(false); loadingRef.current = false; }, 10000);
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("evaluaciones").select("*").order("created_at", { ascending: false }),
        supabase.from("respuestas").select("*"),
        supabase.from("empresas").select("*").order("created_at", { ascending: false }),
      ]);
      if (!r1.error) setEvaluaciones(r1.data || []);
      if (!r2.error) setRespuestas(r2.data   || []);
      if (!r3.error) setEmpresas(r3.data     || []);
    } catch(e) {
      console.error("fetchData error:", e);
    } finally {
      clearTimeout(timeout);
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    fetchData();

    // ── Realtime: re-fetch silently on any change in evaluaciones or respuestas ──
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluaciones" },
        () => fetchDataSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "respuestas" },
        () => fetchDataSilent())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authed]);

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
    { id: "empresas",  icon: "🏢", label: "Empresas" },
    { id: "monitor",   icon: "📊", label: "Monitoreo" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "links",     icon: "🔗", label: "Links" },
    { id: "reporte",   icon: "📄", label: "Reporte PDF" },
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
        <div style={{ marginBottom: 32, padding: "0 8px", display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzIiIGZpbGw9Im5vbmUiPjx0ZXh0IHg9IjUwJSIgeT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSInR2lsbCBTYW5zJywnVHJlYnVjaGV0IE1TJywnSGVsdmV0aWNhIE5ldWUnLEhlbHZldGljYSxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmb250LXdlaWdodD0iNTAwIiBmaWxsPSIjMUUxRTFFIiBsZXR0ZXItc3BhY2luZz0iNCI+S0VBUk5FWTwvdGV4dD48L3N2Zz4=" alt="Kearney" style={{ height:17, display:"block", marginBottom:6, maxWidth:"100%" }}/>
          <div style={{ fontSize:9, fontWeight:700, color:"#7823DC", letterSpacing:".1em", textTransform:"uppercase" }}>Inventarios · Admin</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                color: tab === t.id ? "#7823DC" : "#999",
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </div>
          ))}
        </div>

        <button onClick={fetchData} className="btn-action" style={{
          padding: "12px 12px", borderRadius: 10, border: "none",
          background: loading ? "#D1D0CB" : "linear-gradient(135deg,#7823DC,#5A1AA0)",
          color: "#fff", fontSize: 13,
          fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: loading ? "none" : "0 4px 14px rgba(120,35,220,0.35)",
        }}>
          <span className={loading ? "spin" : ""} style={{ display: "inline-block", fontSize: 14 }}>🔄</span>
          {loading ? "Cargando..." : "Actualizar"}
        </button>

        <button onClick={() => setAuthed(false)} className="btn-action" style={{
          marginTop: 8, padding: "10px 12px", borderRadius: 10,
          border: "1px solid #E8E4DF", background: "transparent",
          color: "#BBB", fontSize: 12, cursor: "pointer",
        }}>🚪 Cerrar sesión</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "0" }}>

        {/* ── Refresh bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 36px", background: "#fff",
          borderBottom: "1px solid #E8E4DF", flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: "#AAA", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background: loading ? "#F59E0B" : "#10B981", display:"inline-block" }}/>
            {loading ? "Actualizando..." : "En vivo · Supabase Realtime"}
          </div>
          <button onClick={fetchData} disabled={loading} className="btn-action" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: loading ? "#E8E4DF" : "linear-gradient(135deg,#9B35F5,#7823DC,#5A1AA0)",
            color: loading ? "#AAA" : "#fff", fontSize: 13, fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 18px rgba(120,35,220,0.45)",
            letterSpacing: "-.01em",
            transform: loading ? "none" : "translateY(0)",
            transition: "all .15s ease",
          }}
            onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(120,35,220,0.55)"; }}}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=loading?"none":"0 4px 18px rgba(120,35,220,0.45)"; }}
          >
            <span className={loading ? "spin" : ""} style={{ fontSize: 14 }}>🔄</span>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>
        </div>

        <div style={{ padding: "32px 36px" }}>
          <div style={{ marginBottom: 28 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#7823DC", letterSpacing: "-.02em" }}>
                {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
              </div>
              <div style={{ fontSize: 12, color: "#AAA", marginTop: 3 }}>
                {tab === "monitor"   && "Seguimiento en tiempo real de todos los diagnósticos registrados — avance, puntajes por dimensión y perfil del respondente."}
                {tab === "links"     && "Crea y comparte links de acceso únicos por empresa para que los equipos realicen el diagnóstico."}
                {tab === "analytics" && "Comparativas de madurez por dirección, rol e industria para identificar patrones y brechas clave."}
                {tab === "reporte"   && "Genera reportes PDF personalizados con resultados, brechas y oportunidades por empresa."}
                {tab === "downloads" && "Exporta los datos de evaluaciones en formato Excel para análisis adicional."}
                {tab === "empresas"  && "Configura empresas, industrias, colores, preguntas personalizadas, direcciones y roles para cada cliente."}
              </div>
            </div>
            {tab !== "empresas" && tab !== "links" && empresas.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#BBB", textTransform:"uppercase", letterSpacing:".1em" }}>Empresa</span>
                <select
                  value={empresaFiltro || ""}
                  onChange={e => setEmpresaFiltro(e.target.value || null)}
                  style={{
                    padding:"6px 32px 6px 12px", borderRadius:9, fontSize:12, fontWeight:600,
                    border:"1.5px solid " + (empresaFiltro ? "#7823DC" : "#E8E4DF"),
                    background:"#FAFAFA", color: empresaFiltro ? "#7823DC" : "#666",
                    cursor:"pointer", outline:"none", appearance:"none",
                    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center",
                  }}
                >
                  <option value="">Todas</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {tab === "monitor" && (
          <MonitorTab
            evaluaciones={empresaFiltro ? evaluaciones.filter(e=>e.empresa_id===empresaFiltro) : evaluaciones} respuestas={respuestas}
            empresas={empresas}
            selected={selected} setSelected={setSelected}
            onDelete={ids => setConfirmDelete(ids)} loading={loading}
          />
        )}
        {tab === "analytics" && <AnalyticsTab evaluaciones={empresaFiltro ? evaluaciones.filter(e=>e.empresa_id===empresaFiltro) : evaluaciones} respuestas={respuestas} />}
        {tab === "reporte" && <ReportTab evaluaciones={empresaFiltro ? evaluaciones.filter(e=>e.empresa_id===empresaFiltro) : evaluaciones} respuestas={respuestas} />}
        {tab === "links" && <LinksTab />}
        {tab === "empresas" && <EmpresasTab empresas={empresas} evaluaciones={evaluaciones} onRefresh={fetchData} showToast={showToast} />}
        {tab === "downloads" && <DownloadsTab evaluaciones={empresaFiltro ? evaluaciones.filter(e=>e.empresa_id===empresaFiltro) : evaluaciones} respuestas={respuestas} />}
          </div>{/* end header+tabs wrapper */}
        </div>{/* end padding wrapper */}
      {confirmDelete && (
        <ConfirmModal count={confirmDelete.length} onConfirm={doDelete} onCancel={() => setConfirmDelete(null)} />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          padding: "10px 14px 10px 16px", borderRadius: 10,
          background: toast.type === "error" ? "#FFF1F0" : "#F0FDF4",
          border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`,
          color: toast.type === "error" ? "#991B1B" : "#166534",
          fontWeight: 500, fontSize: 12.5,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10, maxWidth: 320,
        }}>
          <span style={{ fontSize: 13 }}>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 16, color: "#AAA", lineHeight: 1, padding: "0 2px",
            flexShrink: 0,
          }}>×</button>
        </div>
      )}
    </div>
  );
}
