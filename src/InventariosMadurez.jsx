import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell, CartesianGrid
} from "recharts";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function actualizarScoresFinales(answers, evalId) {
  try {
    const scores = {};
    DIMS.forEach(d => {
      const vals = d.subs.map(s => answers[s.id]).filter(v => v > 0);
      scores[d.key] = vals.length
        ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2))
        : null;
    });
    const scoreGlobal = parseFloat(
      (Object.values(scores).filter(Boolean).reduce((a,b)=>a+b,0) /
        Object.values(scores).filter(Boolean).length).toFixed(2)
    );
    await supabase.from("evaluaciones").update({
      score_global:          scoreGlobal,
      score_estrategia:      scores.estrategia,
      score_caracterizacion: scores.caracterizacion,
      score_procesos:        scores.procesos,
      score_roles:           scores.roles,
      score_herramientas:    scores.herramientas,
      score_indicadores:     scores.indicadores,
      score_abastecimiento:  scores.abastecimiento,
    }).eq("id", evalId);
    console.log("✅ Scores finales actualizados");
  } catch(e) { console.error("Error actualizando scores:", e); }
}

async function guardarEvaluacion(answers, perfil = {}) {
  try {
    // Calcular scores por dimensión
    const scores = {};
    DIMS.forEach(d => {
      const vals = d.subs.map(s => answers[s.id]).filter(v => v > 0);
      scores[d.key] = vals.length
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
        : null;
    });

    const scoreGlobal = parseFloat(
      (Object.values(scores).filter(Boolean).reduce((a, b) => a + b, 0) /
        Object.values(scores).filter(Boolean).length).toFixed(2)
    );

    // Insertar evaluación
    const { data, error } = await supabase.from("evaluaciones").insert([{
      direccion:             perfil.direccion || null,
      rol:                   perfil.rol || null,
      empresa_id:            perfil.empresa_id || null,
      score_global:          scoreGlobal,
      score_estrategia:      scores.estrategia,
      score_caracterizacion: scores.caracterizacion,
      score_procesos:        scores.procesos,
      score_roles:           scores.roles,
      score_herramientas:    scores.herramientas,
      score_indicadores:     scores.indicadores,
      score_abastecimiento:  scores.abastecimiento,
    }]).select();

    if (error) { console.error("Error guardando evaluación:", error); return; }

    // Insertar respuestas individuales
    const filas = [];
    DIMS.forEach(d => {
      d.subs.forEach(s => {
        if (answers[s.id] > 0) {
          filas.push({
            evaluacion_id:   data[0].id,
            subdimension_id: s.id,
            dimension_key:   d.key,
            valor:           answers[s.id],
          });
        }
      });
    });

    await supabase.from("respuestas").insert(filas);
    console.log("✅ Evaluación guardada correctamente en Supabase");
  } catch (err) {
    console.error("Error inesperado:", err);
  }
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;font-family:'Outfit',system-ui,sans-serif;}
.display,.syne{font-family:'Outfit',system-ui,sans-serif;letter-spacing:-0.02em;}
body{margin:0;background:#F7F6F3;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#D4D2CC;border-radius:99px;}

/* ── animations ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmerMove{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(120,35,220,0)}50%{box-shadow:0 0 0 8px rgba(120,35,220,0.08)}}
@keyframes barGrow{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}
@keyframes bounceDown{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.scroll-arrow{animation:bounceDown 1.4s ease-in-out infinite;}

.fade-up{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}
.fade-up-1{animation:fadeUp .5s .08s cubic-bezier(.22,1,.36,1) both;}
.fade-up-2{animation:fadeUp .5s .16s cubic-bezier(.22,1,.36,1) both;}
.fade-up-3{animation:fadeUp .5s .24s cubic-bezier(.22,1,.36,1) both;}
.fade-up-4{animation:fadeUp .5s .32s cubic-bezier(.22,1,.36,1) both;}
.scale-in{animation:scaleIn .35s cubic-bezier(.22,1,.36,1) both;}

/* ── interactions ── */
.lv-card{transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s ease,border-color .15s;cursor:pointer;}
.lv-card:hover{transform:translateY(-4px) scale(1.015);}
.lv-card.selected{transform:translateY(-5px) scale(1.02);}
.hover-lift{transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s ease;}
.hover-lift:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,0.09)!important;}
.btn-red{transition:all .18s cubic-bezier(.22,1,.36,1);}
.btn-red:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(120,35,220,0.38)!important;}
.btn-ghost{transition:all .15s;}
.btn-ghost:hover{background:rgba(255,255,255,0.12)!important;}
.tab-pill{transition:all .2s cubic-bezier(.4,0,.2,1);}
.sidebar-item{transition:background .12s,border-color .12s;}
.sidebar-item:hover{background:#FFF8F7!important;}
.accordion-hd{transition:background .15s;cursor:pointer;}
.accordion-hd:hover{background:#FAFAF8!important;}
.sub-pill{transition:all .18s cubic-bezier(.22,1,.36,1);cursor:pointer;}
.sub-pill:hover{transform:translateY(-1px);}
`;

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  red:"#7823DC", redDk:"#5A1AA0", redMid:"#9B59D6",
  redBg:"#F0E8FF", redSoft:"#DDD0F7", redXsoft:"#F7F3FF",
  ink:"#111110", inkMid:"#6B6860", inkSoft:"#9C9A95", inkXsoft:"#C8C6C0",
  surface:"#FAF7FF", card:"#FFFFFF",
  border:"#E8E6E0", borderSm:"#F0EEE9",
  L:[
    {label:"Básico",     c:"#78716C",bg:"#FAFAF8",text:"#44403C",border:"#E7E5E4",desc:"Ejecución transaccional y reactiva; procesos rudimentarios; alta dependencia manual."},
    {label:"Emergente",  c:"#D97706",bg:"#FFFBEB",text:"#92400E",border:"#FDE68A",desc:"Eficiencia interna; estandarización parcial; prácticas iniciales de control."},
    {label:"Robusto",    c:"#2563EB",bg:"#EFF6FF",text:"#1E3A8A",border:"#BFDBFE",desc:"Excelencia funcional; procesos estandarizados; KPIs y mejora continua."},
    {label:"End-to-End", c:"#7C3AED",bg:"#F5F3FF",text:"#4C1D95",border:"#DDD6FE",desc:"Integración y optimización E2E; única fuente de verdad; trade-offs explícitos."},
    {label:"Pivote",     c:"#059669",bg:"#ECFDF5",text:"#064E3B",border:"#A7F3D0",desc:"Cadena centrada en cliente; decisiones dinámicas habilitadas por IA y automatización."},
  ],
};

const DIMS = [
  { key:"estrategia", label:"Estrategia de Gestión", num:"01", icon:"🎯", sub:"Objetivos, políticas, red, gobernanza y riesgos", subs:[
    { id:"e1", label:"Objetivos & trade-offs", desc:"Servicio, costo, capital de trabajo", q:"¿Qué tan claros y usados son los objetivos de inventario (servicio al cliente, costo y capital de trabajo) para tomar decisiones?", ndesc:["No hay objetivos claros; se repone 'para no quedarnos sin stock'.","Hay objetivos generales (p. ej., 'tener cobertura'), pero se aplican de forma irregular.","Objetivos definidos por canal/categoría; se usan de forma consistente y se revisan periódicamente.","Objetivos acordados entre áreas y bajados a nivel de productos/ubicaciones; guían la planeación.","Objetivos dinámicos: se ajustan con datos/analítica y optimizan continuamente servicio vs costo vs capital."], opp:"Objetivos dinámicos: se ajustan con datos/analítica y optimizan continuamente servicio vs costo vs capital." },
    { id:"e2", label:"Políticas por canal/segmento", desc:"B2B/B2C, SS/ROP por canal", q:"¿Qué tan definidas y aplicadas están las políticas de inventario para diferentes canales/segmentos (B2C, B2B, retail, online, etc.)?", ndesc:["No hay políticas por canal; se atiende por urgencias y disponibilidad.","Hay algunas reglas por canal (p. ej., mínimos), pero no son consistentes ni siempre se cumplen.","Políticas claras por canal/segmento (niveles objetivo, reposición); se cumplen en la mayoría de los casos.","Políticas integradas con la promesa comercial y la capacidad logística; se ajustan por temporada/eventos.","Políticas automatizadas y optimizadas (según demanda y restricciones) con revisión continua."], opp:"Políticas automatizadas y optimizadas (según demanda y restricciones) con revisión continua." },
    { id:"e3", label:"Diseño de red y posicionamiento", desc:"CDC, tiendas, hubs, técnicos", q:"¿Cómo se decide dónde ubicar el inventario (centro de distribución, tiendas, hubs, técnicos) para cumplir servicio al menor costo?", ndesc:["Se decide por historial o 'como siempre', sin análisis formal.","Se hacen ajustes puntuales cuando hay problemas, con análisis básico.","Hay un diseño de red y reglas de distribución definidas; se revisa cuando cambian volúmenes/canales.","Decisiones basadas en análisis de costo-servicio y tiempos; coordinación de punta a punta (CD-tiendas-última milla).","Red y posicionamiento optimizados con simulaciones/analítica; ajustes ágiles ante cambios y disrupciones."], opp:"Red y posicionamiento optimizados con simulaciones/analítica; ajustes ágiles ante cambios y disrupciones." },
    { id:"e4", label:"Gobernanza y alineación", desc:"S&OP/S&OE, Comercial, Finanzas", q:"¿Qué tan alineadas están las decisiones de inventario entre Comercial, Operación y Finanzas (foros, reglas y seguimiento)?", ndesc:["Cada área decide por su lado; no hay foros ni reglas claras de decisión.","Hay reuniones ocasionales, pero sin decisiones sostenidas ni seguimiento.","Existe un proceso regular de planeación/ejecución con acuerdos y seguimiento de acciones.","Gobernanza formal con responsables, datos comunes y decisiones end-to-end (demanda-abasto-inventario).","Gobernanza madura: decisiones rápidas con escenarios, y alineación extendida con proveedores y logística."], opp:"Gobernanza madura: decisiones rápidas con escenarios, y alineación extendida con proveedores y logística." },
    { id:"e5", label:"Riesgos y resiliencia", desc:"Disrupciones, fraude, regulación", q:"¿Qué tan gestionados están los riesgos del inventario (disrupciones, fraude, regulación) y la capacidad de respuesta?", ndesc:["No se gestionan riesgos; se reacciona cuando el problema ocurre.","Hay controles básicos, pero sin análisis de riesgos ni planes de contingencia claros.","Riesgos identificados y controles definidos; planes básicos de contingencia.","Gestión proactiva: monitoreo, controles antifraude/seguridad y planes de continuidad probados.","Resiliencia avanzada: alertas tempranas, simulación de escenarios y respuesta coordinada con terceros."], opp:"Resiliencia avanzada: alertas tempranas, simulación de escenarios y respuesta coordinada con terceros." },
  ]},
  { key:"caracterizacion", label:"Caracterización", num:"02", icon:"🏷️", sub:"Segmentación, trazabilidad, ciclo de vida y retornos", subs:[
    { id:"c1", label:"Segmentación ABC/XYZ", desc:"Categoría, criticidad, valor-volumen", q:"¿Cómo se clasifica el inventario para definir prioridades y niveles de control (valor, rotación y criticidad)?", ndesc:["No se clasifica; todo se trata igual.","Clasificación básica hecha manualmente y sin actualización frecuente.","Segmentación estandarizada y actualizada periódicamente.","La segmentación se usa para definir políticas (niveles, conteos, seguridad) y prioridades por canal/ubicación.","Segmentación avanzada y dinámica: se ajusta con analítica (demanda/riesgo) y mejora continuamente."], opp:"Segmentación avanzada y dinámica: se ajusta con analítica (demanda/riesgo) y mejora continuamente." },
    { id:"c2", label:"Atributos & trazabilidad", desc:"Serial/IMEI, lotes, caducidad", q:"¿Qué tan completa y confiable es la trazabilidad del inventario (por número de serie/IMEI, lote o estado) a lo largo del proceso?", ndesc:["Trazabilidad limitada o inexistente; se pierde el rastro entre movimientos.","Se registra en algunos puntos, pero con errores y registros manuales.","Trazabilidad consistente en sistemas para lo crítico; controles para evitar duplicados/errores.","Trazabilidad de punta a punta (entrada-movimiento-venta-posventa) y conciliaciones regulares entre sistemas.","Trazabilidad casi en tiempo real con controles automáticos y analítica para detectar anomalías/fraude."], opp:"Trazabilidad casi en tiempo real con controles automáticos y analítica para detectar anomalías/fraude." },
    { id:"c3", label:"Ciclo de vida y obsolescencia", desc:"SLOB, lanzamientos, fin de vida", q:"¿Cómo se gestiona el ciclo de vida de productos (lanzamientos, ramp-up, fin de vida) y el riesgo de obsolescencia?", ndesc:["No se planifica el ciclo de vida; se acumula inventario obsoleto.","Acciones puntuales (promos/liquidaciones) cuando el inventario ya está envejecido.","Planificación básica de lanzamientos y fin de vida; seguimiento de inventario envejecido.","Gestión integrada: planes de lanzamiento/retirada con Comercial y proveedores; metas de envejecimiento/obsolescencia.","Gestión avanzada: predicción de obsolescencia y decisiones tempranas (mix, precios, devoluciones, swap)."], opp:"Gestión avanzada: predicción de obsolescencia y decisiones tempranas (mix, precios, devoluciones, swap)." },
    { id:"c4", label:"Ubicación y propiedad", desc:"Consignación, 3PL, tiendas, técnicos", q:"¿Qué tan visible y controlado está el inventario por ubicación y por 'dueño' (propio, consignación, operador logístico, dealers, técnicos)?", ndesc:["No hay visibilidad completa; se desconoce parte del inventario fuera del CD.","Visibilidad a nivel general, pero con datos desactualizados o inconsistentes.","Inventario identificado por ubicación y dueño en sistemas; conciliaciones periódicas.","Visibilidad end-to-end con reglas claras de propiedad y responsabilidades; conciliaciones frecuentes.","Visibilidad casi en tiempo real con integraciones/alertas y control contractual y operativo robusto."], opp:"Visibilidad casi en tiempo real con integraciones/alertas y control contractual y operativo robusto." },
    { id:"c5", label:"Retornos y condición", desc:"Nuevo, refurb, swap, scrap", q:"¿Qué tan claro y controlado está el estado del inventario (nuevo/usado/refurb/swap/scrap) y su gestión de garantías/retornos?", ndesc:["No se controla bien la condición; se mezclan estados y hay reprocesos.","Separación básica con registros manuales y poca trazabilidad.","Estados definidos y registrados en sistema; proceso estándar para retornos/garantías.","Gestión integrada con posventa/proveedores: clasificación, pruebas, rutas y KPIs de ciclo.","Gestión optimizada: automatización, analítica de fallas y recuperación de valor (economía circular)."], opp:"Gestión optimizada: automatización, analítica de fallas y recuperación de valor (economía circular)." },
  ]},
  { key:"procesos", label:"Procesos", num:"03", icon:"⚙️", sub:"Planeación, asignación, ejecución y control", subs:[
    { id:"p1", label:"Planeación & reposición", desc:"DRP, min-max, MEIO", q:"¿Cómo se planea y repone el inventario (pronóstico, niveles objetivo y reposición)?", ndesc:["Se repone de forma reactiva (cuando se agota o cuando alguien lo pide).","Planificación básica con reglas simples/Excel; depende de personas clave.","Proceso definido con parámetros (mínimos/máximos, coberturas) y revisión regular.","Planeación integrada por canal/ubicación con coordinación demanda-abasto y control de excepciones.","Planeación optimizada con analítica/automatización (mejor pronóstico, escenarios y ajustes continuos)."], opp:"Planeación optimizada con analítica/automatización (mejor pronóstico, escenarios y ajustes continuos)." },
    { id:"p2", label:"Asignación omnicanal", desc:"ATP/CTP, reservas omnicanal", q:"¿Qué tan bien se gestiona la disponibilidad y asignación de inventario para todos los canales (reservas y promesa al cliente)?", ndesc:["No hay visibilidad confiable; se promete sin confirmar inventario.","Visibilidad parcial; reservas manuales y conflictos entre canales.","Reglas claras de asignación; se puede reservar y ver disponibilidad en la mayoría de casos.","Disponibilidad integrada (CD-tiendas-online) con prioridades por canal y control de sobreventa.","Asignación optimizada en tiempo real con reglas dinámicas y cumplimiento consistente de la promesa."], opp:"Asignación optimizada en tiempo real con reglas dinámicas y cumplimiento consistente de la promesa." },
    { id:"p3", label:"Ejecución física", desc:"Recepción, almacenaje, picking", q:"¿Qué tan estandarizados y controlados están los procesos físicos (recepción, almacenaje, picking y transferencias)?", ndesc:["Procesos poco definidos; alta variabilidad y errores frecuentes.","Procedimientos básicos; controles manuales y calidad irregular.","Procesos estandarizados y medidos; formación y controles de calidad regulares.","Ejecución integrada con herramientas (movilidad/escaneo) y mejora continua basada en datos.","Ejecución optimizada: automatización, productividad alta y trazabilidad detallada en tiempo real."], opp:"Ejecución optimizada: automatización, productividad alta y trazabilidad detallada en tiempo real." },
    { id:"p4", label:"Control & exactitud", desc:"Conteos cíclicos, shrinkage", q:"¿Qué tan precisa es la información de inventario y cómo se asegura (conteos, auditorías y control de pérdidas)?", ndesc:["Exactitud baja; diferencias frecuentes entre sistema y físico.","Conteos esporádicos; correcciones reactivas y poco análisis de causa.","Conteos cíclicos y auditorías planificadas; análisis básico de variaciones.","Alta exactitud sostenida: controles por riesgo, investigación de causas y acciones correctivas.","Exactitud líder: controles preventivos y analítica para detectar desviaciones/pérdidas temprano."], opp:"Exactitud líder: controles preventivos y analítica para detectar desviaciones/pérdidas temprano." },
    { id:"p5", label:"Excepciones y devoluciones", desc:"RMA, devoluciones, reparación", q:"¿Qué tan eficiente y controlado es el manejo de excepciones y devoluciones (garantías, reparación y disposición final)?", ndesc:["No hay proceso claro; devoluciones se acumulan y se pierde visibilidad.","Proceso básico y manual; tiempos altos y poca visibilidad del estado.","Proceso estandarizado con estados en sistema; tiempos y responsabilidades definidos.","Integrado con posventa/proveedores/logística: trazabilidad end-to-end y KPIs de ciclo.","Optimizado: automatización, diagnóstico rápido y recuperación de valor (refurb, reutilización, scrap controlado)."], opp:"Optimizado: automatización, diagnóstico rápido y recuperación de valor (refurb, reutilización, scrap controlado)." },
  ]},
  { key:"roles", label:"Roles y Responsabilidades", num:"04", icon:"👥", sub:"RACI, coordinación, terceros y capacidades", subs:[
    { id:"r1", label:"Modelo operativo & RACI", desc:"Dueños de proceso E2E", q:"¿Qué tan claros están los roles, dueños de proceso y responsabilidades de punta a punta (RACI) para inventarios?", ndesc:["No están claros; depende de personas y se generan 'zonas grises'.","Roles definidos de forma parcial; aún hay solapamientos o vacíos.","RACI definido y conocido; responsabilidades claras para la mayoría de actividades.","Dueños de proceso E2E con autoridad y rutinas de gestión; escalamiento definido.","Modelo operativo optimizado: accountability fuerte, decisiones ágiles y mejora continua sostenida."], opp:"Modelo operativo optimizado: accountability fuerte, decisiones ágiles y mejora continua sostenida." },
    { id:"r2", label:"Coordinación entre áreas", desc:"Comercial, Finanzas, Operaciones, TI", q:"¿Qué tan coordinados están Comercial, Finanzas, Operaciones y TI para decisiones y ejecución de inventarios?", ndesc:["Trabajo en silos; hay reprocesos y conflictos frecuentes.","Coordinación por casos; acuerdos informales y poca disciplina.","Rutinas regulares de coordinación con datos comunes y compromisos claros.","Gestión integrada: decisiones basadas en un solo 'dato oficial' y resolución rápida de conflictos.","Colaboración avanzada: planificación conjunta, escenarios y decisiones alineadas end-to-end."], opp:"Colaboración avanzada: planificación conjunta, escenarios y decisiones alineadas end-to-end." },
    { id:"r3", label:"Gestión de terceros", desc:"OEM, 3PL, distribuidores, dealers", q:"¿Qué tan bien se gestionan los terceros (proveedores, operadores logísticos, distribuidores/dealers) en temas de inventario?", ndesc:["No hay control claro; se confía en reportes sin verificación.","Acuerdos básicos; seguimiento esporádico.","Indicadores y acuerdos de servicio definidos; conciliaciones y auditorías periódicas.","Gestión integrada: visibilidad compartida, mejora conjunta y manejo de riesgos con terceros.","Gestión optimizada: colaboración avanzada, incentivos alineados y desempeño sobresaliente."], opp:"Gestión optimizada: colaboración avanzada, incentivos alineados y desempeño sobresaliente." },
    { id:"r4", label:"Capacidades y formación", desc:"Planificación, analítica, operación", q:"¿Qué tan desarrolladas están las capacidades del equipo (planificación, operación y analítica) y la formación en inventarios?", ndesc:["No hay formación estructurada; se aprende 'sobre la marcha'.","Capacitación básica para roles críticos; iniciativas puntuales.","Plan de formación por rol; conocimientos consistentes.","Capacidades avanzadas y comunidades de práctica (mejora de procesos y analítica).","Excelencia: desarrollo continuo (certificaciones/mentoría) basado en brechas y necesidades."], opp:"Excelencia: desarrollo continuo (certificaciones/mentoría) basado en brechas y necesidades." },
    { id:"r5", label:"Incentivos & accountability", desc:"SLAs, KPIs, consecuencias", q:"¿Qué tan alineados están los incentivos y la rendición de cuentas a indicadores de inventarios (SLAs/KPIs, consecuencias)?", ndesc:["No hay indicadores ni consecuencias claras; se mide poco.","Algunos indicadores existen, pero no influyen en prioridades ni decisiones.","Indicadores definidos por rol/área; seguimiento regular y planes de acción.","Incentivos/acuerdos alineados entre áreas; accountability real y gestión por desempeño.","Incentivos optimizados: foco en resultados end-to-end y mejora continua sin 'juegos' de métricas."], opp:"Incentivos optimizados: foco en resultados end-to-end y mejora continua sin 'juegos' de métricas." },
  ]},
  { key:"herramientas", label:"Herramientas", num:"05", icon:"🔧", sub:"ERP, planificación, visibilidad y analítica", subs:[
    { id:"h1", label:"Arquitectura core", desc:"ERP/OMS/WMS e integración", q:"¿Qué tan integrados están los sistemas que soportan inventarios (ERP / ventas / bodegas) y qué tan confiable es la información entre ellos?", ndesc:["Sistemas desconectados; mucha operación manual y datos inconsistentes.","Integración parcial; se usan archivos/ajustes manuales para conciliar.","Integraciones estándar para procesos clave; información razonablemente confiable.","Integración end-to-end con conciliaciones automáticas; baja duplicidad de datos.","Integración en tiempo real, alta confiabilidad y rápida incorporación de nuevos canales."], opp:"Integración en tiempo real, alta confiabilidad y rápida incorporación de nuevos canales." },
    { id:"h2", label:"Herramientas de planificación", desc:"APS/DRP, pronóstico, S&OP", q:"¿Qué tan soportada por herramientas está la planificación (pronóstico, reposición y ciclos de planeación)?", ndesc:["Sin herramientas; se planea manualmente.","Herramientas básicas (Excel/reportes); poca automatización.","Herramienta formal para pronóstico/reposición; uso consistente y parámetros controlados.","Planeación integrada con escenarios y gestión de excepciones; datos compartidos entre áreas.","Planeación avanzada: modelos predictivos/optimización y recomendaciones automáticas."], opp:"Planeación avanzada: modelos predictivos/optimización y recomendaciones automáticas." },
    { id:"h3", label:"Visibilidad & trazabilidad", desc:"Serialización, RFID, track&trace", q:"¿Qué tan buena es la visibilidad y trazabilidad en sistemas (serial/IMEI, seguimiento de movimientos y ubicación)?", ndesc:["Visibilidad limitada; se desconoce ubicación/estado con frecuencia.","Visibilidad básica con registros manuales o atrasados.","Visibilidad estandarizada en sistemas para la mayoría de movimientos; trazabilidad donde aplica.","Visibilidad end-to-end y casi en tiempo real; alertas por inconsistencias.","Visibilidad líder: monitoreo en tiempo real y analítica para anticipar riesgos/desviaciones."], opp:"Visibilidad líder: monitoreo en tiempo real y analítica para anticipar riesgos/desviaciones." },
    { id:"h4", label:"Datos & analítica", desc:"Lakehouse, BI, modelos, calidad", q:"¿Qué tan maduro es el uso de datos y analítica para decisiones de inventarios (calidad de datos, tableros, modelos)?", ndesc:["Datos poco confiables; se decide por intuición.","Reportes básicos; mucha limpieza manual de datos.","Datos gobernados para inventarios; tableros regulares y métricas confiables.","Analítica avanzada para decisiones (segmentación, causas, escenarios) con datos integrados.","Analítica predictiva/prescriptiva: recomendaciones automáticas y mejora continua basada en aprendizaje."], opp:"Analítica predictiva/prescriptiva: recomendaciones automáticas y mejora continua basada en aprendizaje." },
    { id:"h5", label:"Automatización", desc:"RPA, APIs/EDI, alertas, movilidad", q:"¿Qué tan automatizados están los flujos de inventario (integraciones, alertas y captura móvil/escaneo en operación)?", ndesc:["Todo es manual; alta dependencia de correos y aprobaciones informales.","Automatización puntual; poca estandarización.","Automatización en procesos clave; uso de movilidad/escaneo en operación.","Automatización end-to-end con alertas, integraciones y controles; baja intervención manual.","Automatización avanzada: orquestación en tiempo real y mejora continua de flujos."], opp:"Automatización avanzada: orquestación en tiempo real y mejora continua de flujos." },
  ]},
  { key:"indicadores", label:"Indicadores", num:"06", icon:"📊", sub:"Servicio, eficiencia, exactitud y salud", subs:[
    { id:"i1", label:"Servicio al cliente", desc:"Fill rate, OTIF, backorders, NPS", q:"¿Cómo se mide y gestiona el impacto del inventario en el servicio al cliente (disponibilidad, entregas a tiempo, faltantes)?", ndesc:["No se mide de forma consistente; se conoce por quejas.","Se mide ocasionalmente con reportes manuales; poca acción correctiva.","Indicadores definidos y revisados regularmente; planes de acción cuando hay desviaciones.","Indicadores integrados por canal/segmento y conectados a decisiones de inventario y logística.","Gestión optimizada: alertas tempranas y mejora continua basada en datos; servicio predecible."], opp:"Gestión optimizada: alertas tempranas y mejora continua basada en datos; servicio predecible." },
    { id:"i2", label:"Eficiencia & capital", desc:"Rotación, DIO, capital de trabajo", q:"¿Cómo se mide y mejora la eficiencia y el capital invertido en inventario (rotación, días de inventario, capital de trabajo)?", ndesc:["No se mide o no se usa para gestionar.","Se mide a nivel general, sin palancas claras de mejora.","Indicadores por categoría/canal; seguimiento regular y acciones.","Gestión integrada con Finanzas: metas, trade-offs y decisiones basadas en datos.","Optimización continua del capital con disciplina sostenida y modelos/alertas."], opp:"Optimización continua del capital con disciplina sostenida y modelos/alertas." },
    { id:"i3", label:"Exactitud & pérdidas", desc:"Accuracy, shrinkage, ajustes", q:"¿Cómo se mide y controla la exactitud del inventario y las pérdidas (diferencias, ajustes, pérdidas)?", ndesc:["No hay medición confiable; ajustes frecuentes sin explicación.","Se registran ajustes, pero con poca investigación y prevención.","Indicadores con análisis de causa y acciones correctivas.","Control proactivo por ubicación/proceso, auditorías dirigidas y prevención.","Control avanzado: detección temprana con analítica y reducción sostenida de pérdidas."], opp:"Control avanzado: detección temprana con analítica y reducción sostenida de pérdidas." },
    { id:"i4", label:"Salud del inventario", desc:"Aging, SLOB, write-offs, DOH", q:"¿Cómo se mide y gestiona la salud del inventario (envejecimiento, obsolescencia, castigos)?", ndesc:["No se mide; se detecta tarde cuando ya hay pérdidas.","Se mide de forma básica; acciones reactivas tardías.","Indicadores definidos; revisión regular y planes de acción.","Gestión integrada con Comercial/Finanzas: prevención y recuperación de valor.","Gestión optimizada: predicción de riesgo y acciones tempranas que minimizan obsolescencia."], opp:"Gestión optimizada: predicción de riesgo y acciones tempranas que minimizan obsolescencia." },
    { id:"i5", label:"Cumplimiento & riesgo", desc:"Fraude, auditoría, regulatorio", q:"¿Cómo se mide y gestiona el cumplimiento y el riesgo del inventario (auditoría, fraude, seguridad, regulatorio)?", ndesc:["No se mide; controles mínimos.","Controles básicos; medición parcial.","Indicadores y controles definidos; auditorías periódicas.","Gestión integrada: monitoreo, cumplimiento consistente y respuesta a hallazgos.","Gestión líder: controles preventivos y analítica antifraude con cumplimiento robusto en toda la red."], opp:"Gestión líder: controles preventivos y analítica antifraude con cumplimiento robusto en toda la red." },
  ]},
  { key:"abastecimiento", label:"Abastecimiento", num:"07", icon:"📦", sub:"Dispositivos, CPE, SIM, accesorios y repuestos", subs:[
    { id:"ab1", label:"Dispositivos (smartphones/tablets)", desc:"Smartphones/tablets: lanzamiento-rampa-EOL", q:"¿Qué tan robusta es la estrategia para abastecer dispositivos (lanzamientos, rampa y fin de vida) sin sobrestock ni quiebres?", ndesc:["Se compra reactivamente; quiebres o sobrestock frecuentes en lanzamientos.","Planificación básica por experiencia; ajustes tardíos según ventas reales.","Plan por lanzamiento con metas y seguimiento; coordinación razonable con proveedores.","Estrategia integrada con Comercial y proveedores: escenarios, asignación por canal y control de fin de vida.","Optimización avanzada: analítica para lanzamientos/demanda y acciones tempranas para evitar obsolescencia."], opp:"Optimización avanzada: analítica para lanzamientos/demanda y acciones tempranas para evitar obsolescencia." },
    { id:"ab2", label:"CPE/routers/STB", desc:"Proyectos, bundles, reposición de fallas", q:"¿Qué tan controlado es el abastecimiento de CPE (routers/STB) para proyectos/bundles y reposición por fallas?", ndesc:["Se gestiona caso a caso; faltantes afectan instalaciones o reposiciones.","Se planifica por proyectos, pero con visibilidad limitada y ajustes manuales.","Planificación y reposición estandarizadas; niveles de seguridad para fallas y proyectos.","Integrado con instalación/posventa: pronóstico, disponibilidad y control de retornos/recuperación.","Optimizado: modelos para fallas y proyectos, y ciclos cerrados de recuperación y reutilización."], opp:"Optimizado: modelos para fallas y proyectos, y ciclos cerrados de recuperación y reutilización." },
    { id:"ab3", label:"SIM/eSIM & kits", desc:"Alto volumen, bajo valor, control fraude", q:"¿Qué tan eficiente y seguro es el abastecimiento y control de SIM/eSIM (alto volumen, riesgo de fraude/pérdida)?", ndesc:["Control débil; pérdidas o uso indebido sin trazabilidad suficiente.","Controles básicos; conteos manuales y diferencias.","Trazabilidad y control estandarizados; reglas claras de entrega/consumo y auditorías.","Gestión integrada: visibilidad por canal/ubicación, controles antifraude y conciliaciones frecuentes.","Gestión líder: monitoreo y analítica antifraude, automatización y mínima desviación."], opp:"Gestión líder: monitoreo y analítica antifraude, automatización y mínima desviación." },
    { id:"ab4", label:"Accesorios", desc:"Amplia variedad, moda, obsolescencia", q:"¿Qué tan efectiva es la estrategia para accesorios (mucha variedad, ciclos cortos, riesgo de obsolescencia)?", ndesc:["Se compra sin criterio claro; alto sobrestock y descuentos frecuentes.","Se gestiona por intuición; control básico y liquidaciones tardías.","Estrategia estándar (mix, mínimos) y seguimiento por rotación/envejecimiento.","Gestión integrada con Comercial: surtido por tienda/canal, reposición ágil y acciones preventivas.","Optimización avanzada: analítica de surtido/precio y ajuste rápido del portafolio para minimizar obsolescencia."], opp:"Optimización avanzada: analítica de surtido/precio y ajuste rápido del portafolio para minimizar obsolescencia." },
    { id:"ab5", label:"Repuestos/refurb/swap", desc:"Circularidad, garantías, niveles de servicio", q:"¿Qué tan madura es la gestión de repuestos/refurb/swap (garantías, circularidad y niveles de servicio)?", ndesc:["No hay control claro; tiempos altos y pérdidas de valor.","Proceso básico; visibilidad limitada y decisiones manuales.","Proceso estandarizado con trazabilidad y tiempos objetivo; control por estado.","Integrado con posventa/proveedores: indicadores de ciclo, recuperación de valor y disponibilidad por acuerdos de servicio.","Optimizado: economía circular avanzada, analítica de fallas y mejora continua que reduce costos y tiempos."], opp:"Optimizado: economía circular avanzada, analítica de fallas y mejora continua que reduce costos y tiempos." },
  ]},
];


// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getLv(v) { return (v>=1&&v<=5)?T.L[v-1]:T.L[0]; }

function emptyAnswers() {
  const o={};
  DIMS.forEach(d=>d.subs.forEach(s=>{o[s.id]=0;}));
  return o;
}

function getDimScore(d,ans) {
  const vals=d.subs.map(s=>ans[s.id]).filter(v=>v>0);
  return vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null;
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function LvBadge({v,sm}) {
  if(!v) return null;
  const l=getLv(v);
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:sm?3:4,
      padding:sm?"2px 8px":"3px 11px",borderRadius:99,
      background:l.bg,color:l.text,
      border:`1px solid ${l.border}`,
      fontSize:sm?9:11,fontWeight:600,whiteSpace:"nowrap",letterSpacing:".01em",
    }}>
      <span style={{width:sm?5:7,height:sm?5:7,borderRadius:"50%",background:l.c,flexShrink:0}}/>
      {v}·{l.label}
    </span>
  );
}

function Logo({h=26, inv=false}) {
  const src = inv ? "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzIiIGZpbGw9Im5vbmUiPjx0ZXh0IHg9IjEiIHk9IjI0IiBmb250LWZhbWlseT0iJ0dpbGwgU2FucycsJ1RyZWJ1Y2hldCBNUycsJ0hlbHZldGljYSBOZXVlJyxIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjUwMCIgZmlsbD0iI0ZGRkZGRiIgbGV0dGVyLXNwYWNpbmc9IjQiPktFQVJORVk8L3RleHQ+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzIiIGZpbGw9Im5vbmUiPjx0ZXh0IHg9IjEiIHk9IjI0IiBmb250LWZhbWlseT0iJ0dpbGwgU2FucycsJ1RyZWJ1Y2hldCBNUycsJ0hlbHZldGljYSBOZXVlJyxIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjUwMCIgZmlsbD0iIzFFMUUxRSIgbGV0dGVyLXNwYWNpbmc9IjQiPktFQVJORVk8L3RleHQ+PC9zdmc+";
  return <img src={src} alt="Kearney" style={{height:h, display:"block", objectFit:"contain"}}/>;
}

// ─── NOISE SVG (grain texture) ────────────────────────────────────────────────
const NoiseSVG = () => (
  <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.04,pointerEvents:"none",zIndex:1}} xmlns="http://www.w3.org/2000/svg">
    <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#noise)"/>
  </svg>
);

// ─── COUNTER ANIMATION ────────────────────────────────────────────────────────
function CountUp({to,decimals=0,duration=800}) {
  const [val,setVal] = useState(0);
  const ref = useRef(null);
  useEffect(()=>{
    if(ref.current) cancelAnimationFrame(ref.current);
    const start=performance.now();
    const fn = (now) => {
      const p=Math.min((now-start)/duration,1);
      const ease=1-Math.pow(1-p,4);
      setVal(parseFloat((ease*to).toFixed(decimals)));
      if(p<1) ref.current=requestAnimationFrame(fn);
    };
    ref.current=requestAnimationFrame(fn);
    return ()=>cancelAnimationFrame(ref.current);
  },[to]);
  return <>{val.toFixed(decimals)}</>;
}

// ─── REGISTRO FORM (modal de inicio) ─────────────────────────────────────────
const DEFAULT_DIRECCIONES = {'Telecomunicaciones': ['Supply Chain', 'Ingeniería', 'Implementación', 'OyM', 'UMM', 'UMC'], 'Farmacéutica': ['Supply Chain', 'Manufactura', 'Calidad y Regulatorio', 'Comercial', 'Distribución'], 'Oil & Gas': ['Supply Chain', 'Operaciones', 'Mantenimiento', 'Proyectos CAPEX', 'HSEQ', 'Procura'], 'Manufactura': ['Supply Chain', 'Producción', 'Mantenimiento', 'Calidad', 'Comercial', 'Logística'], 'CPG': ['Supply Chain', 'Manufactura', 'Comercial / Trade', 'Logística', 'Marketing', 'Finanzas']};
const DEFAULT_ROLES = {'Telecomunicaciones': ['Director', 'Gerente', 'Jefe', 'Ingeniero', 'Analista'], 'Farmacéutica': ['Director', 'Gerente', 'Jefe / Coordinador', 'Especialista', 'Analista'], 'Oil & Gas': ['Superintendente', 'Gerente', 'Supervisor', 'Ingeniero Senior', 'Ingeniero', 'Analista'], 'Manufactura': ['Gerente de Planta', 'Gerente', 'Jefe / Supervisor', 'Ingeniero', 'Técnico', 'Analista'], 'CPG': ['Director', 'Gerente', 'Jefe / Coordinador', 'Analista Senior', 'Analista']};
// Resolved dynamically in App based on empresa
const DIRECCIONES_FALLBACK = ["Supply Chain","Ingeniería","Implementación","OyM","UMM","UMC"];
const ROLES_FALLBACK = ["Director","Gerente","Jefe","Ingeniero","Analista"];

// ─── INDUSTRY QUESTIONS ──────────────────────────────────────────────────────
const INDUSTRY_QUESTIONS = {
  "Telecomunicaciones": {},
  "Farmacéutica": {
    "e1": {q:"¿Qué tan claros y balanceados están los objetivos de inventario (servicio, costo y capital) considerando restricciones regulatorias como BPM y cadena de frío?", label:"Objetivos & trade-offs regulatorios", desc:"Servicio, costo, BPM, cadena de frío", ndesc:["No hay objetivos claros; se repone por urgencia sin considerar restricciones regulatorias.","Hay objetivos generales, pero no integran requisitos BPM ni condiciones especiales de almacenamiento.","Objetivos definidos por categoría (controlados, OTC, dispositivos) con políticas básicas de cumplimiento.","Objetivos acordados entre áreas con trade-offs explícitos entre servicio, costo y cumplimiento regulatorio.","Objetivos dinámicos optimizados con analítica; integran BPM, serialización y cadena de frío de forma continua."], opp:"Objetivos dinámicos optimizados con analítica; integran BPM, serialización y cadena de frío de forma continua."}, 
    "e2": {q:"¿Qué tan diferenciadas y aplicadas están las políticas de inventario por tipo de producto (medicamentos controlados, OTC, dispositivos médicos y materias primas)?", label:"Políticas por categoría farmacéutica", desc:"Controlados, OTC, dispositivos, materias primas", ndesc:["No hay políticas diferenciadas; todos los productos se gestionan igual sin considerar su naturaleza.","Hay algunas reglas básicas por tipo, pero no se aplican consistentemente ni cubren todos los segmentos.","Políticas definidas por categoría farmacéutica con niveles objetivo y reglas de reposición documentadas.","Políticas integradas con la cadena de frío, cumplimiento INVIMA y capacidad logística por segmento.","Políticas automatizadas y optimizadas con revisión continua según demanda, regulación y restricciones."], opp:"Políticas automatizadas y optimizadas con revisión continua según demanda, regulación y restricciones."}, 
    "e3": {q:"¿Qué tan bien diseñada está la red de distribución considerando cadena de frío, bodegas habilitadas y puntos de dispensación (farmacias, hospitales, IPS)?", label:"Red con cadena de frío", desc:"Bodegas frío, hospitales, IPS, farmacias", ndesc:["La red se define por inercia; no hay análisis de cadena de frío ni requisitos de habilitación.","Se hacen ajustes puntuales cuando hay problemas de temperatura o habilitación, sin diseño formal.","Hay un diseño de red con reglas por tipo de punto (hospital, farmacia, IPS) y requisitos de frío definidos.","Decisiones basadas en costo-servicio con trazabilidad de condiciones en toda la red.","Red optimizada con simulaciones; ajustes ágiles ante cambios regulatorios o de demanda hospitalaria."], opp:"Red optimizada con simulaciones; ajustes ágiles ante cambios regulatorios o de demanda hospitalaria."}, 
    "c1": {q:"¿Qué tan bien se segmenta el portafolio por criticidad clínica, rotación (ABC) y variabilidad de demanda (XYZ), considerando vida útil y productos controlados?", label:"Segmentación por criticidad clínica", desc:"ABC/XYZ, vida útil, controlados", ndesc:["No se segmenta; todos los medicamentos se tratan igual independientemente de su criticidad o rotación.","Hay clasificación básica (controlados vs. no controlados), pero no se usa para definir políticas diferenciadas.","Segmentación ABC/XYZ aplicada con consideración de vida útil y criticidad clínica por categoría.","Segmentación dinámica que guía políticas de reposición, almacenamiento y nivel de servicio por producto.","Segmentación avanzada con analítica predictiva; ajuste continuo según cambios de demanda y regulación."], opp:"Segmentación avanzada con analítica predictiva; ajuste continuo según cambios de demanda y regulación."}, 
    "c2": {q:"¿Qué tan completa y confiable es la trazabilidad de lotes, fechas de vencimiento, números de serie y condiciones de temperatura a lo largo de la cadena?", label:"Trazabilidad y serialización", desc:"Lotes, vencimientos, DSCSA, INVIMA", ndesc:["Trazabilidad limitada o inexistente; se pierde el rastro de lotes y vencimientos con frecuencia.","Hay registro de lotes en algunos puntos, pero sin continuidad ni control de temperatura sistematizado.","Trazabilidad de lotes y vencimientos documentada en sistemas; control básico de cadena de frío.","Serialización implementada con track & trace hasta el punto de dispensación y monitoreo de temperatura IoT.","Trazabilidad casi en tiempo real con controles automáticos; cumplimiento total DSCSA/INVIMA y alertas preventivas."], opp:"Trazabilidad casi en tiempo real con controles automáticos; cumplimiento total DSCSA/INVIMA y alertas preventivas."}, 
    "c3": {q:"¿Qué tan bien se gestiona el ciclo de vida de productos con fecha de vencimiento corta, incluyendo recalls y retiro de mercado?", label:"Gestión de vencimientos y recalls", desc:"FEFO, recalls, retiro de mercado", ndesc:["No se planifica el ciclo de vida; se acumula inventario vencido sin procesos claros de retiro.","Se hacen ajustes reactivos cuando hay vencimientos próximos o alertas de recall sin proceso formal.","FEFO implementado; hay proceso documentado para recalls y retiro de mercado con trazabilidad básica.","Gestión proactiva de vencimientos con alertas tempranas; recalls ejecutados con trazabilidad completa.","Gestión optimizada: predicción de riesgo de vencimiento, automatización de FEFO y simulacros de recall."], opp:"Gestión optimizada: predicción de riesgo de vencimiento, automatización de FEFO y simulacros de recall."}, 
    "c4": {q:"¿Qué tan visible y controlado está el inventario en centros de distribución propios, operadores 3PL y puntos de dispensación hospitalarios?", label:"Inventario en red hospitalaria", desc:"CD propio, 3PL, hospitales, clínicas", ndesc:["No hay visibilidad completa; se desconoce el stock en hospitales y puntos de dispensación.","Visibilidad parcial en CD propio; los puntos hospitalarios reportan de forma manual e irregular.","Visibilidad integrada en CD y principales puntos hospitalarios con reconciliación periódica.","Control en tiempo real de stock en toda la red incluyendo 3PL y puntos de dispensación.","Visibilidad casi en tiempo real con integraciones automáticas y analítica de disponibilidad por red."], opp:"Visibilidad casi en tiempo real con integraciones automáticas y analítica de disponibilidad por red."}, 
    "h3": {q:"¿Qué tan avanzada es la trazabilidad end-to-end con serialización, control de temperatura por IoT y track & trace hasta el punto de dispensación?", label:"Serialización y cold chain IoT", desc:"DSCSA, INVIMA, IoT temperatura", ndesc:["Sin serialización ni monitoreo de temperatura automatizado; todo es manual y propenso a errores.","Hay serialización básica en algunos puntos, pero sin continuidad ni alertas de temperatura en tiempo real.","Serialización implementada en la cadena principal; monitoreo de temperatura en bodegas habilitadas.","Track & trace end-to-end con alertas IoT de temperatura y trazabilidad hasta el punto de dispensación.","Trazabilidad líder: serialización completa, analítica de cold chain y cumplimiento regulatorio automatizado."], opp:"Trazabilidad líder: serialización completa, analítica de cold chain y cumplimiento regulatorio automatizado."}, 
    "p3": {q:"¿Qué tan estandarizados y controlados están los procesos de almacenamiento bajo BPM, el picking FEFO y el control de cadena de frío?", label:"Almacenamiento BPM y FEFO", desc:"BPM, BPD, FEFO, cadena de frío", ndesc:["Procesos poco definidos; no se aplica FEFO ni se cumplen requisitos BPM de forma consistente.","Hay lineamientos básicos de almacenamiento, pero FEFO y cadena de frío se aplican de forma irregular.","BPM y FEFO implementados en operaciones principales con registros documentados y auditorías periódicas.","Procesos estandarizados con control de temperatura automatizado y cumplimiento BPD verificado.","Ejecución optimizada: automatización de FEFO, monitoreo continuo de frío y auditorías en tiempo real."], opp:"Ejecución optimizada: automatización de FEFO, monitoreo continuo de frío y auditorías en tiempo real."}, 
    "p5": {q:"¿Qué tan eficiente y controlado es el manejo de devoluciones, destrucción de producto vencido y ejecución de recalls con trazabilidad regulatoria?", label:"Devoluciones y destrucción regulatoria", desc:"Recalls, destrucción, INVIMA", ndesc:["No hay proceso claro; devoluciones se acumulan y destrucciones se hacen sin documentación regulatoria.","Hay procesos básicos de devolución, pero la destrucción y trazabilidad para INVIMA son inconsistentes.","Proceso documentado para devoluciones, cuarentena y destrucción certificada con registros INVIMA.","Trazabilidad completa en devoluciones; recalls ejecutados con documentación regulatoria y análisis de causa.","Optimizado: destrucción certificada automatizada, analítica de recalls y mejora continua regulatoria."], opp:"Optimizado: destrucción certificada automatizada, analítica de recalls y mejora continua regulatoria."}, 
    "ab1": {q:"¿Qué tan robusta es la estrategia de abastecimiento para medicamentos de alto costo y biotecnológicos con condiciones especiales de almacenamiento y acceso restringido?", label:"Medicamentos alto costo y biotecnológicos", desc:"Alto costo, biológicos, cadena frío", ndesc:["Se compra reactivamente; quiebres frecuentes o sobrestock sin gestión de condiciones especiales.","Hay gestión básica de inventario, pero sin estrategia diferenciada para alto costo o requisitos de frío.","Estrategia definida para biológicos y alto costo con niveles de seguridad y control de cadena de frío.","Abastecimiento optimizado con acuerdos con fabricantes, trazabilidad end-to-end y control de acceso.","Gestión avanzada: analítica predictiva, contratos de suministro garantizado y monitoreo continuo de condiciones."], opp:"Gestión avanzada: analítica predictiva, contratos de suministro garantizado y monitoreo continuo de condiciones."}, 
    "ab2": {q:"¿Qué tan bien se gestiona el inventario de dispositivos médicos, implantes y equipos de diagnóstico incluyendo vida útil, calibración y retiro de mercado?", label:"Dispositivos médicos e implantes", desc:"Dispositivos, implantes, calibración", ndesc:["Sin gestión diferenciada; se mezclan dispositivos sin control de vida útil ni calibración.","Hay registro básico de dispositivos, pero sin control sistematizado de calibración o retiro.","Gestión documentada con control de vida útil, calibración periódica y proceso de retiro definido.","Trazabilidad por número de serie con alertas de vencimiento, calibración programada y gestión de recalls.","Optimizado: ciclo de vida completo gestionado con analítica, automatización y cumplimiento regulatorio total."], opp:"Optimizado: ciclo de vida completo gestionado con analítica, automatización y cumplimiento regulatorio total."}, 
    "ab3": {q:"¿Qué tan efectiva es la estrategia de abastecimiento para productos OTC, genéricos y vitaminas con alta rotación, múltiples canales y gestión masiva de vencimientos?", label:"OTC, genéricos y vitaminas", desc:"OTC, genéricos, alta rotación, multicanal", ndesc:["Se compra sin criterio claro; alto sobrestock o quiebres sin gestión de vencimientos.","Hay reposición básica, pero sin diferenciación por canal ni control proactivo de vencimientos.","Estrategia por categoría con niveles de reposición y gestión FEFO para productos de alta rotación.","Reposición optimizada por canal con VMI en canales clave y control masivo de vencimientos automatizado.","Gestión avanzada: analítica de demanda multicanal, surtido optimizado y cero desperdicios por vencimiento."], opp:"Gestión avanzada: analítica de demanda multicanal, surtido optimizado y cero desperdicios por vencimiento."}, 
    "ab4": {q:"¿Qué tan bien se gestiona el abastecimiento de materias primas e insumos de manufactura farmacéutica incluyendo proveedores calificados y control de cuarentena?", label:"Materias primas farmacéuticas", desc:"API, excipientes, proveedores calificados", ndesc:["Se compra reactivamente; sin control de proveedores calificados ni procesos de cuarentena definidos.","Hay lista de proveedores, pero la calificación y los procesos de cuarentena son inconsistentes.","Proveedores calificados con procesos de cuarentena documentados y control de certificados de análisis.","Gestión integrada de proveedores con MRP, control de cuarentena automatizado y trazabilidad de lotes.","Optimizado: red de proveedores resiliente, analítica de calidad y cero rechazos por fallas de proveedor."], opp:"Optimizado: red de proveedores resiliente, analítica de calidad y cero rechazos por fallas de proveedor."}, 
    "ab5": {q:"¿Qué tan controlado y eficiente es el proceso de gestión de producto devuelto, vencido y en cuarentena incluyendo destrucción certificada y documentación regulatoria?", label:"Devoluciones y destrucción certificada", desc:"Cuarentena, destrucción, INVIMA", ndesc:["No hay proceso claro; producto en cuarentena se mezcla con activo y las destrucciones no se documentan.","Hay separación básica de cuarentena, pero destrucción y documentación INVIMA son inconsistentes.","Proceso documentado de cuarentena, destrucción certificada y registros regulatorios completos.","Trazabilidad end-to-end de devoluciones con destrucción programada y reportes automáticos a reguladores.","Optimizado: gestión automatizada de cuarentena, analítica de causas y mejora continua regulatoria."], opp:"Optimizado: gestión automatizada de cuarentena, analítica de causas y mejora continua regulatoria."}, 
    "i1": {q:"¿Cómo se mide y gestiona la disponibilidad de medicamentos críticos, el nivel de desabastecimiento y el cumplimiento de pedidos hospitalarios?", label:"Disponibilidad y desabastecimiento", desc:"Fill rate, desabasto, hospitales", ndesc:["No se mide de forma consistente; los desabastecimientos se conocen cuando el paciente o hospital reclama.","Hay seguimiento básico de quiebres, pero sin indicadores formales ni diferenciación por criticidad.","Fill rate y desabasto medidos por categoría; hay metas y seguimiento periódico con hospitales clave.","Indicadores en tiempo real con alertas tempranas de desabasto y gestión proactiva con IPS y hospitales.","Gestión optimizada: analítica predictiva de desabasto, contratos de disponibilidad y mejora continua."], opp:"Gestión optimizada: analítica predictiva de desabasto, contratos de disponibilidad y mejora continua."}, 
    "i5": {q:"¿Cómo se mide y gestiona el cumplimiento regulatorio (INVIMA, BPD, serialización), auditorías de calidad y riesgos de la cadena farmacéutica?", label:"Cumplimiento INVIMA y BPD", desc:"INVIMA, BPD, auditorías, recalls", ndesc:["No se mide; controles mínimos y hallazgos frecuentes en auditorías regulatorias.","Hay seguimiento básico de cumplimiento, pero sin indicadores formales ni gestión proactiva de riesgos.","Indicadores de cumplimiento definidos; auditorías periódicas con plan de acción documentado.","Gestión de cumplimiento integrada con trazabilidad completa, alertas regulatorias y simulacros de recall.","Controles preventivos líderes: analítica de riesgo regulatorio y cero hallazgos críticos en auditorías."], opp:"Controles preventivos líderes: analítica de riesgo regulatorio y cero hallazgos críticos en auditorías."}, 
  },
  "Oil & Gas": {
    "e1": {q:"¿Qué tan bien se balancean la disponibilidad de materiales críticos para operaciones, el costo de inventario y el riesgo de paradas no planificadas?", label:"Disponibilidad vs costo operacional", desc:"Uptime, piezas críticas, OPEX/CAPEX", ndesc:["No hay balance; se sobrecompra por miedo a paradas o se queda sin piezas críticas de forma frecuente.","Hay algunos niveles de seguridad definidos, pero sin análisis formal de criticidad vs. costo.","Trade-offs definidos por categoría con políticas de stock de seguridad para equipos críticos.","Decisiones basadas en análisis de criticidad, costo de parada y lead time; revisión periódica.","Optimización continua: analítica de confiabilidad integrada con inventario para minimizar OPEX y paradas."], opp:"Optimización continua: analítica de confiabilidad integrada con inventario para minimizar OPEX y paradas."}, 
    "e2": {q:"¿Qué tan diferenciadas y aplicadas están las políticas de inventario para piezas de seguridad, repuestos MRO, consumibles y materiales de proyecto?", label:"Políticas por criticidad operacional", desc:"Seguridad, MRO, consumibles, proyectos", ndesc:["No hay políticas diferenciadas; todos los materiales se gestionan igual sin importar su criticidad.","Hay algunas reglas para materiales críticos, pero no cubren consumibles ni materiales de proyecto.","Políticas definidas por categoría (seguridad, MRO, consumibles) con niveles de reposición documentados.","Políticas integradas con planes de mantenimiento y proyectos CAPEX; revisión ante cambios operacionales.","Políticas automatizadas y optimizadas con analítica de confiabilidad y planificación de largo plazo."], opp:"Políticas automatizadas y optimizadas con analítica de confiabilidad y planificación de largo plazo."}, 
    "e3": {q:"¿Qué tan bien diseñada está la red de almacenes considerando la ubicación en campos, plantas, instalaciones offshore y centros de distribución regionales?", label:"Red en campos y plantas", desc:"Campos, offshore, plantas, almacenes regionales", ndesc:["La red se define por inercia; no hay análisis formal de ubicación ni criterios de distancia-servicio.","Se hacen ajustes puntuales cuando hay problemas de abasto en campo, sin diseño estructurado.","Hay un diseño de red con reglas de distribución por tipo de instalación y región operacional.","Decisiones de red basadas en análisis de costo-servicio con visibilidad desde offshore hasta campo.","Red optimizada con simulaciones; ajustes ágiles ante cambios de producción o disrupciones logísticas."], opp:"Red optimizada con simulaciones; ajustes ágiles ante cambios de producción o disrupciones logísticas."}, 
    "e5": {q:"¿Qué tan bien se gestionan los riesgos de la cadena de suministro incluyendo dependencia de proveedores únicos, materiales peligrosos y contingencias operacionales?", label:"Resiliencia y materiales peligrosos", desc:"HAZMAT, proveedor único, contingencias", ndesc:["No se gestionan riesgos; se reacciona cuando hay escasez o incidente con materiales peligrosos.","Hay identificación básica de riesgos, pero sin planes de contingencia ni gestión HAZMAT formal.","Riesgos identificados con planes de contingencia documentados y cumplimiento HAZMAT básico.","Gestión proactiva de riesgos con proveedores alternativos, stocks estratégicos y protocolos HAZMAT.","Resiliencia avanzada: alertas tempranas, simulaciones de disrupciones y gestión predictiva de riesgos."], opp:"Resiliencia avanzada: alertas tempranas, simulaciones de disrupciones y gestión predictiva de riesgos."}, 
    "c1": {q:"¿Qué tan bien se clasifica el inventario MRO por criticidad operacional, impacto en uptime de producción y lead time de reposición?", label:"Criticidad operacional y uptime", desc:"Criticidad, uptime, lead time MRO", ndesc:["No se clasifica; todos los materiales MRO se tratan igual sin considerar su impacto en producción.","Hay una lista de materiales críticos, pero sin metodología formal ni políticas diferenciadas.","Clasificación por criticidad (A-E) con políticas de stock mínimo para materiales de alta criticidad.","Clasificación integrada con planes de mantenimiento y análisis de impacto en uptime por equipo.","Segmentación dinámica con analítica de confiabilidad; optimización continua de stocks según criticidad."], opp:"Segmentación dinámica con analítica de confiabilidad; optimización continua de stocks según criticidad."}, 
    "c2": {q:"¿Qué tan completa es la caracterización de materiales peligrosos, control de vida útil y trazabilidad de equipos vinculados al mantenimiento?", label:"HAZMAT, vida útil y trazabilidad", desc:"HAZMAT, SDS, vida útil, mantenimiento", ndesc:["Caracterización incompleta; HAZMAT sin SDS actualizadas y sin control de vida útil sistematizado.","Hay registro básico de HAZMAT, pero vida útil y trazabilidad de equipos son manuales e incompletos.","HAZMAT caracterizados con SDS; vida útil controlada y número de serie registrado en sistema.","Trazabilidad completa con alertas de vencimiento de vida útil y vinculación a órdenes de mantenimiento.","Gestión líder: caracterización automatizada, analítica de vida útil y trazabilidad end-to-end."], opp:"Gestión líder: caracterización automatizada, analítica de vida útil y trazabilidad end-to-end."}, 
    "c3": {q:"¿Qué tan bien se gestiona la obsolescencia de materiales asociada a cambios tecnológicos, equipos fuera de soporte y activos dados de baja?", label:"Obsolescencia de activos y repuestos", desc:"Obsolescencia, equipos EOL, activos", ndesc:["No se gestiona; se acumulan repuestos de equipos obsoletos sin proceso de disposición.","Se detecta la obsolescencia de forma reactiva cuando hay quiebres o equipos ya dados de baja.","Hay proceso de revisión periódica de obsolescencia con plan de disposición o reutilización.","Gestión proactiva vinculada al ciclo de vida de activos; alerta temprana de EOL de equipos.","Optimizado: gestión predictiva de obsolescencia con analítica de activos y recuperación de valor."], opp:"Optimizado: gestión predictiva de obsolescencia con analítica de activos y recuperación de valor."}, 
    "c4": {q:"¿Qué tan visible y controlado está el inventario en campos, plantas, almacenes offshore, materiales en consignación y tránsito internacional?", label:"Visibilidad en campos y offshore", desc:"Campos, offshore, consignación, tránsito", ndesc:["No hay visibilidad completa; se desconoce el inventario en campo y offshore con frecuencia.","Visibilidad parcial en almacenes principales; campo y offshore reportan de forma manual.","Visibilidad integrada en sistemas con reconciliación periódica en todas las ubicaciones.","Control en tiempo real incluyendo consignación en proveedores y materiales en tránsito.","Visibilidad líder: integraciones automáticas, analítica por ubicación y control total end-to-end."], opp:"Visibilidad líder: integraciones automáticas, analítica por ubicación y control total end-to-end."}, 
    "p1": {q:"¿Qué tan bien está integrada la planificación de inventario MRO con los planes de mantenimiento preventivo, historial de fallas y criticidad de equipos?", label:"Planeación MRO basada en mantenimiento", desc:"PM, CMMS, historial fallas, criticidad", ndesc:["Sin integración; el inventario MRO se repone reactivamente sin considerar planes de mantenimiento.","Hay algunas listas de materiales por equipo, pero sin conexión formal con el CMMS ni historial de fallas.","Planificación MRO vinculada a planes de mantenimiento preventivo con revisión periódica.","Integración CMMS-ERP con generación automática de requerimientos según planes de mantenimiento.","Planeación optimizada: analítica predictiva de fallas integrada con inventario y proveedores."], opp:"Planeación optimizada: analítica predictiva de fallas integrada con inventario y proveedores."}, 
    "p3": {q:"¿Qué tan estandarizados y controlados están los procesos de recepción, almacenamiento y despacho de materiales peligrosos, equipos de gran porte y materiales de proyecto?", label:"Operaciones con HAZMAT y gran porte", desc:"HAZMAT, gran porte, materiales proyecto", ndesc:["Procesos poco definidos; HAZMAT sin protocolos y materiales de gran porte sin control de ubicación.","Hay lineamientos básicos, pero se aplican de forma irregular según el operador o turno.","Procesos documentados con protocolos HAZMAT y control de ubicaciones para gran porte.","Procesos estandarizados con capacitación formal, controles de calidad y trazabilidad en campo.","Ejecución optimizada: automatización de controles HAZMAT y gestión integrada de materiales de proyecto."], opp:"Ejecución optimizada: automatización de controles HAZMAT y gestión integrada de materiales de proyecto."}, 
    "p4": {q:"¿Qué tan preciso es el control de inventario físico en ubicaciones remotas y cómo se reconcilia con activos en mantenimiento y sistema?", label:"Control en ubicaciones remotas", desc:"Campos remotos, activos, reconciliación", ndesc:["Exactitud baja en campo; diferencias frecuentes entre físico y sistema sin procesos de reconciliación.","Se hacen conteos esporádicos en campos remotos, pero sin reconciliación sistemática con activos.","Conteos cíclicos programados en ubicaciones remotas con reconciliación periódica documentada.","Control con tecnología móvil o RFID; reconciliación en tiempo real con activos en mantenimiento.","Exactitud líder: controles preventivos, analítica de pérdidas y reconciliación automatizada."], opp:"Exactitud líder: controles preventivos, analítica de pérdidas y reconciliación automatizada."}, 
    "h1": {q:"¿Qué tan integrados están el ERP, el CMMS (SAP PM/Maximo) y los sistemas de compras para gestionar el ciclo completo de materiales MRO?", label:"ERP-CMMS-Compras integrados", desc:"SAP PM, Maximo, integración MRO", ndesc:["Sistemas desconectados; mucha operación manual entre CMMS y ERP con duplicidad de datos.","Hay integraciones básicas, pero con inconsistencias frecuentes entre órdenes de mantenimiento y compras.","Integración ERP-CMMS con flujos automatizados para los principales tipos de materiales MRO.","Integración end-to-end con visibilidad de costo por activo y generación automática de requerimientos.","Integración en tiempo real con analítica de confiabilidad, alta disponibilidad y roadmap de mejora continua."], opp:"Integración en tiempo real con analítica de confiabilidad, alta disponibilidad y roadmap de mejora continua."}, 
    "ab1": {q:"¿Qué tan robusta es la estrategia de abastecimiento para repuestos críticos de producción (bombas, válvulas, compresores) incluyendo acuerdos con OEM?", label:"Repuestos críticos de producción", desc:"Bombas, válvulas, compresores, OEM", ndesc:["Se compra reactivamente cuando falla el equipo; sin acuerdos con OEM ni stock estratégico.","Hay algunos repuestos de seguridad, pero sin estrategia formal ni acuerdos de suministro con fabricantes.","Estrategia definida para repuestos críticos con stock mínimo y contratos básicos con OEM.","Abastecimiento optimizado con acuerdos de suministro garantizado, stock en consignación y trazabilidad.","Gestión avanzada: analítica predictiva de fallas, contratos integrales con OEM y cero paradas por repuesto."], opp:"Gestión avanzada: analítica predictiva de fallas, contratos integrales con OEM y cero paradas por repuesto."}, 
    "ab2": {q:"¿Qué tan bien se gestiona el inventario de materiales e insumos de operación (chemicals, lubricantes, catalizadores) incluyendo condiciones especiales de almacenamiento?", label:"Chemicals, lubricantes y catalizadores", desc:"Chemicals, lubricantes, catalizadores", ndesc:["Sin gestión diferenciada; chemicals almacenados sin control de condiciones ni segregación adecuada.","Hay control básico de chemicals, pero sin gestión formal de condiciones de almacenamiento ni vida útil.","Gestión documentada con control de condiciones, vida útil y cumplimiento normativo básico.","Control integrado con monitoreo de condiciones, alertas de vencimiento y trazabilidad de uso.","Optimizado: gestión predictiva de consumo, condiciones monitoreadas en tiempo real y cero incidentes."], opp:"Optimizado: gestión predictiva de consumo, condiciones monitoreadas en tiempo real y cero incidentes."}, 
    "ab3": {q:"¿Qué tan eficiente es la gestión de consumibles MRO de alto volumen (herramientas, EPP, filtros) con contratos marco y reposición automatizada?", label:"MRO consumibles y EPP", desc:"Herramientas, EPP, filtros, contratos marco", ndesc:["Sin gestión estructurada; consumibles comprados por urgencia sin contratos ni control de consumo.","Hay proveedores recurrentes, pero sin contratos marco ni automatización de reposición.","Contratos marco para principales consumibles con reposición periódica basada en consumo histórico.","Reposición automatizada con VMI o kanban para consumibles de alta rotación; trazabilidad de uso.","Optimizado: analítica de consumo, contratos integrales y cero quiebres de consumibles críticos."], opp:"Optimizado: analítica de consumo, contratos integrales y cero quiebres de consumibles críticos."}, 
    "ab4": {q:"¿Qué tan bien se gestiona el abastecimiento de materiales de proyectos de capital incluyendo planificación de largo plazo, importaciones y materiales de entrega larga?", label:"Materiales de proyectos CAPEX", desc:"CAPEX, long-lead, importaciones", ndesc:["Sin gestión diferenciada de CAPEX; materiales de largo plazo comprados con urgencia y retrasos.","Hay seguimiento básico de proyectos, pero sin planificación integrada de materiales de entrega larga.","Planificación de materiales CAPEX con tracking de long-lead items y gestión básica de importaciones.","Gestión integrada con cronograma de proyecto, analítica de riesgo de suministro e importaciones.","Optimizado: planificación predictiva, contratos anticipados con fabricantes y cero retrasos por material."], opp:"Optimizado: planificación predictiva, contratos anticipados con fabricantes y cero retrasos por material."}, 
    "ab5": {q:"¿Qué tan bien se gestiona el inventario de materiales reparables, reacondicionados y surplus incluyendo procesos de reparación, disposición y recuperación de valor?", label:"Reparables, surplus y disposición", desc:"Reparables, surplus, disposición HAZMAT", ndesc:["Sin gestión de reparables ni surplus; materiales dañados o excedentes se acumulan sin disposición.","Hay reparaciones ocasionales, pero sin proceso formal ni seguimiento de recuperación de valor.","Proceso de reparación documentado con categorización de surplus y plan de disposición básico.","Gestión integrada de reparables con circularidad; surplus analizado para reutilización o disposición.","Optimizado: economía circular avanzada, analítica de recuperación de valor y disposición HAZMAT certificada."], opp:"Optimizado: economía circular avanzada, analítica de recuperación de valor y disposición HAZMAT certificada."}, 
    "i1": {q:"¿Cómo se mide y gestiona el impacto del inventario en el uptime de producción y el costo de paradas no planificadas por falta de repuesto?", label:"Uptime y costo de paradas", desc:"Uptime, paradas, costo producción perdida", ndesc:["No se mide; las paradas por falta de repuesto se conocen cuando ya afectaron la producción.","Hay registro básico de paradas, pero sin cuantificación del costo ni vinculación al inventario.","Uptime y costo de paradas medidos; hay metas y seguimiento con mantenimiento y operaciones.","Indicadores en tiempo real con alertas de riesgo de parada y gestión proactiva de repuestos críticos.","Gestión optimizada: analítica predictiva de paradas, cero quiebres críticos y mejora continua de uptime."], opp:"Gestión optimizada: analítica predictiva de paradas, cero quiebres críticos y mejora continua de uptime."}, 
    "i5": {q:"¿Cómo se mide y gestiona el cumplimiento de regulaciones HSE para materiales peligrosos, disposición y transporte en la cadena de suministro?", label:"Cumplimiento HSE y seguridad", desc:"HSE, HAZMAT, transporte, auditorías", ndesc:["No se mide; controles mínimos y hallazgos frecuentes en inspecciones HSE.","Hay seguimiento básico de cumplimiento HSE, pero sin indicadores formales ni gestión proactiva.","Indicadores de cumplimiento HSE definidos con auditorías periódicas y plan de acción documentado.","Gestión integrada con trazabilidad de HAZMAT, alertas regulatorias y auditorías en tiempo real.","Líder en HSE: controles preventivos, analítica de riesgo y cero incidentes regulatorios en cadena."], opp:"Líder en HSE: controles preventivos, analítica de riesgo y cero incidentes regulatorios en cadena."}, 
  },
  "Manufactura": {
    "e1": {q:"¿Qué tan bien se balancean el nivel de servicio al cliente, el costo de inventario en cada etapa del ciclo productivo (MP, WIP, PT) y el capital de trabajo?", label:"Trade-offs en ciclo productivo", desc:"MP, WIP, PT, capital de trabajo", ndesc:["No hay balance; se acumula inventario en todas las etapas sin considerar costo ni servicio.","Hay objetivos generales de producción, pero sin trade-offs explícitos entre etapas del ciclo.","Trade-offs definidos por etapa (MP, WIP, PT) con políticas de stock diferenciadas.","Objetivos acordados entre Comercial, Manufactura y Finanzas con revisión periódica de capital.","Optimización continua: analítica de ciclo productivo integrada para minimizar capital sin afectar servicio."], opp:"Optimización continua: analítica de ciclo productivo integrada para minimizar capital sin afectar servicio."}, 
    "e2": {q:"¿Qué tan diferenciadas y aplicadas están las políticas de inventario por etapa productiva (MP, WIP, PT) y canal de distribución (B2B, distribuidores, exportación)?", label:"Políticas por etapa y canal", desc:"MP, WIP, PT, B2B, exportación", ndesc:["No hay políticas diferenciadas; se gestiona igual sin importar la etapa o el canal de destino.","Hay algunas reglas por canal principal, pero no cubren todas las etapas ni canales menores.","Políticas definidas por etapa y canal con niveles objetivo y reglas de reposición documentadas.","Políticas integradas con la promesa comercial, capacidad de planta y restricciones de canal.","Políticas automatizadas y optimizadas con revisión continua según demanda y capacidad productiva."], opp:"Políticas automatizadas y optimizadas con revisión continua según demanda y capacidad productiva."}, 
    "e3": {q:"¿Qué tan bien diseñada está la red considerando plantas de producción, centros de distribución, almacenes de tránsito y puntos de entrega a clientes industriales?", label:"Red planta-CD-cliente industrial", desc:"Plantas, CD, almacenes, clientes B2B", ndesc:["La red se define por inercia; no hay análisis formal de ubicación ni criterios de servicio-costo.","Se hacen ajustes puntuales cuando hay problemas de entrega, sin diseño estructurado de red.","Hay un diseño de red con reglas de distribución por tipo de cliente y zona geográfica.","Decisiones basadas en análisis de costo-servicio con coordinación planta-CD-cliente end-to-end.","Red optimizada con simulaciones; ajustes ágiles ante cambios de demanda o capacidad productiva."], opp:"Red optimizada con simulaciones; ajustes ágiles ante cambios de demanda o capacidad productiva."}, 
    "c1": {q:"¿Qué tan bien se segmenta el portafolio de SKUs por volumen (ABC), variabilidad de demanda (XYZ) y etapa productiva para definir estrategias diferenciadas?", label:"Segmentación SKU por etapa productiva", desc:"ABC/XYZ, make-to-stock vs make-to-order", ndesc:["No se segmenta; todos los SKUs se planifican igual sin considerar volumen ni variabilidad.","Hay clasificación ABC básica, pero no guía decisiones de make-to-stock vs. make-to-order.","Segmentación ABC/XYZ aplicada con estrategias diferenciadas por etapa productiva.","Segmentación dinámica que guía políticas de producción, inventario y servicio por SKU.","Segmentación avanzada con analítica predictiva; optimización continua según demanda y capacidad."], opp:"Segmentación avanzada con analítica predictiva; optimización continua según demanda y capacidad."}, 
    "c2": {q:"¿Qué tan completa es la trazabilidad de lotes de producción, materias primas con certificados de calidad y el seguimiento a través del proceso productivo?", label:"Trazabilidad productiva y calidad", desc:"Lotes producción, certificados, QC", ndesc:["Trazabilidad limitada; se pierde el rastro de lotes entre etapas productivas frecuentemente.","Hay registro básico de lotes, pero sin continuidad ni vinculación a certificados de calidad.","Trazabilidad de lotes documentada con certificados de calidad vinculados al proceso productivo.","Trazabilidad end-to-end con número de lote rastreable desde MP hasta PT entregado al cliente.","Trazabilidad en tiempo real con controles automáticos de calidad y analítica de no conformes."], opp:"Trazabilidad en tiempo real con controles automáticos de calidad y analítica de no conformes."}, 
    "c3": {q:"¿Qué tan bien se gestiona el ciclo de vida del producto incluyendo lanzamientos, cambios de versión, descontinuaciones y obsolescencia de MP y PT?", label:"Ciclo de vida y obsolescencia", desc:"NPL, descontinuados, MP obsoleta, PT SLOB", ndesc:["No se planifica el ciclo de vida; se acumula inventario obsoleto de MP y PT sin proceso de disposición.","Se detecta la obsolescencia de forma reactiva cuando ya hay pérdidas significativas.","Hay proceso de revisión de ciclo de vida con plan de descontinuación y gestión básica de SLOB.","Gestión proactiva de lanzamientos y descontinuaciones con control de MP asociada y SLOB.","Gestión avanzada: predicción de obsolescencia, liquidación optimizada y cero MP bloqueada por descontinuación."], opp:"Gestión avanzada: predicción de obsolescencia, liquidación optimizada y cero MP bloqueada por descontinuación."}, 
    "p1": {q:"¿Qué tan bien está integrada la planificación de producción e inventario (MPS/MRP) con la demanda del cliente y los planes de capacidad de planta?", label:"MPS/MRP integrado con demanda", desc:"MPS, MRP, capacidad, demanda", ndesc:["Sin integración; producción planificada por inercia sin considerar demanda real ni capacidad.","Hay MPS básico, pero sin conexión formal con demanda del cliente ni restricciones de capacidad.","MPS/MRP implementado con actualización periódica basada en demanda y revisión de capacidad.","Planificación integrada con demanda en tiempo real, capacidad y disponibilidad de MP.","Planeación optimizada: analítica avanzada, ajuste continuo y sincronización end-to-end."], opp:"Planeación optimizada: analítica avanzada, ajuste continuo y sincronización end-to-end."}, 
    "p2": {q:"¿Qué tan bien se gestiona la asignación de producción y PT entre múltiples plantas, clientes y canales con visibilidad de capacidad disponible?", label:"Asignación multicanal y multiplanta", desc:"ATP, capacidad, multicanal, exportación", ndesc:["Sin gestión formal; asignación por urgencia o relación comercial sin criterios objetivos.","Hay reglas básicas de priorización, pero sin visibilidad de ATP ni integración multiplanta.","Asignación con reglas definidas por canal; ATP básico con revisión periódica.","Asignación optimizada con ATP en tiempo real y reglas por cliente, canal y prioridad.","Optimizado: asignación dinámica con analítica, simulaciones de escenarios y cero conflictos de capacidad."], opp:"Optimizado: asignación dinámica con analítica, simulaciones de escenarios y cero conflictos de capacidad."}, 
    "p3": {q:"¿Qué tan estandarizados y controlados están los procesos de almacenamiento de materias primas, WIP y producto terminado incluyendo condiciones especiales y FIFO/FEFO?", label:"Almacenamiento MP, WIP y PT", desc:"MP, WIP, PT, condiciones, FIFO/FEFO", ndesc:["Procesos poco definidos; FIFO no se aplica y condiciones especiales no se controlan.","Hay lineamientos básicos, pero FIFO/FEFO y condiciones especiales se aplican irregularmente.","FIFO/FEFO implementado con condiciones de almacenamiento documentadas y auditadas.","Procesos estandarizados con control automatizado de condiciones y trazabilidad por ubicación.","Ejecución optimizada: automatización de FIFO, monitoreo de condiciones en tiempo real."], opp:"Ejecución optimizada: automatización de FIFO, monitoreo de condiciones en tiempo real."}, 
    "h1": {q:"¿Qué tan integrados están el ERP, los sistemas MES de planta, el WMS de almacenes y las plataformas de planificación para visibilidad end-to-end del ciclo productivo?", label:"ERP-MES-WMS integrados", desc:"ERP, MES, WMS, integración productiva", ndesc:["Sistemas desconectados; mucha operación manual entre planta, almacén y ERP.","Hay integraciones básicas ERP-MES, pero con inconsistencias entre producción y logística.","Integración ERP-MES-WMS con flujos automatizados para los principales procesos productivos.","Integración end-to-end con visibilidad de inventario en proceso y producto terminado en tiempo real.","Integración líder: datos en tiempo real, alta confiabilidad y analítica de ciclo productivo continua."], opp:"Integración líder: datos en tiempo real, alta confiabilidad y analítica de ciclo productivo continua."}, 
    "ab1": {q:"¿Qué tan robusta es la gestión de materias primas e insumos directos incluyendo planificación por MRP, proveedores alternativos y lead times variables?", label:"Materias primas e insumos directos", desc:"MRP, proveedores, lead times, calidad", ndesc:["Se compra reactivamente; quiebres de MP frecuentes o sobrestock sin planificación formal.","Hay MRP básico, pero sin proveedores alternativos ni gestión de variabilidad de lead times.","MRP implementado con lista de proveedores alternativos para materiales críticos.","Planificación integrada con gestión de riesgo de proveedor, lead times y calidad de MP.","Optimizado: analítica predictiva de demanda de MP, proveedores resilientes y cero quiebres productivos."], opp:"Optimizado: analítica predictiva de demanda de MP, proveedores resilientes y cero quiebres productivos."}, 
    "ab2": {q:"¿Qué tan bien se gestiona el inventario de materiales de empaque y envase (primario, secundario, terciario) sincronizado con los planes de producción?", label:"Materiales de empaque y envase", desc:"Empaque primario, secundario, terciario", ndesc:["Sin gestión diferenciada; empaque comprado sin sincronización con producción ni control de variantes.","Hay reposición básica de empaque, pero sin sincronización formal con MPS ni control de variantes.","Gestión sincronizada con MPS; control de variantes por SKU y proveedor de empaque.","Planificación integrada con cambios de diseño, lanzamientos y descontinuaciones de empaque.","Optimizado: sincronización automática, analítica de consumo y cero quiebres de empaque productivo."], opp:"Optimizado: sincronización automática, analítica de consumo y cero quiebres de empaque productivo."}, 
    "ab3": {q:"¿Qué tan bien se gestiona el MRO industrial (repuestos de planta, herramientas, consumibles) para garantizar la continuidad de producción?", label:"MRO industrial y repuestos planta", desc:"Repuestos, herramientas, consumibles planta", ndesc:["Sin gestión estructurada; paradas de línea por falta de repuesto son frecuentes.","Hay algunos repuestos de seguridad, pero sin estrategia formal ni integración con mantenimiento.","Estrategia MRO definida con stock de seguridad para repuestos críticos de línea.","MRO integrado con planes de mantenimiento preventivo y control de consumo por equipo.","Optimizado: analítica predictiva de fallas, cero paradas por MRO y gestión de economía circular."], opp:"Optimizado: analítica predictiva de fallas, cero paradas por MRO y gestión de economía circular."}, 
    "ab4": {q:"¿Qué tan bien se gestiona el portafolio de productos terminados incluyendo proliferación de variantes, análisis de rentabilidad y simplificación de SKUs?", label:"Portafolio PT y gestión de variantes", desc:"SKUs, variantes, proliferación, simplificación", ndesc:["Sin gestión formal; alta proliferación de SKUs sin análisis de rentabilidad ni racionalización.","Hay listado de SKUs, pero sin análisis de rentabilidad ni proceso de descontinuación.","Análisis de portafolio periódico con criterios de rentabilidad y proceso de simplificación.","Gestión activa de variantes con decisiones de continuación/descontinuación basadas en datos.","Optimizado: racionalización continua, analítica de rentabilidad por SKU y surtido óptimo."], opp:"Optimizado: racionalización continua, analítica de rentabilidad por SKU y surtido óptimo."}, 
    "ab5": {q:"¿Qué tan eficiente y controlado es el manejo de devoluciones de PT, reprocesos, producto no conforme y gestión de merma y scrap productivo?", label:"Devoluciones, reproceso y scrap", desc:"Devoluciones, no conforme, scrap, merma", ndesc:["Sin proceso claro; devoluciones, no conformes y scrap se acumulan sin gestión formal.","Hay procesos básicos de devolución y scrap, pero sin análisis de causa ni control de merma.","Proceso documentado con clasificación de no conforme, reproceso y disposición de scrap.","Gestión integrada con análisis de causa, reducción de merma y circularidad de materiales.","Optimizado: cero defectos como objetivo, analítica de no conformes y economía circular avanzada."], opp:"Optimizado: cero defectos como objetivo, analítica de no conformes y economía circular avanzada."}, 
    "i2": {q:"¿Cómo se miden y gestionan la eficiencia del ciclo productivo, la rotación de inventario por etapa (MP, WIP, PT) y el costo de inventario sobre ventas?", label:"Rotación MP, WIP y PT", desc:"DIO por etapa, rotación, costo/ventas", ndesc:["No se mide de forma consistente; el inventario en cada etapa se desconoce o no se usa para gestionar.","Hay métricas básicas de inventario total, pero sin diferenciación por etapa ni vinculación a costos.","DIO medido por etapa con metas y seguimiento periódico; costo de inventario reportado.","Indicadores en tiempo real por etapa con análisis de causa de desviaciones y acciones correctivas.","Optimización continua del ciclo productivo con analítica avanzada y benchmarking vs. industria."], opp:"Optimización continua del ciclo productivo con analítica avanzada y benchmarking vs. industria."}, 
  },
  "CPG": {
    "e1": {q:"¿Qué tan bien se balancean el nivel de servicio al retail y e-commerce, el costo de inventario y el capital de trabajo considerando alta estacionalidad y efectos promocionales?", label:"Trade-offs con estacionalidad y promo", desc:"Servicio retail, estacionalidad, promociones", ndesc:["No hay balance; se acumula inventario en temporadas sin considerar costo ni impacto post-promo.","Hay objetivos generales, pero sin trade-offs explícitos para estacionalidad ni promociones.","Trade-offs definidos por canal y temporada con políticas de stock diferenciadas para eventos.","Objetivos acordados entre Comercial, Manufactura y Finanzas con revisión ante cada campaña.","Optimización continua: analítica de estacionalidad y promo integrada para minimizar capital sin afectar OTIF."], opp:"Optimización continua: analítica de estacionalidad y promo integrada para minimizar capital sin afectar OTIF."}, 
    "e2": {q:"¿Qué tan diferenciadas y aplicadas están las políticas de inventario por canal (supermercados, canal tradicional, e-commerce) y categoría (perecederos, no perecederos)?", label:"Políticas por canal y categoría", desc:"Retail, tradicional, e-com, perecederos", ndesc:["No hay políticas diferenciadas; todos los canales y categorías se gestionan igual.","Hay algunas reglas para el canal principal, pero no cubren e-commerce ni perecederos.","Políticas definidas por canal y categoría con niveles objetivo y reglas de reposición.","Políticas integradas con promesa comercial, capacidad logística y restricciones de vida útil.","Políticas automatizadas y optimizadas por canal con revisión continua según demanda y rentabilidad."], opp:"Políticas automatizadas y optimizadas por canal con revisión continua según demanda y rentabilidad."}, 
    "e3": {q:"¿Qué tan bien diseñada está la red de distribución considerando CEDIS del retail, dark stores para e-commerce y entrega directa a tienda (DSD)?", label:"Red con CEDIS y DSD", desc:"CEDIS, DSD, dark stores, regional", ndesc:["La red se define por inercia; no hay análisis formal de cobertura ni criterios por canal.","Se hacen ajustes puntuales cuando hay problemas de entrega o OTIF, sin diseño estructurado.","Hay diseño de red con reglas por tipo de punto (CEDIS, DSD, dark store) y zona.","Decisiones basadas en análisis de costo-servicio con coordinación planta-CD-punto de venta.","Red optimizada con simulaciones; ajustes ágiles ante cambios de canal o comportamiento del shopper."], opp:"Red optimizada con simulaciones; ajustes ágiles ante cambios de canal o comportamiento del shopper."}, 
    "e4": {q:"¿Qué tan avanzada es la colaboración S&OP con los principales clientes retail para sincronizar pronósticos, promociones y reposición de inventario?", label:"S&OP colaborativo con retail", desc:"ECR, CPFR, joint forecast, VMI", ndesc:["Sin colaboración; no hay intercambio de información de demanda con clientes retail.","Hay reuniones ocasionales con algunos clientes, pero sin datos compartidos ni acuerdos formales.","Proceso de colaboración básica (ECR/CPFR) con clientes clave; pronósticos compartidos periódicamente.","Colaboración avanzada con VMI en clientes principales; forecast conjunto y planificación de eventos.","Colaboración líder: planificación integrada en tiempo real, cero OOS en punto de venta con clientes clave."], opp:"Colaboración líder: planificación integrada en tiempo real, cero OOS en punto de venta con clientes clave."}, 
    "c1": {q:"¿Qué tan bien se segmenta el portafolio por velocidad de venta (ABC), variabilidad de demanda (XYZ), canal y ciclo de vida para definir estrategias diferenciadas?", label:"Segmentación por velocidad y canal", desc:"ABC/XYZ, estacionalidad, canal, ciclo vida", ndesc:["No se segmenta; todos los SKUs se planifican igual sin considerar velocidad ni canal.","Hay clasificación ABC básica, pero no guía decisiones por canal ni considera estacionalidad.","Segmentación ABC/XYZ aplicada por canal con estrategias diferenciadas de inventario.","Segmentación dinámica que guía políticas de reposición, surtido y servicio por canal y SKU.","Segmentación avanzada con analítica predictiva; optimización continua según tendencias del shopper."], opp:"Segmentación avanzada con analítica predictiva; optimización continua según tendencias del shopper."}, 
    "c2": {q:"¿Qué tan completa es la trazabilidad de lotes, fechas de vencimiento y condiciones de almacenamiento desde producción hasta el punto de venta para un recall efectivo?", label:"Trazabilidad y gestión FEFO", desc:"Lotes, vencimientos, FEFO, trazabilidad retail", ndesc:["Trazabilidad limitada; se pierde el rastro de lotes entre planta y punto de venta.","Hay registro de lotes en planta, pero sin continuidad hasta el retail ni control de FEFO.","FEFO implementado con trazabilidad de lotes hasta CD; registro básico en puntos de venta.","Trazabilidad end-to-end desde producción hasta punto de venta; recall ejecutable en horas.","Trazabilidad líder: tiempo real desde planta hasta PDV, recall en minutos y cero errores de FEFO."], opp:"Trazabilidad líder: tiempo real desde planta hasta PDV, recall en minutos y cero errores de FEFO."}, 
    "c3": {q:"¿Qué tan bien se gestiona el ciclo de vida del SKU incluyendo lanzamientos, extensiones de línea, descontinuaciones y liquidación de inventario SLOB?", label:"Ciclo de vida SKU y liquidación", desc:"NPL, extensiones, descontinuados, liquidación", ndesc:["No se planifica el ciclo de vida; se acumula inventario SLOB sin proceso de liquidación.","Se detecta la obsolescencia de forma reactiva cuando ya hay pérdidas significativas.","Hay proceso de revisión de ciclo de vida con plan de descontinuación y liquidación básica.","Gestión proactiva de lanzamientos y descontinuaciones con control de SLOB por canal.","Gestión avanzada: predicción de fin de vida, liquidación optimizada y cero SLOB no gestionado."], opp:"Gestión avanzada: predicción de fin de vida, liquidación optimizada y cero SLOB no gestionado."}, 
    "p1": {q:"¿Qué tan robusta es la planificación de demanda considerando estacionalidad, efectos promocionales, nuevos lanzamientos y colaboración con clientes retail?", label:"Demand planning con estacionalidad y promo", desc:"Estacionalidad, promo, colaboración, error", ndesc:["Sin planificación formal; se reacciona ante quiebres y sobrestock tras temporadas o promociones.","Hay pronósticos básicos, pero sin modelos de estacionalidad ni captura de efectos promocionales.","Planificación con modelos de estacionalidad y uplift promocional; error de pronóstico medido.","Demand planning avanzado con colaboración con retail, ajuste por evento y reducción de MAPE.","Optimizado: modelos ML de demanda, planificación conjunta con clientes y cero sorpresas en temporada."], opp:"Optimizado: modelos ML de demanda, planificación conjunta con clientes y cero sorpresas en temporada."}, 
    "p2": {q:"¿Qué tan bien se gestiona la asignación de producto entre canales (retail, canal tradicional, e-commerce) en situaciones de escasez o restricción de producción?", label:"Asignación multicanal en escasez", desc:"ATP, priorización canal, escasez", ndesc:["Sin gestión formal; asignación por urgencia o presión comercial sin criterios objetivos.","Hay reglas básicas de prioridad por canal, pero sin ATP ni proceso formal de asignación.","Asignación con reglas definidas por canal y cliente; ATP básico revisado periódicamente.","Asignación optimizada con ATP en tiempo real y reglas de prioridad por rentabilidad y OTIF.","Optimizado: asignación dinámica con analítica, simulaciones de escenarios y máxima rentabilidad."], opp:"Optimizado: asignación dinámica con analítica, simulaciones de escenarios y máxima rentabilidad."}, 
    "p3": {q:"¿Qué tan estandarizados están los procesos de almacenamiento con FEFO, manejo de temperatura controlada, gestión de merma y operaciones de cross-docking para retail?", label:"FEFO, temperatura y cross-docking", desc:"FEFO, temperatura, merma, cross-docking", ndesc:["Procesos poco definidos; FEFO no se aplica y merma se detecta tarde sin control de causas.","Hay lineamientos básicos, pero FEFO, temperatura y cross-docking se aplican irregularmente.","FEFO y cross-docking implementados con control básico de temperatura y registro de merma.","Procesos estandarizados con control automatizado de FEFO, temperatura y merma por causa.","Ejecución optimizada: automatización de FEFO, cross-docking eficiente y merma mínima documentada."], opp:"Ejecución optimizada: automatización de FEFO, cross-docking eficiente y merma mínima documentada."}, 
    "h1": {q:"¿Qué tan integrados están el ERP, las plataformas de demand planning, el WMS y los sistemas EDI con clientes retail para visibilidad end-to-end?", label:"ERP-DPL-WMS-EDI integrados", desc:"ERP, IBP, WMS, EDI retail, e-commerce", ndesc:["Sistemas desconectados; mucha operación manual entre planificación, bodega y clientes retail.","Hay integraciones básicas ERP-WMS, pero sin demand planning integrado ni EDI con retail.","Integración ERP-DPL-WMS con flujos automatizados; EDI con principales clientes retail.","Integración end-to-end con visibilidad de sell-out, inventario en retail y reposición automática.","Integración líder: datos en tiempo real desde el PDV hasta producción y analítica de cadena completa."], opp:"Integración líder: datos en tiempo real desde el PDV hasta producción y analítica de cadena completa."}, 
    "h4": {q:"¿Qué tan maduras son las capacidades analíticas para planificación de demanda, optimización de inventario multiescalón y análisis de rentabilidad por SKU y canal?", label:"Analítica avanzada de demanda e inventario", desc:"ML forecast, optimización, rentabilidad SKU", ndesc:["Sin analítica; se decide por intuición o históricos simples sin modelos formales.","Hay reportes básicos de demanda e inventario, pero sin modelos predictivos ni optimización.","Analítica descriptiva con tableros de gestión; modelos de estacionalidad básicos implementados.","Analítica predictiva de demanda con optimización de inventario y análisis de rentabilidad por canal.","Analítica prescriptiva: ML forecast, optimización multiescalón y recomendaciones automatizadas."], opp:"Analítica prescriptiva: ML forecast, optimización multiescalón y recomendaciones automatizadas."}, 
    "ab1": {q:"¿Qué tan eficiente es la gestión del portafolio de alta rotación con reposición automática, VMI en clientes clave y colaboración con retail?", label:"Productos alta rotación y VMI", desc:"Alta rotación, VMI, reposición automática", ndesc:["Sin automatización; reposición manual con quiebres frecuentes en productos de alta rotación.","Hay reposición periódica, pero sin VMI ni automatización para productos de alta rotación.","VMI implementado en clientes clave con reposición automática basada en sell-out.","VMI avanzado con integración de POS data; reposición en tiempo real para alta rotación.","Optimizado: cero OOS en alta rotación, VMI con analítica y mejora continua de servicio."], opp:"Optimizado: cero OOS en alta rotación, VMI con analítica y mejora continua de servicio."}, 
    "ab2": {q:"¿Qué tan robusta es la gestión de productos de temporada con planificación anticipada, precompras y procesos de liquidación al cierre de temporada?", label:"Gestión de temporadas y precompras", desc:"Temporadas, precompras, liquidación", ndesc:["Sin planificación formal de temporadas; precompras por inercia y liquidaciones caóticas.","Hay planificación básica de temporada, pero sin modelos de demanda ni proceso de liquidación.","Planificación de temporadas con modelos de uplift; precompras con criterios definidos.","Gestión proactiva con simulaciones de temporada, precompras optimizadas y plan de liquidación.","Optimizado: analítica avanzada de temporada, cero sobrestock residual y liquidación rentable."], opp:"Optimizado: analítica avanzada de temporada, cero sobrestock residual y liquidación rentable."}, 
    "ab3": {q:"¿Qué tan bien se gestiona el abastecimiento de materias primas y materiales de empaque incluyendo consolidación de proveedores y gestión de variantes por mercado?", label:"Materias primas y empaque CPG", desc:"MP, empaque, consolidación, variantes", ndesc:["Sin gestión diferenciada; MP y empaque comprados por urgencia sin consolidación ni control de variantes.","Hay proveedores recurrentes, pero sin consolidación formal ni control de variantes por mercado.","Gestión con consolidación de proveedores clave y control básico de variantes de empaque.","Planificación integrada con cambios de diseño, lanzamientos y gestión de variantes por canal.","Optimizado: consolidación avanzada, analítica de costos de empaque y cero quiebres productivos."], opp:"Optimizado: consolidación avanzada, analítica de costos de empaque y cero quiebres productivos."}, 
    "ab4": {q:"¿Qué tan bien se gestiona el portafolio de SKUs incluyendo análisis de rentabilidad, racionalización de variantes y equilibrio entre innovación y core business?", label:"Portafolio SKU y racionalización", desc:"Rentabilidad, racionalización, innovación", ndesc:["Sin gestión formal; alta proliferación de SKUs sin análisis de rentabilidad ni proceso de descontinuación.","Hay listado de SKUs, pero sin análisis de rentabilidad ni proceso formal de racionalización.","Análisis de portafolio periódico con criterios de rentabilidad y proceso básico de simplificación.","Gestión activa con decisiones basadas en datos de rentabilidad, surtido y aporte al portafolio.","Optimizado: racionalización continua, analítica avanzada de rentabilidad y surtido óptimo por canal."], opp:"Optimizado: racionalización continua, analítica avanzada de rentabilidad y surtido óptimo por canal."}, 
    "ab5": {q:"¿Qué tan eficiente y controlado es el manejo de devoluciones del canal retail, producto vencido, merma en punto de venta y disposición final o donación?", label:"Devoluciones retail y merma PDV", desc:"Devoluciones retail, vencidos, merma, donación", ndesc:["Sin proceso claro; devoluciones y merma se acumulan sin análisis ni disposición formal.","Hay procesos básicos de devolución, pero sin control de merma en PDV ni política de donación.","Proceso documentado de devoluciones con clasificación de merma y política básica de disposición.","Gestión integrada con análisis de causa de merma, reducción en PDV y programa de donación.","Optimizado: merma mínima, analítica de causas en PDV, circularidad y donación estructurada."], opp:"Optimizado: merma mínima, analítica de causas en PDV, circularidad y donación estructurada."}, 
    "i1": {q:"¿Cómo se miden y gestionan el nivel de servicio al retail: OTIF, fill rate por canal, quiebres en punto de venta (OOS) y efectividad de ejecución de promociones?", label:"OTIF, fill rate y OOS retail", desc:"OTIF, fill rate canal, OOS, promo", ndesc:["No se mide de forma consistente; los quiebres y OOS se conocen cuando el cliente reclama.","Hay seguimiento básico de OTIF, pero sin diferenciación por canal ni medición de OOS.","OTIF y fill rate medidos por canal; hay metas y seguimiento con clientes retail clave.","Indicadores en tiempo real con alertas de OOS y gestión proactiva de ejecución de promociones.","Gestión optimizada: OTIF líder, cero OOS en categorías clave y excelencia en ejecución comercial."], opp:"Gestión optimizada: OTIF líder, cero OOS en categorías clave y excelencia en ejecución comercial."}, 
    "i4": {q:"¿Cómo se mide y gestiona la salud del inventario incluyendo días de inventario por canal, % SLOB, merma, vencimientos y costo de liquidación?", label:"Salud inventario y merma canal", desc:"DIO canal, SLOB, merma, vencidos, liquidación", ndesc:["No se mide; inventario SLOB y merma se detectan tarde cuando ya hay pérdidas significativas.","Hay métricas básicas de inventario total, pero sin diferenciación por canal ni seguimiento de SLOB.","DIO y SLOB medidos por canal; hay metas y proceso básico de revisión y liquidación.","Indicadores con alertas tempranas de riesgo de SLOB; gestión proactiva de liquidación por canal.","Gestión optimizada: cero SLOB no gestionado, analítica predictiva y liquidación rentable continua."], opp:"Gestión optimizada: cero SLOB no gestionado, analítica predictiva y liquidación rentable continua."}, 
  },
};

// ─── CÓDIGO DE ACCESO ─────────────────────────────────────────────────────────
const INDUSTRIAS = ["Telecomunicaciones","Farmacéutica","Oil & Gas","Manufactura","CPG"];

function CodigoAccesoScreen({ onSuccess }) {
  const [codigo,  setCodigo]  = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState("");

  async function handleSubmit() {
    const cod = codigo.trim().toUpperCase();
    if (!cod) { setError("Ingresa un código de acceso"); return; }
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase
        .from("empresas").select("*").eq("codigo", cod).single();
      if (err || !data) {
        setError("Código no encontrado. Verifica e intenta de nuevo.");
        setLoading(false); return;
      }
      // Load subs_custom, then overlay industry defaults for empty ones
      const { data: subs } = await supabase
        .from("subs_custom").select("*").eq("empresa_id", data.id);
      const industria = data.industria || "Telecomunicaciones";
      const industryDefaults = INDUSTRY_QUESTIONS[industria] || {};
      console.log("[Madurez] empresa:", data.nombre, "| industria:", industria, "| overrides:", Object.keys(industryDefaults).length);
      const subsMap = {};
      // First apply industry defaults
      Object.entries(industryDefaults).forEach(([sub_id, vals]) => {
        subsMap[sub_id] = { q: vals.q, label: vals.label, desc: vals.desc, ndesc: vals.ndesc, opp: vals.opp };
      });
      // Then overlay manual overrides from DB (higher priority)
      (subs||[]).forEach(s => {
        subsMap[s.sub_id] = {
          q:     s.q     || subsMap[s.sub_id]?.q     || "",
          label: s.label || subsMap[s.sub_id]?.label || "",
          desc:  s.descripcion || subsMap[s.sub_id]?.desc || "",
          ndesc: subsMap[s.sub_id]?.ndesc || null,
          opp:   subsMap[s.sub_id]?.opp   || null,
        };
      });
      // Direcciones y roles: DB overrides → industry defaults → fallback
      const dirs  = data.direcciones  || DEFAULT_DIRECCIONES[industria]  || DIRECCIONES_FALLBACK;
      const roles = data.roles        || DEFAULT_ROLES[industria]        || ROLES_FALLBACK;
      onSuccess(data, subsMap, dirs, roles);
    } catch(e) {
      setError("Error al conectar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#F7F5FC",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"Outfit, system-ui, sans-serif",
    }}>
      <div style={{
        width:"100%", maxWidth:420, background:"#fff", borderRadius:24,
        border:"1px solid #E8E4DF",
        boxShadow:"0 24px 64px rgba(120,35,220,0.12)", overflow:"hidden",
      }}>
        <div style={{
          background:"linear-gradient(150deg,#3D0D8C 0%,#7823DC 60%,#6B1FC8 100%)",
          padding:"36px 40px 32px", position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize:"18px 18px", pointerEvents:"none" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzIiIGZpbGw9Im5vbmUiPjx0ZXh0IHg9IjEiIHk9IjI0IiBmb250LWZhbWlseT0iJ0dpbGwgU2FucycsJ1RyZWJ1Y2hldCBNUycsJ0hlbHZldGljYSBOZXVlJyxIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjUwMCIgZmlsbD0iI0ZGRkZGRiIgbGV0dGVyLXNwYWNpbmc9IjQiPktFQVJORVk8L3RleHQ+PC9zdmc+" alt="Kearney" style={{ height:20, display:"block", marginBottom:20 }}/>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.55)", textTransform:"uppercase", letterSpacing:".14em", marginBottom:8 }}>Modelo de Madurez · Inventarios</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1.2 }}>Diagnóstico de<br/>Gestión de Inventarios</div>
          </div>
        </div>
        <div style={{ padding:"32px 40px 36px" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1A1A18", marginBottom:6 }}>Ingresa tu código de acceso</div>
          <div style={{ fontSize:12, color:"#9C9A95", marginBottom:24, lineHeight:1.5 }}>Tu facilitador te habrá compartido un código único para tu empresa.</div>
          <input
            value={codigo}
            onChange={e => { setCodigo(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Código de acceso"
            style={{
              width:"100%", padding:"13px 16px", borderRadius:11,
              border:`2px solid ${error ? "#ef4444" : "#E0D8F7"}`,
              fontSize:16, fontWeight:700, color:"#1A1A18", background:"#FAFAF8",
              outline:"none", letterSpacing:".04em", textAlign:"center",
              marginBottom: error ? 8 : 20, boxSizing:"border-box",
            }}
          />
          {error && <div style={{ fontSize:11, color:"#ef4444", marginBottom:16, textAlign:"center" }}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{
            width:"100%", padding:"14px 0", borderRadius:11,
            background:loading ? "#C8C6C0" : "linear-gradient(135deg,#5A1AA0,#7823DC)",
            color:"#fff", border:"none", fontSize:14, fontWeight:700,
            cursor:loading ? "not-allowed" : "pointer",
            boxShadow:loading ? "none" : "0 4px 18px rgba(120,35,220,0.38)",
          }}>
            {loading ? "Verificando..." : "Acceder al diagnóstico →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistroForm({onStart, color=T.red, colorDk=T.redDk, direcciones=DIRECCIONES_FALLBACK, roles=ROLES_FALLBACK}) {
  const [dir,setDir]   = useState("");
  const [rol,setRol]   = useState("");
  const [err,setErr]   = useState(false);

  function start() {
    if (!dir || !rol) { setErr(true); return; }
    onStart({ direccion: dir, rol });
  }

  const sel = (val,set,opts) => (
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {opts.map(o=>(
        <button key={o} onClick={()=>{set(o);setErr(false);}} style={{
          padding:"7px 16px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",
          border:`1.5px solid ${val===o?color:T.border}`,
          background:val===o?(color+"18"):T.card,
          color:val===o?color:T.inkMid,
          transition:"all .15s",
        }}>{o}</button>
      ))}
    </div>
  );

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:500,backdropFilter:"blur(6px)",
    }}>
      <div className="fade-up" style={{
        width:480,background:T.card,borderRadius:22,
        border:`1px solid ${T.borderSm}`,
        boxShadow:"0 32px 80px rgba(0,0,0,0.18)",
        padding:"40px 40px 36px",
      }}>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:20,fontWeight:900,color:T.ink,letterSpacing:"-.02em",marginBottom:6}}>
            Antes de comenzar
          </div>
          <div style={{fontSize:13,color:T.inkMid}}>
            Cuéntanos un poco sobre ti para contextualizar el diagnóstico.
          </div>
        </div>

        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",
            letterSpacing:".1em",marginBottom:10}}>Dirección</div>
          {sel(dir,setDir,direcciones)}
        </div>

        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",
            letterSpacing:".1em",marginBottom:10}}>Rol</div>
          {sel(rol,setRol,roles)}
        </div>

        {err && (
          <div style={{fontSize:12,color:color,marginBottom:16}}>
            Por favor selecciona tu dirección y rol para continuar.
          </div>
        )}

        <button onClick={start} className="btn-red" style={{
          width:"100%",padding:"13px",borderRadius:12,border:"none",
          background:`linear-gradient(135deg,${color},${colorDk})`,
          color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
          boxShadow:`0 4px 16px rgba(120,35,220,0.3)`,
        }}>Iniciar diagnóstico →</button>
      </div>
    </div>
  );
}

// ─── PERFIL MODAL (alias legacy) ─────────────────────────────────────────────
function PerfilModal({onStart}) {
  return <RegistroForm onStart={onStart}/>;
}

// ─── INTRO TAB ────────────────────────────────────────────────────────────────
// ─── BANNER GRACIAS (dismissible) ────────────────────────────────────────────
function BannerGracias() {
  const [visible, setVisible] = React.useState(() => {
    try { return localStorage.getItem("banner_gracias_dismissed") !== "1"; } catch { return true; }
  });
  if (!visible) return null;
  return (
    <div style={{
      background:"linear-gradient(135deg,#F0E8FF 0%,#E8DCFF 100%)",
      borderBottom:"1px solid #DDD0F7",
      padding:"10px 20px 10px 24px",
      display:"flex", alignItems:"center", gap:10,
    }}>
      <span style={{fontSize:16, flexShrink:0}}>👋</span>
      <p style={{margin:0, fontSize:12, color:"#3D1A6E", lineHeight:1.5, flex:1}}>
        <strong>Gracias por realizar este ejercicio.</strong>{" "}
        Tu perspectiva es de mucho valor para trabajar en conjunto hacia las oportunidades identificadas.
      </p>
      <button onClick={()=>{ setVisible(false); try{localStorage.setItem("banner_gracias_dismissed","1");}catch{} }}
        style={{ background:"none", border:"none", cursor:"pointer", fontSize:18,
          color:"#9B59D6", lineHeight:1, padding:"0 4px", flexShrink:0, opacity:.7 }}
        title="Cerrar">×</button>
    </div>
  );
}


function IntroTab({onNavigate, color=T.red, colorDk=T.redDk}) {
  const total=DIMS.reduce((a,d)=>a+d.subs.length,0);

  const STEPS=[
    {n:"01",icon:"📖",c:color,bg:(color+"18"),label:"Lee el Modelo",   desc:"Revisa las 7 dimensiones y la escala de madurez SoE antes de evaluar."},
    {n:"02",icon:"👥",c:"#2563EB",bg:"#EFF6FF",label:"Convoca al equipo",desc:"Supply, Comercial, Finanzas, Ops y TI. Sesión conjunta ~45 min."},
    {n:"03",icon:"📝",c:"#7C3AED",bg:"#F5F3FF",label:"Evalúa las 35",   desc:"Para cada sub-dimensión elige el nivel que describe la situación actual."},
    {n:"04",icon:"📊",c:"#059669",bg:"#ECFDF5",label:"Lee el Resumen",  desc:"Radar, brechas críticas y oportunidades con impacto cuantificado."},
    {n:"05",icon:"🗺️",c:"#D97706",bg:"#FFFBEB",label:"Define el Plan",  desc:"Prioriza iniciativas en 3 horizontes: 0–6, 6–12 y 12–24 meses."},
  ];

  return (
    <div style={{maxWidth:1060,margin:"0 auto",padding:"36px 36px 52px"}}>

      {/* ═══ HERO ═══ */}
      <BannerGracias/>
      <div className="fade-up hover-lift" style={{
        borderRadius:24,marginBottom:22,overflow:"hidden",position:"relative",
        background:`linear-gradient(150deg,${colorDk} 0%,${color} 50%,${colorDk} 100%)`,
        boxShadow:"0 32px 80px rgba(0,0,0,0.28)",
      }}>
        <NoiseSVG/>
        {/* radial glows */}
        <div style={{position:"absolute",top:"-20%",right:"5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.12),transparent 65%)",pointerEvents:"none",zIndex:2}}/>
        <div style={{position:"absolute",bottom:"-30%",left:"10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.07),transparent 65%)",pointerEvents:"none",zIndex:2}}/>
        {/* dot grid */}
        <div style={{position:"absolute",inset:0,zIndex:2,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:3,display:"grid",gridTemplateColumns:"1fr 230px"}}>
          <div style={{padding:"52px 56px"}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:36}}>
              <Logo h={30} inv/>
              <div style={{width:1,height:30,background:"rgba(255,255,255,0.14)"}}/>
              <div>
                <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.38)",letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Supply Chain · Gestión de Inventarios</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.42)"}}>Kearney – Claro Colombia · 2025</div>
              </div>
            </div>

            <div className="display" style={{
              fontSize:40,fontWeight:900,color:"#FFF",
              lineHeight:1.12,letterSpacing:"-.03em",marginBottom:8,
            }}>
              Modelo de Madurez<br/>
              <em style={{color:"rgba(255,255,255,0.90)",fontStyle:"italic"}}>Gestión de Inventarios</em>
            </div>
            <div style={{fontSize:13.5,color:"rgba(255,255,255,0.52)",lineHeight:1.8,maxWidth:500,marginBottom:36}}>
              Estado de Excelencia (SoE) — Diagnóstico integral de 7 dimensiones para operaciones Telco Retail B2B/B2C. Desde la estrategia hasta la ejecución operativa.
            </div>
            <div style={{display:"flex",gap:12}}>
              <button className="btn-ghost" onClick={()=>onNavigate("modelo")} style={{
                padding:"12px 24px",borderRadius:12,
                border:"1px solid rgba(255,255,255,0.16)",
                background:"rgba(255,255,255,0.06)",
                color:"rgba(255,255,255,0.8)",fontWeight:600,fontSize:13,cursor:"pointer",
              }}>🗂 Ver el Modelo</button>
            </div>
          </div>

          {/* STATS */}
          <div style={{
            borderLeft:"1px solid rgba(255,255,255,0.07)",
            background:"rgba(255,255,255,0.03)",
            display:"flex",flexDirection:"column",justifyContent:"center",
            padding:"44px 32px",gap:0,
          }}>
            {[
              {n:"7",    l:"Dimensiones"},
              {n:String(total),l:"Sub-dimensiones"},
              {n:"5",    l:"Niveles SoE"},
              {n:"~45′", l:"Duración"},
            ].map((s,i)=>(
              <div key={s.n} style={{
                padding:"18px 0",
                borderBottom:i<3?"1px solid rgba(255,255,255,0.06)":"none",
              }}>
                <div className="display" style={{
                  fontSize:36,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:"-.02em",marginBottom:5,
                }}>{s.n}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ OBJETIVO + ALCANCE ═══ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {[
          {t:"Objetivo",icon:"🎯",ib:"#FEF2F1",ibr:"#FDDCDA",body:"Evaluar la madurez de la gestión de inventarios de Claro en 7 dimensiones clave, identificar brechas frente a mejores prácticas del sector y construir una hoja de ruta que optimice el balance servicio · costo · capital de trabajo."},
          {t:"Alcance", icon:"🔭",ib:"#EFF6FF",ibr:"#BFDBFE",body:"Cadena de inventarios Telco Retail: B2B (corporativo/pyme) + B2C (prepago/postpago), todas las categorías (dispositivos, CPE, SIM, accesorios, repuestos) y la red de distribución (CDC, tiendas, distribuidores, 3PL)."},
        ].map((c,i)=>(
          <div key={c.t} className={`fade-up-${i+1} hover-lift`} style={{
            background:T.card,borderRadius:18,
            border:`1px solid ${T.borderSm}`,padding:"26px 28px",
            boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,borderRadius:13,background:c.ib,border:`1px solid ${c.ibr}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:20}}>{c.icon}</span>
              </div>
              <div className="display" style={{fontSize:14,fontWeight:700,color:T.ink,letterSpacing:"-.01em"}}>{c.t}</div>
            </div>
            <p style={{fontSize:12.5,color:T.inkMid,lineHeight:1.85,margin:0}}>{c.body}</p>
          </div>
        ))}
      </div>

      {/* ═══ DELIVERABLES ═══ */}
      <div className="fade-up-2 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"26px 28px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:18}}>Qué obtienes al final</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {icon:"🎯",bg:"#FEF2F1",bdr:"#FDDCDA",tc:"colorDk",t:"Diagnóstico",      d:"Puntaje 1–5 por dimensión y sub-dimensión con radar y barras."},
            {icon:"🚨",bg:"#FFF8ED",bdr:"#FFD89B",tc:"#92400E",t:"Brechas críticas", d:"Sub-dimensiones en niveles 1–2 con análisis de estado actual."},
            {icon:"💡",bg:"#ECFDF5",bdr:"#A7F3D0",tc:"#065F46",t:"Oportunidades",    d:"Impacto cuantificado: % reducción capital, quiebres, fraude."},
            {icon:"🗺️",bg:"#EFF6FF",bdr:"#BFDBFE",tc:"#1E3A8A",t:"Hoja de ruta",    d:"Plan en 3 horizontes: 0–6, 6–12 y 12–24 meses."},
          ].map((d,i)=>(
            <div key={d.t} className={`fade-up-${i+1} hover-lift`} style={{borderRadius:14,padding:"18px 16px",background:d.bg,border:`1px solid ${d.bdr}`}}>
              <div style={{fontSize:26,marginBottom:12}}>{d.icon}</div>
              <div className="display" style={{fontSize:12,fontWeight:700,color:d.tc,marginBottom:7,lineHeight:1.3}}>{d.t}</div>
              <div style={{fontSize:11,color:T.inkMid,lineHeight:1.7}}>{d.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PASO A PASO ═══ */}
      <div className="fade-up-3 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"26px 28px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:26}}>Cómo completar la evaluación</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,position:"relative"}}>
          {/* connector */}
          <div style={{position:"absolute",top:24,left:"9%",right:"9%",height:1,background:`linear-gradient(90deg,${(color+"30")},${color},${colorDk},${color},${(color+"30")})`,zIndex:0}}/>
          {STEPS.map((s,i)=>(
            <div key={s.n} className={`fade-up-${i+1}`} style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 4px"}}>
              <div style={{
                width:48,height:48,borderRadius:"50%",
                background:s.bg,border:`2px solid ${s.c}33`,
                display:"flex",alignItems:"center",justifyContent:"center",
                marginBottom:14,flexShrink:0,
                boxShadow:`0 0 0 5px ${T.card}, 0 0 0 6px ${s.c}22`,
              }}>
                <span style={{fontSize:19}}>{s.icon}</span>
              </div>
              <div style={{fontSize:9,fontWeight:700,color:s.c,letterSpacing:".1em",textTransform:"uppercase",marginBottom:5,textAlign:"center"}}>{s.n}</div>
              <div className="display" style={{fontSize:11,fontWeight:700,color:T.ink,marginBottom:5,textAlign:"center",lineHeight:1.3}}>{s.label}</div>
              <div style={{fontSize:10,color:T.inkMid,lineHeight:1.7,textAlign:"center"}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CTA FINAL ═══ */}
      <div className="fade-up-4" style={{
        marginTop:14,borderRadius:20,overflow:"hidden",
        background:`linear-gradient(135deg,${color},${colorDk})`,
        padding:"36px 48px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,
        boxShadow:`0 16px 48px rgba(120,35,220,0.28)`,
      }}>
        <div>
          <div className="display" style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-.02em",marginBottom:6}}>
            ¿Listo para comenzar?
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.7}}>
            El diagnóstico toma ~45 minutos. Necesitarás a tu equipo de Supply, Comercial y Finanzas.
          </div>
        </div>
        <button className="btn-red" onClick={()=>onNavigate("assessment")} style={{
          padding:"16px 40px",borderRadius:14,border:"2px solid rgba(255,255,255,0.3)",
          background:"rgba(255,255,255,0.12)",backdropFilter:"blur(8px)",
          color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",
          whiteSpace:"nowrap",flexShrink:0,
          boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
        }}>Iniciar diagnóstico →</button>
      </div>

    </div>
  );
}
function ModeloTab({color=T.red, colorDk=T.redDk}) {
  const [open,setOpen] = useState(null);

  const DESC={
    estrategia:      "Define el 'norte' de la gestión: qué se prioriza, cómo se toman decisiones de trade-off entre servicio, costo y capital, y cómo se gobiernan a través de S&OP/S&OE.",
    caracterizacion: "El 'ADN' de cada producto: cómo se clasifica, rastrea y gestiona según su ciclo de vida y condición. Sin buena caracterización, la planeación pierde precisión.",
    procesos:        "Los procesos operativos core: desde planeación estadística de demanda y reposición hasta ejecución física en bodega, control de exactitud y gestión de retornos.",
    roles:           "Define quién hace qué y cómo se coordinan Supply, Comercial, Finanzas, TI y Ops — incluyendo la gestión de terceros (OEMs, 3PL, distribuidores, dealers).",
    herramientas:    "El stack tecnológico: desde la arquitectura core (ERP/OMS/WMS) hasta herramientas de planificación avanzada, visibilidad en tiempo real, analítica y automatización.",
    indicadores:     "El sistema de medición: servicio al cliente, eficiencia de capital, exactitud de inventario, salud del portafolio (SLOB/aging) y gestión de riesgos/fraude.",
    abastecimiento:  "Estrategias por categoría: lanzamientos de dispositivos, proyectos CPE, control de fraude en SIM, moda en accesorios, circularidad en repuestos/refurb.",
  };

  return (
    <div style={{maxWidth:1060,margin:"0 auto",padding:"36px 36px 52px"}}>

      {/* ═══ HERO DARK ═══ */}
      <div className="fade-up hover-lift" style={{
        borderRadius:24,marginBottom:22,overflow:"hidden",position:"relative",
        background:`linear-gradient(150deg,${colorDk} 0%,${colorDk} 45%,${color} 100%)`,
        boxShadow:"0 28px 72px rgba(0,0,0,0.24)",
      }}>
        <NoiseSVG/>
        <div style={{position:"absolute",top:"-20%",right:"8%",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.1),transparent 65%)",pointerEvents:"none",zIndex:2}}/>
        <div style={{position:"absolute",bottom:"-20%",left:"5%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,180,180,0.1),transparent 65%)",pointerEvents:"none",zIndex:2}}/>
        <div style={{position:"absolute",inset:0,zIndex:2,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:3,padding:"48px 56px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:".18em",textTransform:"uppercase",marginBottom:12}}>Estructura del Modelo · Estado de Excelencia (SoE)</div>
          <div className="display" style={{
            fontSize:36,fontWeight:900,color:"#fff",letterSpacing:"-.025em",lineHeight:1.18,marginBottom:14,
          }}>Las 7 Dimensiones y la<br/><em style={{color:"rgba(255,255,255,0.90)",fontStyle:"italic"}}>Escala de Madurez</em></div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.46)",lineHeight:1.8,maxWidth:600,marginBottom:24}}>
            Cada dimensión incluye <strong style={{color:"rgba(255,255,255,0.7)"}}>5 sub-dimensiones</strong> evaluadas en escala 1–5, generando un diagnóstico granular de <strong style={{color:"rgba(255,255,255,0.7)"}}>35 puntos de evaluación</strong>.
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {n:"7",   l:"dimensiones",      c:"#FFFFFF"},
              {n:"35",  l:"sub-dimensiones",  c:"#FFBBBB"},
              {n:"5",   l:"niveles de madurez",c:"#FFD5D5"},
              {n:"~45′",l:"duración",          c:"#FFCCCC"},
            ].map(s=>(
              <div key={s.n} style={{
                background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:99,padding:"6px 16px",display:"flex",alignItems:"baseline",gap:7,
              }}>
                <span className="display" style={{fontSize:18,fontWeight:900,color:s.c}}>{s.n}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ ESCALA SoE ═══ */}
      <div className="fade-up-1 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"26px 28px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:18}}>Escala de Madurez · Estados de Excelencia</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
          {T.L.map((l,i)=>(
            <div key={i} className="hover-lift" style={{borderRadius:16,overflow:"hidden",border:`1.5px solid ${l.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{background:l.c,padding:"11px 14px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{
                  width:28,height:28,borderRadius:"50%",
                  background:"rgba(255,255,255,0.2)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                }}>
                  <span className="display" style={{fontSize:14,fontWeight:900,color:"#fff"}}>{i+1}</span>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:".06em"}}>{l.label}</span>
              </div>
              <div style={{padding:"14px",background:l.bg}}>
                <p style={{fontSize:10.5,color:l.text,margin:"0 0 12px",lineHeight:1.65}}>{l.desc}</p>
                <div style={{display:"flex",gap:3}}>
                  {[0,1,2,3,4].map(j=><div key={j} style={{flex:1,height:3,borderRadius:99,background:j<=i?l.c:T.borderSm}}/>)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:9,fontWeight:700,color:T.inkSoft,letterSpacing:".12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Reactivo</span>
          <div style={{flex:1,height:2,borderRadius:99,background:`linear-gradient(90deg,${(color+"30")},${color},${colorDk})`}}/>
          <span style={{fontSize:9,fontWeight:700,color:"#059669",letterSpacing:".12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Líder de mercado</span>
        </div>
      </div>

      {/* ═══ 7 DIMENSIONES ═══ */}
      <div className="fade-up-2" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"26px 28px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:16}}>Las 7 Dimensiones · Clic para expandir</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {DIMS.map((d)=>{
            const isOpen=open===d.key;
            return (
              <div key={d.key} style={{
                borderRadius:14,overflow:"hidden",
                border:`1.5px solid ${isOpen?color:T.borderSm}`,
                transition:"border-color .2s,box-shadow .2s",
                boxShadow:isOpen?"0 4px 20px rgba(120,35,220,0.1)":"0 1px 3px rgba(0,0,0,0.03)",
              }}>
                <div className="accordion-hd" onClick={()=>setOpen(isOpen?null:d.key)} style={{
                  display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",
                  background:isOpen?(color+"10"):"#FAFAF8",
                }}>
                  <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{
                      width:42,height:42,borderRadius:12,
                      background:isOpen?(color+"18"):T.borderSm,
                      border:`1.5px solid ${isOpen?(color+"30"):T.borderSm}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",flexShrink:0,
                    }}>
                      <span style={{fontSize:19}}>{d.icon}</span>
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:9,fontWeight:700,color:isOpen?color:T.inkSoft,letterSpacing:".1em",textTransform:"uppercase"}}>{d.num}</span>
                        <div className="display" style={{fontSize:13,fontWeight:700,color:isOpen?color:T.ink,transition:"color .15s"}}>{d.label}</div>
                      </div>
                      <div style={{fontSize:10,color:T.inkSoft}}>{d.sub}</div>
                    </div>
                  </div>
                  <div/>
                  <div style={{padding:"0 20px",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{textAlign:"center"}}>
                      <div className="display" style={{fontSize:22,fontWeight:900,color:isOpen?color:T.inkMid,lineHeight:1,transition:"color .15s"}}>{d.subs.length}</div>
                      <div style={{fontSize:8.5,color:T.inkSoft}}>sub-dim.</div>
                    </div>
                    <div style={{
                      width:26,height:26,borderRadius:"50%",
                      background:isOpen?(color+"18"):T.borderSm,
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
                    }}>
                      <span style={{fontSize:14,color:isOpen?color:T.inkSoft,transform:isOpen?"rotate(90deg)":"none",display:"block",transition:"transform .22s",fontWeight:700,lineHeight:1}}>›</span>
                    </div>
                  </div>
                </div>
                {isOpen&&(
                  <div className="scale-in" style={{padding:"20px 22px",borderTop:`1px solid ${(color+"30")}`,background:T.card}}>
                    <p style={{fontSize:12.5,color:T.inkMid,lineHeight:1.8,margin:"0 0 18px"}}>{DESC[d.key]}</p>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                      {d.subs.map(s=>(
                        <div key={s.id} style={{background:(color+"10"),borderRadius:10,padding:"12px 12px",border:`1px solid ${(color+"30")}`}}>
                          <div style={{fontSize:10,fontWeight:700,color:color,marginBottom:4,lineHeight:1.35}}>{s.label}</div>
                          <div style={{fontSize:9.5,color:T.inkMid,lineHeight:1.55}}>{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SCORING ═══ */}
      <div className="fade-up-3" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"26px 28px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:18}}>¿Cómo se calcula el puntaje?</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[
            {icon:"①",t:"Nivel por sub-dimensión",d:"Selecciona 1–5 para cada sub-dimensión. Situación actual verificable, no la aspiración.",c:"#2563EB",bg:"#EFF6FF",bdr:"#BFDBFE"},
            {icon:"②",t:"Puntaje por dimensión",  d:"Promedio simple de las 5 sub-dimensiones. Se muestra con un decimal (ej. 2.4).",              c:"#7C3AED",bg:"#F5F3FF",bdr:"#DDD6FE"},
            {icon:"③",t:"Puntaje global",          d:"Promedio de los 7 puntajes dimensionales. El nivel se redondea al entero más cercano.",         c:"#059669",bg:"#ECFDF5",bdr:"#A7F3D0"},
          ].map(c=>(
            <div key={c.t} className="hover-lift" style={{borderRadius:14,border:`1.5px solid ${c.bdr}`,background:c.bg,padding:"22px 20px"}}>
              <div className="display" style={{fontSize:38,fontWeight:900,color:c.c,marginBottom:12,lineHeight:1}}>{c.icon}</div>
              <div className="display" style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:8}}>{c.t}</div>
              <div style={{fontSize:11.5,color:T.inkMid,lineHeight:1.7}}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── SUMMARY TAB ──────────────────────────────────────────────────────────────
function SummaryTab({answers, perfil, color=T.red, colorDk=T.redDk}) {
  const globalScore=useMemo(()=>{
    const sc=DIMS.map(d=>getDimScore(d,answers)).filter(Boolean);
    return sc.length?parseFloat((sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(2)):null;
  },[answers]);

  function descargarExcel() {
    const LEVEL_LABELS = ["","Básico","Emergente","Robusto","End-to-End","Pivote"];
    // Hoja resumen
    const resumen = [
      { Campo:"Dirección", Valor: perfil?.direccion || "—" },
      { Campo:"Rol",       Valor: perfil?.rol       || "—" },
      { Campo:"Score Global", Valor: globalScore || "—" },
      { Campo:"Nivel Global", Valor: LEVEL_LABELS[Math.round(globalScore)] || "—" },
      ...DIMS.map(d=>({ Campo:`Score ${d.num} ${d.label}`, Valor: getDimScore(d,answers) || "—" })),
    ];
    const wsRes = XLSX.utils.json_to_sheet(resumen);
    wsRes["!cols"] = [{wch:28},{wch:30}];

    // Hoja detalle respuestas
    const detalle = [];
    DIMS.forEach(d => d.subs.forEach(s => {
      const v = answers[s.id];
      if (v > 0) detalle.push({
        "Dimensión": `${d.num} ${d.label}`,
        "Sub-dimensión": s.label,
        "Descripción": s.desc,
        "Valor": v,
        "Nivel": LEVEL_LABELS[v] || "—",
      });
    }));
    const wsDet = XLSX.utils.json_to_sheet(detalle);
    wsDet["!cols"] = [{wch:28},{wch:26},{wch:30},{wch:8},{wch:14}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsRes, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsDet, "Respuestas");
    XLSX.writeFile(wb, `Madurez_Inventarios_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const allGaps=useMemo(()=>{
    const gaps=[];
    DIMS.forEach(d=>d.subs.forEach(s=>{
      const v=answers[s.id];
      if(v>0&&v<=3) gaps.push({dim:d,sub:s,score:v,gap:5-v});
    }));
    return gaps.sort((a,b)=>a.score-b.score);
  },[answers]);

  const critGaps=allGaps.filter(g=>g.score<=2);
  const modGaps=allGaps.filter(g=>g.score===3);
  const totalQ=DIMS.reduce((a,d)=>a+d.subs.length,0);
  const totalAnswered=Object.values(answers).filter(v=>v>0).length;
  const allRadarFilled=DIMS.every(d=>d.subs.some(s=>answers[s.id]>0));
  const barData=DIMS.map(d=>({name:d.num+" "+d.label.slice(0,13),actual:getDimScore(d,answers)||0}));
  const radarData=DIMS.map(d=>{
    const vals=d.subs.map(s=>answers[s.id]||0).filter(v=>v>0);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    return {dim:d.label,value:parseFloat(avg.toFixed(2)),fullMark:5};
  });

  if(totalAnswered===0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16}}>
      <div style={{fontSize:64,lineHeight:1}}>📋</div>
      <div className="display" style={{fontSize:22,fontWeight:800,color:T.ink}}>Evaluación pendiente</div>
      <div style={{fontSize:13,color:T.inkMid,textAlign:"center",maxWidth:360,lineHeight:1.75}}>Completa la evaluación para ver el diagnóstico, radar de madurez y hoja de ruta priorizada.</div>
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"36px 36px 52px"}}>


      {/* ─── INSIGHTS ─── */}
      {(()=>{
        const scores=DIMS.map(d=>getDimScore(d,answers)).filter(Boolean).map(Number);
        if(!scores.length) return null;
        const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
        const max=Math.max(...scores), min=Math.min(...scores);
        const spread=parseFloat((max-min).toFixed(1));
        const allFive=Object.values(answers).filter(v=>v>0).every(v=>v===5);
        const highCount=Object.values(answers).filter(v=>v===5).length;
        const totalAns=Object.values(answers).filter(v=>v>0).length;
        const suspicious=totalAns>=10&&highCount/totalAns>0.7;
        const strongDim=DIMS.reduce((best,d)=>{const sc=getDimScore(d,answers);return sc&&sc>=(best.sc||0)?{d,sc}:best},{}).d;
        const weakDim=DIMS.reduce((worst,d)=>{const sc=getDimScore(d,answers);return sc&&sc<=(worst.sc||99)?{d,sc}:worst},{}).d;
        return (
          <div className="fade-up" style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {suspicious&&(
              <div style={{background:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚠️</span>
                <div style={{fontSize:12,color:"#92400E",lineHeight:1.6}}>
                  <strong>Posible sesgo de respuesta:</strong> más del 70% de las respuestas son nivel 5. Te recomendamos revisar que los puntajes reflejen la situación actual verificable, no la aspiración.
                </div>
              </div>
            )}
            {spread>=2&&strongDim&&weakDim&&(
              <div style={{background:"#F0F9FF",border:"1.5px solid #BAE6FD",borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>💡</span>
                <div style={{fontSize:12,color:"#0C4A6E",lineHeight:1.6}}>
                  <strong>Alta dispersión ({spread} niveles):</strong> Fortaleza clara en <strong>{strongDim?.label}</strong>, brecha significativa en <strong>{weakDim?.label}</strong>. Considera alinear estas dimensiones antes de avanzar al siguiente nivel.
                </div>
              </div>
            )}
            {spread<1.5&&scores.length>=5&&(
              <div style={{background:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>✅</span>
                <div style={{fontSize:12,color:"#14532D",lineHeight:1.6}}>
                  <strong>Alta consistencia:</strong> Las dimensiones están alineadas (dispersión {spread} niveles). El crecimiento puede ser balanceado y transversal.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* BOTÓN DESCARGA */}
      <div className="fade-up" style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={descargarExcel} className="btn-red" style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"10px 22px",borderRadius:11,border:"none",
          background:`linear-gradient(135deg,${color},${colorDk})`,
          color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",
          boxShadow:`0 4px 14px rgba(120,35,220,0.3)`,
        }}>⬇ Descargar Excel</button>
      </div>

      {/* SCORE BAR */}
      <div className="fade-up hover-lift" style={{
        display:"grid",gridTemplateColumns:"auto 1fr auto",gap:0,
        background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,
        marginBottom:16,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          padding:"28px 36px",
          background:"linear-gradient(135deg,#FFF1F1,#FEE8E8)",
          borderRight:`1px solid ${T.borderSm}`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:185,
        }}>
          <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:10}}>Madurez Global</div>
          {globalScore?(<>
            <div className="display" style={{fontSize:58,fontWeight:900,color:color,letterSpacing:"-.04em",lineHeight:1,marginBottom:4}}><CountUp to={parseFloat(globalScore)} decimals={1} duration={900}/></div>
            <div style={{fontSize:12,color:T.inkSoft,marginBottom:10}}>/5.0</div>
            <LvBadge v={Math.round(globalScore)}/>
          </>):<div style={{fontSize:18,color:T.inkSoft}}>—</div>}
        </div>

        <div style={{padding:"22px 28px"}}>
          <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:16}}>Distribución por nivel</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {T.L.map((l,i)=>{
              const count=DIMS.reduce((acc,d)=>acc+d.subs.filter(s=>Math.round(answers[s.id])===i+1).length,0);
              return (
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{height:52,borderRadius:10,background:l.bg,border:`1px solid ${l.border}`,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:4,marginBottom:6,overflow:"hidden",position:"relative"}}>
                    <div style={{
                      position:"absolute",bottom:0,left:0,right:0,
                      height:`${Math.max(count?10:0,(count/totalQ)*100)}%`,
                      background:l.c,borderRadius:"6px 6px 0 0",
                      transition:"height .7s cubic-bezier(.22,1,.36,1)",
                    }}/>
                  </div>
                  <div style={{fontSize:8.5,fontWeight:600,color:l.text,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>{l.label.slice(0,6)}</div>
                  <div className="display" style={{fontSize:20,fontWeight:900,color:l.c}}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding:"28px 32px",borderLeft:`1px solid ${T.borderSm}`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:145,
        }}>
          <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:10}}>Completitud</div>
          <div className="display" style={{fontSize:42,fontWeight:900,color:T.ink,letterSpacing:"-.03em",lineHeight:1}}>
            <CountUp to={Math.round(totalAnswered/totalQ*100)}/><span style={{fontSize:22}}>%</span>
          </div>
          <div style={{fontSize:11,color:T.inkSoft,marginTop:4}}>{totalAnswered}/{totalQ}</div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        {[0,1].map(i=>(
          <div key={i} className="fade-up-1 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"20px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:14}}>
              {i===0?"Puntaje por Dimensión":"Radar de Madurez"}
            </div>
            {i===0?(
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={barData} layout="vertical" margin={{left:0,right:20,top:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderSm}/>
                  <XAxis type="number" domain={[0,5]} tick={{fontSize:9,fill:T.inkSoft}} tickCount={6}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:8.5,fill:T.inkMid,fontWeight:600}} width={92}/>
                  <Tooltip formatter={(v)=>[v>0?`${parseFloat(v).toFixed(1)} / 5`:"Sin datos","Madurez"]} contentStyle={{borderRadius:10,border:`1px solid ${T.border}`,fontSize:12}}/>
                  <Bar dataKey="actual" radius={[0,7,7,0]} barSize={13}>
                    {barData.map((e,i)=><Cell key={i} fill={e.actual>0?getLv(Math.round(e.actual)).c:T.borderSm}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ):(
              allRadarFilled?(
                <ResponsiveContainer width="100%" height={256}>
                  <RadarChart data={radarData} margin={{top:10,right:30,bottom:10,left:30}}>
                    <PolarGrid stroke={T.borderSm}/>
                    <PolarAngleAxis dataKey="dim" tick={{fill:T.inkMid,fontSize:8.5,fontWeight:500}}/>
                    <PolarRadiusAxis angle={90} domain={[0,5]} tick={{fontSize:7.5,fill:T.inkSoft}} tickCount={6}/>
                    <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2.5}/>
                    <Tooltip formatter={(v)=>[`${v} / 5`,"Madurez"]} contentStyle={{borderRadius:10,border:`1px solid ${T.border}`,fontSize:12}}/>
                  </RadarChart>
                </ResponsiveContainer>
              ):(
                <div style={{height:256,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
                  <span style={{fontSize:40}}>📊</span>
                  <span style={{fontSize:12,color:T.inkSoft,textAlign:"center"}}>Completa todas las dimensiones<br/>para ver el radar</span>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* DIM GRID */}
      <div className="fade-up-2 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"22px 24px",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".16em",marginBottom:14}}>Detalle por Dimensión</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
          {DIMS.map(d=>{
            const sc=getDimScore(d,answers);
            const l=sc?getLv(Math.round(sc)):null;
            const pct=(d.subs.filter(s=>answers[s.id]>0).length/d.subs.length)*100;
            return (
              <div key={d.key} className="hover-lift" style={{borderRadius:14,border:`1.5px solid ${l?l.border:T.borderSm}`,background:l?l.bg:T.surface,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                <div style={{fontSize:22,marginBottom:6}}>{d.icon}</div>
                <div style={{fontSize:9,fontWeight:600,color:T.inkSoft,marginBottom:5,lineHeight:1.3}}>{d.label}</div>
                <div className="display" style={{fontSize:24,fontWeight:900,color:l?l.c:T.inkSoft,lineHeight:1}}>{sc||"—"}</div>
                {sc&&<div style={{fontSize:8,color:l.text,marginTop:1}}>/5</div>}
                {sc&&<div style={{marginTop:7}}><LvBadge v={Math.round(sc)} sm/></div>}
                <div style={{marginTop:8}}>
                  <div style={{height:3,background:T.borderSm,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:l?l.c:T.border,borderRadius:99,transition:"width .7s"}}/>
                  </div>
                  <div style={{fontSize:8,color:T.inkSoft,marginTop:2}}>{Math.round(pct)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRITICAL GAPS */}
      {critGaps.length>0&&(
        <div className="fade-up-3" style={{borderRadius:18,border:"1.5px solid #FECACA",padding:"24px 26px",marginBottom:14,background:"#FFF8F8",boxShadow:"0 4px 16px rgba(220,38,38,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{width:38,height:38,borderRadius:11,background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18}}>🚨</span></div>
            <div>
              <div className="display" style={{fontSize:15,fontWeight:800,color:"#991B1B"}}>Brechas Críticas — Nivel 1–2</div>
              <div style={{fontSize:11,color:"#B91C1C",marginTop:2}}>{critGaps.length} sub-dimensiones en estado básico/emergente · Acción inmediata recomendada</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {critGaps.map(g=>(
              <div key={g.sub.id} className="hover-lift" style={{background:T.card,borderRadius:14,border:"1px solid #FECACA",padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{flexShrink:0,textAlign:"center",minWidth:52}}>
                    <span style={{fontSize:21}}>{g.dim.icon}</span>
                    <div style={{fontSize:8,fontWeight:600,color:T.inkMid,marginTop:2}}>{g.dim.num}</div>
                    <div style={{marginTop:5}}><LvBadge v={g.score} sm/></div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span className="display" style={{fontSize:13,fontWeight:700,color:T.ink}}>{g.sub.label}</span>
                      <span style={{fontSize:10,color:T.inkSoft}}>· {g.dim.label}</span>
                    </div>
                    <div style={{fontSize:11.5,color:"#7F1D1D",background:"#FEF2F2",borderRadius:8,padding:"8px 12px",marginBottom:7,lineHeight:1.7,border:"1px solid #FFE4E4"}}>
                      <strong>Estado actual: </strong>{g.sub.ndesc[g.score-1]}
                    </div>
                    <div style={{fontSize:11.5,color:"#065F46",background:"#ECFDF5",borderRadius:8,padding:"8px 12px",lineHeight:1.7,border:"1px solid #A7F3D0"}}>
                      <strong>Oportunidad: </strong>{g.sub.opp}
                    </div>
                  </div>
                  <div style={{flexShrink:0,textAlign:"center",minWidth:54}}>
                    <div style={{fontSize:9,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>Brecha</div>
                    <div className="display" style={{fontSize:28,fontWeight:900,color:"#DC2626",lineHeight:1}}>+{g.gap}</div>
                    <div style={{fontSize:9,color:T.inkSoft}}>niveles</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODERATE GAPS */}
      {modGaps.length>0&&(
        <div className="fade-up-4" style={{borderRadius:18,border:"1.5px solid #FDE68A",padding:"24px 26px",marginBottom:14,background:"#FFFBF0",boxShadow:"0 4px 16px rgba(217,119,6,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:38,height:38,borderRadius:11,background:"#FEF3C7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18}}>⚡</span></div>
            <div>
              <div className="display" style={{fontSize:15,fontWeight:800,color:"#92400E"}}>Oportunidades de Mejora — Nivel 3</div>
              <div style={{fontSize:11,color:"#B45309",marginTop:2}}>{modGaps.length} sub-dimensiones · Potencial de avance a nivel 4–5</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {modGaps.map(g=>(
              <div key={g.sub.id} className="hover-lift" style={{background:T.card,borderRadius:14,border:"1px solid #FDE68A",padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.03)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:16}}>{g.dim.icon}</span>
                  <div style={{flex:1}}>
                    <div className="display" style={{fontSize:12,fontWeight:700,color:T.ink}}>{g.sub.label}</div>
                    <div style={{fontSize:9.5,color:T.inkSoft}}>{g.dim.label}</div>
                  </div>
                  <LvBadge v={g.score} sm/>
                </div>
                <div style={{fontSize:11.5,color:"#78350F",background:"#FFFBEB",borderRadius:8,padding:"7px 10px",lineHeight:1.7,border:"1px solid #FDE68A"}}>{g.sub.opp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROADMAP */}
      {allGaps.length>0&&(
        <div className="fade-up-4 hover-lift" style={{background:T.card,borderRadius:18,border:`1px solid ${T.borderSm}`,padding:"24px 26px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{width:38,height:38,borderRadius:11,background:(color+"18"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18}}>🗺️</span></div>
            <div>
              <div className="display" style={{fontSize:15,fontWeight:800,color:T.ink}}>Hoja de Ruta Priorizada</div>
              <div style={{fontSize:11,color:T.inkMid,marginTop:2}}>Secuencia recomendada según impacto y urgencia</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[
              {t:"Corto Plazo",  sub:"0–6 meses",   c:"#DC2626",bg:"#FEF2F2",bdr:"#FECACA",icon:"🚀",items:critGaps.slice(0,4)},
              {t:"Mediano Plazo",sub:"6–12 meses",  c:"#D97706",bg:"#FFFBEB",bdr:"#FDE68A",icon:"⚡",items:[...critGaps.slice(4),...modGaps.slice(0,3)].slice(0,4)},
              {t:"Largo Plazo",  sub:"12–24 meses", c:"#059669",bg:"#ECFDF5",bdr:"#A7F3D0",icon:"🏆",items:modGaps.slice(3,7)},
            ].map(ph=>(
              <div key={ph.t} style={{borderRadius:14,border:`1.5px solid ${ph.bdr}`,background:ph.bg,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${ph.bdr}`,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:15}}>{ph.icon}</span>
                  <div>
                    <div className="display" style={{fontSize:12,fontWeight:800,color:ph.c}}>{ph.t}</div>
                    <div style={{fontSize:9.5,color:ph.c,opacity:.7}}>{ph.sub}</div>
                  </div>
                </div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                  {ph.items.length>0?ph.items.map((g,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13}}>{g.dim.icon}</span>
                      <span style={{fontSize:11,color:T.inkMid,flex:1}}>{g.sub.label}</span>
                      <LvBadge v={g.score} sm/>
                    </div>
                  )):<div style={{fontSize:11,color:T.inkSoft,fontStyle:"italic"}}>Sin brechas en este horizonte</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── SCROLL INDICATOR ─────────────────────────────────────────────────────────
function ScrollIndicator({ scrollRef, color=T.red }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;
    function onScroll() {
      const nearBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 40;
      setShow(!nearBottom);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  if (!show) return null;

  const sideBtn = (side) => (
    <div
      onClick={() => {
        const el = scrollRef?.current;
        if (el) el.scrollBy({ top: 200, behavior: "smooth" });
      }}
      style={{
        position:"fixed",
        [side]: 10,
        top:"50%",
        transform:"translateY(-50%)",
        zIndex:999,
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        gap:6,
        cursor:"pointer",
        userSelect:"none",
        pointerEvents:"all",
      }}
    >
      <div style={{
        background:"rgba(255,255,255,0.96)",
        border:`1.5px solid ${(color+"30")}`,
        borderRadius:14,
        padding:"12px 10px",
        boxShadow:"0 6px 24px rgba(0,0,0,0.13)",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        gap:8,
        maxWidth:52,
      }}>
        {/* Vertical text */}
        <span style={{
          fontSize:9,
          fontWeight:700,
          color:color,
          textTransform:"uppercase",
          letterSpacing:".1em",
          writingMode:"vertical-rl",
          textOrientation:"mixed",
          transform: side==="left" ? "rotate(180deg)" : "none",
          lineHeight:1.3,
        }}>Scroll hacia abajo</span>
        {/* Animated arrow */}
        <svg
          className="scroll-arrow"
          width="16" height="22" viewBox="0 0 16 22" fill="none"
        >
          <path d="M8 1v16M1 11l7 8 7-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  return (
    <>
      {sideBtn("left")}
      {sideBtn("right")}
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const LS_ANSWERS = "madurez_answers";
const LS_PERFIL  = "madurez_perfil";
function loadLS(key, fallback) {
  try { const s=localStorage.getItem(key); return s?JSON.parse(s):fallback; } catch{ return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch{}
}

export default function App() {
  const [answers,setAnswers] = useState(()=>loadLS(LS_ANSWERS,emptyAnswers()));
  const [perfil,setPerfil] = useState(()=>loadLS(LS_PERFIL,null));
  const [showPerfil,setShowPerfil] = useState(false);
  const [showRegistro,setShowRegistro] = useState(()=>!loadLS(LS_PERFIL,null));
  const [empresa,    setEmpresa]       = useState(null);
  const [subsCustom, setSubsCustom]   = useState({});
  const [eDirecciones, setEDirecciones] = useState(DIRECCIONES_FALLBACK);
  const [eRoles,       setERoles]       = useState(ROLES_FALLBACK);
  const [activeDim,setActiveDim] = useState(0);
  const [activeSub,setActiveSub] = useState(0);
  const [view,setView] = useState("intro");
  const [isFullscreen,setIsFullscreen] = useState(false);
  const appRef = useRef(null);
  const introScrollRef = useRef(null);
  const modeloScrollRef = useRef(null);
  const summaryScrollRef = useRef(null);
  const assessScrollRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function doReset() {
    const empty=emptyAnswers();
    setAnswers(empty);
    saveLS(LS_ANSWERS,empty);
    setPerfil(null);
    localStorage.removeItem(LS_PERFIL);
    setActiveDim(0);
    setActiveSub(0);
    setView("intro");
    setShowRegistro(true);
    setConfirmReset(false);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      appRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=GS;
    document.head.appendChild(s);
    return()=>s.remove();
  },[]);

  // ─── PERSISTIR EN LOCALSTORAGE ──────────────────────────────────────────
  useEffect(()=>{ saveLS(LS_ANSWERS, answers); },[answers]);
  useEffect(()=>{ if(perfil) saveLS(LS_PERFIL, perfil); },[perfil]);

  // ─── GUARDAR EN SUPABASE AL LLEGAR AL RESUMEN ────────────────────────────
  const guardadoRef = useRef(false);
  const evalIdRef   = useRef(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Guardar scores finales al llegar al resumen
  useEffect(() => {
    if (view === "summary" && !guardadoRef.current) {
      guardadoRef.current = true;
      if (evalIdRef.current) {
        actualizarScoresFinales(answers, evalIdRef.current);
      } else {
        guardarEvaluacion(answers, perfil || {});
      }
    }
    if (view !== "summary") guardadoRef.current = false;
  }, [view]);

  // Función para guardar/sincronizar progreso en cualquier momento
  async function guardarProgreso(ans) {
    if (!perfil) return;
    setSaving(true); setSavedOk(false);
    try {
      if (!evalIdRef.current) {
        // Crear evaluación nueva
        const { data, error } = await supabase.from("evaluaciones").insert([{
          direccion:  perfil.direccion  || null,
          rol:        perfil.rol        || null,
          empresa_id: perfil.empresa_id || null,
        }]).select();
        if (error) throw error;
        evalIdRef.current = data[0].id;
      }
      // Guardar todas las respuestas actuales
      const filas = [];
      DIMS.forEach(d => d.subs.forEach(s => {
        if ((ans||answers)[s.id] > 0) filas.push({
          evaluacion_id:   evalIdRef.current,
          subdimension_id: s.id,
          dimension_key:   d.key,
          valor:           (ans||answers)[s.id],
        });
      }));
      if (filas.length > 0) {
        // Delete existing and re-insert (simpler than upsert with constraint)
        await supabase.from("respuestas").delete().eq("evaluacion_id", evalIdRef.current);
        await supabase.from("respuestas").insert(filas);
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch(e) {
      console.error("Error guardando progreso:", e);
    }
    setSaving(false);
  }

  const EC  = empresa?.color_primary || T.red;
  const ECD = empresa?.color_dark    || T.redDk;

  const EDIMS = React.useMemo(() => DIMS.map(d=>({
    ...d,
    subs: d.subs.map(s => {
      const c = subsCustom[s.id];
      if (!c) return s;
      return {
        ...s,
        q:     c.q     || s.q,
        label: c.label || s.label,
        desc:  c.desc  || s.desc,
        ndesc: c.ndesc || s.ndesc,
        opp:   c.opp   || s.opp,
      };
    }),
  })), [subsCustom]);

  const dim=EDIMS[activeDim];
  const sub=dim.subs[activeSub];
  const setVal=(id,v)=>{
    const next = {...answers,[id]:v};
    setAnswers(next);
    guardarProgreso(next);
  };

  const totalQ=DIMS.reduce((a,d)=>a+d.subs.length,0);
  const answered=Object.values(answers).filter(v=>v>0).length;
  const pct=Math.round(answered/totalQ*100);
  const completedDims=DIMS.filter(d=>d.subs.every(s=>answers[s.id]>0)).length;

  const totalScore=useMemo(()=>{
    const sc=DIMS.map(d=>getDimScore(d,answers)).filter(Boolean).map(Number);
    return sc.length?(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(1):null;
  },[answers]);

  const TABS=[
    {id:"intro",     label:"Introducción",     icon:"📘"},
    {id:"modelo",    label:"El Modelo",         icon:"🗂"},
    {id:"assessment",label:"Evaluación",        icon:"📝"},
    {id:"summary",   label:"Resumen & Brechas", icon:"📊"},
  ];

  // ── Empresa gate — after ALL hooks ─────────────────────────────────────────
  if (!empresa) return (
    <CodigoAccesoScreen onSuccess={(emp, subs, dirs, roles) => {
      setEmpresa(emp);
      setSubsCustom(subs);
      setEDirecciones(dirs);
      setERoles(roles);
      // Mostrar registro solo si no hay perfil guardado para esta empresa
      const savedPerfil = loadLS("madurez_perfil", null);
      const perfilEsDeEstaEmpresa = savedPerfil?.empresa_id === emp.id;
      if (!perfilEsDeEstaEmpresa) {
        setPerfil(null);
        localStorage.removeItem("madurez_perfil");
        setShowRegistro(true);
      }
    }}/>
  );

  return (
    <div ref={appRef} style={{background:T.surface,minHeight:"100vh",display:"flex",flexDirection:"column",fontSize:"106%"}}>

      {/* ═══ TOPBAR ═══ */}
      <header style={{
        background:"rgba(255,255,255,0.88)",
        backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.borderSm}`,
        padding:"0 28px",height:60,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexShrink:0,position:"sticky",top:0,zIndex:200,
        boxShadow:"0 1px 0 rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          {empresa?.logo_url ? <img src={empresa.logo_url} alt={empresa.nombre} style={{height:24,objectFit:"contain"}}/> : <Logo h={24}/>}
          <div style={{width:1,height:28,background:T.borderSm}}/>
          <div>
            <div className="display" style={{fontSize:12,fontWeight:700,color:T.ink,letterSpacing:"-.01em"}}>{empresa?.nombre || "Modelo de Madurez"} · Gestión de Inventarios</div>
            <div style={{fontSize:9.5,color:T.inkSoft}}>{empresa?.industria || "SoE"} · {empresa?.codigo} · {totalQ} sub-dimensiones</div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {totalScore&&(
            <div style={{
              display:"flex",alignItems:"center",gap:8,
              padding:"5px 14px",background:(EC+"10"),
              borderRadius:99,border:`1px solid ${(EC+"30")}`,
            }}>
              <span style={{fontSize:10,color:T.inkMid,fontWeight:500}}>Global</span>
              <span className="display" style={{fontSize:18,fontWeight:900,color:EC}}>{totalScore}</span>
              <span style={{fontSize:10,color:T.inkSoft}}>/5</span>
              <LvBadge v={Math.round(Number(totalScore))} sm/>
            </div>
          )}
          <div style={{
            display:"flex",gap:2,
            background:T.surface,borderRadius:12,padding:"3px",
            border:`1px solid ${T.borderSm}`,
          }}>
            {TABS.map(t=>(
              <button key={t.id} className="tab-pill" onClick={()=>setView(t.id)} style={{
                padding:"6px 14px",borderRadius:10,border:"none",
                background:view===t.id?T.card:"transparent",
                color:view===t.id?EC:T.inkMid,
                fontWeight:view===t.id?700:500,
                fontSize:11,cursor:"pointer",
                borderBottom:view===t.id?`2px solid ${EC}`:"2px solid transparent",
                boxShadow:view===t.id?"0 2px 6px rgba(0,0,0,0.09)":"none",
                whiteSpace:"nowrap",
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <button onClick={toggleFullscreen} title={isFullscreen?"Salir de pantalla completa":"Pantalla completa"} style={{
            width:34,height:34,borderRadius:9,border:`1px solid ${T.borderSm}`,
            background:isFullscreen?(EC+"10"):T.card,
            color:isFullscreen?EC:T.inkMid,
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:14,flexShrink:0,
            transition:"all .15s",
          }}>{isFullscreen?"⊠":"⛶"}</button>
          <button onClick={()=>setConfirmReset(true)} title="Reiniciar evaluación" style={{
            width:34,height:34,borderRadius:9,border:`1px solid ${T.borderSm}`,
            background:T.card,color:T.inkMid,
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:14,flexShrink:0,
            transition:"all .15s",
          }}>↺</button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      {view==="intro"    &&<div ref={introScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><IntroTab color={EC} colorDk={ECD} industria={empresa?.industria||"Telecomunicaciones"} onNavigate={(v)=>{if(v==="registro"){setShowRegistro(true);}else{setView(v);}}}/><ScrollIndicator color={EC} scrollRef={introScrollRef}/></div>}
      {showRegistro&&<RegistroForm color={EC} colorDk={ECD} direcciones={eDirecciones} roles={eRoles} onStart={(p)=>{setPerfil({...p,empresa_id:empresa?.id});setShowRegistro(false);}}/>}
      {view==="modelo"   &&<div ref={modeloScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><ModeloTab color={EC} colorDk={ECD}/><ScrollIndicator color={EC} scrollRef={modeloScrollRef}/></div>}
      {view==="summary"  &&<div ref={summaryScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><SummaryTab color={EC} colorDk={ECD} answers={answers} perfil={perfil}/><ScrollIndicator color={EC} scrollRef={summaryScrollRef}/></div>}

      {view==="assessment"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* SIDEBAR */}
          <aside style={{
            width:224,background:T.card,
            borderRight:`1px solid ${T.borderSm}`,
            overflow:"auto",flexShrink:0,
          }}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.borderSm}`,background:T.surface}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:9,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".12em"}}>Progreso</span>
                <span className="display" style={{fontSize:14,fontWeight:900,color:EC}}>{pct}%</span>
              </div>
              <div style={{height:5,background:T.borderSm,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${EC},#FF6B6B)`,borderRadius:99,transition:"width .5s cubic-bezier(.22,1,.36,1)"}}/>
              </div>
              <div style={{fontSize:9,color:T.inkSoft,marginTop:5}}>{answered}/{totalQ} resp. · {completedDims}/7 dims</div>
            </div>

            {EDIMS.map((d,i)=>{
              const sc=getDimScore(d,answers);
              const active=i===activeDim;
              return (
                <div key={d.key}>
                  <button className="sidebar-item" onClick={()=>{setActiveDim(i);setActiveSub(0);}} style={{
                    width:"100%",textAlign:"left",padding:"10px 14px",
                    background:active?"#FFF8F7":"transparent",
                    borderLeft:`3px solid ${active?EC:"transparent"}`,
                    border:"none",borderBottom:`1px solid ${T.borderSm}`,
                    cursor:"pointer",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:15}}>{d.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10.5,fontWeight:active?700:500,color:active?EC:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.num} {d.label}</div>
                        <div style={{fontSize:8.5,color:T.inkSoft,marginTop:1}}>{d.subs.filter(s=>answers[s.id]>0).length}/{d.subs.length} evaluadas</div>
                      </div>
                      {sc&&<span className="display" style={{fontSize:12,fontWeight:900,color:getLv(Math.round(sc)).c,flexShrink:0}}>{sc}</span>}
                    </div>
                    {sc&&(
                      <div style={{marginTop:4,height:3,background:T.borderSm,borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(sc/5)*100}%`,background:getLv(Math.round(sc)).c,borderRadius:99,transition:"width .4s"}}/>
                      </div>
                    )}
                  </button>
                  {active&&(
                    <div style={{paddingLeft:30,paddingBottom:6,background:"#FFFAF9"}}>
                      {d.subs.map((s,j)=>(
                        <button key={s.id} onClick={()=>setActiveSub(j)} style={{
                          display:"block",width:"100%",textAlign:"left",
                          padding:"4px 10px",borderRadius:7,border:"none",
                          background:j===activeSub?"#FFF1F0":"transparent",cursor:"pointer",marginBottom:1,
                        }}>
                          <span style={{fontSize:9.5,fontWeight:j===activeSub?700:400,color:j===activeSub?EC:answers[s.id]?getLv(answers[s.id]).text:T.inkSoft}}>
                            {answers[s.id]?"●":"○"} {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>

          {/* MAIN */}
          <main ref={assessScrollRef} style={{flex:1,overflow:"auto",padding:"32px 36px",position:"relative"}}>

            {/* dim header */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <div style={{
                width:48,height:48,borderRadius:14,
                background:(EC+"18"),border:`1.5px solid ${(EC+"30")}`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>
                <span style={{fontSize:23}}>{dim.icon}</span>
              </div>
              <div style={{flex:1}}>
                <div className="display" style={{fontSize:18,fontWeight:900,color:T.ink,letterSpacing:"-.02em"}}>{dim.num}. {dim.label}</div>
                <div style={{fontSize:11,color:T.inkSoft,marginTop:2}}>{dim.sub}</div>
              </div>
              <button onClick={()=>guardarProgreso(answers)} disabled={saving}
                style={{
                  display:"flex",alignItems:"center",gap:5,
                  padding:"7px 15px",borderRadius:20,flexShrink:0,
                  border: savedOk ? "1.5px solid #6EE7B7" : saving ? "1.5px solid #E8E4DF" : "1.5px solid transparent",
                  background: savedOk ? "#ECFDF5" : saving ? "#F7F5F2" : `linear-gradient(135deg,${EC},${ECD})`,
                  color: savedOk ? "#059669" : saving ? "#BBB" : "#fff",
                  fontSize:11.5,fontWeight:700,cursor:saving?"default":"pointer",
                  boxShadow: saving||savedOk ? "none" : `0 2px 12px ${EC}40`,
                  letterSpacing:".01em",
                  transition:"all .25s ease",
                }}>
                <span style={{fontSize:12,lineHeight:1}}>{saving ? "⏳" : savedOk ? "✓" : "↑"}</span>
                <span>{saving ? "Guardando..." : savedOk ? "Guardado" : "Guardar"}</span>
              </button>
              {getDimScore(dim,answers)&&(
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <LvBadge v={Math.round(getDimScore(dim,answers))}/>
                  <span className="display" style={{fontSize:22,fontWeight:900,color:getLv(Math.round(getDimScore(dim,answers))).c}}>{getDimScore(dim,answers)}</span>
                </div>
              )}
            </div>

            {/* sub pills */}
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {dim.subs.map((s,j)=>(
                <button key={s.id} className="sub-pill" onClick={()=>setActiveSub(j)} style={{
                  padding:"5px 13px",borderRadius:99,
                  border:`1.5px solid ${j===activeSub?EC:answers[s.id]?getLv(answers[s.id]).border:T.borderSm}`,
                  background:j===activeSub?EC:answers[s.id]?getLv(answers[s.id]).bg:T.card,
                  color:j===activeSub?"#fff":answers[s.id]?getLv(answers[s.id]).text:T.inkMid,
                  fontSize:10.5,fontWeight:j===activeSub?700:500,
                  whiteSpace:"nowrap",cursor:"pointer",
                  boxShadow:j===activeSub?`0 3px 10px rgba(120,35,220,0.3)`:"none",
                }}>
                  {answers[s.id]?`${answers[s.id]} · `:""}{s.label}
                </button>
              ))}
            </div>

            {/* sub card */}
            <div key={sub.id} className="scale-in" style={{
              background:T.card,borderRadius:18,
              border:`1px solid ${T.borderSm}`,
              padding:"26px",marginBottom:20,
              boxShadow:"0 4px 16px rgba(0,0,0,0.06)",
            }}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,gap:14}}>
                <div style={{flex:1}}>
                  <div className="display" style={{fontSize:16,fontWeight:800,color:T.ink,letterSpacing:"-.015em",marginBottom:5}}>{sub.label}</div>
                  <div style={{fontSize:12,color:T.inkMid,marginBottom:sub.q?10:0}}>{sub.desc}</div>
                  {sub.q&&<div style={{fontSize:13,color:T.ink,lineHeight:1.6,fontStyle:"italic",padding:"10px 14px",background:"#F7F3FF",borderRadius:10,borderLeft:"3px solid #7823DC"}}>{sub.q}</div>}
                </div>
                {answers[sub.id]>0&&<LvBadge v={answers[sub.id]}/>}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
                {T.L.map((l,i)=>{
                  const v=i+1;
                  const sel=answers[sub.id]===v;
                  return (
                    <div key={v} className={`lv-card${sel?" selected":""}`} onClick={()=>setVal(sub.id,v)} style={{
                      borderRadius:14,border:`2px solid ${sel?l.c:l.border}`,
                      background:sel?l.bg:T.card,overflow:"hidden",
                      boxShadow:sel?`0 6px 20px ${l.c}40`:"0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{background:l.c,padding:"9px 11px",display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span className="display" style={{fontSize:13,fontWeight:900,color:"#fff"}}>{v}</span>
                        </div>
                        <span style={{fontSize:9,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:".06em",flex:1}}>{l.label}</span>
                        {sel&&<span style={{fontSize:11,color:"#fff"}}>✓</span>}
                      </div>
                      <div style={{padding:"11px 11px 7px"}}>
                        <p style={{fontSize:10,color:sel?l.text:T.inkMid,margin:0,lineHeight:1.65}}>{sub.ndesc[i]}</p>
                      </div>
                      <div style={{padding:"0 11px 10px",display:"flex",gap:3}}>
                        {[0,1,2,3,4].map(j=><div key={j} style={{flex:1,height:3,borderRadius:99,background:j<=i?l.c:T.borderSm}}/>)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{background:T.surface,borderRadius:10,padding:"10px 14px",border:`1px solid ${T.borderSm}`}}>
                <span style={{fontSize:9.5,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",letterSpacing:".1em"}}>Oportunidad: </span>
                <span style={{fontSize:11.5,color:T.inkMid,lineHeight:1.65}}>{sub.opp}</span>
              </div>
            </div>

            {/* nav */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <button onClick={()=>{
                if(activeSub>0)setActiveSub(activeSub-1);
                else if(activeDim>0){setActiveDim(activeDim-1);setActiveSub(EDIMS[activeDim-1].subs.length-1);}
              }} disabled={activeDim===0&&activeSub===0} style={{
                padding:"10px 22px",borderRadius:12,
                border:`1.5px solid ${T.borderSm}`,background:T.card,
                color:T.inkMid,fontWeight:600,fontSize:12,cursor:"pointer",
                opacity:(activeDim===0&&activeSub===0)?.4:1,transition:"all .15s",
              }}>← Anterior</button>
              <div style={{fontSize:10.5,color:T.inkSoft}}>{dim.num} · {activeSub+1}/{dim.subs.length}</div>
              <button className="btn-red" onClick={()=>{
                if(activeSub<dim.subs.length-1)setActiveSub(activeSub+1);
                else if(activeDim<EDIMS.length-1){setActiveDim(activeDim+1);setActiveSub(0);}
                else setView("summary");
              }} style={{
                padding:"10px 24px",borderRadius:12,border:"none",
                background:`linear-gradient(135deg,${EC},${ECD})`,
                color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",
                boxShadow:`0 4px 14px rgba(120,35,220,0.35)`,
              }}>{activeDim===EDIMS.length-1&&activeSub===dim.subs.length-1?"Ver Resumen →":"Siguiente →"}</button>
            </div>

          </main>
        </div>
      )}


      {showPerfil && <PerfilModal onStart={(p)=>{ setPerfil(p); setShowPerfil(false); setView("assessment"); }} />}

      {confirmReset && (
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:500,backdropFilter:"blur(4px)",
        }}>
          <div className="scale-in" style={{
            width:360,background:T.card,borderRadius:20,
            border:`1px solid ${T.borderSm}`,padding:"36px 32px",
            boxShadow:"0 40px 80px rgba(0,0,0,0.15)",textAlign:"center",
          }}>
            <div style={{fontSize:36,marginBottom:14}}>↺</div>
            <div style={{fontSize:16,fontWeight:800,color:T.ink,marginBottom:8}}>¿Reiniciar evaluación?</div>
            <div style={{fontSize:12,color:T.inkMid,lineHeight:1.7,marginBottom:28}}>
              Se borrarán todas las respuestas actuales y volverás al inicio. Esta acción no se puede deshacer.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmReset(false)} style={{
                flex:1,padding:"11px",borderRadius:10,
                border:`1px solid ${T.borderSm}`,background:T.surface,
                color:T.inkMid,fontWeight:600,fontSize:13,cursor:"pointer",
              }}>Cancelar</button>
              <button onClick={doReset} style={{
                flex:1,padding:"11px",borderRadius:10,border:"none",
                background:`linear-gradient(135deg,${EC},${ECD})`,
                color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",
                boxShadow:`0 4px 14px rgba(120,35,220,0.35)`,
              }}>Reiniciar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER NAV ═══ */}
      {(()=>{
        const NAV_TABS = [
          {id:"intro",      label:"Introducción",     icon:"📘"},
          {id:"modelo",     label:"El Modelo",        icon:"🗂"},
          {id:"assessment", label:"Evaluación",       icon:"📝"},
          {id:"summary",    label:"Resumen & Brechas",icon:"📊"},
        ];
        const currentIdx = NAV_TABS.findIndex(t=>t.id===view);
        const prev = currentIdx > 0 ? NAV_TABS[currentIdx-1] : null;
        const next = currentIdx < NAV_TABS.length-1 ? NAV_TABS[currentIdx+1] : null;
        return (
          <footer style={{
            background:T.card, borderTop:`1px solid ${T.borderSm}`,
            height:52, display:"flex", alignItems:"center",
            justifyContent:"space-between", padding:"0 24px", flexShrink:0,
          }}>
            {/* PREV */}
            {prev ? (
              <button onClick={()=>setView(prev.id)} style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"7px 16px",borderRadius:10,border:`1px solid ${T.borderSm}`,
                background:T.surface,cursor:"pointer",transition:"all .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=EC;e.currentTarget.style.color=EC;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderSm;e.currentTarget.style.color=T.ink;}}
              >
                <span style={{fontSize:14}}>←</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:8.5,color:T.inkSoft,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",lineHeight:1}}>Anterior</div>
                  <div style={{fontSize:12,fontWeight:700,color:"inherit",lineHeight:1.4}}>{prev.icon} {prev.label}</div>
                </div>
              </button>
            ) : <div/>}

            {/* CENTER */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {NAV_TABS.map((t,i)=>(
                <div key={t.id} onClick={()=>setView(t.id)} style={{
                  width: t.id===view ? 20 : 6,
                  height:6, borderRadius:99,
                  background: t.id===view ? EC : T.borderSm,
                  cursor:"pointer", transition:"all .25s cubic-bezier(.22,1,.36,1)",
                }}/>
              ))}
            </div>

            {/* NEXT */}
            {next ? (
              <button onClick={()=>setView(next.id)} style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"7px 16px",borderRadius:10,border:`1px solid ${T.borderSm}`,
                background:T.surface,cursor:"pointer",transition:"all .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=EC;e.currentTarget.style.color=EC;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderSm;e.currentTarget.style.color=T.ink;}}
              >
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:8.5,color:T.inkSoft,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",lineHeight:1}}>Siguiente</div>
                  <div style={{fontSize:12,fontWeight:700,color:"inherit",lineHeight:1.4}}>{next.icon} {next.label}</div>
                </div>
                <span style={{fontSize:14}}>→</span>
              </button>
            ) : <div/>}
          </footer>
        );
      })()}

    </div>
  );
}
