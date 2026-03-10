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
const DIRECCIONES = [
  "Supply Chain","Ingeniería","Implementación","OyM","UMM","UMC",
];
const ROLES = [
  "Director","Gerente","Jefe","Ingeniero","Analista",
];

// ─── INDUSTRY QUESTIONS ──────────────────────────────────────────────────────
const INDUSTRY_QUESTIONS = {
  "Telecomunicaciones": {},
  "Farmacéutica": {
    "e1":  {q:"¿En qué nivel se encuentran los trade-offs entre nivel de servicio, costo de inventario y capital de trabajo considerando restricciones regulatorias (BPM, serialización)?",label:"Objetivos & trade-offs regulatorios",desc:"Servicio, costo, BPM, cadena de frío"},
    "e2":  {q:"¿En qué nivel están las políticas de inventario diferenciadas por tipo de producto: medicamentos controlados, OTC, dispositivos médicos y materias primas?",label:"Políticas por categoría farmacéutica",desc:"Controlados, OTC, dispositivos, materias primas"},
    "e3":  {q:"¿En qué nivel está el diseño de red considerando cadena de frío, bodegas habilitadas y puntos de dispensación (farmacias, hospitales, IPS)?",label:"Red con cadena de frío",desc:"Bodegas frío, hospitales, IPS, farmacias"},
    "c1":  {q:"¿En qué nivel está la segmentación del portafolio por criticidad clínica, rotación (ABC) y variabilidad de demanda (XYZ) considerando productos de vida corta?",label:"Segmentación por criticidad clínica",desc:"ABC/XYZ, vida útil, controlados"},
    "c2":  {q:"¿En qué nivel está la trazabilidad de lotes, fechas de vencimiento, número de serie y condiciones de temperatura en toda la cadena?",label:"Trazabilidad y serialización",desc:"Lotes, vencimientos, DSCSA, INVIMA"},
    "c3":  {q:"¿En qué nivel está la gestión del ciclo de vida considerando productos con fecha de vencimiento corta, recalls y retiro de mercado?",label:"Gestión de vencimientos y recalls",desc:"FEFO, recalls, retiro de mercado"},
    "c4":  {q:"¿En qué nivel está la visibilidad de inventario en centros de distribución propios, operadores logísticos 3PL y puntos de dispensación hospitalarios?",label:"Inventario en red hospitalaria",desc:"CD propio, 3PL, hospitales, clínicas"},
    "h3":  {q:"¿En qué nivel está la trazabilidad end-to-end con serialización (DSCSA/INVIMA), control de temperatura IoT y track & trace hasta el punto de dispensación?",label:"Serialización y cold chain IoT",desc:"DSCSA, INVIMA, IoT temperatura"},
    "p3":  {q:"¿En qué nivel están los procesos de almacenamiento bajo BPM, picking FEFO y control de cadena de frío?",label:"Almacenamiento BPM y FEFO",desc:"BPM, BPD, FEFO, cadena de frío"},
    "p5":  {q:"¿En qué nivel están los procesos de gestión de devoluciones, destrucción de producto vencido y manejo de recalls con trazabilidad completa?",label:"Devoluciones y destrucción regulatoria",desc:"Recalls, destrucción, INVIMA"},
    "ab1": {q:"¿En qué nivel está la gestión de inventario de medicamentos de alto costo y biotecnológicos, con control de condiciones especiales y acceso restringido?",label:"Medicamentos alto costo y biotecnológicos",desc:"Alto costo, biológicos, cadena frío"},
    "ab2": {q:"¿En qué nivel está la gestión de dispositivos médicos, implantes y equipos de diagnóstico incluyendo vida útil, calibración y retiro de mercado?",label:"Dispositivos médicos e implantes",desc:"Dispositivos, implantes, calibración"},
    "ab3": {q:"¿En qué nivel está la gestión de medicamentos OTC, genéricos y vitaminas con modelo de alta rotación y gestión de vencimientos masiva?",label:"OTC, genéricos y vitaminas",desc:"OTC, genéricos, alta rotación, multicanal"},
    "ab4": {q:"¿En qué nivel está la gestión de materias primas e insumos de manufactura farmacéutica incluyendo control de proveedores calificados y cuarentena?",label:"Materias primas farmacéuticas",desc:"API, excipientes, proveedores calificados"},
    "ab5": {q:"¿En qué nivel está la gestión de producto devuelto, vencido y en cuarentena incluyendo procesos de destrucción certificada?",label:"Devoluciones y destrucción certificada",desc:"Cuarentena, destrucción, INVIMA"},
    "i1":  {q:"¿En qué nivel están los indicadores de disponibilidad de medicamentos críticos, nivel de desabastecimiento y cumplimiento de pedidos hospitalarios?",label:"Disponibilidad y desabastecimiento",desc:"Fill rate, desabasto, hospitales"},
    "i5":  {q:"¿En qué nivel está el cumplimiento regulatorio (INVIMA, BPD, serialización), auditorías de calidad y gestión de riesgos de la cadena farmacéutica?",label:"Cumplimiento INVIMA y BPD",desc:"INVIMA, BPD, auditorías, recalls"},
  },
  "Oil & Gas": {
    "e1":  {q:"¿En qué nivel están los trade-offs entre disponibilidad de partes críticas para operaciones upstream/downstream, costo de inventario y riesgo operacional?",label:"Disponibilidad vs costo operacional",desc:"Uptime, piezas críticas, OPEX/CAPEX"},
    "e2":  {q:"¿En qué nivel están las políticas de inventario diferenciadas por criticidad: partes de seguridad, repuestos MRO, consumibles y materiales de proyecto?",label:"Políticas por criticidad operacional",desc:"Seguridad, MRO, consumibles, proyectos"},
    "e3":  {q:"¿En qué nivel está el diseño de la red considerando ubicación en campos, plantas, offshore y centros de distribución regionales?",label:"Red en campos y plantas",desc:"Campos, offshore, plantas, almacenes regionales"},
    "e5":  {q:"¿En qué nivel está la gestión de riesgos incluyendo proveedores únicos, materiales peligrosos y contingencias operacionales?",label:"Resiliencia y materiales peligrosos",desc:"HAZMAT, proveedor único, contingencias"},
    "c1":  {q:"¿En qué nivel está la clasificación de materiales MRO por criticidad operacional (ABCDE), impacto en uptime y lead time de reposición?",label:"Criticidad operacional y uptime",desc:"Criticidad, uptime, lead time MRO"},
    "c2":  {q:"¿En qué nivel está el control de materiales peligrosos (HAZMAT), materiales con vida útil limitada y equipos con número de serie para trazabilidad de mantenimiento?",label:"HAZMAT, vida útil y trazabilidad",desc:"HAZMAT, SDS, vida útil, mantenimiento"},
    "c3":  {q:"¿En qué nivel está la gestión de materiales obsoletos por cambios tecnológicos, equipos fuera de soporte y repuestos de activos dados de baja?",label:"Obsolescencia de activos y repuestos",desc:"Obsolescencia, equipos EOL, activos"},
    "c4":  {q:"¿En qué nivel está la visibilidad de inventario en campos, plantas, almacenes offshore, consignación en proveedores y materiales en tránsito internacional?",label:"Visibilidad en campos y offshore",desc:"Campos, offshore, consignación, tránsito"},
    "p1":  {q:"¿En qué nivel está la planificación de inventario MRO basada en planes de mantenimiento preventivo (PM), historial de fallas y criticidad de equipos?",label:"Planeación MRO basada en mantenimiento",desc:"PM, CMMS, historial fallas, criticidad"},
    "p3":  {q:"¿En qué nivel están los procesos de recepción, almacenamiento y despacho de materiales peligrosos, equipos de gran porte y materiales de proyecto en campo?",label:"Operaciones con HAZMAT y gran porte",desc:"HAZMAT, gran porte, materiales proyecto"},
    "p4":  {q:"¿En qué nivel está el control de inventario físico en ubicaciones remotas, almacenes de campo y reconciliación con activos en mantenimiento?",label:"Control en ubicaciones remotas",desc:"Campos remotos, activos, reconciliación"},
    "h1":  {q:"¿En qué nivel está la integración entre ERP, CMMS (SAP PM/Maximo) y sistemas de compras para la gestión del ciclo completo de materiales MRO?",label:"ERP-CMMS-Compras integrados",desc:"SAP PM, Maximo, integración MRO"},
    "ab1": {q:"¿En qué nivel está la gestión de repuestos críticos de producción (bombas, válvulas, compresores) con estrategias de spare parts y acuerdos con OEM?",label:"Repuestos críticos de producción",desc:"Bombas, válvulas, compresores, OEM"},
    "ab2": {q:"¿En qué nivel está la gestión de materiales e insumos de operación (chemicals, lubricantes, catalizadores) con control de condiciones de almacenamiento?",label:"Chemicals, lubricantes y catalizadores",desc:"Chemicals, lubricantes, catalizadores"},
    "ab3": {q:"¿En qué nivel está la gestión de consumibles MRO de alto volumen (herramientas, EPP, filtros, empaques) con contratos marco y reposición automática?",label:"MRO consumibles y EPP",desc:"Herramientas, EPP, filtros, contratos marco"},
    "ab4": {q:"¿En qué nivel está la gestión de materiales de proyectos de capital (CAPEX) incluyendo planificación de largo plazo, importaciones y materiales de entrega larga?",label:"Materiales de proyectos CAPEX",desc:"CAPEX, long-lead, importaciones"},
    "ab5": {q:"¿En qué nivel está la gestión de materiales reparables, reacondicionados y surplus incluyendo procesos de reparación, disposición y recuperación de valor?",label:"Reparables, surplus y disposición",desc:"Reparables, surplus, disposición HAZMAT"},
    "i1":  {q:"¿En qué nivel están los indicadores de disponibilidad de materiales críticos, impacto en uptime de producción y costo de paradas no planificadas?",label:"Uptime y costo de paradas",desc:"Uptime, paradas, costo producción perdida"},
    "i5":  {q:"¿En qué nivel está el cumplimiento de regulaciones HSE (materiales peligrosos, disposición, transporte) y auditorías de seguridad en la cadena?",label:"Cumplimiento HSE y seguridad",desc:"HSE, HAZMAT, transporte, auditorías"},
  },
  "Manufactura": {
    "e1":  {q:"¿En qué nivel están los trade-offs entre nivel de servicio al cliente, costo de inventario de materias primas/WIP/producto terminado y capital de trabajo en el ciclo productivo?",label:"Trade-offs en ciclo productivo",desc:"MP, WIP, PT, capital de trabajo"},
    "e2":  {q:"¿En qué nivel están las políticas de inventario diferenciadas por etapa productiva (MP, WIP, PT) y canal (B2B, distribuidores, exportación)?",label:"Políticas por etapa y canal",desc:"MP, WIP, PT, B2B, exportación"},
    "e3":  {q:"¿En qué nivel está el diseño de la red considerando plantas de producción, centros de distribución, almacenes de tránsito y puntos de entrega a clientes industriales?",label:"Red planta-CD-cliente industrial",desc:"Plantas, CD, almacenes, clientes B2B"},
    "c1":  {q:"¿En qué nivel está la segmentación del portafolio de SKUs por volumen (ABC), variabilidad (XYZ) y etapa productiva para definir estrategias de producción?",label:"Segmentación SKU por etapa productiva",desc:"ABC/XYZ, make-to-stock vs make-to-order"},
    "c2":  {q:"¿En qué nivel está el control de lotes de producción, materias primas con certificados de calidad y trazabilidad en el proceso productivo?",label:"Trazabilidad productiva y calidad",desc:"Lotes producción, certificados, QC"},
    "c3":  {q:"¿En qué nivel está la gestión del ciclo de vida del producto considerando lanzamientos, cambios de versión, descontinuaciones y obsolescencia de MP y PT?",label:"Ciclo de vida y obsolescencia",desc:"NPL, descontinuados, MP obsoleta, PT SLOB"},
    "p1":  {q:"¿En qué nivel está la planificación integrada de producción e inventario (MPS/MRP) sincronizada con la demanda del cliente y los planes de capacidad?",label:"MPS/MRP integrado con demanda",desc:"MPS, MRP, capacidad, demanda"},
    "p2":  {q:"¿En qué nivel está la gestión de asignación de producción y PT entre múltiples plantas, clientes y canales con visibilidad de capacidad disponible?",label:"Asignación multicanal y multiplanta",desc:"ATP, capacidad, multicanal, exportación"},
    "p3":  {q:"¿En qué nivel están los procesos de almacenamiento de MP, WIP y PT incluyendo condiciones especiales y FIFO/FEFO?",label:"Almacenamiento MP, WIP y PT",desc:"MP, WIP, PT, condiciones, FIFO/FEFO"},
    "h1":  {q:"¿En qué nivel está la integración entre ERP, sistemas MES de planta, WMS y plataformas de planificación para visibilidad end-to-end del ciclo productivo?",label:"ERP-MES-WMS integrados",desc:"ERP, MES, WMS, integración productiva"},
    "ab1": {q:"¿En qué nivel está la gestión de materias primas e insumos directos de producción incluyendo planificación por MRP, proveedores alternativos y lead times?",label:"Materias primas e insumos directos",desc:"MRP, proveedores, lead times, calidad"},
    "ab2": {q:"¿En qué nivel está la gestión de materiales de empaque y envase (primario, secundario, terciario) sincronizada con los planes de producción?",label:"Materiales de empaque y envase",desc:"Empaque primario, secundario, terciario"},
    "ab3": {q:"¿En qué nivel está la gestión de MRO industrial (repuestos de planta, herramientas, consumibles) para garantizar continuidad de producción?",label:"MRO industrial y repuestos planta",desc:"Repuestos, herramientas, consumibles planta"},
    "ab4": {q:"¿En qué nivel está la gestión del portafolio de productos terminados incluyendo gestión de variantes, SKU proliferation y simplificación?",label:"Portafolio PT y gestión de variantes",desc:"SKUs, variantes, proliferación, simplificación"},
    "ab5": {q:"¿En qué nivel está la gestión de devoluciones de PT, reprocesos, producto no conforme y gestión de merma y scrap productivo?",label:"Devoluciones, reproceso y scrap",desc:"Devoluciones, no conforme, scrap, merma"},
    "i2":  {q:"¿En qué nivel están los indicadores de eficiencia del ciclo productivo: rotación de MP/WIP/PT, días de inventario en cada etapa y costo de inventario sobre ventas?",label:"Rotación MP, WIP y PT",desc:"DIO por etapa, rotación, costo/ventas"},
  },
  "CPG": {
    "e1":  {q:"¿En qué nivel están los trade-offs entre nivel de servicio al retail/e-commerce, costo de inventario y capital de trabajo considerando alta estacionalidad y promociones?",label:"Trade-offs con estacionalidad y promo",desc:"Servicio retail, estacionalidad, promociones"},
    "e2":  {q:"¿En qué nivel están las políticas de inventario diferenciadas por canal (supermercados, canal tradicional, e-commerce, exportación) y categoría (perecederos, no perecederos)?",label:"Políticas por canal y categoría",desc:"Retail, tradicional, e-com, perecederos"},
    "e3":  {q:"¿En qué nivel está el diseño de la red de distribución considerando CEDIS del retail, dark stores y entrega directa a tienda (DSD)?",label:"Red con CEDIS y DSD",desc:"CEDIS, DSD, dark stores, regional"},
    "e4":  {q:"¿En qué nivel está la colaboración S&OP con los principales clientes retail (ECR/CPFR) para sincronizar pronósticos, promociones y reposición?",label:"S&OP colaborativo con retail",desc:"ECR, CPFR, joint forecast, VMI"},
    "c1":  {q:"¿En qué nivel está la segmentación del portafolio por velocidad (ABC), variabilidad (XYZ), ciclo de vida y canal para definir estrategias diferenciadas?",label:"Segmentación por velocidad y canal",desc:"ABC/XYZ, estacionalidad, canal, ciclo vida"},
    "c2":  {q:"¿En qué nivel está el control de lotes, fechas de vencimiento (FEFO), condiciones de almacenamiento y trazabilidad hasta el punto de venta para recall efectivo?",label:"Trazabilidad y gestión FEFO",desc:"Lotes, vencimientos, FEFO, trazabilidad retail"},
    "c3":  {q:"¿En qué nivel está la gestión del ciclo de vida del SKU considerando lanzamientos, extensiones de línea, descontinuaciones, liquidación e inventario SLOB?",label:"Ciclo de vida SKU y liquidación",desc:"NPL, extensiones, descontinuados, liquidación"},
    "p1":  {q:"¿En qué nivel está la planificación de demanda considerando estacionalidad, efectos promocionales, nuevos lanzamientos y colaboración con clientes clave?",label:"Demand planning con estacionalidad y promo",desc:"Estacionalidad, promo, colaboración, error"},
    "p2":  {q:"¿En qué nivel está la asignación de producto entre canales (retail, canal tradicional, e-commerce, exportación) en situaciones de escasez?",label:"Asignación multicanal en escasez",desc:"ATP, priorización canal, escasez"},
    "p3":  {q:"¿En qué nivel están los procesos de almacenamiento con FEFO, manejo de temperatura controlada, gestión de merma y operaciones de cross-docking para retail?",label:"FEFO, temperatura y cross-docking",desc:"FEFO, temperatura, merma, cross-docking"},
    "h1":  {q:"¿En qué nivel está la integración entre ERP, sistemas de demand planning (IBP/Kinaxis/o9), WMS y plataformas EDI con clientes retail?",label:"ERP-DPL-WMS-EDI integrados",desc:"ERP, IBP, WMS, EDI retail, e-commerce"},
    "h4":  {q:"¿En qué nivel están las capacidades analíticas para gestión de demanda (ML forecast), optimización de inventario multiescalón y análisis de rentabilidad por SKU/canal?",label:"Analítica avanzada de demanda e inventario",desc:"ML forecast, optimización, rentabilidad SKU"},
    "ab1": {q:"¿En qué nivel está la gestión del portafolio de alta rotación con reposición automática, VMI y colaboración con retail?",label:"Productos alta rotación y VMI",desc:"Alta rotación, VMI, reposición automática"},
    "ab2": {q:"¿En qué nivel está la gestión de productos de temporada (navidad, escolar, verano) con planificación anticipada, precompras y liquidación al cierre?",label:"Gestión de temporadas y precompras",desc:"Temporadas, precompras, liquidación"},
    "ab3": {q:"¿En qué nivel está la gestión de materiales de empaque y materias primas con consolidación de proveedores y gestión de variantes por mercado?",label:"Materias primas y empaque CPG",desc:"MP, empaque, consolidación, variantes"},
    "ab4": {q:"¿En qué nivel está la gestión del portafolio de SKUs incluyendo análisis de rentabilidad, racionalización de variantes y gestión de innovación vs core?",label:"Portafolio SKU y racionalización",desc:"Rentabilidad, racionalización, innovación"},
    "ab5": {q:"¿En qué nivel está la gestión de devoluciones del canal retail, producto vencido, merma en punto de venta y procesos de disposición o donación?",label:"Devoluciones retail y merma PDV",desc:"Devoluciones retail, vencidos, merma, donación"},
    "i1":  {q:"¿En qué nivel están los indicadores de nivel de servicio al retail: OTIF, fill rate por canal, OOS en punto de venta y efectividad de promociones?",label:"OTIF, fill rate y OOS retail",desc:"OTIF, fill rate canal, OOS, promo"},
    "i4":  {q:"¿En qué nivel están los indicadores de salud del inventario: días de inventario por canal, % SLOB, merma, vencimientos y costo de liquidación?",label:"Salud inventario y merma canal",desc:"DIO canal, SLOB, merma, vencidos, liquidación"},
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
      const industryDefaults = INDUSTRY_QUESTIONS[data.industria] || {};
      const subsMap = {};
      // First apply industry defaults
      Object.entries(industryDefaults).forEach(([sub_id, vals]) => {
        subsMap[sub_id] = { q: vals.q, label: vals.label, desc: vals.desc };
      });
      // Then overlay manual overrides from DB (higher priority)
      (subs||[]).forEach(s => {
        subsMap[s.sub_id] = {
          q:     s.q     || subsMap[s.sub_id]?.q     || "",
          label: s.label || subsMap[s.sub_id]?.label || "",
          desc:  s.descripcion || subsMap[s.sub_id]?.desc || "",
        };
      });
      onSuccess(data, subsMap);
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

function RegistroForm({onStart, color=T.red, colorDk=T.redDk}) {
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
          {sel(dir,setDir,DIRECCIONES)}
        </div>

        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inkSoft,textTransform:"uppercase",
            letterSpacing:".1em",marginBottom:10}}>Rol</div>
          {sel(rol,setRol,ROLES)}
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
  const [empresa, setEmpresa]       = useState(null);
  const [subsCustom, setSubsCustom]   = useState({});
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
  useEffect(() => {
    if (view === "summary" && !guardadoRef.current) {
      guardadoRef.current = true;
      guardarEvaluacion(answers, perfil || {});
    }
    if (view !== "summary") guardadoRef.current = false;
  }, [view]);

  const EC  = empresa?.color_primary || T.red;
  const ECD = empresa?.color_dark    || T.redDk;

  const EDIMS = React.useMemo(() => DIMS.map(d=>({
    ...d,
    subs: d.subs.map(s => {
      const c = subsCustom[s.id];
      return c ? { ...s, q:c.q||s.q, label:c.label||s.label, desc:c.desc||s.desc } : s;
    }),
  })), [subsCustom]);

  const dim=EDIMS[activeDim];
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

  // ── Empresa gate — after ALL hooks ─────────────────────────────────────────
  if (!empresa) return (
    <CodigoAccesoScreen onSuccess={(emp, subs) => {
      setEmpresa(emp);
      setSubsCustom(subs);
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
      {showRegistro&&<RegistroForm color={EC} colorDk={ECD} onStart={(p)=>{setPerfil({...p,empresa_id:empresa?.id});setShowRegistro(false);}}/>}
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
