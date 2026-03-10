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
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});

      // ─── TOKENS — exact app values ────────────────────────────────────────
      const W=210,H=297,M=14;
      const CW=W-M*2;

      // LV_META exact: c=text color, bg=background, dk=dark variant
      const LV=[
        {c:[120,113,108],bg:[250,250,248],dk:[100,94,90],  label:"Basico"},
        {c:[217,119,  6],bg:[255,251,235],dk:[180, 98,  5],label:"Emergente"},
        {c:[ 37, 99,235],bg:[239,246,255],dk:[ 29, 78,216],label:"Robusto"},
        {c:[124, 58,237],bg:[245,243,255],dk:[109, 40,217],label:"End-to-End"},
        {c:[  5,150,105],bg:[236,253,245],dk:[  4,120, 87],label:"Pivote"},
      ];
      const lv   = v=>LV[Math.max(0,Math.min(4,Math.round(v||1)-1))];
      const lvC  = v=>lv(v).c;
      const lvBg = v=>lv(v).bg;
      const lvL  = v=>lv(v).label;

      // App palette — all from source
      const RED   =[232, 37, 31];  // #E8251F
      const REDDK =[200, 15, 10];  // #C80F0A
      const REDMD =[192, 16, 16];  // #C01010
      const REDLT =[255,248,247];  // #FFF8F7
      const REDDA =[253,220,218];  // #FDDCDA
      const INK   =[ 26, 26, 24];  // #1A1A18
      const INK2  =[ 42, 42, 40];  // #2A2A28
      const MID   =[ 85, 84, 80];  // #555
      const AAA   =[170,168,163];  // #AAA
      const CCC   =[209,208,203];  // #CCC / #D1D0CB
      const BBB   =[187,185,180];  // #BBB
      const BDR   =[232,228,223];  // #E8E4DF border
      const SURF  =[247,245,242];  // #F7F5F2
      const WARM  =[250,248,245];  // #FAFAF8
      const FBF   =[251,249,247];  // #FBF9F7
      const TRACK =[240,237,233];  // #F0EDE9 minibar track
      const WHITE =[255,255,255];

      // ASCII sanitizer
      const T=v=>{
        if(v==null)return"-";
        return String(v)
          .replace(/\u00e0|\u00e1|\u00e2|\u00e3|\u00e4/g,"a")
          .replace(/\u00e8|\u00e9|\u00ea|\u00eb/g,"e")
          .replace(/\u00ec|\u00ed|\u00ee|\u00ef/g,"i")
          .replace(/\u00f2|\u00f3|\u00f4|\u00f5|\u00f6/g,"o")
          .replace(/\u00f9|\u00fa|\u00fb|\u00fc/g,"u")
          .replace(/\u00f1/g,"n").replace(/\u00e7/g,"c")
          .replace(/\u00c0|\u00c1|\u00c2|\u00c3|\u00c4/g,"A")
          .replace(/\u00c8|\u00c9|\u00ca|\u00cb/g,"E")
          .replace(/\u00cc|\u00cd|\u00ce|\u00cf/g,"I")
          .replace(/\u00d2|\u00d3|\u00d4|\u00d5|\u00d6/g,"O")
          .replace(/\u00d9|\u00da|\u00db|\u00dc/g,"U")
          .replace(/\u00d1/g,"N").replace(/\u00c7/g,"C")
          .replace(/[\u2013\u2014]/g,"-").replace(/\u00d7/g,"x")
          .replace(/\u2212/g,"-").replace(/\u00b7/g,".")
          .replace(/[^\x00-\xFF]/g,"").replace(/\s{2,}/g," ").trim()||"-";
      };

      // ─── PRIMITIVES ───────────────────────────────────────────────────────
      const F =(c)=>doc.setFillColor(c[0],c[1],c[2]);
      const S =(c,w)=>{doc.setDrawColor(c[0],c[1],c[2]);if(w!=null)doc.setLineWidth(w);};
      const R =(x,y,w,h,r,c)=>{F(c);doc.roundedRect(x,y,w,h,r,r,"F");};
      const RD=(x,y,w,h,r,f,s,sw)=>{F(f);S(s,sw!=null?sw:0.25);doc.roundedRect(x,y,w,h,r,r,"FD");};
      const LN=(x1,y1,x2,y2,c,w)=>{S(c||BDR,w||0.25);doc.line(x1,y1,x2,y2);};
      const DOT=(x,y,r,c)=>{F(c);doc.circle(x,y,r,"F");};
      const TRI=(x1,y1,x2,y2,x3,y3,c)=>{F(c);doc.triangle(x1,y1,x2,y2,x3,y3,"F");};

      const sf=(w,s,c)=>{
        doc.setFont("helvetica",w);doc.setFontSize(s);
        if(c)doc.setTextColor(c[0],c[1],c[2]);
      };
      const tx =(t,x,y,o)=>doc.text(T(t),x,y,o||{});
      const txR=(t,x,y)  =>doc.text(T(t),x,y,{align:"right"});
      const txC=(t,x,y)  =>doc.text(T(t),x,y,{align:"center"});

      // ─── DESIGN COMPONENTS ───────────────────────────────────────────────

      // Card — white bg, #E8E4DF border 1px, borderRadius 16 (exact app AnalyticsCard)
      const CARD=(x,y,w,h,r)=>RD(x,y,w,h,r!=null?r:14,WHITE,BDR,0.3);

      // AnalyticsLabel — fontSize:9.5 fw:700 color:#D1D0CB uppercase letterSpacing:.12em
      const LBL=(t,x,y)=>{
        sf("bold",7.5,CCC);
        doc.setCharSpace(0.55);
        tx(T(t).toUpperCase(),x,y);
        doc.setCharSpace(0);
      };

      // Value display — fontWeight:900 letterSpacing:-.02em (app's BIG numbers)
      const VAL=(t,x,y,c,sz)=>{
        sf("bold",sz||20,c||INK);
        doc.setCharSpace(-0.12);
        tx(T(t),x,y);
        doc.setCharSpace(0);
      };

      // MiniBar — track:#F0EDE9 fill:color height:5 borderRadius:99 (exact app MiniBar)
      const BAR=(x,y,val,max,c,bw,bh)=>{
        bh=bh||4;const r=bh/2;
        R(x,y,bw,bh,r,TRACK);
        if(val&&max)R(x,y,Math.max(bh,(val/max)*bw),bh,r,c);
      };

      // Level pill — borderRadius:99, level bg, level text (app pill style)
      const PILL=(v,x,y,w,h)=>{
        h=h||6.5;const l=lv(v);
        R(x,y,w,h,h/2,l.bg);
        sf("bold",6,l.c);txC(T(l.label),x+w/2,y+h-1.5);
      };

      // ─── PAGE / SECTION MANAGEMENT ───────────────────────────────────────
      let _pn=0,_sec="",_startY=21;

      const NEWPAGE=(sec,dark)=>{
        if(_pn>0)doc.addPage();
        _pn++;if(sec)_sec=sec;

        // Header — same as app: red strip height 13, left darker edge
        R(0,0,W,13,0,RED);
        R(0,0,4,13,0,REDDK);
        // Thin bottom rule
        R(0,12.6,W,0.4,0,REDMD);

        // Document title left — uppercase tracked bold white
        sf("bold",6.5,WHITE);doc.setCharSpace(0.6);
        tx(T(titulo).toUpperCase().slice(0,34),7,9);doc.setCharSpace(0);

        // Section right — faded red
        sf("normal",6,[255,185,183]);doc.setCharSpace(0.4);
        txR(T(_sec).toUpperCase(),W-M,9);doc.setCharSpace(0);

        return 21;
      };

      const FOOTER=(p,tot)=>{
        LN(M,H-13,W-M,H-13,BDR,0.2);
        sf("normal",5.5,CCC);
        tx("Kearney  |  Diagnostico de Madurez de Inventarios  |  Confidencial",M,H-8.5);
        // Page number chip — app pill style
        RD(W-M-22,H-12.5,22,8,4,SURF,BDR,0.25);
        sf("bold",6.5,AAA);txC(p+" / "+tot,W-M-11,H-7.2);
      };

      const CY=(y,n)=>{if(y+(n||30)>H-18){return NEWPAGE();}return y;};

      // Section header — left red bar + bold title + subtitle + rule (matches app section headers)
      const SH=(title,sub,x,y)=>{
        R(x,y,3.5,sub?11:7,1.5,RED);
        sf("bold",14,INK);tx(T(title),x+7,y+(sub?7:5.5));
        if(sub){sf("normal",7.5,AAA);tx(T(sub),x+7,y+12.5);}
        LN(x,y+(sub?17:12),x+CW,y+(sub?17:12),BDR,0.18);
        return y+(sub?23:17);
      };

      // ─── DATA PREP ────────────────────────────────────────────────────────
      const now=new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"});
      const avg=arr=>{const a=arr.filter(x=>x!=null&&!isNaN(x));return a.length?parseFloat((a.reduce((s,v)=>s+v,0)/a.length).toFixed(2)):null;};

      const gAvg =avg(filtered.map(e=>e.score_global));
      const dAvgs=DIMS_META.map(d=>({...d,score:avg(filtered.map(e=>e[`score_${d.key}`]))}));
      const best =dAvgs.filter(d=>d.score).sort((a,b)=>b.score-a.score)[0];
      const wrst =dAvgs.filter(d=>d.score).sort((a,b)=>a.score-b.score)[0];
      const sprd =best&&wrst?parseFloat((best.score-wrst.score).toFixed(1)):null;

      const gaps=dAvgs.filter(d=>d.score&&d.score<=3).map(d=>({
        ...d,gap:parseFloat((5-d.score).toFixed(1)),
        n:filtered.filter(e=>e[`score_${d.key}`]!=null).length
      })).sort((a,b)=>a.score-b.score);
      const critG=gaps.filter(g=>g.score<=2);
      const modG =gaps.filter(g=>g.score>2);

      const byRole=[...new Set(filtered.map(e=>e.rol).filter(Boolean))].map(r=>{
        const rows=filtered.filter(e=>e.rol===r);
        return{rol:r,n:rows.length,score:avg(rows.map(e=>e.score_global))};
      }).filter(r=>r.score).sort((a,b)=>b.score-a.score);

      const hDirs=[...new Set(filtered.map(e=>e.direccion).filter(Boolean))].sort();
      const hRows=hDirs.map(dir=>{
        const rows=filtered.filter(e=>e.direccion===dir);
        const r={dir,n:rows.length,global:avg(rows.map(e=>e.score_global))};
        DIMS_META.forEach(d=>{r[d.key]=avg(rows.map(e=>e[`score_${d.key}`]));});
        return r;
      }).sort((a,b)=>(b.global||0)-(a.global||0));

      const dist=LV.map((l,i)=>({...l,v:i+1,
        count:filtered.filter(e=>Math.round(e.score_global)===i+1).length,
        pct:filtered.length?Math.round(filtered.filter(e=>Math.round(e.score_global)===i+1).length/filtered.length*100):0,
      }));

      // ══════════════════════════════════════════════════════════════════════
      //  PORTADA  — editorial cover matching app preview card exactly
      //  App uses: linear-gradient(150deg,#C80F0A 0%,#E8251F 55%,#C01010 100%)
      //  radial-gradient dot grid, fontWeight:900 letterSpacing:-.02em title
      // ══════════════════════════════════════════════════════════════════════
      if(sections.portada){
        NEWPAGE("Portada");

        // ── Hero gradient (top 62%) — replicate app cover preview gradient
        R(0,0,W,162,0,RED);
        // Gradient simulation: dark band top, mid, dark bottom
        R(0,0,W,50,0,REDDK);           // #C80F0A — matches gradient start
        R(0,115,W,47,0,REDMD);         // #C01010 — matches gradient end
        // Geometric accent circles (decorative depth)
        F([185,12,8]); doc.circle(W+15,-20,70,"F");
        F([175,8,5]);  doc.circle(W-8,40,40,"F");
        F([195,14,10]);doc.circle(-20,155,58,"F");
        F([205,18,14]);doc.circle(W-5,158,28,"F");

        // Dot grid — exact app: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px) 20px 20px
        F(WHITE);
        for(let gx=M+2;gx<W-M;gx+=9)
          for(let gy=5;gy<157;gy+=9)
            doc.circle(gx,gy,0.2,"F");

        // ── KEARNEY brand block ── (app header exact: red bg, bold white tracked)
        RD(M,M,42,11,3,REDMD,[255,255,255,0].slice(0,3).map(()=>0).fill(0),0);
        R(M,M,42,11,3,REDMD);
        R(M,M,42,1.5,0,[160,8,6]);  // top highlight
        sf("bold",8.5,WHITE);doc.setCharSpace(2.2);txC("KEARNEY",M+21,M+8);doc.setCharSpace(0);

        // Date top-right
        sf("normal",7,[255,180,178]);txR(T(now),W-M,M+8);

        // ── Overline — app label style: uppercase tracked faded ──
        sf("normal",6.5,[255,160,158]);doc.setCharSpace(1.4);
        tx("DIAGNOSTICO DE MADUREZ DE INVENTARIOS",M,42);doc.setCharSpace(0);

        // ── Main title — fontWeight:900 letterSpacing:-.02em fontSize:22 (app exact) ──
        sf("bold",26,WHITE);doc.setCharSpace(-0.25);
        const tLines=doc.splitTextToSize(T(titulo),W-M*2-10);
        let ty=53;
        tLines.slice(0,3).forEach(l=>{tx(l,M,ty);ty+=12;});
        doc.setCharSpace(0);

        // Subtitle — app: fontSize:13 color:rgba(255,200,200,.9)
        sf("normal",11,[255,195,193]);
        const stLines=doc.splitTextToSize(T(subtitulo),W-M*2-8);
        stLines.slice(0,2).forEach(l=>{tx(l,M,ty+3);ty+=7;});

        // ── Metric strip — 4 cards ──
        // App StatCard style on dark: semi-dark cards with value fw:900
        ty+=14;
        const mw=(CW-9)/4;
        const mdata=[
          {v:String(filtered.length),   lbl:"Evaluaciones"},
          {v:gAvg!=null?gAvg.toFixed(1):"-", lbl:"Score Promedio"},
          {v:gAvg?lvL(gAvg):"-",        lbl:"Nivel Actual"},
          {v:sprd!=null?sprd+"pts":"-", lbl:"Dispersion"},
        ];
        mdata.forEach((m,i)=>{
          const mx=M+i*(mw+3);
          R(mx,ty,mw,30,6,[178,12,9]);
          R(mx,ty,3,30,0,[140,6,4]);    // left edge accent
          R(mx,ty,mw,1.5,0,[210,30,26]); // top highlight
          // Value — fw:900
          sf("bold",20,WHITE);doc.setCharSpace(-0.12);txC(T(m.v),mx+mw/2,ty+15);doc.setCharSpace(0);
          // Label — uppercase tracked small
          sf("normal",5.5,[255,165,163]);doc.setCharSpace(0.4);txC(T(m.lbl).toUpperCase(),mx+mw/2,ty+23);doc.setCharSpace(0);
        });

        // ── White lower section ──
        ty+=37;
        R(0,ty,W,H-ty,0,WHITE);
        // Sharp red triangle cutout
        TRI(0,ty,38,ty,0,ty+25,RED);

        let wy=ty+13;

        // ── 7 dimension preview cards — exact app dim pill grid ──
        sf("bold",7,INK);doc.setCharSpace(0.25);
        tx("DIMENSIONES EVALUADAS",M,wy);doc.setCharSpace(0);
        wy+=7;

        const dw=(CW-12)/7;
        DIMS_META.forEach((d,i)=>{
          const sc=dAvgs.find(x=>x.key===d.key)?.score;
          const dc=sc?lvC(sc):CCC;
          const db=sc?lvBg(sc):WARM;
          const dx=M+i*(dw+2);
          // App AnalyticsCard exact
          CARD(dx,wy,dw,30,8);
          if(sc)R(dx,wy,dw,2.5,0,dc);     // colored top bar
          // Dim num — app style: fontSize:9 fw:700 color:#BBB
          sf("bold",7.5,sc?dc:BBB);txC(d.num,dx+dw/2,wy+11);
          // Score — fw:900 color:level
          sf("bold",12,sc?dc:CCC);doc.setCharSpace(-0.1);txC(sc!=null?sc.toFixed(1):"-",dx+dw/2,wy+21);doc.setCharSpace(0);
          // Mini bar
          BAR(dx+3,wy+24,sc||0,5,dc,dw-6,2);
        });
        wy+=38;

        // ── Filter/section info ──
        if(filterDir.length||filterRol.length){
          RD(M,wy,CW,14,8,WARM,BDR,0.25);
          LBL("Filtros aplicados",M+6,wy+6);
          sf("normal",7.5,MID);
          tx(T([
            filterDir.length?"Dir: "+T(filterDir.slice(0,3).join(", ")):"",
            filterRol.length?"Rol: "+T(filterRol.slice(0,2).join(", ")):"",
          ].filter(Boolean).join("  |  ")),M+6,wy+11.5);
          wy+=20;
        }

        // Section chips — app pill style: borderRadius:99 bg:#F7F5F2 border:#E8E4DF
        LBL("Secciones incluidas",M,wy+3);wy+=8;
        const slist=Object.entries(sections).filter(([sk,v])=>v&&sk!=="portada").map(([sk])=>SECTION_LABELS[sk]?.label||sk);
        let sx=M;
        slist.forEach(lbl=>{
          const tw=doc.getTextWidth(T(lbl))+10;
          if(sx+tw>W-M){sx=M;wy+=7;}
          RD(sx,wy-4,tw,6.5,3.5,SURF,BDR,0.25);
          sf("normal",6.5,MID);tx(T(lbl),sx+5,wy);
          sx+=tw+4;
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      //  KPIs EJECUTIVOS  — replicates app AnalyticsTab KPI section exactly
      //  StatCard: bg:#FFF border:#E8E4DF radius:16 padding:22 24
      //  Value: fontSize:32 fw:900 letterSpacing:-.02em lineHeight:1 color:level
      //  Label: fontSize:11 color:#999 fw:600 uppercase letterSpacing:.1em
      //  Icon: width:40 height:40 borderRadius:10 bg:color+"18"
      // ══════════════════════════════════════════════════════════════════════
      if(sections.resumen_kpis){
        let y=NEWPAGE("KPIs Ejecutivos");
        y=SH("Resumen Ejecutivo","Indicadores clave del estado de madurez de inventarios",M,y);

        // ── 4 StatCards ──
        const kpis=[
          {lbl:"Score Global Prom.",v:gAvg!=null?gAvg.toFixed(2):"-",  sub:gAvg?lvL(gAvg):"-",                  c:gAvg?lvC(gAvg):CCC},
          {lbl:"Dim. mas fuerte",   v:best?best.num:"-",               sub:best?T(best.label).slice(0,16):"-",   c:[5,150,105]},
          {lbl:"Dim. mas debil",    v:wrst?wrst.num:"-",               sub:wrst?T(wrst.label).slice(0,16):"-",   c:RED},
          {lbl:"Dispersion",        v:sprd!=null?sprd+"pts":"-",       sub:"max - min entre dims",               c:sprd>=2?RED:sprd>=1?LV[1].c:LV[4].c},
        ];
        const kw=(CW-9)/4;
        kpis.forEach((k,i)=>{
          const kx=M+i*(kw+3);
          // StatCard body — bg:#FFF border:#E8E4DF radius:16
          CARD(kx,y,kw,40);
          // Colored top accent strip
          R(kx,y,kw,3,0,k.c);
          // Icon box — borderRadius:10 bg:color+"18" width:40 height:40 (scaled to PDF)
          const ibg=k.c.map(v=>Math.min(255,v+185));
          R(kx+kw-14,y+7,11,11,3,ibg);
          R(kx+kw-12,y+9,7,7,2,k.c);  // inner icon block
          // Label — fontSize:11 color:#999 fw:600 uppercase letterSpacing:.1em
          LBL(k.lbl,kx+6,y+12);
          // Value — fontSize:32 fw:900 letterSpacing:-.02em (PDF: ~22pt)
          VAL(k.v,kx+6,y+27,k.c,20);
          // Sub — level pill
          if(k.sub&&k.sub!=="-"){
            const sbg=k.c.map(v=>Math.min(255,v+185));
            R(kx+6,y+31.5,kw-12,6.5,3.5,sbg);
            sf("bold",6,k.c);txC(T(k.sub),kx+kw/2,y+36.2);
          }
        });
        y+=48;

        // ── Dim score rows — exact app Analytics dim list ──
        // Row: num(fw:700 #BBB) + label(fw:600 #555) + MiniBar(track:#F0EDE9) + score(fw:800 color)
        y=CY(y,8+DIMS_META.length*13);
        LBL("Score por dimension — ordenado de mayor a menor",M,y);y+=7;

        [...dAvgs].sort((a,b)=>(b.score||0)-(a.score||0)).forEach((d,i)=>{
          y=CY(y,12);
          const sc=d.score;
          const dc=sc?lvC(sc):CCC;
          const db=sc?lvBg(sc):WARM;

          // Row bg — app hover style: alternating #F7F5F2
          if(i%2===0)R(M,y-1,CW,12,3,WARM);

          // Dim num — app: fontSize:9 fw:700 color:#BBB
          sf("bold",7.5,sc?dc:BBB);tx(d.num,M+3,y+7.2);

          // Icon (dim.icon stripped of emoji, show colored square instead)
          R(M+14,y+2,8,8,2,sc?db:SURF);
          if(sc){S(dc,0.3);doc.roundedRect(M+14,y+2,8,8,2,2);}
          sf("bold",5.5,dc);txC(d.num,M+18,y+7.2);

          // Label — fw:600 color:#555
          sf("bold",8.5,MID);tx(T(d.label),M+25,y+7.2);

          // n evaluaciones — small #CCC
          const nEval=filtered.filter(e=>e[`score_${d.key}`]!=null).length;
          sf("normal",6,CCC);tx("n="+nEval,M+100,y+7.2);

          // MiniBar — app exact: track:#F0EDE9 borderRadius:99 height:5
          const bx=M+115,bw=CW-115-32;
          BAR(bx,y+4,sc||0,5,dc,bw,4.5);

          // Score + level pill — fw:800 color
          if(sc){
            const sbg=sc?db:WARM;
            R(W-M-30,y+1.5,16,8,4,sbg);
            sf("bold",7,dc);txC(sc.toFixed(1),W-M-30+8,y+7);
            PILL(sc,W-M-12,y+1.5,11,8);
          }
          y+=12;
        });

        y+=6;LN(M,y,W-M,y,BDR,0.15);y+=8;

        // ── Distribution mini chart ──
        y=CY(y,75);
        LBL("Distribucion por nivel de madurez",M,y);y+=8;
        const maxC=Math.max(...dist.map(d=>d.count),1);
        const bcw=(CW-16)/5;
        dist.forEach((l,i)=>{
          const bx=M+8+i*(bcw+4);
          const mxH=45,bh=l.count>0?Math.max(5,(l.count/maxC)*mxH):0;
          // Track
          R(bx,y,bcw,mxH,4,SURF);
          // Fill with rounded top
          if(bh>0){R(bx,y+mxH-bh,bcw,bh,4,l.c);}
          // Count label
          if(bh>9){sf("bold",10,WHITE);txC(String(l.count),bx+bcw/2,y+mxH-bh+8);}
          else{sf("normal",9,CCC);txC(String(l.count),bx+bcw/2,y+mxH/2+3);}
          // Level label
          sf("bold",7,l.c);txC(T(l.label),bx+bcw/2,y+mxH+7);
          sf("normal",6,AAA);txC(l.pct+"%",bx+bcw/2,y+mxH+13);
          // Level number dot
          DOT(bx+bcw/2,y-3,2.8,bh>0?l.c:BDR);
          sf("bold",5.5,WHITE);txC(String(i+1),bx+bcw/2,y-1.5);
        });
        y+=mxH+22;
        var mxH=45;
      }

      // ══════════════════════════════════════════════════════════════════════
      //  HEATMAP  — exact app heatmap table aesthetic
      //  Header: bg:#F7F5F2, fw:700, color:#999, uppercase, letterSpacing:.1em
      //  Cells: level bg + level color bold score, alternating white/#FBF9F7
      //  Border: 1px solid #E8E4DF bottom each row
      // ══════════════════════════════════════════════════════════════════════
      if(sections.heatmap&&hRows.length>0){
        let y=NEWPAGE("Heatmap");
        y=SH("Heatmap Direccion x Dimension","Score promedio por unidad y dimension | Color = nivel de madurez",M,y);

        const LW=42,NW=10,GW=20;
        const DW=(CW-LW-NW-GW-3)/DIMS_META.length;

        // Table wrapper card
        CARD(M,y,CW,10+hRows.length*10+2,3);

        // Header row — app: bg:#F7F5F2 border-bottom:#E8E4DF fw:700 #999 uppercase
        R(M,y,CW,10,3,SURF);
        LN(M,y+10,M+CW,y+10,BDR,0.25);
        sf("bold",6.5,CCC);doc.setCharSpace(0.45);
        tx("DIRECCION",M+3,y+7);
        txC("N",M+LW+NW/2,y+7);
        txC("GLOBAL",M+LW+NW+GW/2,y+7);
        DIMS_META.forEach((d,i)=>txC(d.num,M+LW+NW+GW+3+i*DW+DW/2,y+7));
        doc.setCharSpace(0);y+=10;

        hRows.forEach((row,ri)=>{
          y=CY(y,10.5);
          R(M,y,CW,10,0,ri%2===0?WHITE:FBF);
          LN(M,y+10,M+CW,y+10,BDR,0.15);

          sf(ri===0?"bold":"normal",8,MID);tx(T(row.dir).slice(0,18),M+3,y+6.8);
          sf("normal",7.5,AAA);txC(String(row.n),M+LW+NW/2,y+6.8);

          if(row.global){
            const gc=lvC(row.global),gb=lvBg(row.global);
            R(M+LW+NW+1,y+2,GW-2,6.5,3,gb);
            sf("bold",8,gc);txC(row.global.toFixed(1),M+LW+NW+GW/2,y+6.8);
          }else{sf("normal",7,CCC);txC("-",M+LW+NW+GW/2,y+6.8);}

          DIMS_META.forEach((d,i)=>{
            const v=row[d.key];
            const cx2=M+LW+NW+GW+3+i*DW;
            if(v){
              R(cx2+0.5,y+2,DW-1,6.5,2,lvBg(v));
              sf("bold",7.5,lvC(v));txC(v.toFixed(1),cx2+DW/2,y+6.8);
            }else{sf("normal",6.5,CCC);txC("-",cx2+DW/2,y+6.8);}
          });
          y+=10;
        });

        y+=6;
        // Legend
        LBL("Niveles de madurez",M,y+3);y+=8;
        LV.forEach((l,i)=>{
          const lx=M+i*37;
          RD(lx,y-3.5,35,7,3.5,l.bg,l.c.map(v=>Math.min(255,v+120)),0.3);
          sf("bold",6.5,l.c);txC((i+1)+" "+T(l.label),lx+17.5,y);
        });
        y+=12;

        // By Role
        if(byRole.length>0){
          y=CY(y,14+byRole.length*11);
          LN(M,y,M+CW,y,BDR,0.18);y+=7;
          LBL("Score promedio por rol",M,y);y+=8;
          byRole.forEach((r,i)=>{
            y=CY(y,11);
            const rc=r.score?lvC(r.score):CCC;
            if(i%2===0)R(M,y-1,CW,11,3,WARM);
            // Rank dot
            DOT(M+5,y+4.5,4.5,i<3?rc:BDR);
            sf("bold",6.5,i<3?WHITE:AAA);txC(String(i+1),M+5,y+6);
            // Score badge
            RD(M+13,y+1,22,8,4,r.score?lvBg(r.score):WARM,rc,0.3);
            sf("bold",8,rc);txC(r.score!=null?r.score.toFixed(2):"-",M+24,y+6.3);
            // Name
            sf("bold",9,MID);tx(T(r.rol).slice(0,28),M+38,y+6.3);
            sf("normal",6,CCC);tx("n="+r.n,M+38+doc.getTextWidth(T(r.rol).slice(0,28))+4,y+5.8);
            // Bar
            BAR(M+38,y+7.5,r.score||0,5,rc,CW-50,3);
            y+=11;
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  BRECHAS CRITICAS  — app gap cards exactly
      //  Card: bg:#FFF8F7 border:#FDDCDA radius:12
      //  Num: colored pill fw:700 bg:level-bg
      //  Bar: MiniBar with floating score marker
      // ══════════════════════════════════════════════════════════════════════
      if(sections.brechas_crit){
        let y=NEWPAGE("Brechas Criticas");
        y=SH("Brechas Criticas","Dimensiones con score promedio 1–2 | Accion inmediata recomendada",M,y);

        if(critG.length===0){
          CARD(M,y,CW,18,10);R(M,y,CW,2.5,0,LV[4].c);
          sf("bold",10,LV[4].c);txC("Sin brechas criticas en la seleccion actual",M+CW/2,y+12);
          y+=24;
        }else{
          critG.forEach((g,gi)=>{
            y=CY(y,42);
            const gc=lvC(g.score),gb=lvBg(g.score);

            // Gap card — app tinted style: bg:#FFF8F7 (red tint) border:#FDDCDA
            RD(M,y,CW,38,12,REDLT,REDDA,0.45);
            // Left thick stripe — level color
            R(M,y,5,38,0,gc);

            // Priority circle (top-left, over stripe)
            DOT(M+5.5,y+5.5,5,gc);
            sf("bold",7,WHITE);txC(String(gi+1),M+5.5,y+7);

            // Dim number pill — app borderRadius:99 style
            RD(M+13,y+7,16,10,5,gb,gc,0.4);
            sf("bold",8,gc);txC(g.num,M+21,y+13.5);

            // Dim label — fw:800 large
            sf("bold",12,INK);tx(T(g.label),M+33,y+13);

            // n evaluaciones (top-right)
            sf("normal",6.5,AAA);txR(g.n+" evaluaciones",W-M-4,y+10);

            // Score pill + Gap badge (right side)
            RD(W-M-52,y+16,24,8,4,gb,gc,0.35);
            sf("bold",7.5,gc);txC("Score "+g.score.toFixed(1),W-M-52+12,y+21.5);
            R(W-M-25,y+16,22,8,4,[255,235,235]);
            sf("bold",7.5,RED);txC("+"+g.gap.toFixed(1)+" niv",W-M-25+11,y+21.5);

            // Progress bar — MiniBar style with current score floating dot
            const bX=M+13,bW=CW-65-6;
            BAR(bX,y+28,g.score,5,gc,bW,5);
            // Floating marker
            const mk=bX+(g.score/5)*bW;
            DOT(mk,y+30.5,4.5,gc);
            sf("bold",5.5,WHITE);txC(g.score.toFixed(1),mk,y+31.5);
            // Scale numbers
            sf("normal",5.5,CCC);tx("1",bX,y+36.5);txR("5",bX+bW,y+36.5);

            y+=44;
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  BRECHAS MODERADAS  — 2-column grid of cards
      // ══════════════════════════════════════════════════════════════════════
      if(sections.brechas_mod){
        let y=NEWPAGE("Brechas Moderadas");
        y=SH("Brechas Moderadas","Dimensiones con score promedio de nivel 3 | Oportunidad de mejora",M,y);

        if(modG.length===0){
          CARD(M,y,CW,18,10);sf("normal",10,AAA);txC("Sin brechas moderadas",M+CW/2,y+12);y+=24;
        }else{
          const gw=(CW-6)/2;const rows2=Math.ceil(modG.length/2);
          modG.forEach((g,i)=>{
            const col=i<rows2?0:1,row=i<rows2?i:i-rows2;
            const gx=M+col*(gw+6),gy=y+row*32;
            y=CY(gy,30);
            const gc=lvC(g.score),gb=lvBg(g.score);
            CARD(gx,gy,gw,28,10);
            R(gx,gy,gw,3,0,gc);
            RD(gx+6,gy+7,14,9,4,gb,gc,0.35);
            sf("bold",7.5,gc);txC(g.num,gx+13,gy+13);
            sf("bold",9,MID);tx(T(g.label).slice(0,22),gx+24,gy+12);
            sf("normal",6.5,AAA);tx("n="+g.n,gx+24,gy+18.5);
            BAR(gx+6,gy+21,g.score,5,gc,gw-12,3.5);
            sf("bold",10,gc);txR(g.score.toFixed(1)+" / 5",gx+gw-4,gy+12);
          });
          y+=rows2*32+4;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  ROADMAP  — 3-column phased plan
      // ══════════════════════════════════════════════════════════════════════
      if(sections.roadmap&&gaps.length>0){
        let y=NEWPAGE("Hoja de Ruta");
        y=SH("Hoja de Ruta Priorizada","Plan de accion en 3 horizontes segun impacto y urgencia",M,y);

        const phases=[
          {t:"Corto Plazo",  sub:"0–6 meses",  c:RED,    bg:REDLT,    br:REDDA, items:critG.slice(0,4)},
          {t:"Mediano Plazo",sub:"6–12 meses", c:LV[1].c,bg:LV[1].bg, br:[253,230,138],items:[...critG.slice(4),...modG.slice(0,3)].slice(0,4)},
          {t:"Largo Plazo",  sub:"12–24 meses",c:LV[4].c,bg:LV[4].bg, br:[167,243,208],items:modG.slice(3,7)},
        ];
        const pw=(CW-8)/3;

        // Phase headers
        phases.forEach((ph,pi)=>{
          const px=M+pi*(pw+4);
          CARD(px,y,pw,24,10);
          R(px,y,pw,3,0,ph.c);
          DOT(px+10,y+13,5.5,ph.c);
          sf("bold",8,WHITE);txC(String(pi+1),px+10,y+14.5);
          sf("bold",10,ph.c);tx(T(ph.t),px+19,y+11);
          sf("normal",7.5,ph.c);tx(T(ph.sub),px+19,y+18);
        });

        // Timeline line
        const tly=y+12;
        LN(M+pw,tly,M+CW-pw,tly,BDR,0.4);
        [0,1,2].forEach(pi=>{const px=M+pi*(pw+4)+pw/2;DOT(px,tly,2,BDR);DOT(px,tly,1,WHITE);});
        y+=30;

        const maxI=Math.max(...phases.map(p=>p.items.length),0);
        for(let row=0;row<maxI;row++){
          y=CY(y,17);
          phases.forEach((ph,pi)=>{
            const px=M+pi*(pw+4);const g=ph.items[row];
            if(!g){if(row===0){R(px,y,pw,14,4,WARM);sf("normal",7,CCC);txC("Sin acciones",px+pw/2,y+9);}return;}
            const gc=lvC(g.score);
            RD(px,y,pw,14,5,WHITE,ph.br,0.4);
            DOT(px+7,y+7,4.5,ph.c);
            sf("bold",6.5,WHITE);txC(String(row+1),px+7,y+8.5);
            sf("bold",8,MID);tx(T(g.label).slice(0,18),px+14,y+7.5);
            R(px+pw-22,y+3,20,7,3.5,lvBg(g.score));
            sf("bold",6,gc);txC(g.score.toFixed(1)+" nv",px+pw-12,y+7.5);
            BAR(px+14,y+10,g.score,5,gc,pw-14-24,2.5);
          });
          y+=17;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  RANKING  — exact app table style
      //  Header: bg:#F7F5F2 fw:700 #999 uppercase letterSpacing:.1em
      //  Rows: white/#FBF9F7 alt, first row bg:#FFF8F7 border:#FDDCDA
      //  Level badge: borderRadius:99 bg:level-bg text:level-c
      //  Spark: vertical bars per dim, level-colored
      // ══════════════════════════════════════════════════════════════════════
      if(sections.ranking){
        let y=NEWPAGE("Ranking");
        y=SH("Ranking de Evaluaciones","Top 20 evaluaciones ordenadas por score global descendente",M,y);

        const sorted=[...filtered].sort((a,b)=>(b.score_global||0)-(a.score_global||0)).slice(0,20);

        const cols=[
          {l:"#",     w:9, x:M},
          {l:"Dir.",  w:44,x:M+10},
          {l:"Rol",   w:34,x:M+55},
          {l:"Score", w:18,x:M+90},
          {l:"Nivel", w:28,x:M+109},
          {l:"Fecha", w:24,x:M+138},
          {l:"Dims",  w:CW-163,x:M+163},
        ];

        // Table wrapper
        CARD(M,y,CW,10+sorted.length*11+2,3);

        // Header — app table header: bg:#F7F5F2 fw:700 #999 uppercase letterSpacing:.1em
        R(M,y,CW,10,3,SURF);
        LN(M,y+10,M+CW,y+10,BDR,0.25);
        sf("bold",6.5,CCC);doc.setCharSpace(0.4);
        cols.forEach(c=>tx(T(c.l),c.x+1,y+7));
        doc.setCharSpace(0);y+=10;

        sorted.forEach((e,i)=>{
          y=CY(y,11);
          const rc=e.score_global?lvC(e.score_global):CCC;
          const rb=e.score_global?lvBg(e.score_global):WARM;

          // Row background — app: first row #FFF8F7/#FDDCDA, alt white/#FBF9F7
          if(i===0)RD(M,y,CW,11,2,REDLT,REDDA,0.35);
          else if(i%2===0)R(M,y,CW,11,0,FBF);
          else R(M,y,CW,11,0,WHITE);

          // Rank — medal colors for top 3
          if(i<3){
            const mc=i===0?[217,119,6]:i===1?[150,147,140]:LV[1].c;
            DOT(cols[0].x+4.5,y+5.5,4.5,mc);
            sf("bold",6.5,WHITE);txC(String(i+1),cols[0].x+4.5,y+6.8);
          }else{sf("bold",7,CCC);tx(String(i+1),cols[0].x+2,y+6.8);}

          // Direccion — fw:600 #555
          sf(i<3?"bold":"normal",7.5,MID);tx(T(e.direccion||"-").slice(0,15),cols[1].x+1,y+6.8);
          // Rol
          sf("normal",7,AAA);tx(T(e.rol||"-").slice(0,12),cols[2].x+1,y+6.8);
          // Score — fw:900 level color
          sf("bold",9.5,rc);doc.setCharSpace(-0.1);tx(e.score_global!=null?e.score_global.toFixed(2):"-",cols[3].x+1,y+7);doc.setCharSpace(0);
          // Level pill — app borderRadius:99 bg:level-bg text:level-c
          PILL(e.score_global||1,cols[4].x,y+2.5,27,7);
          // Date
          sf("normal",6.5,CCC);tx((e.created_at||"").slice(0,10)||"-",cols[5].x+1,y+6.8);
          // Dim spark bars — vertical, level-colored
          const spX=cols[6].x,spW=cols[6].w-2;
          const dW=(spW/DIMS_META.length)-0.5;
          DIMS_META.forEach((d,di)=>{
            const dv=e[`score_${d.key}`];
            const dc=dv?lvC(dv):BDR;
            const bh=dv?(dv/5)*8.5:1;
            R(spX+di*(dW+0.5),y+10.5-bh,dW,bh,0.5,dc);
          });
          LN(M,y+11,M+CW,y+11,BDR,0.15);
          y+=11;
        });
      }

      // ─── FOOTERS ──────────────────────────────────────────────────────────
      const tot=doc.internal.getNumberOfPages();
      for(let p=1;p<=tot;p++){doc.setPage(p);FOOTER(p,tot);}

      doc.save("Reporte_Madurez_"+new Date().toISOString().slice(0,10)+".pdf");
    }catch(err){
      console.error("PDF error:",err);
      alert("Error generando PDF: "+err.message);
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
