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
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(243,36,36,0)}50%{box-shadow:0 0 0 8px rgba(243,36,36,0.08)}}
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
.btn-red:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(243,36,36,0.38)!important;}
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
  red:"#E8251F", redDk:"#B91A15", redMid:"#F04040",
  redBg:"#FEF2F1", redSoft:"#FDDCDA", redXsoft:"#FFF6F5",
  ink:"#111110", inkMid:"#6B6860", inkSoft:"#9C9A95", inkXsoft:"#C8C6C0",
  surface:"#FFF8F8", card:"#FFFFFF",
  border:"#E8E6E0", borderSm:"#F0EEE9",
  L:[
    {label:"Básico",     c:"#78716C",bg:"#FAFAF8",text:"#44403C",border:"#E7E5E4",desc:"Ejecución transaccional y reactiva; procesos rudimentarios; alta dependencia manual."},
    {label:"Emergente",  c:"#D97706",bg:"#FFFBEB",text:"#92400E",border:"#FDE68A",desc:"Eficiencia interna; estandarización parcial; prácticas iniciales de control."},
    {label:"Robusto",    c:"#2563EB",bg:"#EFF6FF",text:"#1E3A8A",border:"#BFDBFE",desc:"Excelencia funcional; procesos estandarizados; KPIs y mejora continua."},
    {label:"End-to-End", c:"#7C3AED",bg:"#F5F3FF",text:"#4C1D95",border:"#DDD6FE",desc:"Integración y optimización E2E; única fuente de verdad; trade-offs explícitos."},
    {label:"Pivote",     c:"#059669",bg:"#ECFDF5",text:"#064E3B",border:"#A7F3D0",desc:"Cadena centrada en cliente; decisiones dinámicas habilitadas por IA y automatización."},
  ],
};

