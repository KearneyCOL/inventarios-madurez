import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
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
  { v:4, label:"End-to-End", c:"#7C3AED", bg:"#F5F3FF" },
  { v:5, label:"Pivote",     c:"#059669", bg:"#ECFDF5" },
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
function MiniBar({ value, max=5, color="#E8251F" }) {
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

  const filtered = useMemo(() => evaluaciones.filter(e => {
    if (filterDir.length && !filterDir.includes(e.direccion)) return false;
    if (filterRol.length && !filterRol.includes(e.rol)) return false;
    if (filterLvl.length && !filterLvl.includes(Math.round(e.score_global))) return false;
    return true;
  }), [evaluaciones, filterDir, filterRol, filterLvl]);

  const hasFilters = filterDir.length || filterRol.length || filterLvl.length;
  const RED = "#E8251F";

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
          <div style={{ textAlign:"center", padding:"48px 0", color:"#AAA", fontSize:13 }}>Sin evaluaciones con los filtros seleccionados</div>
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
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[
              { id:"critical", label:`🚨 Críticas (${critGaps.length})`, c:"#DC2626" },
              { id:"moderate", label:`⚡ Moderadas (${modGaps.length})`, c:"#D97706" },
              { id:"roadmap",  label:"🗺️ Hoja de Ruta",                  c:"#059669" },
            ].map(t=>(
              <button key={t.id} onClick={()=>setGapsView(t.id)} style={{
                padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                border:`1.5px solid ${gapsView===t.id?t.c:"#E8E4DF"}`,
                background: gapsView===t.id?t.c+"15":"#FAFAFA",
                color: gapsView===t.id?t.c:"#AAA", transition:"all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {gapsView === "critical" && (
          critGaps.length === 0
            ? <div style={{ textAlign:"center", color:"#AAA", fontSize:13, padding:"32px 0" }}>✅ No hay brechas críticas en la selección actual</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {critGaps.map(g=>{
                  const l = lvMeta(g.score);
                  return (
                    <div key={g.key} style={{ background:"#FFF8F8", border:"1px solid #FECACA", borderRadius:14, padding:"16px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ fontSize:22, flexShrink:0 }}>{g.dimIcon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                            <span style={{ fontSize:9, fontWeight:700, color:RED, background:RED+"15", padding:"2px 8px", borderRadius:99 }}>{g.dimNum}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"#1A1A18" }}>{g.dimLabel}</span>
                            <span style={{ padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:l.c+"18", color:l.c, border:`1px solid ${l.c}30` }}>{g.score.toFixed(1)} · {l.label}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ flex:1, height:6, background:"#F0EDE9", borderRadius:99, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${(g.score/5)*100}%`, background:l.c, borderRadius:99 }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:800, color:"#DC2626", flexShrink:0 }}>+{g.gap.toFixed(1)} niveles de brecha</span>
                          </div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:"center", minWidth:48 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase" }}>n</div>
                          <div style={{ fontSize:20, fontWeight:900, color:"#555" }}>{g.n}</div>
                          <div style={{ fontSize:9, color:"#AAA" }}>evals</div>
                        </div>
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
    return ["","Básico","Emergente","Robusto","End-to-End","Pivote"][Math.round(v)]||"—";
  }

  async function generatePDF() {
    setGenerating(true);
    try {
      if (!window.jspdf) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ── Design Tokens (matches app: Outfit font, #E8251F red, warm neutrals) ──
      const W = 210, H = 297;
      const M = 18;          // margin
      const COL = W - M * 2; // content width

      const C = {
        red:      [232, 37,  31],
        redDk:    [180, 15,  10],
        redLt:    [255, 242, 241],
        redMid:   [253, 220, 218],
        ink:      [17,  17,  16],
        inkMid:   [85,  84,  80],
        inkSoft:  [150, 147, 140],
        inkFaint: [187, 185, 180],
        border:   [232, 228, 223],
        surface:  [247, 245, 242],
        card:     [255, 255, 255],
        warm1:    [250, 248, 245],
        lv1:      [120, 113, 108],
        lv2:      [217, 119,   6],
        lv3:      [37,  99,  235],
        lv4:      [124, 58,  237],
        lv5:      [5,  150,  105],
      };

      const LV_RGB   = [C.lv1, C.lv2, C.lv3, C.lv4, C.lv5];
      const LV_NAMES = ["", "Basico", "Emergente", "Robusto", "End-to-End", "Pivote"];
      const LV_BG    = [[245,244,242],[255,251,235],[239,246,255],[245,243,255],[236,253,245]];

      function lvRgb(v)  { return LV_RGB[Math.max(0, Math.round(v) - 1)]  || C.inkFaint; }
      function lvBg(v)   { return LV_BG[Math.max(0, Math.round(v) - 1)]   || [245,244,242]; }
      function lvName(v) { return LV_NAMES[Math.round(v)] || "-"; }

      function avgA(arr) {
        const a = arr.filter(x => x != null && !isNaN(x));
        return a.length ? parseFloat((a.reduce((s,x) => s+x, 0) / a.length).toFixed(2)) : null;
      }
      // ASCII-safe text — strips anything jsPDF Helvetica can't render
      function T(v) {
        if (v == null) return "-";
        return String(v)
          .replace(/[\u0100-\uFFFF]/g, c => {
            if (c==='\u2013'||c==='\u2014') return '-';
            if (c==='\u00D7') return 'x';
            if (c==='\u2212') return '-';
            if (c==='\u00B7') return '.';
            return '';
          })
          .replace(/\s{2,}/g, ' ').trim() || '-';
      }

      // ── Drawing primitives ─────────────────────────────────────────────────
      function fill(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
      function stroke(rgb, w) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); if(w) doc.setLineWidth(w); }
      function box(x, y, w, h, r, rgb) { fill(rgb); doc.roundedRect(x, y, w, h, r, r, "F"); }
      function boxS(x, y, w, h, r, fRgb, sRgb, sw) {
        fill(fRgb); stroke(sRgb, sw||0.3); doc.roundedRect(x, y, w, h, r, r, "FD");
      }
      function line(x1, y1, x2, y2, rgb, w) {
        stroke(rgb||C.border, w||0.3); doc.line(x1, y1, x2, y2);
      }
      function circle(x, y, r, rgb) { fill(rgb); doc.circle(x, y, r, "F"); }

      function sf(weight, size, rgb) {
        doc.setFont("helvetica", weight);
        doc.setFontSize(size);
        if (rgb) doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      }
      function txt(text, x, y, opts) { doc.text(T(text), x, y, opts||{}); }
      function txtR(text, x, y) { doc.text(T(text), x, y, { align:"right" }); }
      function txtC(text, x, y, w) { doc.text(T(text), x + (w||0)/2, y, { align:"center" }); }

      function bar(x, y, val, max, rgb, bw, bh) {
        bh = bh||3;
        box(x, y, bw, bh, bh/2, C.border);
        if (val && max) box(x, y, Math.max(bh, (val/max)*bw), bh, bh/2, rgb);
      }

      // ── Page structure ─────────────────────────────────────────────────────
      let pageNum = 0;

      function addPage(opts) {
        if (pageNum > 0) doc.addPage();
        pageNum++;
        const o = opts || {};

        if (o.cover) return; // cover handles its own layout

        // Header bar
        box(0, 0, W, 16, 0, o.darkHeader ? C.ink : C.red);

        // Red accent left stripe (thin)
        if (!o.darkHeader) {
          box(0, 0, 3, 16, 0, C.redDk);
        }

        // Document title (left)
        sf("bold", 7.5, [255,255,255]);
        txt(T(titulo).toUpperCase(), 8, 10.5);

        // Section name (right)
        if (o.section) {
          sf("normal", 7, [255, 200, 200]);
          txtR(T(o.section).toUpperCase(), W - M, 10.5);
        }

        // Thin bottom line on header
        box(0, 15.5, W, 0.5, 0, C.redDk);

        return 24; // starting Y
      }

      function pageFooter(p, total) {
        // Left: doc info
        sf("normal", 6.5, C.inkFaint);
        txt("Kearney  |  Diagnostico de Madurez de Inventarios  |  Confidencial", M, H - 7);
        // Right: page number with decorative element
        box(W - M - 18, H - 11, 18, 7, 2, C.surface);
        stroke(C.border, 0.3); doc.roundedRect(W - M - 18, H - 11, 18, 7, 2, 2);
        sf("bold", 7, C.inkMid);
        txtC(p + " / " + total, W - M - 18, H - 5.5, 18);
        // Footer line
        line(M, H - 14, W - M, H - 14, C.border, 0.3);
      }

      // ── Section header inside page ─────────────────────────────────────────
      function sectionTitle(text, sub, y) {
        // Left accent bar
        box(M, y, 3, sub ? 10 : 7, 1.5, C.red);
        sf("bold", 14, C.ink);
        txt(text, M + 7, y + (sub ? 6 : 5));
        if (sub) { sf("normal", 8, C.inkSoft); txt(sub, M + 7, y + 11); }
        return y + (sub ? 18 : 14);
      }

      function divider(y) { line(M, y, W-M, y, C.border, 0.25); return y + 4; }

      function checkY(y, needed) {
        if (y + (needed||30) > H - 20) {
          const ny = addPage({ section: currentSection });
          return ny;
        }
        return y;
      }

      let currentSection = "";

      // ── Data ──────────────────────────────────────────────────────────────
      const now = new Date().toLocaleDateString("es-CO", {day:"2-digit", month:"long", year:"numeric"});
      const globalAvg = avgA(filtered.map(e => e.score_global));
      const dimAvgs = DIMS_META.map(d => ({ ...d, score: avgA(filtered.map(e => e[`score_${d.key}`])) }));
      const strongest = [...dimAvgs].filter(d=>d.score).sort((a,b)=>b.score-a.score)[0];
      const weakest   = [...dimAvgs].filter(d=>d.score).sort((a,b)=>a.score-b.score)[0];
      const spread = strongest&&weakest ? parseFloat((strongest.score-weakest.score).toFixed(1)) : null;

      const gapsData = DIMS_META.map(d => {
        const sc = avgA(filtered.map(e => e[`score_${d.key}`]));
        if (!sc || sc > 3) return null;
        return { ...d, score:sc, gap:parseFloat((5-sc).toFixed(1)), n:filtered.filter(e=>e[`score_${d.key}`]).length };
      }).filter(Boolean).sort((a,b)=>a.score-b.score);
      const critGaps = gapsData.filter(g=>g.score<=2);
      const modGaps  = gapsData.filter(g=>g.score>2);

      const byRoleData = [...new Set(filtered.map(e=>e.rol).filter(Boolean))].map(rol => {
        const rows = filtered.filter(e=>e.rol===rol);
        return { rol, n:rows.length, score:avgA(rows.map(e=>e.score_global)) };
      }).filter(r=>r.score).sort((a,b)=>b.score-a.score);

      const heatDirs = [...new Set(filtered.map(e=>e.direccion).filter(Boolean))].sort();
      const heatRows = heatDirs.map(dir => {
        const rows = filtered.filter(e=>e.direccion===dir);
        const r = { dir, n:rows.length, global:avgA(rows.map(e=>e.score_global)) };
        DIMS_META.forEach(d => { r[d.key] = avgA(rows.map(e=>e[`score_${d.key}`])); });
        return r;
      }).sort((a,b)=>(b.global||0)-(a.global||0));

      const distData = [1,2,3,4,5].map(v => ({
        v, label:LV_NAMES[v], rgb:LV_RGB[v-1],
        count:filtered.filter(e=>Math.round(e.score_global)===v).length,
        pct: filtered.length ? Math.round(filtered.filter(e=>Math.round(e.score_global)===v).length/filtered.length*100) : 0,
      }));

      // ══════════════════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════════════════
      if (sections.portada) {
        addPage({ cover: true });

        // Full bleed red hero (top 60%)
        box(0, 0, W, 175, 0, C.red);

        // Geometric accent shapes
        // Large circle top-right (decorative)
        fill([200, 20, 15]);
        doc.circle(W - 10, -10, 55, "F");
        fill([215, 28, 22]);
        doc.circle(W + 5, 30, 35, "F");
        // Bottom arc shape
        fill([210, 24, 18]);
        doc.circle(20, 180, 40, "F");

        // Dot grid pattern (subtle)
        fill([255,255,255]);
        for (let gx = M; gx < W - M; gx += 10)
          for (let gy = 8; gy < 170; gy += 10)
            doc.circle(gx, gy, 0.28, "F");

        // ── TOP: Kearney brand strip ──
        box(M, M, 50, 11, 2, C.redDk);
        sf("bold", 10, [255,255,255]);
        txtC("KEARNEY", M, M+7.5, 50);

        // Date chip (top right)
        box(W - M - 52, M, 52, 8, 2, [200,20,15]);
        sf("normal", 7, [255,220,218]);
        txtC(T(now), W - M - 52, M + 5.5, 52);

        // ── MAIN TITLE ──
        const displayTitle = T(titulo);
        sf("bold", 28, [255,255,255]);
        const tLines = doc.splitTextToSize(displayTitle, W - M*2 - 10);
        let ty = 55;
        tLines.forEach(l => { txt(l, M, ty); ty += 12; });

        // Subtitle
        sf("normal", 12, [255,200,198]);
        txt(T(subtitulo), M, ty + 4);

        // ── HERO METRICS ROW ──
        const metrics = [
          { v: String(filtered.length),                            label: "Evaluaciones" },
          { v: globalAvg != null ? globalAvg.toFixed(1) : "-",    label: "Score Promedio" },
          { v: globalAvg ? lvName(globalAvg) : "-",               label: "Nivel Actual" },
          { v: spread != null ? spread + "pts" : "-",             label: "Dispersion" },
        ];
        const mw = (W - M * 2 - 9) / 4;
        let mx = M;
        ty += 20;
        metrics.forEach((m, i) => {
          // Card with glass-like overlay
          fill([255,255,255]); doc.setGlobalAlpha ? null : null;
          doc.setFillColor(255,255,255);
          doc.setGState && doc.GState ? null : null;
          box(mx, ty, mw, 28, 4, [220, 30, 24]);
          // Inner highlight
          box(mx, ty, mw, 1.5, 0, [255,255,255]);
          sf("bold", 20, [255,255,255]);
          txtC(T(m.v), mx, ty + 16, mw);
          sf("normal", 7, [255,210,208]);
          txtC(T(m.label).toUpperCase(), mx, ty + 23, mw);
          mx += mw + 3;
        });

        // ── WHITE LOWER SECTION ──
        box(0, 175, W, H - 175, 0, C.card);

        // Diagonal transition element
        fill(C.red);
        doc.triangle(0, 175, 60, 175, 0, 195, "F");

        // ── CONTENT GRID on white ──
        let wy = 188;

        // Filters applied (if any)
        if (filterDir.length || filterRol.length) {
          boxS(M, wy, COL, 18, 3, C.warm1, C.border);
          sf("bold", 8, C.inkMid); txt("Filtros aplicados", M + 5, wy + 6);
          sf("normal", 7.5, C.inkSoft);
          const fText = [
            filterDir.length ? "Direccion: " + T(filterDir.join(", ")) : "",
            filterRol.length ? "Rol: " + T(filterRol.join(", ")) : "",
          ].filter(Boolean).join("   |   ");
          txt(fText, M + 5, wy + 13);
          wy += 24;
        }

        // Sections included
        sf("bold", 8, C.inkMid); txt("Este reporte incluye:", M, wy + 4);
        const secLabels = Object.entries(sections).filter(([sk,v])=>v&&sk!=="portada").map(([sk])=>SECTION_LABELS[sk]?.label||sk);
        let sx = M, sy = wy + 9;
        secLabels.forEach(lbl => {
          const tw = doc.getTextWidth(T(lbl)) + 8;
          if (sx + tw > W - M) { sx = M; sy += 7; }
          boxS(sx, sy - 4, tw, 6, 2, C.surface, C.border);
          sf("normal", 6.5, C.inkMid); txt(T(lbl), sx + 4, sy);
          sx += tw + 3;
        });
        wy = sy + 10;

        // Dimensiones preview row
        sf("bold", 8, C.inkMid); txt("Dimensiones evaluadas", M, wy + 2);
        wy += 7;
        const dw2 = (COL - 6*2) / 7;
        DIMS_META.forEach((d, i) => {
          const sc = dimAvgs.find(x=>x.key===d.key)?.score;
          const rgb = sc ? lvRgb(sc) : C.border;
          const bgc = sc ? lvBg(sc) : [245,244,242];
          box(M + i*(dw2+2), wy, dw2, 16, 3, bgc);
          if (sc) { box(M + i*(dw2+2), wy, dw2, 2, 0, rgb); }
          sf("bold", 6.5, sc ? rgb : C.inkFaint);
          txtC(d.num, M + i*(dw2+2), wy + 8, dw2);
          sf("bold", 8.5, sc ? rgb : C.inkFaint);
          txtC(sc != null ? sc.toFixed(1) : "-", M + i*(dw2+2), wy + 14, dw2);
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // KPIs EJECUTIVOS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.resumen_kpis) {
        currentSection = "KPIs Ejecutivos";
        let y = addPage({ section: currentSection });

        y = sectionTitle("Resumen Ejecutivo", "Indicadores clave de madurez de inventarios", y);

        // ── 4 big KPI cards ──
        const kpis = [
          { label:"Score Global",     value: globalAvg != null ? globalAvg.toFixed(2) : "-", sub: lvName(globalAvg||0),     rgb: C.red,  wide:true },
          { label:"Dim. mas fuerte",  value: strongest ? strongest.num : "-",                sub: strongest ? T(strongest.label) : "-",  rgb: C.lv5, wide:false },
          { label:"Dim. mas debil",   value: weakest   ? weakest.num   : "-",                sub: weakest   ? T(weakest.label)   : "-",  rgb: C.red, wide:false },
          { label:"Dispersion",       value: spread != null ? spread+"pts" : "-",            sub: "max - min entre dims",                rgb: spread>=2?C.red:spread>=1?C.lv2:C.lv5, wide:false },
        ];

        // Card 1: big (left half)
        const bigW = COL * 0.4;
        const smW  = (COL * 0.6 - 6) / 3;

        // Big score card
        box(M, y, bigW, 38, 5, C.red);
        box(M, y, bigW, 4, 0, C.redDk);           // top accent
        box(M, y, 4, 38, 0, C.redDk);             // left accent
        sf("bold", 32, [255,255,255]);
        txtC(T(kpis[0].value), M, y + 22, bigW);
        sf("bold", 8, [255,200,198]);
        txtC(T(kpis[0].label).toUpperCase(), M, y + 30, bigW);
        // Level badge inside
        const lvBadgeX = M + bigW/2 - 18;
        box(lvBadgeX, y + 32, 36, 7, 3, C.redDk);
        sf("bold", 7, [255,230,228]);
        txtC(T(kpis[0].sub), lvBadgeX, y + 37, 36);

        // 3 smaller cards (right side)
        [1,2,3].forEach((ki, i) => {
          const k = kpis[ki];
          const kx = M + bigW + 3 + i*(smW+3);
          box(kx, y, smW, 38, 5, C.warm1);
          stroke(k.rgb, 0.5); doc.roundedRect(kx, y, smW, 38, 5, 5);
          box(kx, y, smW, 3, 0, k.rgb); // top bar
          sf("bold", 20, k.rgb);
          txtC(T(k.value), kx, y + 20, smW);
          sf("normal", 6.5, C.inkSoft);
          txtC(T(k.label).toUpperCase(), kx, y + 27, smW);
          sf("bold", 7, k.rgb);
          txtC(T(k.sub), kx, y + 33.5, smW);
        });
        y += 46;

        // ── Score por dimension: horizontal gauge bars ──
        y = sectionTitle("Score por dimension", "", y);

        DIMS_META.forEach((d, i) => {
          y = checkY(y, 11);
          const sc = dimAvgs.find(x=>x.key===d.key)?.score;
          const rgb = sc ? lvRgb(sc) : C.inkFaint;
          const bg  = sc ? lvBg(sc)  : [245,244,242];

          // Row background (alternating)
          if (i % 2 === 0) box(M, y-1, COL, 10, 2, C.warm1);

          // Dim number + name
          box(M, y, 14, 8, 2, sc ? bg : [245,244,242]);
          stroke(sc ? rgb : C.border, 0.3); doc.roundedRect(M, y, 14, 8, 2, 2);
          sf("bold", 6.5, sc ? rgb : C.inkFaint);
          txtC(d.num, M, y+5.5, 14);

          sf("normal", 8, C.ink);
          txt(T(d.label), M + 17, y + 5.5);

          // Score badge
          if (sc) {
            const bx = M + COL - 32;
            box(bx, y+1, 32, 6, 3, bg);
            sf("bold", 7, rgb);
            txtC(sc.toFixed(2) + "  " + lvName(sc), bx, y+5.5, 32);
          }

          // Progress bar
          const barX = M + 80, barW2 = COL - 80 - 36;
          bar(barX, y+3, sc||0, 5, sc?rgb:C.border, barW2, 3);

          // Tick marks at 1-5
          for(let t=1; t<=5; t++) {
            const tx = barX + (t/5)*barW2;
            stroke(C.border, 0.2);
            doc.line(tx, y+1.5, tx, y+2);
          }

          y += 11;
        });

        y = divider(y + 2);

        // ── Evaluaciones breakdown by level ──
        y = sectionTitle("Distribucion de evaluaciones por nivel", "", y);
        const maxC2 = Math.max(...distData.map(d=>d.count), 1);
        const bw2 = COL / 5 - 4;
        let bx2 = M;
        distData.forEach(l => {
          const bh = l.count > 0 ? Math.max(6, (l.count/maxC2) * 40) : 0;
          // BG column
          box(bx2, y, bw2, 40, 3, C.warm1);
          // Fill
          if (bh > 0) {
            box(bx2, y + 40 - bh, bw2, bh, 3, l.rgb);
            // Count inside bar
            sf("bold", 10, [255,255,255]);
            if (bh > 8) txtC(String(l.count), bx2, y+40-bh+7, bw2);
          } else {
            sf("normal", 9, C.inkFaint); txtC("0", bx2, y+22, bw2);
          }
          // Label below
          sf("bold", 7, l.rgb);
          txtC(T(l.label), bx2, y+46, bw2);
          sf("normal", 6.5, C.inkSoft);
          txtC(l.pct+"%", bx2, y+51, bw2);
          bx2 += bw2 + 4;
        });
        y += 58;
      }

      // ══════════════════════════════════════════════════════════════════════
      // HEATMAP
      // ══════════════════════════════════════════════════════════════════════
      if (sections.heatmap && heatRows.length > 0) {
        currentSection = "Heatmap";
        let y = addPage({ section: currentSection });
        y = sectionTitle("Heatmap Direccion x Dimension", "Score promedio por unidad organizacional y dimension evaluada", y);

        const nCols = DIMS_META.length;
        const labelW = 40, numW = 10, globalW = 18;
        const dimW = (COL - labelW - numW - globalW - 3) / nCols;

        // Header row
        box(M, y, COL, 9, 3, C.ink);
        sf("bold", 6.5, [255,255,255]);
        txt("DIRECCION", M+2, y+5.8);
        txtC("N", M+labelW+numW/2, y+5.8, 0);
        txtC("GLOBAL", M+labelW+numW+globalW/2, y+5.8, 0);
        DIMS_META.forEach((d, i) => {
          txtC(d.num, M+labelW+numW+globalW+3+i*dimW+dimW/2, y+5.8, 0);
        });
        y += 10;

        heatRows.forEach((row, ri) => {
          y = checkY(y, 10);
          const rowBg = ri%2===0 ? C.card : C.warm1;
          box(M, y, COL, 9, 0, rowBg);

          // Dir name
          sf("bold", 7.5, C.ink);
          txt(T(row.dir).slice(0,18), M+2, y+5.8);

          // N
          sf("normal", 7, C.inkSoft);
          txtC(String(row.n), M+labelW+numW/2, y+5.8, 0);

          // Global score — colored badge
          const gl = row.global;
          if (gl) {
            const gc = lvRgb(gl), gb = lvBg(gl);
            box(M+labelW+numW+1, y+1, globalW-2, 7, 2, gb);
            sf("bold", 7.5, gc);
            txtC(gl.toFixed(1), M+labelW+numW+1+globalW/2-1, y+5.8, 0);
          } else {
            sf("normal", 7, C.inkFaint); txtC("-", M+labelW+numW+globalW/2, y+5.8, 0);
          }

          // Dim cells
          DIMS_META.forEach((d, i) => {
            const v = row[d.key];
            const cellX = M+labelW+numW+globalW+3+i*dimW;
            if (v) {
              const vc = lvRgb(v), vb = lvBg(v);
              box(cellX+0.5, y+1, dimW-1, 7, 2, vb);
              sf("bold", 7, vc);
              txtC(v.toFixed(1), cellX+dimW/2, y+5.8, 0);
            } else {
              sf("normal", 6.5, C.inkFaint); txtC("-", cellX+dimW/2, y+5.8, 0);
            }
          });

          // Bottom row separator
          line(M, y+9, M+COL, y+9, C.border, 0.2);
          y += 9;
        });

        y += 4;
        // Legend
        sf("bold", 7, C.inkSoft); txt("Referencia de niveles:", M, y+4); y += 7;
        LV_NAMES.slice(1).forEach((name, i) => {
          const lx = M + i*36;
          box(lx, y-3.5, 34, 6, 2, LV_BG[i]);
          stroke(LV_RGB[i], 0.4); doc.roundedRect(lx, y-3.5, 34, 6, 2, 2);
          sf("bold", 6.5, LV_RGB[i]);
          txtC((i+1)+" - "+T(name), lx+17, y, 0);
        });
        y += 10;

        // By Role section (append if space, else new page)
        if (byRoleData.length > 0) {
          y = checkY(y, 20 + byRoleData.length * 11);
          y = sectionTitle("Score Promedio por Rol", "", y);

          const half = Math.ceil(byRoleData.length / 2);
          byRoleData.forEach((r, i) => {
            const col2 = i < half ? 0 : 1;
            const row2 = i < half ? i : i - half;
            const rx = M + col2 * (COL/2 + 3);
            const ry = y + row2 * 11;
            const rgb = r.score ? lvRgb(r.score) : C.inkFaint;

            checkY(ry, 10);
            if (i%2===0 && col2===0) box(rx, ry-0.5, COL/2-3, 10, 2, C.warm1);

            box(rx, ry, 18, 8, 2, C.surface);
            sf("bold", 8.5, rgb); txtC(r.score!=null?r.score.toFixed(1):"-", rx, ry+5.5, 18);

            sf("normal", 8, C.ink); txt(T(r.rol), rx+21, ry+5.5);
            sf("normal", 6.5, C.inkFaint); txt("n="+r.n, rx+21+doc.getTextWidth(T(r.rol))+3, ry+5.5);

            bar(rx+21, ry+6.5, r.score||0, 5, rgb, COL/2-3-22, 2);
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // BRECHAS CRITICAS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.brechas_crit) {
        currentSection = "Brechas Criticas";
        let y = addPage({ section: currentSection });
        y = sectionTitle("Brechas Criticas", "Dimensiones con score promedio 1-2. Accion inmediata recomendada.", y);

        if (critGaps.length === 0) {
          boxS(M, y, COL, 18, 5, [236,253,245], [167,243,208], 0.5);
          sf("bold", 10, C.lv5); txtC("Sin brechas criticas identificadas en la seleccion actual", M, y+11, COL);
          y += 24;
        } else {
          critGaps.forEach((g, gi) => {
            y = checkY(y, 36);
            const rgb = lvRgb(g.score);
            const bg  = lvBg(g.score);

            // Card
            boxS(M, y, COL, 32, 5, [255,248,248], [254,202,202], 0.5);
            // Left color stripe
            box(M, y, 4, 32, 0, rgb);
            // Dim number badge
            box(M+8, y+4, 16, 9, 3, bg);
            stroke(rgb, 0.4); doc.roundedRect(M+8, y+4, 16, 9, 3, 3);
            sf("bold", 7.5, rgb); txtC(g.num, M+8, y+10, 16);

            // Dim label
            sf("bold", 11, C.ink); txt(T(g.label), M+28, y+10);

            // Score + gap badges (right)
            const bBx = M+COL-56;
            box(bBx, y+4, 26, 9, 3, bg);
            sf("bold", 8.5, rgb); txtC("Score: "+g.score.toFixed(1), bBx, y+10, 26);
            box(bBx+29, y+4, 24, 9, 3, [255,235,235]);
            sf("bold", 8.5, [220,38,38]); txtC("+"+g.gap.toFixed(1)+" niv.", bBx+29, y+10, 24);

            // Progress bar (full width)
            sf("normal", 6.5, C.inkFaint); txt("0", M+8, y+22);
            bar(M+14, y+18.5, g.score, 5, rgb, COL-22, 4);
            // Target marker at 5
            sf("bold", 6.5, C.inkSoft); txtR("5", M+COL-2, y+22);
            // Current score marker
            const markerX = M+14 + (g.score/5)*(COL-22);
            box(markerX-3, y+16, 6, 8, 1, rgb);
            sf("bold", 5.5, [255,255,255]); txtC(g.score.toFixed(1), markerX-3, y+21.5, 6);

            // n evaluaciones
            sf("normal", 6.5, C.inkFaint); txt(g.n+" evaluaciones promediadas", M+28, y+27);

            y += 38;
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // BRECHAS MODERADAS
      // ══════════════════════════════════════════════════════════════════════
      if (sections.brechas_mod) {
        currentSection = "Brechas Moderadas";
        let y = addPage({ section: currentSection });
        y = sectionTitle("Brechas Moderadas", "Dimensiones con score promedio de nivel 3. Oportunidad de mejora.", y);

        if (modGaps.length === 0) {
          sf("normal", 10, C.inkSoft); txtC("Sin brechas moderadas.", M, y+8, COL); y += 14;
        } else {
          // 2-column grid
          const half = Math.ceil(modGaps.length/2);
          modGaps.forEach((g, i) => {
            y = checkY(y, 26);
            const col2 = i < half ? 0 : 1;
            const row2 = i < half ? i : i-half;
            const gx = M + col2*(COL/2+3);
            const gy = y + row2*28;
            const rgb = lvRgb(g.score);
            const bg  = lvBg(g.score);
            const gw  = COL/2-3;

            boxS(gx, gy, gw, 24, 4, [255,251,240], [253,230,138], 0.4);
            box(gx, gy, gw, 3, 0, rgb); // top bar

            sf("bold", 7, rgb); txtC(g.num, gx+8, gy+10, 14);
            box(gx+2, gy+5, 14, 9, 2, bg);
            stroke(rgb,0.3); doc.roundedRect(gx+2, gy+5, 14, 9, 2, 2);
            sf("bold", 7.5, rgb); txtC(g.num, gx+2, gy+10.5, 14);

            sf("bold", 8, C.ink); txt(T(g.label).slice(0,22), gx+20, gy+9);
            sf("normal", 6.5, C.inkSoft); txt("n="+g.n, gx+20, gy+14.5);

            bar(gx+2, gy+18, g.score, 5, rgb, gw-4, 3);
            sf("bold", 8, rgb); txtR(g.score.toFixed(1)+" / 5", gx+gw-2, gy+9);
          });
          y += Math.ceil(modGaps.length/2)*28 + 4;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // ROADMAP
      // ══════════════════════════════════════════════════════════════════════
      if (sections.roadmap && gapsData.length > 0) {
        currentSection = "Hoja de Ruta";
        let y = addPage({ section: currentSection });
        y = sectionTitle("Hoja de Ruta Priorizada", "Plan de accion en 3 horizontes temporales segun impacto y urgencia", y);

        const phases = [
          { t:"Corto Plazo",   sub:"0-6 meses",   rgb:C.red,  bg:[255,242,242], br:[254,202,202], items:critGaps.slice(0,4) },
          { t:"Mediano Plazo", sub:"6-12 meses",  rgb:C.lv2,  bg:[255,251,235], br:[253,230,138], items:[...critGaps.slice(4),...modGaps.slice(0,3)].slice(0,4) },
          { t:"Largo Plazo",   sub:"12-24 meses", rgb:C.lv5,  bg:[236,253,245], br:[167,243,208], items:modGaps.slice(3,7) },
        ];

        // Timeline header strip
        const pw = (COL-6)/3;
        phases.forEach((ph, pi) => {
          const px = M + pi*(pw+3);
          // Header card
          box(px, y, pw, 18, 4, ph.bg);
          stroke(ph.rgb, 0.5); doc.roundedRect(px, y, pw, 18, 4, 4);
          box(px, y, pw, 3.5, 0, ph.rgb); // top stripe
          // Phase number circle
          circle(px+10, y+11, 5, ph.rgb);
          sf("bold", 7.5, [255,255,255]); txtC(String(pi+1), px+10, y+12.5, 0);
          sf("bold", 9, ph.rgb); txt(ph.t, px+18, y+9);
          sf("normal", 7, ph.rgb); txt(ph.sub, px+18, y+15);
        });
        y += 22;

        // Connector line
        line(M+pw/2, y-4, M+COL-pw/2, y-4, C.border, 0.5);
        [0,1,2].forEach(pi => {
          const px = M + pi*(pw+3) + pw/2;
          circle(px, y-4, 2, C.border);
          circle(px, y-4, 1, C.inkFaint);
        });

        // Items grid
        const maxItems = Math.max(...phases.map(p=>p.items.length), 1);
        for (let row = 0; row < maxItems; row++) {
          y = checkY(y, 20);
          phases.forEach((ph, pi) => {
            const px = M + pi*(pw+3);
            const g = ph.items[row];
            if (!g) {
              if (row === 0) {
                box(px, y, pw, 16, 3, C.warm1);
                sf("normal", 7.5, C.inkFaint); txtC("Sin acciones en este horizonte", px, y+9, pw);
              }
              return;
            }
            const rgb = lvRgb(g.score);
            boxS(px, y, pw, 16, 3, C.card, ph.br, 0.5);

            // Priority number
            circle(px+8, y+8, 5, ph.rgb);
            sf("bold", 7, [255,255,255]); txtC(String(row+1), px+8, y+9.5, 0);

            // Dim info
            sf("bold", 8, C.ink); txt(T(g.label).slice(0,20), px+16, y+7);

            // Score pill
            const sw = 22, sx2 = px+pw-sw-2;
            box(sx2, y+2, sw, 7, 3, lvBg(g.score));
            sf("bold", 6.5, rgb); txtC(g.score.toFixed(1)+" niv.", sx2, y+6.5, sw);

            // Mini bar
            bar(px+16, y+11, g.score, 5, rgb, pw-18-sw-4, 2);
          });
          y += 19;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // RANKING
      // ══════════════════════════════════════════════════════════════════════
      if (sections.ranking) {
        currentSection = "Ranking";
        let y = addPage({ section: currentSection });
        y = sectionTitle("Ranking de Evaluaciones", "Top evaluaciones ordenadas por score global descendente", y);

        const sorted = [...filtered].sort((a,b)=>(b.score_global||0)-(a.score_global||0)).slice(0, 20);

        // Column layout
        const cols = [
          { label:"#",         w:8,  x:M },
          { label:"Direccion", w:46, x:M+9 },
          { label:"Rol",       w:32, x:M+56 },
          { label:"Score",     w:20, x:M+89 },
          { label:"Nivel",     w:30, x:M+110 },
          { label:"Fecha",     w:24, x:M+141 },
          { label:"Dims",      w:COL-166, x:M+166 },
        ];

        // Header
        box(M, y, COL, 8, 3, C.ink);
        sf("bold", 6.5, [255,255,255]);
        cols.forEach(c => txt(c.label, c.x+1, y+5.3));
        y += 9;

        sorted.forEach((e, i) => {
          y = checkY(y, 10);
          const rgb = e.score_global ? lvRgb(e.score_global) : C.inkFaint;
          const bg  = e.score_global ? lvBg(e.score_global)  : [245,244,242];

          // Row background
          if (i === 0) {
            // Gold row for #1
            box(M, y, COL, 9, 2, [255,251,235]);
            stroke([253,230,138], 0.5); doc.roundedRect(M, y, COL, 9, 2, 2);
          } else if (i % 2 === 0) {
            box(M, y, COL, 9, 0, C.warm1);
          }

          // Rank
          if (i < 3) {
            circle(cols[0].x+3.5, y+4.5, 4, i===0?[217,119,6]:i===1?C.inkFaint:C.lv2);
            sf("bold", 6.5, [255,255,255]); txtC(String(i+1), cols[0].x, y+5.7, 8);
          } else {
            sf("bold", 7, C.inkFaint); txt(String(i+1), cols[0].x+1, y+5.7);
          }

          // Dir
          sf(i<3?"bold":"normal", 7.5, C.ink);
          txt(T(e.direccion||"-").slice(0,16), cols[1].x+1, y+5.7);

          // Rol
          sf("normal", 7, C.inkMid);
          txt(T(e.rol||"-").slice(0,12), cols[2].x+1, y+5.7);

          // Score
          sf("bold", 8.5, rgb);
          txt(e.score_global!=null?e.score_global.toFixed(2):"-", cols[3].x+1, y+5.7);

          // Level badge
          box(cols[4].x, y+1.5, 28, 6, 3, bg);
          sf("bold", 6, rgb); txtC(e.score_global?lvName(e.score_global):"-", cols[4].x, y+5.7, 28);

          // Date
          sf("normal", 6.5, C.inkFaint);
          txt((e.created_at||"").slice(0,10)||"-", cols[5].x+1, y+5.7);

          // Mini dim bars (sparkline)
          const sparkX = cols[6].x, sparkW = cols[6].w - 4;
          const dCount = DIMS_META.length;
          const dW = sparkW / dCount - 1;
          DIMS_META.forEach((d, di) => {
            const dv = e[`score_${d.key}`];
            const dc = dv ? lvRgb(dv) : C.border;
            box(sparkX + di*(dW+1), y+6, dW, dv?(dv/5)*5:1, 0.5, dc);
          });

          line(M, y+9, M+COL, y+9, C.border, 0.2);
          y += 9;
        });
      }

      // ── Page footers ──────────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        pageFooter(p, totalPages);
      }

      doc.save("Reporte_Madurez_" + new Date().toISOString().slice(0,10) + ".pdf");
    } catch (err) {
      console.error("PDF error:", err);
      alert("Error generando PDF: " + err.message);
    }
    setGenerating(false);
  }

  const RED  = "#E8251F";
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
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:"#555", marginBottom:7 }}>Consolidado</div>
            <button onClick={()=>{ setFilterDir([]); setFilterRol([]); }} style={{
              padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
              border:`1.5px solid ${!filterDir.length&&!filterRol.length?RED:"#E8E4DF"}`,
              background:!filterDir.length&&!filterRol.length?RED+"18":"#FAFAFA",
              color:!filterDir.length&&!filterRol.length?RED:"#999",
            }}>Todas las evaluaciones ({evaluaciones.length})</button>
          </div>
          <div style={{ height:1, background:"#F0EDE9", marginBottom:14 }} />
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
          <div style={{ background:"linear-gradient(150deg,#C80F0A 0%,#E8251F 55%,#C01010 100%)",
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
              : "linear-gradient(135deg,#E8251F,#B91A15)",
            color: (generating||filtered.length===0||secCount===0)?"#AAA":"#FFFFFF",
            fontWeight:800, fontSize:15, cursor: generating||filtered.length===0||secCount===0?"not-allowed":"pointer",
            boxShadow: generating?"none":"0 8px 24px rgba(232,37,31,0.35)",
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
            {tab === "reporte" && "Genera un reporte PDF personalizado con portada y secciones seleccionables"}
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
        {tab === "analytics" && <AnalyticsTab evaluaciones={evaluaciones} respuestas={respuestas} />}
        {tab === "reporte" && <ReportTab evaluaciones={evaluaciones} respuestas={respuestas} />}
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