const LOGO = "data:image/png;base64,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";
const DIMS = [
  { num:"01", key:"estrategia", icon:"🎯", label:"Estrategia de Gestión", sub:"Objetivos · Políticas · Red · Gobernanza · Riesgos",
    subs:[
      { id:"e1", label:"Objetivos & trade-offs", desc:"Servicio, costo, capital de trabajo",
        ndesc:["Sin estrategia documentada. Objetivo: disponibilidad sin considerar costos ni capital.","Metas a nivel agregado vinculadas al presupuesto. Foco en reducir costos de almacenamiento.","Estrategia integrada con B2B/B2C. Objetivos por canal y categoría. Trade-offs costo-servicio-capital.","Estrategia alineada al negocio e integrada al IBP. Objetivos a nivel SKU-ubicación con balance óptimo.","Estrategia dinámica informada por datos en tiempo real. Objetivos ajustados automáticamente."],
        opp:"Definir política formal de inventarios con metas diferenciadas por canal, categoría y SKU. Integrar al ciclo S&OP. Reducción esperada de capital inmovilizado: 15–25%."},
      { id:"e2", label:"Políticas por canal", desc:"B2B/B2C, SS/ROP",
        ndesc:["No existen políticas por canal. Gestión one-size-fits-all; decisiones reactivas. Sin parámetros claros.","Políticas básicas por categoría y canal. Clasificación ABC simple. Parámetros uniformes.","Políticas diferenciadas por B2B/B2C y ABC/XYZ. Niveles de servicio por canal; reglas documentadas.","Políticas multicriterio a nivel SKU-ubicación. Integradas a S&OP/IBP y revisión trimestral.","Políticas dinámicas con IA: micro-segmentación SKU-tienda-cliente, auto-ajuste en tiempo real."],
        opp:"Implementar parámetros SS/ROP diferenciados por ABC/XYZ y canal. Documentar reglas de asignación B2B/B2C. Reducción de quiebres críticos: 20–30%."},
      { id:"e3", label:"Diseño de red", desc:"CDC, tiendas, hubs",
        ndesc:["Red no diseñada formalmente. Almacenamiento centralizado sin optimización. Tiempos inconsistentes.","Red básica con CD central y puntos de cross-docking regionales. Sin optimización de costos.","Red diseñada para balance costo-servicio. Puntos estratégicos por región. Rutas optimizadas.","Red integrada para todos los canales y técnicos/campo. Posicionamiento óptimo por nodo.","Red dinámica ship-from-anywhere: optimización automática según demanda y costos."],
        opp:"Estudio de red para optimizar posicionamiento por nodo (CDC vs hubs vs tiendas). Reducción de costos de distribución: 10–18% y mejora de OTIF."},
      { id:"e4", label:"Gobernanza S&OP", desc:"S&OP/S&OE, Comercial, Finanzas",
        ndesc:["No existe gobernanza formal. Decisiones desconectadas de comercial/finanzas; sin foros.","Coordinación básica e informal. Foco en apagar incendios. Participación limitada de finanzas.","S&OP formalizado mensual con participación de comercial, finanzas y supply chain.","IBP/E2E: plan integrado demanda-suministro-inventario-finanzas con escenarios. RACI claro.","Planificación continua y dinámica. Automatización de excepciones. IA en decisiones."],
        opp:"Formalizar ciclo S&OP mensual con Comercial, Finanzas y Supply Chain. Establecer único número y RACI. Reducción de quiebres por desalineación: 25–35%."},
      { id:"e5", label:"Riesgos y resiliencia", desc:"Disrupciones, fraude, regulación",
        ndesc:["Sin proceso formal de gestión de riesgos. Reacción tardía ante quiebres, robos o cambios regulatorios.","Identificación reactiva de riesgos principales. Planes de mitigación ad-hoc.","Proceso estructurado: registro de riesgos, owners y planes por categorías críticas.","Gestión proactiva integrada al S&OP: escenarios y estrategias de cobertura (buffers, dual-sourcing).","Modelamiento predictivo con IA: alertas tempranas de disrupción, fraude y SLOB."],
        opp:"Crear registro de riesgos (SLOB, fraude SIM/IMEI, disrupciones) con owners y planes de contingencia. Controles anti-fraude en categorías de alto riesgo."},
    ]
  },
  { num:"02", key:"caracterizacion", icon:"🏷️", label:"Caracterización", sub:"Segmentación · Trazabilidad · Ciclo de vida · Ubicación · Retornos",
    subs:[
      { id:"c1", label:"Segmentación ABC/XYZ", desc:"Categoría, criticidad, valor-volumen",
        ndesc:["No existe clasificación formal. Productos sin diferenciación. No se conoce la contribución de cada SKU.","Clasificación ABC básica por volumen o valor. Aplica a categorías principales. Actualización anual.","Clasificación ABC/XYZ combinando valor y variabilidad. Aplica a todas las categorías.","Clasificación multidimensional: margen, rotación, ciclo de vida. Actualización trimestral automatizada.","Clasificación dinámica continua. ML reclasifica SKUs. Integración con roadmap de OEMs."],
        opp:"Implementar clasificación ABC/XYZ para todo el catálogo activo. Diferenciar parámetros por segmento. Reducción de inventario: 15–20% manteniendo nivel de servicio."},
      { id:"c2", label:"Atributos & trazabilidad", desc:"Serial/IMEI, lotes, caducidad",
        ndesc:["Catálogo maestro incompleto. Atributos críticos (serial/IMEI, lote) faltantes o no confiables.","Maestros parcialmente completos. Trazabilidad limitada para SKUs de alto valor.","Gobernanza de maestros estandarizada. Trazabilidad por serial/IMEI para dispositivos y CPE.","Trazabilidad E2E incluyendo 3PL/distribuidores. Validaciones automáticas de IMEI/serial.","Trazabilidad en tiempo real con control tower; RFID/IoT donde aplique."],
        opp:"Captura obligatoria de IMEI/serial en recepción, venta y swap. Limpiar maestro de ítems activos. Reducción de fraude SIM/dispositivos: 30–50%."},
      { id:"c3", label:"Ciclo de vida y SLOB", desc:"SLOB, lanzamientos, fin de vida",
        ndesc:["No se considera el ciclo de vida. Mismas políticas para productos nuevos y maduros. SLOB acumulado.","Reconocimiento informal del ciclo de vida; ajustes manuales en EOL. Identificación reactiva de SLOB.","Gestión por fases (lanzamiento-crecimiento-declive-EOL) con políticas por fase.","Gestión integrada con roadmap de OEMs y S&OP: transiciones planificadas; alertas tempranas de SLOB.","Gestión predictiva: modelos anticipan adopción/declive. Provisiones automáticas con analítica."],
        opp:"Proceso de gestión SLOB con criterios claros (antigüedad, rotación). Planes de depleción antes de superar X días de cobertura. Reducción de write-offs: 40–60%."},
      { id:"c4", label:"Ubicación y propiedad", desc:"Consignación, 3PL, tiendas, técnicos",
        ndesc:["Ubicaciones y propiedad no claramente definidas. Visibilidad limitada a bodegas principales.","Estructura básica de ubicaciones y marca simple propio vs consignado. Reportes periódicos.","Maestro de ubicaciones estandarizado (nodo-bodega-bin) y atributos de propiedad/estado.","Visibilidad E2E multi-parte (3PL, dealers, distribuidores) casi en tiempo real.","Visibilidad en tiempo real con partners. Optimización de posicionamiento dinámica."],
        opp:"Maestro completo de ubicaciones con jerarquía nodo-bodega-bin. Control de inventario en poder de técnicos de campo. Reducción de discrepancias contables."},
      { id:"c5", label:"Retornos y condición", desc:"Nuevo, refurb, swap, scrap",
        ndesc:["Sin proceso formal de retornos. Productos devueltos acumulados sin clasificación.","Proceso básico de recepción de devoluciones. Clasificación manual simple (apto/no apto).","Proceso estructurado (RMA) con políticas por canal y tipo. Triage por condición.","Logística inversa integrada E2E: enrutamiento optimizado a reparación/refurb/reciclaje.","Economía circular optimizada: asignación dinámica automática del destino óptimo."],
        opp:"Implementar proceso RMA con triage estandarizado y tiempos objetivo de reingreso. Potencial de recuperación de valor: 10–20% del costo de los retornos."},
    ]
  },
  { num:"03", key:"procesos", icon:"⚙️", label:"Procesos", sub:"Planeación · Omnicanal · Ejecución · Control · Excepciones",
    subs:[
      { id:"p1", label:"Planeación & reposición", desc:"DRP, min-max, MEIO",
        ndesc:["Sin proceso formal. Pedidos manuales basados en intuición. Sin parámetros SS/ROP/EOQ.","Forecast básico por categoría/canal en Excel. Frecuencias fijas; parámetros a nivel agregado.","Planeación a nivel SKU con modelos estadísticos. Parámetros diferenciados por ABC/XYZ.","Planeación integrada a S&OP/IBP: parámetros a nivel SKU-ubicación y optimización MEIO.","Planeación continua y autónoma: modelos ML + señales externas. Digital twin; ejecución automática."],
        opp:"Migrar de reposición reactiva a planeación estadística por SKU. Calcular SS y ROP por ABC/XYZ y lead time real. Reducción de quiebres: 30–40%. Reducción de inventario total: 10–15%."},
      { id:"p2", label:"Asignación omnicanal", desc:"ATP/CTP, reservas, disponibilidad",
        ndesc:["Inventarios gestionados en silos. Sin visibilidad cruzada. Exceso en un canal y quiebre en otro.","Visibilidad consolidada básica. Reglas simples de reserva/ATP manual. Transferencias lentas.","Pool compartido para categorías principales; reglas de asignación por prioridad de canal.","Orquestación omnicanal integrada: ATP/CTP con reglas dinámicas. Fulfillment flexible.","Orquestación en tiempo real. Promesa de disponibilidad dinámica. Inventario virtual en toda la red."],
        opp:"Crear pool de inventario compartido con reglas de priorización B2B/B2C. Eliminar el fenómeno de exceso en un canal y quiebre en otro. Mejora de disponibilidad: 15–25% sin incrementar inventario."},
      { id:"p3", label:"Ejecución física", desc:"Recepción, almacenaje, picking",
        ndesc:["Procesos físicos manuales y no estandarizados. Uso limitado de códigos de barras; errores frecuentes.","SOPs básicos en CDC; registro en sistema al cierre del día. Picking con listas impresas.","Procesos estandarizados con WMS en CDC (RF/escáner), layout y slotting definidos.","Ejecución E2E en CDC/tiendas/3PL: integración WMS-OMS-TMS. Automatización selectiva.","Ejecución altamente automatizada (robotización/IoT). Slotting dinámico."],
        opp:"Implementar WMS con captura RF/escáner en CDC. Estandarizar SOPs de recepción, picking y despacho. Reducción de errores: 50–70%. Mejora de productividad: 20–30%."},
      { id:"p4", label:"Control & exactitud", desc:"Conteos cíclicos, shrinkage",
        ndesc:["Sin proceso de conteo cíclico. Inventarios físicos anuales con alta discrepancia. Exactitud desconocida.","Inventario físico semestral. Conteos cíclicos básicos en algunas ubicaciones. Exactitud 80–90%.","Programa de conteo cíclico estructurado por ABC con exactitud >95%. Investigación de causas.","Conteo cíclico continuo con tecnología. Exactitud >98%. Controles anti-shrinkage.","Control en tiempo real (RFID/IoT) con exactitud >99% y detección automática de anomalías."],
        opp:"Implementar conteos cíclicos por ABC (A: semanal, B: mensual, C: trimestral). Investigar causas de diferencias. Objetivo: exactitud >95% en 6 meses."},
      { id:"p5", label:"Excepciones y retornos", desc:"RMA, devoluciones, reparación",
        ndesc:["Sin proceso formal para devoluciones. Productos devueltos acumulados sin gestión.","Proceso básico de recepción de devoluciones. Políticas elementales por canal.","Proceso estructurado con políticas claras por canal y tipo de producto. Categorización del devuelto.","Logística inversa integrada. Routing optimizado de devoluciones. Mercado secundario activo.","Logística inversa automatizada con asignación dinámica del destino óptimo."],
        opp:"Definir políticas formales de devolución por tipo y canal. Medir TAT del proceso de retornos. Calcular el capital inmovilizado en retornos sin clasificar y establecer SLAs de reingreso."},
    ]
  },
  { num:"04", key:"roles", icon:"👥", label:"Roles y Responsabilidades", sub:"Modelo operativo · Interfaces · Terceros · Capacidades · Incentivos",
    subs:[
      { id:"r1", label:"Modelo operativo & RACI", desc:"Dueños de proceso E2E",
        ndesc:["No existe modelo operativo definido. Roles no documentados; duplicidades/vacíos. Silos B2B/B2C.","Modelo operativo básico dentro de supply chain; algunos roles definidos. RACI parcial.","Gobernanza y modelo operativo claros con dueños de proceso. RACI completo; matriz de autoridad.","Modelo operativo E2E integrado con proveedores/3PL y canales. Roles especializados.","Modelo operativo adaptable: automatización de tareas rutinarias, equipos en decisiones de alto valor."],
        opp:"Documentar modelo operativo con RACI completo. Asignar dueños formales a procesos críticos (planeación, control, retornos). Eliminar duplicidades con roles y handoffs claros."},
      { id:"r2", label:"Interfaces clave", desc:"Comercial, Finanzas, Operaciones, TI",
        ndesc:["Interfaces no formalizadas. Información compartida tarde/incompleta; conflictos frecuentes.","Rituales básicos de coordinación; finanzas participa ocasionalmente.","Interfaces estructuradas con cadencia y agenda (S&OP/S&OE). Reglas claras para lanzamientos.","Integración E2E: planificación conectada con comercial/finanzas/operaciones/TI. SLAs definidos.","Colaboración en tiempo real: decisiones automatizadas para rutinas. Squads cross-funcionales."],
        opp:"Formalizar la agenda Supply-Comercial-Finanzas. Definir derechos de decisión para campañas y quiebres críticos. Reducción de tiempo de respuesta ante disrupciones: 40–60%."},
      { id:"r3", label:"Gestión de terceros", desc:"OEM, 3PL, distribuidores, dealers",
        ndesc:["Relaciones transaccionales con OEMs enfocadas en precio. Lead times no monitoreados.","Relación por contratos básicos. Lead times conocidos pero poca gestión de performance.","Gestión estructurada con scorecards para OEMs/3PL/dealers. SLAs definidos.","Partnerships E2E: planes de mejora conjuntos; visibilidad de pipeline; acuerdos de buffers.","Ecosistema integrado: datos en tiempo real, planificación colaborativa automatizada. Co-innovación."],
        opp:"Implementar scorecards para top-10 proveedores/3PL con KPIs de lead time, OTIF y exactitud. Iniciar planificación colaborativa con OEMs en lanzamientos. Reducción de variabilidad de lead time: 20–30%."},
      { id:"r4", label:"Capacidades y formación", desc:"Planificación, analítica, operación",
        ndesc:["Sin programa de capacitación específico. Aprendizaje ad-hoc. Brechas no identificadas.","Capacitaciones básicas disponibles. Materiales genéricos. Dependencia de consultores externos.","Programa de capacitación estructurado con módulos específicos de inventarios telco.","Programas de desarrollo individualizados. Formación cross-funcional. Certificaciones.","Programas avanzados en analytics, IA aplicada a inventarios. Aprendizaje continuo."],
        opp:"Evaluar competencias del equipo actual. Diseñar plan de formación en planeación estadística, gestión SLOB y herramientas digitales. Reducción de dependencia de consultores externos."},
      { id:"r5", label:"Incentivos & accountability", desc:"SLAs, KPIs, consecuencias",
        ndesc:["Sin accountability clara ni incentivos alineados. Áreas optimizan objetivos locales.","Revisión periódica enfocada en costos. Incentivos que incentivan sobre-stock.","Gestión de desempeño estructurada: KPIs balanceados (costo-servicio-capital) por función.","Accountability E2E: KPIs compartidos cross-funcionales y con terceros. Incentivos alineados.","Gestión optimizada. Incentivos dinámicos en tiempo real. Compensación ligada al desempeño del ecosistema."],
        opp:"Diseñar tablero de KPIs balanceados visible para todas las áreas. Alinear incentivos de Comercial y Supply Chain. Resolver el dilema ventas vs. capital."},
    ]
  },
  { num:"05", key:"herramientas", icon:"🔧", label:"Herramientas", sub:"ERP/OMS/WMS · APS · Visibilidad · Analytics · Automatización",
    subs:[
      { id:"h1", label:"Arquitectura core", desc:"ERP/OMS/WMS e integración",
        ndesc:["Sistemas legacy o uso básico sin integración. Registros paralelos en Excel. Sin WMS robusto.","ERP implementado pero no armonizado entre canales. WMS básico en CDC. OMS parcial.","ERP integrado con módulos de inventario/compras y WMS robusto en CDC. Datos diarios.","Arquitectura armonizada E2E (ERP-OMS-WMS-TMS) para tiendas, CDC, distribuidores y 3PL.","Plataforma modular cloud con integración en tiempo real vía APIs/eventos. Capacidades IA."],
        opp:"Armonizar ERP para todos los canales y eliminar registros paralelos en Excel. Implementar WMS en tiempo real. Roadmap de arquitectura target de 18–24 meses. Reducción de esfuerzo de conciliación: 60–70%."},
      { id:"h2", label:"Herramientas de planificación", desc:"APS/DRP, pronóstico, S&OP",
        ndesc:["Planificación basada en Excel. Sin herramientas analíticas. Sin capacidad de forecast.","Reporting básico (BI estático). Planificación en Excel con modelos simples. Dashboards manuales.","Herramienta de planificación con modelos estadísticos. BI interactivo. Reportes automatizados.","Suite de planificación avanzada (APS) con optimización de inventarios. Simulación de escenarios.","Plataforma de planning con IA/ML. Digital twin de la cadena de suministro. Analytics predictivos."],
        opp:"Evaluar e implementar herramienta de planificación de demanda. Automatizar cálculo de parámetros SS/ROP. Reducción de tiempo de ciclo de planeación: 50–60%."},
      { id:"h3", label:"Visibilidad & trazabilidad", desc:"Serialización, RFID, track&trace",
        ndesc:["Sin visibilidad del inventario en tránsito ni en puntos de venta. Sin trazabilidad por serie.","Visibilidad básica del inventario en CDs y algunas tiendas. Tránsito conocido solo al llegar.","Visibilidad de inventario en toda la red propia. Inventario en tránsito visible.","Visibilidad en tiempo real de toda la red incluyendo distribuidores y 3PLs. Alertas.","Visibilidad total en tiempo real con IoT/RFID en todos los nodos. Control tower 360°."],
        opp:"Implementar dashboard consolidado de inventario por nodo. Integrar visibilidad de 3PL y distribuidores. Alertas automáticas de quiebre proyectado. Reducción de tiempo de respuesta: 40–50%."},
      { id:"h4", label:"Datos & analítica", desc:"Lakehouse, BI, modelos, calidad",
        ndesc:["Datos dispersos en silos; calidad desconocida. Reportes manuales. Sin gobierno de datos.","BI básico con extracción periódica. Calidad de datos corregida manualmente.","Plataforma de datos corporativa (DWH/lakehouse). Gobierno de datos. BI autoservicio.","Analítica avanzada integrada: modelos de pronóstico, optimización y riesgo.","Analítica predictiva/prescriptiva a escala. Recomendaciones automatizadas. Gemelo digital."],
        opp:"Definir modelo de datos unificado de inventarios. Establecer data owners y métricas estándar. Habilitar BI autoservicio para planeadores. Eliminar inconsistencias entre reportes."},
      { id:"h5", label:"Automatización", desc:"RPA, APIs/EDI, alertas, movilidad",
        ndesc:["Procesos manuales intensivos. Sin integración entre sistemas. Comunicación por email.","Automatización básica de procesos transaccionales. Integración limitada entre sistemas.","Workflows automatizados para procesos clave. Integración vía EDI/API con proveedores.","Alto nivel de automatización E2E. Integración bidireccional con OEMs y 3PLs. RPA.","Automatización inteligente: APIs/eventos + RPA/IA. Movilidad completa en CDC/tiendas."],
        opp:"Automatizar procesos de alta frecuencia: órdenes de reposición, alertas de quiebre/exceso, conciliaciones. Implementar movilidad en CDC (handhelds). Reducción de esfuerzo manual: 40–55%."},
    ]
  },
  { num:"06", key:"indicadores", icon:"📊", label:"Indicadores", sub:"Servicio · Capital · Exactitud · Salud · Cumplimiento",
    subs:[
      { id:"i1", label:"Servicio al cliente", desc:"Fill rate, OTIF, backorders, NPS",
        ndesc:["No se mide servicio de forma consistente. Se conocen quiebres solo por reclamos.","Métricas básicas de quiebres a nivel agregado; medición manual y periódica.","Set estandarizado de KPIs de servicio (fill rate, OTIF, backorders) por canal/categoría.","KPIs de servicio integrados E2E y a nivel SKU-ubicación. Tableros con drill-down.","Servicio en tiempo real con métricas predictivas (riesgo de quiebre) y prescriptivas."],
        opp:"Definir y medir fill rate y OTIF por canal y categoría. Vincular quiebres a impacto en activaciones/NPS. Establecer targets diferenciados por clasificación ABC."},
      { id:"i2", label:"Eficiencia & capital", desc:"Rotación, DIO, capital de trabajo",
        ndesc:["Solo se monitorea valor total de inventario. No se mide rotación/DIO de forma confiable.","Métricas básicas (valor, cobertura en días) con actualización mensual.","KPIs completos de eficiencia (rotación, DIO, DOH, capital de trabajo) por categoría/canal.","Gestión integrada: KPIs a nivel SKU-ubicación y costo de servir. Optimización de trade-offs.","KPIs en tiempo real y predictivos (proyección de capital, riesgo de exceso)."],
        opp:"Reporte semanal de DIO/rotación por categoría. Targets de capital de trabajo vinculados a objetivos financieros. Potencial de liberación de capital: 15–30% del inventario total."},
      { id:"i3", label:"Exactitud & pérdidas", desc:"Accuracy, shrinkage, ajustes",
        ndesc:["Exactitud desconocida o baja; ajustes frecuentes sin análisis. Shrinkage no medido.","Exactitud medida esporádicamente. Shrinkage estimado con baja granularidad.","Exactitud >95% con programa de conteo cíclico; KPIs de ajustes y pérdidas por nodo.","Exactitud >98% con monitoreo continuo; shrinkage gestionado proactivamente.","Exactitud >99% y detección automática de anomalías/pérdidas."],
        opp:"Medir IRA (Inventory Record Accuracy) por nodo. Cuantificar pérdidas anuales por shrinkage y fraude. Implementar controles físicos mínimos en nodos de alto riesgo."},
      { id:"i4", label:"Salud del inventario", desc:"Aging, SLOB, write-offs, DOH",
        ndesc:["No se mide salud (aging/SLOB). Inventario envejecido detectado tarde; write-offs imprecisos.","Reportes manuales de aging y SLOB; criterios inconsistentes. Provisiones reactivas.","KPIs estandarizados de salud (aging, SLOB, DOH, write-offs) con revisión periódica.","Salud integrada a S&OP y ciclo de vida: alertas tempranas, estrategias de depleción.","Métricas predictivas de obsolescencia con prevención automática. Provisiones automáticas."],
        opp:"Reporte mensual de salud con aging por categoría (30/60/90/120+ días). Criterios de clasificación SLOB y provisiones consistentes. Comité mensual de depleción para accionar inventario en riesgo."},
      { id:"i5", label:"Cumplimiento & riesgo", desc:"Fraude, auditoría, regulatorio",
        ndesc:["Cumplimiento reactivo. Controles de seguridad mínimos; riesgo de fraude alto.","Controles básicos y auditorías puntuales. Cumplimiento regulatorio atendido caso a caso.","Marco de cumplimiento y riesgo definido: políticas de seguridad, auditorías, controles anti-fraude.","Gestión E2E del riesgo: controles automatizados, monitoreo continuo y analítica de anomalías.","Gestión predictiva del riesgo: modelos anticipan fraude/robos; acciones automáticas."],
        opp:"Establecer marco formal de riesgo: políticas de seguridad física, controles de IMEI/SIM, segregación de funciones. Auditorías periódicas en canales de mayor riesgo. Reducción de incidentes de fraude: 30–50%."},
    ]
  },
  { num:"07", key:"abastecimiento", icon:"📦", label:"Abastecimiento", sub:"Dispositivos · CPE · SIM/eSIM · Accesorios · Repuestos",
    subs:[
      { id:"ab1", label:"Dispositivos", desc:"Smartphones/tablets: lanzamiento-rampa-fin de vida",
        ndesc:["Compras reactivas. Sin planificación de lanzamientos; quiebres o sobre-stocks frecuentes.","Planificación básica de lanzamientos basada en históricos y estimaciones comerciales.","Estrategia por ciclo de vida: planificación de lanzamientos con 4–8 semanas. Acuerdos con OEM.","E2E con OEMs: integración a roadmap y pipeline; escenarios de demanda. Acuerdos de devolución.","Estrategia dinámica: IA para ramp-up/down, mix óptimo por tienda/segmento en tiempo real."],
        opp:"Proceso formal de planeación de lanzamientos con 4–8 semanas de anticipación. Negociar acuerdos de devolución/crédito con OEMs para dispositivos al EOL. Reducción de SLOB por EOL: 40–50%."},
      { id:"ab2", label:"CPE/routers/STB", desc:"Proyectos, bundles, reposición de fallas",
        ndesc:["Abastecimiento basado en pedidos de proyectos sin estándar. Faltantes afectan altas y soporte.","Planificación básica por proyectos/bundles con buffers simples. RMA manual.","Planeación por demanda de instalaciones y fallas (forecast + históricos). RMA estructurado.","E2E: integración con planes comerciales/operaciones y proveedores. Optimización MEIO.","Estrategia dinámica: analítica predictiva de fallas y demanda; reposición autónoma."],
        opp:"Integrar el plan de instalaciones/altas con la planeación de CPE. Implementar reposición por fallas con histórico de tasas de falla por modelo. Reducción de quiebres que afectan instalaciones: 25–35%."},
      { id:"ab3", label:"SIM/eSIM & kits", desc:"Alto volumen, bajo valor, control de fraude",
        ndesc:["Compras reactivas; control débil de inventario y numeración. Riesgo alto de fraude.","Políticas básicas de reposición por volumen (min-max). Control parcial de numeración.","Gestión estructurada: reposición por consumo y distribución por canal/tienda. Trazabilidad.","E2E: integración con sistemas de activación y cumplimiento regulatorio. Analítica de anomalías.","Monitoreo en tiempo real de pérdidas y fraude con modelos predictivos; bloqueos automáticos."],
        opp:"Control de lote/serie para SIM/kits con cadena de custodia documentada. Auditorías de numeración periódicas. KPIs de activación vs. distribución para detectar anomalías. Reducción de fraude SIM: 30–60%."},
      { id:"ab4", label:"Accesorios", desc:"Amplia variedad, moda, riesgo de obsolescencia",
        ndesc:["Catálogo sin segmentación; compras reactivas. Alto sobre-stock y obsolescencia.","Segmentación básica por valor/rotación; reposición con reglas simples.","Gestión por portafolio: ABC/XYZ + margen y tendencia. Surtido por tienda/segmento.","E2E: integración con marketing y e-commerce. Acuerdos con proveedores para devoluciones.","Estrategia dinámica: IA para predicción de tendencias, personalización por tienda."],
        opp:"Reducir catálogo activo de accesorios priorizando por margen y rotación. Surtido diferenciado por formato de tienda (A/B/C). Ciclos de revisión de aging mensuales. Reducción de SLOB: 35–50%."},
      { id:"ab5", label:"Repuestos/refurb/swap", desc:"Circularidad, garantías y niveles de servicio",
        ndesc:["Gestión reactiva de repuestos y swaps; sin visibilidad de condición. Altas demoras.","Proceso básico de inventario de repuestos; stock de seguridad simple.","Estrategia definida: niveles de servicio para repuestos por familia/tecnología. Triage estructurado.","E2E: optimización multi-escalón (MEIO) y logística inversa integrada. Refurb industrializado.","Estrategia dinámica y circular: modelos predictivos de fallas. Orquestación automática del destino."],
        opp:"Calcular demanda histórica de repuestos/swaps por modelo. Establecer niveles de servicio y targets de TAT. Proceso de reingreso de equipos refurbishados. Recuperación de valor de activos: 20–30%."},
    ]
  },
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

function Logo({h=26,inv=false}) {
  return <img src={LOGO} alt="Claro" style={{height:h,display:"block",filter:inv?"brightness(0) invert(1)":"none"}}/>;
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
const DIRECCIONES = [
  "Dirección de Tecnología","Dirección Comercial","Dirección de Operaciones",
  "Dirección de Supply Chain","Dirección Financiera","Dirección de Logística",
  "Otra",
];
const ROLES = [
  "Gerente / Director","Coordinador / Jefe","Analista","Consultor","Otro",
];

function RegistroForm({onStart}) {
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
          border:`1.5px solid ${val===o?T.red:T.border}`,
          background:val===o?T.redBg:T.card,
          color:val===o?T.red:T.inkMid,
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
          {sel(dir,setDir,DIRECCIONES)}
        </div>

        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",
            letterSpacing:".1em",marginBottom:10}}>Rol</div>
          {sel(rol,setRol,ROLES)}
        </div>

        {err && (
          <div style={{fontSize:12,color:T.red,marginBottom:16}}>
            Por favor selecciona tu dirección y rol para continuar.
          </div>
        )}

        <button onClick={start} className="btn-red" style={{
          width:"100%",padding:"13px",borderRadius:12,border:"none",
          background:`linear-gradient(135deg,${T.red},${T.redDk})`,
          color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
          boxShadow:`0 4px 16px rgba(232,37,31,0.3)`,
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
function IntroTab({onNavigate}) {
  const total=DIMS.reduce((a,d)=>a+d.subs.length,0);

  const STEPS=[
    {n:"01",icon:"📖",c:"#E8251F",bg:"#FEF2F1",label:"Lee el Modelo",   desc:"Revisa las 7 dimensiones y la escala de madurez SoE antes de evaluar."},
    {n:"02",icon:"👥",c:"#2563EB",bg:"#EFF6FF",label:"Convoca al equipo",desc:"Supply, Comercial, Finanzas, Ops y TI. Sesión conjunta ~45 min."},
    {n:"03",icon:"📝",c:"#7C3AED",bg:"#F5F3FF",label:"Evalúa las 35",   desc:"Para cada sub-dimensión elige el nivel que describe la situación actual."},
    {n:"04",icon:"📊",c:"#059669",bg:"#ECFDF5",label:"Lee el Resumen",  desc:"Radar, brechas críticas y oportunidades con impacto cuantificado."},
    {n:"05",icon:"🗺️",c:"#D97706",bg:"#FFFBEB",label:"Define el Plan",  desc:"Prioriza iniciativas en 3 horizontes: 0–6, 6–12 y 12–24 meses."},
  ];

  return (
    <div style={{maxWidth:1060,margin:"0 auto",padding:"36px 36px 52px"}}>

      {/* ═══ HERO ═══ */}
      <div className="fade-up hover-lift" style={{
        borderRadius:24,marginBottom:22,overflow:"hidden",position:"relative",
        background:"linear-gradient(150deg,#C80F0A 0%,#E8251F 50%,#C01010 100%)",
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
              <em style={{color:"#FF6B6B",fontStyle:"italic"}}>Gestión de Inventarios</em>
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
            {icon:"🎯",bg:"#FEF2F1",bdr:"#FDDCDA",tc:"#B91A15",t:"Diagnóstico",      d:"Puntaje 1–5 por dimensión y sub-dimensión con radar y barras."},
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
          <div style={{position:"absolute",top:24,left:"9%",right:"9%",height:1,background:`linear-gradient(90deg,${T.redSoft},${T.red},${T.redDk},${T.red},${T.redSoft})`,zIndex:0}}/>
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
        background:`linear-gradient(135deg,${T.red},${T.redDk})`,
        padding:"36px 48px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,
        boxShadow:`0 16px 48px rgba(232,37,31,0.28)`,
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
function ModeloTab() {
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
        background:"linear-gradient(150deg,#A00D08 0%,#C81010 45%,#E8251F 100%)",
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
          }}>Las 7 Dimensiones y la<br/><em style={{color:"#FF9999",fontStyle:"italic"}}>Escala de Madurez</em></div>
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
          <div style={{flex:1,height:2,borderRadius:99,background:`linear-gradient(90deg,${T.redSoft},${T.red},${T.redDk})`}}/>
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
                border:`1.5px solid ${isOpen?T.red:T.borderSm}`,
                transition:"border-color .2s,box-shadow .2s",
                boxShadow:isOpen?"0 4px 20px rgba(232,37,31,0.1)":"0 1px 3px rgba(0,0,0,0.03)",
              }}>
                <div className="accordion-hd" onClick={()=>setOpen(isOpen?null:d.key)} style={{
                  display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",
                  background:isOpen?T.redXsoft:"#FAFAF8",
                }}>
                  <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{
                      width:42,height:42,borderRadius:12,
                      background:isOpen?T.redBg:T.borderSm,
                      border:`1.5px solid ${isOpen?T.redSoft:T.borderSm}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",flexShrink:0,
                    }}>
                      <span style={{fontSize:19}}>{d.icon}</span>
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:9,fontWeight:700,color:isOpen?T.red:T.inkSoft,letterSpacing:".1em",textTransform:"uppercase"}}>{d.num}</span>
                        <div className="display" style={{fontSize:13,fontWeight:700,color:isOpen?T.red:T.ink,transition:"color .15s"}}>{d.label}</div>
                      </div>
                      <div style={{fontSize:10,color:T.inkSoft}}>{d.sub}</div>
                    </div>
                  </div>
                  <div/>
                  <div style={{padding:"0 20px",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{textAlign:"center"}}>
                      <div className="display" style={{fontSize:22,fontWeight:900,color:isOpen?T.red:T.inkMid,lineHeight:1,transition:"color .15s"}}>{d.subs.length}</div>
                      <div style={{fontSize:8.5,color:T.inkSoft}}>sub-dim.</div>
                    </div>
                    <div style={{
                      width:26,height:26,borderRadius:"50%",
                      background:isOpen?T.redBg:T.borderSm,
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
                    }}>
                      <span style={{fontSize:14,color:isOpen?T.red:T.inkSoft,transform:isOpen?"rotate(90deg)":"none",display:"block",transition:"transform .22s",fontWeight:700,lineHeight:1}}>›</span>
                    </div>
                  </div>
                </div>
                {isOpen&&(
                  <div className="scale-in" style={{padding:"20px 22px",borderTop:`1px solid ${T.redSoft}`,background:T.card}}>
                    <p style={{fontSize:12.5,color:T.inkMid,lineHeight:1.8,margin:"0 0 18px"}}>{DESC[d.key]}</p>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                      {d.subs.map(s=>(
                        <div key={s.id} style={{background:T.redXsoft,borderRadius:10,padding:"12px 12px",border:`1px solid ${T.redSoft}`}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:4,lineHeight:1.35}}>{s.label}</div>
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
function SummaryTab({answers, perfil}) {
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

      {/* BOTÓN DESCARGA */}
      <div className="fade-up" style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={descargarExcel} className="btn-red" style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"10px 22px",borderRadius:11,border:"none",
          background:`linear-gradient(135deg,${T.red},${T.redDk})`,
          color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",
          boxShadow:`0 4px 14px rgba(232,37,31,0.3)`,
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
            <div className="display" style={{fontSize:58,fontWeight:900,color:T.red,letterSpacing:"-.04em",lineHeight:1,marginBottom:4}}><CountUp to={parseFloat(globalScore)} decimals={1} duration={900}/></div>
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
                    <Radar dataKey="value" stroke={T.red} fill={T.red} fillOpacity={0.1} strokeWidth={2.5}/>
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
            <div style={{width:38,height:38,borderRadius:11,background:T.redBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18}}>🗺️</span></div>
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
function ScrollIndicator({ scrollRef }) {
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
        border:`1.5px solid ${T.redSoft}`,
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
          color:T.red,
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
          <path d="M8 1v16M1 11l7 8 7-8" stroke={T.red} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
export default function App() {
  const [answers,setAnswers] = useState(emptyAnswers);
  const [perfil,setPerfil] = useState(null);
  const [showPerfil,setShowPerfil] = useState(false);
  const [showRegistro,setShowRegistro] = useState(true);
  const [activeDim,setActiveDim] = useState(0);
  const [activeSub,setActiveSub] = useState(0);
  const [view,setView] = useState("intro");
  const [isFullscreen,setIsFullscreen] = useState(false);
  const appRef = useRef(null);
  const introScrollRef = useRef(null);
  const modeloScrollRef = useRef(null);
  const summaryScrollRef = useRef(null);
  const assessScrollRef = useRef(null);

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

  // ─── GUARDAR EN SUPABASE AL LLEGAR AL RESUMEN ────────────────────────────
  const guardadoRef = useRef(false);
  useEffect(() => {
    if (view === "summary" && !guardadoRef.current) {
      guardadoRef.current = true;
      guardarEvaluacion(answers, perfil || {});
    }
    if (view !== "summary") guardadoRef.current = false;
  }, [view]);

  const dim=DIMS[activeDim];
  const sub=dim.subs[activeSub];
  const setVal=(id,v)=>setAnswers(p=>({...p,[id]:v}));

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
          <Logo h={24}/>
          <div style={{width:1,height:28,background:T.borderSm}}/>
          <div>
            <div className="display" style={{fontSize:12,fontWeight:700,color:T.ink,letterSpacing:"-.01em"}}>Modelo de Madurez · Gestión de Inventarios</div>
            <div style={{fontSize:9.5,color:T.inkSoft}}>SoE · Telco Retail B2B/B2C · {totalQ} sub-dimensiones</div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {totalScore&&(
            <div style={{
              display:"flex",alignItems:"center",gap:8,
              padding:"5px 14px",background:T.redXsoft,
              borderRadius:99,border:`1px solid ${T.redSoft}`,
            }}>
              <span style={{fontSize:10,color:T.inkMid,fontWeight:500}}>Global</span>
              <span className="display" style={{fontSize:18,fontWeight:900,color:T.red}}>{totalScore}</span>
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
                color:view===t.id?T.ink:T.inkMid,
                fontWeight:view===t.id?700:500,
                fontSize:11,cursor:"pointer",
                boxShadow:view===t.id?"0 2px 6px rgba(0,0,0,0.09)":"none",
                whiteSpace:"nowrap",
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <button onClick={toggleFullscreen} title={isFullscreen?"Salir de pantalla completa":"Pantalla completa"} style={{
            width:34,height:34,borderRadius:9,border:`1px solid ${T.borderSm}`,
            background:isFullscreen?T.redXsoft:T.card,
            color:isFullscreen?T.red:T.inkMid,
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:14,flexShrink:0,
            transition:"all .15s",
          }}>{isFullscreen?"⊠":"⛶"}</button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      {view==="intro"    &&<div ref={introScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><IntroTab onNavigate={(v)=>{if(v==="registro"){setShowRegistro(true);}else{setView(v);}}}/><ScrollIndicator scrollRef={introScrollRef}/></div>}
      {showRegistro&&<RegistroForm onStart={(p)=>{setPerfil(p);setShowRegistro(false);}}/>}
      {view==="modelo"   &&<div ref={modeloScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><ModeloTab/><ScrollIndicator scrollRef={modeloScrollRef}/></div>}
      {view==="summary"  &&<div ref={summaryScrollRef} style={{flex:1,overflow:"auto",position:"relative"}}><SummaryTab answers={answers} perfil={perfil}/><ScrollIndicator scrollRef={summaryScrollRef}/></div>}

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
                <span className="display" style={{fontSize:14,fontWeight:900,color:T.red}}>{pct}%</span>
              </div>
              <div style={{height:5,background:T.borderSm,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${T.red},#FF6B6B)`,borderRadius:99,transition:"width .5s cubic-bezier(.22,1,.36,1)"}}/>
              </div>
              <div style={{fontSize:9,color:T.inkSoft,marginTop:5}}>{answered}/{totalQ} resp. · {completedDims}/7 dims</div>
            </div>

            {DIMS.map((d,i)=>{
              const sc=getDimScore(d,answers);
              const active=i===activeDim;
              return (
                <div key={d.key}>
                  <button className="sidebar-item" onClick={()=>{setActiveDim(i);setActiveSub(0);}} style={{
                    width:"100%",textAlign:"left",padding:"10px 14px",
                    background:active?"#FFF8F7":"transparent",
                    borderLeft:`3px solid ${active?T.red:"transparent"}`,
                    border:"none",borderBottom:`1px solid ${T.borderSm}`,
                    cursor:"pointer",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:15}}>{d.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10.5,fontWeight:active?700:500,color:active?T.red:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.num} {d.label}</div>
                        <div style={{fontSize:8.5,color:T.inkSoft,marginTop:1}}>{d.subs.filter(s=>answers[s.id]>0).length}/{d.subs.length} evaluadas</div>
                      </div>
                      {sc&&<span className="display" style={{fontSize:12,fontWeight:900,color:getLv(Math.round(sc)).c,flexShrink:0}}>{sc}</span>}
                    </div>
                  </button>
                  {active&&(
                    <div style={{paddingLeft:30,paddingBottom:6,background:"#FFFAF9"}}>
                      {d.subs.map((s,j)=>(
                        <button key={s.id} onClick={()=>setActiveSub(j)} style={{
                          display:"block",width:"100%",textAlign:"left",
                          padding:"4px 10px",borderRadius:7,border:"none",
                          background:j===activeSub?"#FFF1F0":"transparent",cursor:"pointer",marginBottom:1,
                        }}>
                          <span style={{fontSize:9.5,fontWeight:j===activeSub?700:400,color:j===activeSub?T.red:answers[s.id]?getLv(answers[s.id]).text:T.inkSoft}}>
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
                background:T.redBg,border:`1.5px solid ${T.redSoft}`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>
                <span style={{fontSize:23}}>{dim.icon}</span>
              </div>
              <div style={{flex:1}}>
                <div className="display" style={{fontSize:18,fontWeight:900,color:T.ink,letterSpacing:"-.02em"}}>{dim.num}. {dim.label}</div>
                <div style={{fontSize:11,color:T.inkSoft,marginTop:2}}>{dim.sub}</div>
              </div>
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
                  border:`1.5px solid ${j===activeSub?T.red:answers[s.id]?getLv(answers[s.id]).border:T.borderSm}`,
                  background:j===activeSub?T.red:answers[s.id]?getLv(answers[s.id]).bg:T.card,
                  color:j===activeSub?"#fff":answers[s.id]?getLv(answers[s.id]).text:T.inkMid,
                  fontSize:10.5,fontWeight:j===activeSub?700:500,
                  whiteSpace:"nowrap",cursor:"pointer",
                  boxShadow:j===activeSub?`0 3px 10px rgba(232,37,31,0.3)`:"none",
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
                <div>
                  <div className="display" style={{fontSize:16,fontWeight:800,color:T.ink,letterSpacing:"-.015em",marginBottom:5}}>{sub.label}</div>
                  <div style={{fontSize:12,color:T.inkMid}}>{sub.desc}</div>
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
                else if(activeDim>0){setActiveDim(activeDim-1);setActiveSub(DIMS[activeDim-1].subs.length-1);}
              }} disabled={activeDim===0&&activeSub===0} style={{
                padding:"10px 22px",borderRadius:12,
                border:`1.5px solid ${T.borderSm}`,background:T.card,
                color:T.inkMid,fontWeight:600,fontSize:12,cursor:"pointer",
                opacity:(activeDim===0&&activeSub===0)?.4:1,transition:"all .15s",
              }}>← Anterior</button>
              <div style={{fontSize:10.5,color:T.inkSoft}}>{dim.num} · {activeSub+1}/{dim.subs.length}</div>
              <button className="btn-red" onClick={()=>{
                if(activeSub<dim.subs.length-1)setActiveSub(activeSub+1);
                else if(activeDim<DIMS.length-1){setActiveDim(activeDim+1);setActiveSub(0);}
                else setView("summary");
              }} style={{
                padding:"10px 24px",borderRadius:12,border:"none",
                background:`linear-gradient(135deg,${T.red},${T.redDk})`,
                color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",
                boxShadow:`0 4px 14px rgba(232,37,31,0.35)`,
              }}>{activeDim===DIMS.length-1&&activeSub===dim.subs.length-1?"Ver Resumen →":"Siguiente →"}</button>
            </div>

            <ScrollIndicator scrollRef={assessScrollRef}/>
          </main>
        </div>
      )}


      {showPerfil && <PerfilModal onStart={(p)=>{ setPerfil(p); setShowPerfil(false); setView("assessment"); }} />}

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
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
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
                  background: t.id===view ? T.red : T.borderSm,
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
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
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
