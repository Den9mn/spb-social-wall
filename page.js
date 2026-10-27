
const NUM=['inversion_eur','impresiones','clics','clics_landing','clics_pagina','seguidores','interacciones','reacciones','comentarios','compartidos','visualizaciones_video'];

dash.calc('obj_red',{inputs:['obj_seguidores','li_diario','ig_diario'],title:'Avance hacia el objetivo de seguidores por red',description:'Hoy = conseguidos a 30 sep (seguimiento del equipo SPB) + crecimiento neto desde el 30 sep (Metricool: seguidores del último día − seguidores del 30 sep). TikTok y YouTube no tienen dato diario: se queda la cifra a 30 sep. Faltan = objetivo − hoy; avance = hoy ÷ objetivo.',
  fn:(obj_seguidores,li_diario,ig_diario)=>{const serie={LinkedIn:li_diario,Instagram:ig_diario};
    return obj_seguidores.map((r)=>{const o=Number(r.objetivo_anual),c=Number(r.conseguidos);
      const s=(serie[r.red]||[]).filter((d)=>d.seguidores!==''&&d.seguidores!=null).sort((a,b)=>a.fecha<b.fecha?-1:1);
      const base=s.find((d)=>d.fecha==='2026-09-30'),last=s[s.length-1];const desde=base&&last?Number(last.seguidores)-Number(base.seguidores):null;const hoy=c+(desde||0);
      return {red:r.red,a_30sep:c,desde_30sep:desde,hoy,dato_hasta:desde==null?'2026-09-30':last.fecha,faltan:Math.max(o-hoy,0),avance:o?hoy/o:null};});}});
dash.calc('obj_total',{inputs:['obj_seguidores','obj_red','obj_presupuesto'],title:'Objetivo de seguidores: total',description:'Suma de las redes con la cifra de hoy; avance = hoy ÷ objetivo; presupuesto al mes = presupuesto Q4 ÷ meses.',
  fn:(obj_seguidores,obj_red,obj_presupuesto)=>{const o=obj_seguidores.reduce((t,r)=>t+Number(r.objetivo_anual),0),c=obj_red.reduce((t,r)=>t+r.hoy,0);const b=obj_presupuesto[0]||{};
    return {objetivo:o,conseguidos:c,faltan:o-c,avance:c/o,restante:(o-c)/o,hasta:obj_red.map((r)=>r.dato_hasta).sort().pop(),presupuesto_mes:Number(b.importe_eur)/Number(b.meses)};}});
dash.calc('ig_ritmo',{inputs:['ig_diario','obj_red'],title:'Instagram: ritmo semanal frente al necesario',
  description:'Crecimiento neto por semana ISO completa = seguidores del último día de la semana − seguidores del último día de la semana anterior (Metricool). Ritmo necesario = seguidores que faltan para el objetivo anual ÷ semanas que quedan entre el último dato y el 31 de diciembre de 2026.',
  fn:(ig_diario,obj_red)=>{const wk=(d)=>{const t=new Date(d+'T00:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));const w=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return y+'-W'+String(w).padStart(2,'0');};
    const s=ig_diario.filter((r)=>r.seguidores!==''&&r.seguidores!=null).sort((a,b)=>a.fecha<b.fecha?-1:1);const m=new Map();
    for(const r of s){const k=wk(r.fecha);let g=m.get(k);if(!g){g={semana:k,inicio:r.fecha,fin:r.fecha,dias:0,ultimo:0};m.set(k,g);}g.fin=r.fecha;g.dias+=1;g.ultimo=Number(r.seguidores);}
    const w=[...m.values()].sort((a,b)=>a.semana<b.semana?-1:1);const rows=[];for(let i=1;i<w.length;i++)if(w[i].dias===7)rows.push({semana:w[i].semana,inicio:w[i].inicio,netos:w[i].ultimo-w[i-1].ultimo,completa:true});
    const ig=obj_red.find((r)=>r.red==='Instagram')||{};const hasta=ig.dato_hasta||s[s.length-1].fecha;const sem=(Date.parse('2026-12-31T00:00:00Z')-Date.parse(hasta+'T00:00:00Z'))/864e5/7;
    return {rows,faltan:ig.faltan,hasta,semanas_restantes:sem,necesario:sem>0?ig.faltan/sem:null};}});

/* ---------- empresas comprometidas ---------- */
const EMP_SIN_EMPRESA=new Set(['Profesional Independiente','Profesional independiente','Independiente / Freelance','Independiente','Independent','Freelance | Self-Employed','Autônoma','Autónomo',
  'Consultório Particular','Consultório particular','Consultorio Psicológico privado','Escritório de Advocacia','Escritório Particular de Advocacia','estudio juridico',
  'Consultoria Independente','Professor particular de informática','Board Member','Em busca de novas desafios']);
const EMP_MIN_IMPR=13,EMP_ALTO=0.15,EMP_MUY_ALTO=0.35;
const NIVELES=['Muy alto','Alto','Medio','Bajo','Sin calificar'];
const EMP_GRUPO=new Set(['Getnet','F1RST Digital Services']); // filiales del grupo Santander sin «Santander» en el nombre
const empMotivo=(n)=>EMP_SIN_EMPRESA.has(n)?'Sin empresa':(/santander/i.test(n)||EMP_GRUPO.has(n))?'Grupo Santander':/^\d{5,}$/.test(n)?'Sin nombre':'';
dash.calc('empresas',{inputs:['empresas_ads'],title:'Nivel de compromiso por empresa',
  description:'Tasa = interacciones paid ÷ impresiones paid. Media = tasa del conjunto de empresas no excluidas. Muy alto: tasa ≥ 35 %; Alto: 15–35 % (en la tabla de Campaign Manager de referencia, todas las empresas calificadas «Alto» tenían entre un 16 % y un 33 %); Medio: entre la media y el 15 %; Bajo: por debajo de la media; Sin calificar: menos de 13 impresiones (la cifra mínima con nivel en la tabla de referencia). Se excluyen perfiles sin empresa, empresas del grupo Santander y empresas sin nombre.',
  fn:(empresas_ads)=>{const rows=empresas_ads.map((r)=>({empresa:r.empresa,impresiones:Number(r.impresiones),clics:Number(r.clics),interacciones:Number(r.interacciones),motivo:empMotivo(r.empresa)}));
    const k=rows.filter((r)=>!r.motivo);const media=d3.sum(k,(r)=>r.interacciones)/d3.sum(k,(r)=>r.impresiones);
    return rows.map((r)=>{const tasa=r.impresiones?r.interacciones/r.impresiones:null;
      const nivel=r.motivo?'':r.impresiones<EMP_MIN_IMPR?'Sin calificar':tasa>=EMP_MUY_ALTO?'Muy alto':tasa>=EMP_ALTO?'Alto':tasa>=media?'Medio':'Bajo';
      return {...r,tasa,nivel,media};});}});
dash.calc('empresas_tot',{inputs:['empresas'],title:'Empresas comprometidas: totales',description:'Recuento de empresas por nivel y de exclusiones; interacciones de las empresas con nivel alto o muy alto.',
  fn:(empresas)=>{const k=empresas.filter((r)=>!r.motivo);const c=(n)=>k.filter((r)=>r.nivel===n).length;const ex=(m)=>empresas.filter((r)=>r.motivo===m);
    const altas=k.filter((r)=>r.nivel==='Alto'||r.nivel==='Muy alto');
    return {empresas:k.length,muy_alto:c('Muy alto'),alto:c('Alto'),medio:c('Medio'),bajo:c('Bajo'),sin_calificar:c('Sin calificar'),altas:altas.length,
      media:k[0]?k[0].media:null,interacciones:d3.sum(k,(r)=>r.interacciones),interacciones_altas:d3.sum(altas,(r)=>r.interacciones),
      excl_sin_empresa:ex('Sin empresa').length,excl_santander:ex('Grupo Santander').length,excl_sin_nombre:ex('Sin nombre').length,
      int_sin_empresa:d3.sum(ex('Sin empresa'),(r)=>r.interacciones),int_santander:d3.sum(ex('Grupo Santander'),(r)=>r.interacciones)};}});

dash.calc('atipicas',{inputs:['campanas'],title:'Campañas con tráfico atípico',
  description:'Campañas con al menos 500 clics, 90% o más de clics a landing y menos de 0,2 seguidores por mil impresiones.',
  fn:(campanas)=>campanas.filter((c)=>{const cl=Number(c.clics);return cl>=500&&Number(c.clics_landing)/cl>=0.9&&Number(c.seguidores)/Number(c.impresiones)*1000<0.2;})
    .map((c)=>({campaign_id:c.campaign_id,campana:c.campana,etiqueta:c.etiqueta,inicio:c.inicio,fin:c.fin,inversion_eur:Number(c.inversion_eur),impresiones:Number(c.impresiones),clics:Number(c.clics),clics_landing:Number(c.clics_landing),seguidores:Number(c.seguidores)}))});

dash.calc('vistas',{inputs:['semanal','atipicas'],title:'Semanas con y sin atípico',
  description:'Cada fila semanal dos veces: vista «todo» y vista «limpio» (sin campañas atípicas).',
  fn:(semanal,atipicas)=>{const fuera=new Set(atipicas.map((a)=>a.campaign_id));const keys=['inversion_eur','impresiones','clics','clics_landing','seguidores','interacciones'];const out=[];
    for(const r of semanal){const b={semana:r.semana,inicio_semana:r.inicio_semana,completa:r.semana_completa==='sí',campaign_id:r.campaign_id,creative_id:r.creative_id,idioma:r.idioma,tier:r.tier,tema:r.tema,formato:r.formato,atipica:fuera.has(r.campaign_id)};
      for(const k of keys)b[k]=Number(r[k]);out.push({...b,vista:'todo'});if(!b.atipica)out.push({...b,vista:'limpio'});}
    return out;}});

dash.calc('serie',{inputs:['vistas'],title:'Serie semanal',description:'Totales por semana y vista; CPF = inversión ÷ seguidores; CTR = clics ÷ impresiones.',
  fn:(vistas)=>{const m=new Map();for(const r of vistas){const k=r.vista+'|'+r.semana;let g=m.get(k);if(!g){g={vista:r.vista,semana:r.semana,inicio_semana:r.inicio_semana,completa:r.completa,inversion_eur:0,impresiones:0,impresiones_atipicas:0,clics:0,seguidores:0};m.set(k,g);}
    g.inversion_eur+=r.inversion_eur;g.impresiones+=r.impresiones;g.clics+=r.clics;g.seguidores+=r.seguidores;if(r.atipica)g.impresiones_atipicas+=r.impresiones;}
    return [...m.values()].map((g)=>({...g,cpf:g.seguidores?g.inversion_eur/g.seguidores:null,ctr:g.impresiones?g.clics/g.impresiones:null})).sort((a,b)=>a.semana<b.semana?-1:1);}});

dash.calc('kpis',{inputs:['vistas'],title:'KPIs últimas 4 semanas',description:'Suma de las 4 últimas semanas completas frente a las 4 anteriores; cambios en % sobre el periodo anterior.',
  fn:(vistas)=>{const semanas=[...new Set(vistas.filter((r)=>r.completa).map((r)=>r.semana))].sort();const act=semanas.slice(-4),ant=semanas.slice(-8,-4);
    const sum=(v,ws)=>{const s={inversion_eur:0,impresiones:0,clics:0,interacciones:0,seguidores:0};for(const r of vistas)if(r.vista===v&&ws.includes(r.semana))for(const k in s)s[k]+=r[k];
      return {...s,otras_interacciones:s.interacciones-s.clics,cpf:s.seguidores?s.inversion_eur/s.seguidores:null,ctr:s.clics/s.impresiones,cpm:s.inversion_eur/s.impresiones*1000};};
    const out=[];for(const v of ['todo','limpio']){const a=sum(v,act),p=sum(v,ant);const d={};for(const k of ['inversion_eur','impresiones','clics','otras_interacciones','seguidores','cpf'])d['d_'+k]=p[k]?a[k]/p[k]-1:null;
      out.push({vista:v,periodo:'actual',desde:act[0],hasta:act[act.length-1],...a,...d});out.push({vista:v,periodo:'anterior',desde:ant[0],hasta:ant[ant.length-1],...p});}
    return out;}});

dash.calc('dims',{inputs:['vistas'],title:'Rendimiento por dimensión',description:'Totales por tier, idioma, tema y formato; CPF = inversión ÷ seguidores; seguidores por mil impresiones.',
  fn:(vistas)=>{const m=new Map();for(const r of vistas)for(const dim of ['tier','idioma','tema','formato']){const k=r.vista+'|'+dim+'|'+r[dim];let g=m.get(k);if(!g){g={vista:r.vista,dim,valor:r[dim],inversion_eur:0,impresiones:0,seguidores:0};m.set(k,g);}
    g.inversion_eur+=r.inversion_eur;g.impresiones+=r.impresiones;g.seguidores+=r.seguidores;}
    return [...m.values()].map((g)=>({...g,cpf:g.seguidores?g.inversion_eur/g.seguidores:null,seg_mil:g.seguidores/g.impresiones*1000}));}});

dash.calc('camp_ratios',{inputs:['campanas','atipicas'],title:'Ratios por campaña',description:'CTR = clics ÷ impresiones; CPF = inversión ÷ seguidores; atípico según la regla de tráfico atípico.',
  fn:(campanas,atipicas)=>{const f=new Set(atipicas.map((a)=>a.campaign_id));return campanas.map((c)=>({campaign_id:c.campaign_id,ctr:Number(c.clics)/Number(c.impresiones),cpf:Number(c.seguidores)?Number(c.inversion_eur)/Number(c.seguidores):null,atipico:f.has(c.campaign_id)?'Sí':'—'}));}});

dash.calc('mensual_ratios',{inputs:['mensual'],title:'CPF mensual',description:'Inversión del mes ÷ seguidores captados en el mes.',
  fn:(mensual)=>mensual.map((m)=>({mes:m.mes,cpf:Number(m.inversion_eur)/Number(m.seguidores)}))});

dash.calc('boosts',{inputs:['campanas'],title:'Boosts activos',description:'Campañas activas; ejecutado = invertido ÷ presupuesto total.',
  fn:(campanas)=>campanas.filter((c)=>c.estado==='ACTIVE').map((c)=>({campaign_id:c.campaign_id,ejecutado:c.presupuesto_eur?Number(c.inversion_eur)/Number(c.presupuesto_eur):null}))});

dash.calc('top_creatives',{inputs:['creatividades','atipicas'],title:'Top creatividades',description:'Las 6 creatividades con más seguidores captados, sin campañas atípicas; CPF = inversión ÷ seguidores.',
  fn:(creatividades,atipicas)=>{const f=new Set(atipicas.map((a)=>a.etiqueta));return creatividades.filter((c)=>!f.has(c.etiqueta)).map((c)=>({creative_id:c.creative_id,seguidores:Number(c.seguidores),cpf:Number(c.seguidores)?Number(c.inversion_eur)/Number(c.seguidores):null})).sort((a,b)=>b.seguidores-a.seguidores).slice(0,6);}});

dash.calc('aud_sen',{inputs:['seniority'],title:'Seniority: tasa de seguimiento',description:'Seguidores por mil impresiones y % de impresiones por seniority.',
  fn:(seniority)=>{const t=seniority.reduce((s,r)=>s+Number(r.impresiones),0);return seniority.filter((r)=>Number(r.impresiones)>=10000).map((r)=>({seniority:r.seniority,seg_mil:Number(r.seguidores)/Number(r.impresiones)*1000,pct_impr:Number(r.impresiones)/t}));}});

dash.calc('aud_pais',{inputs:['pais'],title:'País: impresiones vs seguidores',description:'Peso de cada país en impresiones y en seguidores, sobre los países listados.',
  fn:(pais)=>{const ti=pais.reduce((s,r)=>s+Number(r.impresiones),0),ts=pais.reduce((s,r)=>s+Number(r.seguidores),0);return pais.filter((r)=>Number(r.impresiones)>=50000).map((r)=>({pais:r.pais,pct_impr:Number(r.impresiones)/ti,pct_seg:Number(r.seguidores)/ts,seg_mil:Number(r.seguidores)/Number(r.impresiones)*1000}));}});

dash.calc('aud_fun',{inputs:['funcion'],title:'Función: tasa de seguimiento',description:'Seguidores por mil impresiones por función.',
  fn:(funcion)=>funcion.map((r)=>({funcion:r.funcion,seg_mil:Number(r.seguidores)/Number(r.impresiones)*1000}))});


dash.calc('comunidad',{inputs:['li_diario','ig_diario'],title:'Comunidad: seguidores',description:'Seguidores al inicio y al final del periodo; crecimiento = final − inicio; % paid = seguidores atribuidos a anuncios ÷ crecimiento (solo LinkedIn).',
  fn:(li_diario,ig_diario)=>{const out=[];for(const [red,rows] of [['LinkedIn',li_diario],['Instagram',ig_diario]]){const c=rows.filter((r)=>r.seguidores!=='' && r.seguidores!=null).sort((a,b)=>a.fecha<b.fecha?-1:1);const a=c[0],z=c[c.length-1];
    const ini=Number(a.seguidores),fin=Number(z.seguidores),crec=fin-ini;const row={red,desde:a.fecha,hasta:z.fecha,seguidores_inicio:ini,seguidores_actual:fin,crecimiento:crec,pct:crec/ini};
    if(red==='LinkedIn'){const paid=rows.filter((r)=>r.fecha>a.fecha).reduce((s,r)=>s+Number(r.nuevos_paid||0),0);row.nuevos_paid=paid;row.pct_paid=paid/crec;}out.push(row);}return out;}});
dash.calc('li_sem',{inputs:['li_diario'],title:'LinkedIn: seguidores por semana',description:'Por semana ISO: nuevos seguidores netos, atribuidos a anuncios y orgánicos (netos − paid).',
  fn:(li_diario)=>{const wk=(d)=>{const t=new Date(d+'T00:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));const w=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return y+'-W'+String(w).padStart(2,'0');};
    const m=new Map();for(const r of li_diario){const k=wk(r.fecha);let g=m.get(k);if(!g){g={semana:k,inicio:r.fecha,netos:0,paid:0,impresiones:0,publicaciones:0};m.set(k,g);}g.netos+=Number(r.nuevos_seguidores||0);g.paid+=Number(r.nuevos_paid||0);g.impresiones+=Number(r.impresiones_posts||0);g.publicaciones+=Number(r.publicaciones||0);}
    return [...m.values()].map((g)=>({...g,organicos:Math.max(0,g.netos-g.paid)})).sort((a,b)=>a.semana<b.semana?-1:1);}});
dash.calc('ig_sem',{inputs:['ig_diario'],title:'Instagram: seguidores por semana',description:'Por semana ISO: seguidores ganados, perdidos y visualizaciones (orgánico + paid).',
  fn:(ig_diario)=>{const wk=(d)=>{const t=new Date(d+'T00:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));const w=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return y+'-W'+String(w).padStart(2,'0');};
    const m=new Map();for(const r of ig_diario){const k=wk(r.fecha);let g=m.get(k);if(!g){g={semana:k,inicio:r.fecha,ganados:0,perdidos:0,visualizaciones:0,publicaciones:0};m.set(k,g);}g.ganados+=Number(r.ganados||0);g.perdidos+=Number(r.perdidos||0);g.visualizaciones+=Number(r.visualizaciones||0);g.publicaciones+=Number(r.publicaciones||0);}
    return [...m.values()].sort((a,b)=>a.semana<b.semana?-1:1);}});
dash.calc('visibilidad',{inputs:['li_diario','semanal'],title:'LinkedIn: orgánico frente a paid',description:'Impresiones de publicaciones orgánicas (Metricool) frente a impresiones de anuncios (LinkedIn Ads, SPB_26).',
  fn:(li_diario,semanal)=>{const o=li_diario.reduce((s,r)=>s+Number(r.impresiones_posts||0),0),p=semanal.reduce((s,r)=>s+Number(r.impresiones||0),0);return {organico:o,paid:p,pct_organico:o/(o+p)};}});
dash.calc('org_temas',{inputs:['li_posts','ig_posts'],title:'Orgánico por tema',description:'Media de impresiones (LinkedIn) o alcance (Instagram) por publicación, por tema.',
  fn:(li_posts,ig_posts)=>{const out=[];for(const [red,rows,k] of [['LinkedIn',li_posts,'impresiones'],['Instagram',ig_posts,'alcance']]){const m=new Map();for(const r of rows){let g=m.get(r.tema);if(!g){g={red,tema:r.tema,n:0,total:0};m.set(r.tema,g);}g.n+=1;g.total+=Number(r[k]);}for(const g of m.values())out.push({...g,media:g.total/g.n});}return out;}});
dash.calc('es_en',{inputs:['li_posts'],title:'Español frente a inglés',description:'Días con la misma pieza (gráfico semanal o contenido de inversiones) publicada en español e inglés: impresiones de cada versión.',
  fn:(li_posts)=>{const m=new Map();for(const r of li_posts){if(!['Gráfico semanal','Contenido inversiones'].includes(r.tema))continue;const d=r.fecha.slice(0,10);let g=m.get(d);if(!g){g={fecha:d};m.set(d,g);}if(r.idioma==='Español')g.es=Number(r.impresiones);if(r.idioma==='Inglés')g.en=Number(r.impresiones);}
    return [...m.values()].filter((g)=>g.es!=null&&g.en!=null).sort((a,b)=>a.fecha<b.fecha?-1:1);}});

/* ---------- Meta Ads (Instagram paid) ---------- */
dash.calc('meta_join',{inputs:['meta_seguidores','meta_anuncios'],title:'Meta Ads: anuncio y día',
  description:'Cada fila diaria de seguidores (exportación de Meta) con el tier, tema, formato, idioma, campaña y pieza de su anuncio.',
  fn:(meta_seguidores,meta_anuncios)=>{const A=new Map(meta_anuncios.map((a)=>[a.ad_id,a]));return meta_seguidores.map((r)=>{const a=A.get(r.ad_id)||{};
    return {ad_id:r.ad_id,fecha:r.fecha,inversion_eur:Number(r.inversion_eur),impresiones:Number(r.impresiones),clics:Number(r.clics_todos),seguidores:Number(r.seguidores),
      campaign_id:a.campaign_id,post_ig:a.post_ig,tier:a.tier,tema:a.tema,formato:a.formato,idioma:a.idioma};});}});

dash.calc('meta_sem',{inputs:['meta_join','ig_diario'],title:'Instagram: seguidores paid por semana',
  description:'Por semana ISO: inversión y seguidores atribuidos a anuncios (Meta) y seguidores ganados por la cuenta (Metricool); resto = ganados − paid; CPF = inversión ÷ seguidores paid.',
  fn:(meta_join,ig_diario)=>{const wk=(d)=>{const t=new Date(d+'T00:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));const w=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return y+'-W'+String(w).padStart(2,'0');};
    const m=new Map();const get=(k,d)=>{let g=m.get(k);if(!g){g={semana:k,inicio_semana:d,inversion_eur:0,impresiones:0,seguidores:0,ganados:0,dias_ig:0,impresiones_atipicas:0};m.set(k,g);}if(d<g.inicio_semana)g.inicio_semana=d;return g;};
    for(const r of meta_join){const g=get(wk(r.fecha),r.fecha);g.inversion_eur+=r.inversion_eur;g.impresiones+=r.impresiones;g.seguidores+=r.seguidores;}
    for(const r of ig_diario){const g=get(wk(r.fecha),r.fecha);g.ganados+=Number(r.ganados||0);g.dias_ig+=1;}
    return [...m.values()].map((g)=>({...g,completa:g.dias_ig===7,paid:g.seguidores,resto:Math.max(0,g.ganados-g.seguidores),cpf:g.seguidores?g.inversion_eur/g.seguidores:null})).sort((a,b)=>a.semana<b.semana?-1:1);}});

dash.calc('meta_kpis',{inputs:['meta_join','meta_sem'],title:'Meta Ads: KPIs del periodo',
  description:'Totales de la exportación de Meta: CPF = inversión ÷ seguidores; CPM = inversión ÷ impresiones × 1000; CTR = clics ÷ impresiones; % paid = seguidores paid ÷ seguidores ganados en las semanas completas con datos de Metricool.',
  fn:(meta_join,meta_sem)=>{const s=(k)=>meta_join.reduce((t,r)=>t+r[k],0);const inv=s('inversion_eur'),imp=s('impresiones'),seg=s('seguidores'),cl=s('clics');
    const w=meta_sem.filter((r)=>r.completa);const ps=w.reduce((t,r)=>t+r.paid,0),gs=w.reduce((t,r)=>t+r.ganados,0);
    return {inversion_eur:inv,seguidores:seg,cpf:inv/seg,seg_mil:seg/imp*1000,cpm:inv/imp*1000,ctr:cl/imp,paid_semanas:ps,ganados_semanas:gs,pct_paid:ps/gs};}});

dash.calc('meta_dims',{inputs:['meta_join'],title:'Meta Ads: CPF por dimensión',
  description:'Totales por tier, tema, formato e idioma de la audiencia; CPF = inversión ÷ seguidores; seguidores por mil impresiones.',
  fn:(meta_join)=>{const m=new Map();for(const r of meta_join)for(const dim of ['tier','tema','formato','idioma']){const k=dim+'|'+r[dim];let g=m.get(k);if(!g){g={dim,valor:r[dim],inversion_eur:0,impresiones:0,seguidores:0};m.set(k,g);}
    g.inversion_eur+=r.inversion_eur;g.impresiones+=r.impresiones;g.seguidores+=r.seguidores;}
    return [...m.values()].map((g)=>({...g,cpf:g.seguidores?g.inversion_eur/g.seguidores:null,seg_mil:g.seguidores/g.impresiones*1000}));}});

dash.calc('meta_piezas',{inputs:['meta_anuncios','meta_join'],title:'Meta Ads: piezas promocionadas',
  description:'Anuncios agrupados por la publicación de Instagram que promocionan; seguidores de la exportación de Meta; CPF = inversión ÷ seguidores; CTR = clics de enlace ÷ impresiones (Supermetrics).',
  fn:(meta_anuncios,meta_join)=>{const seg=new Map();for(const r of meta_join)seg.set(r.ad_id,(seg.get(r.ad_id)||0)+r.seguidores);
    const m=new Map();for(const r of meta_anuncios){let g=m.get(r.post_ig);if(!g){g={post_ig:r.post_ig,url:r.url,pieza:r.pieza,fecha_post:r.fecha_post,tema:r.tema,formato:r.formato,idi:new Set(),ti:new Set(),anuncios:0,inversion_eur:0,impresiones:0,clics:0,seguidores:0};m.set(r.post_ig,g);}
    g.idi.add(r.idioma);g.ti.add(r.tier.replace('Tier ','T'));g.anuncios+=1;g.inversion_eur+=Number(r.inversion_eur);g.impresiones+=Number(r.impresiones);g.clics+=Number(r.clics_enlace);g.seguidores+=seg.get(r.ad_id)||0;}
    return [...m.values()].map(({idi,ti,...g})=>({...g,idiomas:[...idi].sort().join(', '),tiers:[...ti].sort().join(', '),ctr:g.clics/g.impresiones,cpf:g.seguidores?g.inversion_eur/g.seguidores:null}));}});

dash.calc('meta_camp_ratios',{inputs:['meta_campanas','meta_join'],title:'Meta Ads: seguidores por campaña',description:'Seguidores de la exportación de Meta por campaña; CPF = inversión ÷ seguidores.',
  fn:(meta_campanas,meta_join)=>{const s=new Map();for(const r of meta_join)s.set(r.campaign_id,(s.get(r.campaign_id)||0)+r.seguidores);
    return meta_campanas.map((c)=>{const f=s.get(c.campaign_id)||0;return {campaign_id:c.campaign_id,seguidores:f,cpf:f?Number(c.inversion_eur)/f:null};});}});

dash.calc('meta_mes',{inputs:['meta_join'],title:'Meta Ads: meses',description:'Totales por mes de la exportación de Meta; CPF = inversión ÷ seguidores. Octubre llega al 12.',
  fn:(meta_join)=>{const N={'06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre (1–12)'};const m=new Map();
    for(const r of meta_join){const k=r.fecha.slice(0,7);let g=m.get(k);if(!g){g={mes:k,etiqueta:N[k.slice(5)]||k,dset:new Set(),inversion_eur:0,impresiones:0,seguidores:0};m.set(k,g);}if(r.inversion_eur>0)g.dset.add(r.fecha);g.inversion_eur+=r.inversion_eur;g.impresiones+=r.impresiones;g.seguidores+=r.seguidores;}
    return [...m.values()].map(({dset,...g})=>({...g,dias:dset.size,cpf:g.seguidores?g.inversion_eur/g.seguidores:null})).sort((a,b)=>a.mes<b.mes?-1:1);}});

dash.calc('meta_plat',{inputs:['meta_semanal'],title:'Meta Ads: plataforma por semana',description:'Inversión por semana ISO y plataforma de entrega (Instagram o Facebook), según la API de Meta vía Supermetrics.',
  fn:(meta_semanal)=>{const m=new Map();for(const r of meta_semanal){let g=m.get(r.semana);if(!g){g={semana:r.semana,inicio:r.inicio_semana,instagram:0,facebook:0};m.set(r.semana,g);}const e=Number(r.inversion_eur);if(r.plataforma==='Instagram')g.instagram+=e;if(r.plataforma==='Facebook')g.facebook+=e;}
    return [...m.values()].sort((a,b)=>a.semana<b.semana?-1:1);}});

dash.calc('meta_activas',{inputs:['meta_campanas'],title:'Meta Ads: campañas activas',
  description:'Campañas con estado activo a la fecha de extracción (13 oct 2026).',
  fn:(meta_campanas)=>meta_campanas.filter((c)=>c.estado==='ACTIVE').map((c)=>({campaign_id:c.campaign_id}))});

/* ---------- Resumen por canal ---------- */
dash.calc('canales',{inputs:['semanal','meta_join','comunidad','meta_kpis','serie','meta_sem'],title:'Paid por canal',
  description:'LinkedIn: totales de SPB_26 (LinkedIn Ads). Instagram: totales de SPB_IG_26 (exportación de Meta). CPF = inversión ÷ seguidores paid; CPM = inversión ÷ impresiones × 1000; últimas 4 semanas = las 4 últimas semanas ISO completas de cada canal; % del crecimiento = seguidores paid ÷ seguidores ganados (LinkedIn: datos de la página en Metricool; Instagram: semanas completas en Metricool).',
  fn:(semanal,meta_join,comunidad,meta_kpis,serie,meta_sem)=>{const sum=(rows,k)=>rows.reduce((t,r)=>t+Number(r[k]||0),0);
    const li={canal:'LinkedIn',inversion_eur:sum(semanal,'inversion_eur'),seguidores:sum(semanal,'seguidores'),impresiones:sum(semanal,'impresiones'),pct_paid:(comunidad.find((r)=>r.red==='LinkedIn')||{}).pct_paid};
    const ig={canal:'Instagram',inversion_eur:sum(meta_join,'inversion_eur'),seguidores:sum(meta_join,'seguidores'),impresiones:sum(meta_join,'impresiones'),pct_paid:meta_kpis.pct_paid};
    const l4=serie.filter((r)=>r.vista==='todo'&&r.completa).slice(-4);const i4=meta_sem.filter((r)=>r.completa&&r.inversion_eur>0).slice(-4);
    li.cpf_4s=sum(l4,'inversion_eur')/sum(l4,'seguidores');li.desde_4s=l4[0].semana;li.hasta_4s=l4[l4.length-1].semana;
    ig.cpf_4s=sum(i4,'inversion_eur')/sum(i4,'seguidores');ig.desde_4s=i4[0].semana;ig.hasta_4s=i4[i4.length-1].semana;
    return [li,ig].map((c)=>({...c,cpf:c.inversion_eur/c.seguidores,cpm:c.inversion_eur/c.impresiones*1000}));}});

dash.calc('canales_sem',{inputs:['serie','meta_sem'],title:'Paid por canal y semana',
  description:'Por semana ISO: inversión, seguidores paid y CPF de LinkedIn (SPB_26, vista sin filtrar) y de Instagram (SPB_IG_26).',
  fn:(serie,meta_sem)=>{const m=new Map();const get=(s,d)=>{let g=m.get(s);if(!g){g={semana:s,inicio:d,li_inv:0,li_seg:0,ig_inv:0,ig_seg:0,completa:true};m.set(s,g);}return g;};
    for(const r of serie){if(r.vista!=='todo')continue;const g=get(r.semana,r.inicio_semana);g.li_inv+=r.inversion_eur;g.li_seg+=r.seguidores;if(!r.completa)g.completa=false;}
    for(const r of meta_sem){if(!(r.inversion_eur>0))continue;const g=get(r.semana,r.inicio_semana);g.ig_inv+=r.inversion_eur;g.ig_seg+=r.paid;}
    return [...m.values()].map((g)=>({...g,li_cpf:g.li_seg?g.li_inv/g.li_seg:null,ig_cpf:g.ig_seg?g.ig_inv/g.ig_seg:null})).sort((a,b)=>a.semana<b.semana?-1:1);}});

/* ---------- Instagram: detalle y audiencia ---------- */
dash.calc('meta_piezas_det',{inputs:['meta_anuncios','meta_join'],title:'Meta Ads: piezas por tier e idioma',
  description:'Anuncios agrupados por publicación de Instagram, tier e idioma de la audiencia; seguidores de la exportación de Meta; CPF = inversión ÷ seguidores; CTR = clics de enlace ÷ impresiones (Supermetrics).',
  fn:(meta_anuncios,meta_join)=>{const seg=new Map();for(const r of meta_join)seg.set(r.ad_id,(seg.get(r.ad_id)||0)+r.seguidores);
    const m=new Map();for(const r of meta_anuncios){const k=r.post_ig+'|'+r.tier+'|'+r.idioma;let g=m.get(k);if(!g){g={post_ig:r.post_ig,tier:r.tier,idioma:r.idioma,url:r.url,pieza:r.pieza,fecha_post:r.fecha_post,tema:r.tema,formato:r.formato,anuncios:0,inversion_eur:0,impresiones:0,clics:0,seguidores:0};m.set(k,g);}
      g.anuncios+=1;g.inversion_eur+=Number(r.inversion_eur);g.impresiones+=Number(r.impresiones);g.clics+=Number(r.clics_enlace);g.seguidores+=seg.get(r.ad_id)||0;}
    return [...m.values()].map((g)=>({...g,ctr:g.clics/g.impresiones,cpf:g.seguidores?g.inversion_eur/g.seguidores:null}));}});

dash.calc('ig_aud_sexo',{inputs:['ig_aud_edad','meta_aud_edad'],title:'Instagram: reparto por sexo',
  description:'% de seguidores de la cuenta (Metricool) y % de impresiones de los anuncios (Meta Ads) por sexo.',
  fn:(ig_aud_edad,meta_aud_edad)=>{const ts=ig_aud_edad.reduce((t,r)=>t+Number(r.seguidores),0),ti=meta_aud_edad.reduce((t,r)=>t+Number(r.impresiones),0);
    return ['Hombres','Mujeres','Sin especificar'].map((s)=>({sexo:s,pct_seg:ig_aud_edad.filter((r)=>r.sexo===s).reduce((t,r)=>t+Number(r.seguidores),0)/ts,pct_impr:meta_aud_edad.filter((r)=>r.sexo===s).reduce((t,r)=>t+Number(r.impresiones),0)/ti}));}});

dash.calc('ig_aud_edad_cmp',{inputs:['ig_aud_edad','meta_aud_edad'],title:'Instagram: edad de seguidores frente a impresiones paid',
  description:'% de seguidores (Metricool) y % de impresiones de los anuncios (Meta Ads) por tramo de edad, sobre el total con edad conocida.',
  fn:(ig_aud_edad,meta_aud_edad)=>{const ages=['13-17','18-24','25-34','35-44','45-54','55-64','65+'];const known=meta_aud_edad.filter((r)=>ages.includes(r.edad));
    const ts=ig_aud_edad.reduce((t,r)=>t+Number(r.seguidores),0),ti=known.reduce((t,r)=>t+Number(r.impresiones),0);
    return ages.map((e)=>({edad:e,pct_seg:ig_aud_edad.filter((r)=>r.edad===e).reduce((t,r)=>t+Number(r.seguidores),0)/ts,pct_impr:known.filter((r)=>r.edad===e).reduce((t,r)=>t+Number(r.impresiones),0)/ti}));}});

dash.calc('ig_aud_pais_cmp',{inputs:['ig_aud_pais','meta_aud_pais'],title:'Instagram: país de seguidores frente a inversión paid',
  description:'% de seguidores por país (Metricool) y % de la inversión de los anuncios por país (Meta Ads). Países con al menos un 1 % de los seguidores o con inversión.',
  fn:(ig_aud_pais,meta_aud_pais)=>{const ti=meta_aud_pais.reduce((t,r)=>t+Number(r.inversion_eur),0);const m=new Map();
    for(const r of ig_aud_pais)m.set(r.pais,{pais:r.pais,pct_seg:Number(r.pct_seguidores),pct_inv:0});
    for(const r of meta_aud_pais){const g=m.get(r.pais)||{pais:r.pais,pct_seg:0,pct_inv:0};g.pct_inv=Number(r.inversion_eur)/ti;m.set(r.pais,g);}
    return [...m.values()].filter((g)=>g.pct_seg>=0.01||g.pct_inv>0);}});

/* ---------- helpers ---------- */
const nf=(d)=>new Intl.NumberFormat('es-ES',{useGrouping:'always',minimumFractionDigits:d,maximumFractionDigits:d});
const F={signed:(v)=>(v>0?'+':v<0?'−':'')+nf(0).format(Math.abs(v)),pct0:(v)=>v==null?'—':nf(0).format(v*100)+' %',txt:(v)=>String(v).slice(8,10)+'/'+String(v).slice(5,7),int:(v)=>nf(0).format(v),eur:(v)=>nf(0).format(v)+' €',eur2:(v)=>v==null?'—':nf(2).format(v)+' €',pct:(v)=>v==null?'—':nf(1).format(v*100)+' %',pct2:(v)=>v==null?'—':nf(2).format(v*100)+' %',
  compact:(v)=>new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1}).format(v),d1:(v)=>nf(1).format(v),
  d2:(v)=>nf(2).format(v),eur3:(v)=>v==null?'—':nf(3).format(v)+' €',raw:(v)=>String(v)};
const fmt=(v,f)=>v==null||Number.isNaN(v)?'—':F[f](v);
const ok=(id)=>dash.data(id).status==='ok';
const rowsOf=(id)=>ok(id)?dash.data(id).data:[];
const vista=()=>dash.params().vista||'todo';
const RED='#EC0000';
const failLine=(el)=>{el.replaceChildren();const d=document.createElement('div');d.className='spb-fail';d.append(document.createElement('i'),'Failed to load');el.append(d);};
const tipFor=(box)=>{let t=box.querySelector('.spb-tip');if(!t){t=document.createElement('div');t.className='spb-tip';box.append(t);}return t;};
const showTip=(box,t,ev,lines)=>{t.replaceChildren();lines.forEach((l,i)=>{const d=document.createElement('div');if(i===0){const b=document.createElement('b');b.textContent=l;d.append(b);}else d.textContent=l;t.append(d);});
  const r=box.getBoundingClientRect();let x=ev.clientX-r.left+12,y=ev.clientY-r.top-10;t.style.opacity=1;const w=t.offsetWidth;if(x+w>r.width)x=Math.max(0,ev.clientX-r.left-w-12);t.style.left=x+'px';t.style.top=y+'px';};
const hideTip=(t)=>{t.style.opacity=0;};
const measure=(svg,texts)=>{const g=svg.append('g').attr('opacity',0);let w=0;for(const s of texts){const n=g.append('text').style('font-size','var(--cds-font-size-caption)').text(s).node();w=Math.max(w,n.getComputedTextLength());}g.remove();return w;};
const wk=(s)=>'S'+String(s).slice(-2);
const cleanAxis=(g)=>{g.attr('font-size',null).attr('font-family',null);g.selectAll('text').style('font-size','var(--cds-font-size-caption)').attr('fill','var(--color-fg-muted)');g.selectAll('.domain').attr('stroke','var(--cds-chart-axis)');g.selectAll('.tick line').attr('stroke','var(--cds-chart-grid)');};

/* vertical weekly chart */
function weekly(el,rows,kind){
  const box=el;box.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(box.clientWidth,280),H=240;
  const svg=d3.select(box).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const yv=(d)=>kind==='seg'?d.seguidores:kind==='cpf'?d.cpf:d.impresiones;
  const maxY=d3.max(rows,yv)||1;const y0=d3.scaleLinear([0,maxY],[H-24,10]).nice();
  const tf=kind==='cpf'?(v)=>nf(0).format(v)+' €':kind==='imp'?F.compact:F.int;
  const ml=measure(svg,y0.ticks(4).map(tf))+10;const x=d3.scaleBand(rows.map((d)=>d.semana),[ml,W-6]).padding(0.25);
  svg.append('g').attr('transform',`translate(${ml},0)`).call(d3.axisLeft(y0).ticks(4).tickFormat(tf).tickSize(-(W-ml-6))).call(cleanAxis).call((g)=>g.select('.domain').remove());
  const step=Math.ceil(rows.length/(W/46));svg.append('g').attr('transform',`translate(0,${H-24})`).call(d3.axisBottom(x).tickValues(rows.map((d)=>d.semana).filter((d,i)=>i%step===0)).tickFormat(wk).tickSize(0).tickPadding(8)).call(cleanAxis);
  const tip=tipFor(box);
  if(kind==='cpf'){
    const pts=rows.filter((d)=>d.cpf!=null);const line=d3.line().x((d)=>x(d.semana)+x.bandwidth()/2).y((d)=>y0(d.cpf));
    svg.append('path').datum(pts).attr('d',line).attr('fill','none').attr('stroke',RED).attr('stroke-width',2).attr('stroke-linecap','round').attr('stroke-linejoin','round');
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx',(d)=>x(d.semana)+x.bandwidth()/2).attr('cy',(d)=>y0(d.cpf)).attr('r',3.5).attr('fill',RED)
      .attr('opacity',(d)=>d.completa?1:.45);
  }else if(kind==='seg'){
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',(d)=>y0(d.seguidores)).attr('height',(d)=>y0(0)-y0(d.seguidores)).attr('rx',4)
      .attr('fill',RED).attr('opacity',(d)=>d.completa?.9:.35);
  }else{
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',(d)=>y0(d.impresiones-d.impresiones_atipicas)).attr('height',(d)=>y0(0)-y0(d.impresiones-d.impresiones_atipicas)).attr('fill','var(--cds-chart-muted)');
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',(d)=>y0(d.impresiones)).attr('height',(d)=>y0(d.impresiones-d.impresiones_atipicas)-y0(d.impresiones)).attr('fill','var(--cds-chart-status-critical)');
  }
  svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',0).attr('height',H-24).attr('fill','transparent')
    .on('mousemove',(ev,d)=>showTip(box,tip,ev,[`Semana ${d.semana.slice(-2)} · desde ${d.inicio_semana}${d.completa?'':' (incompleta)'}`,`Seguidores: ${F.int(d.seguidores)}`,`CPF: ${fmt(d.cpf,'eur2')}`,`Inversión: ${F.eur(d.inversion_eur)}`,`Impresiones: ${F.int(d.impresiones)}`+(d.impresiones_atipicas?` (atípicas ${F.int(d.impresiones_atipicas)})`:'')]))
    .on('mouseleave',()=>hideTip(tip));
}

/* horizontal bar chart */
function hbars(el,rows,{label,value,vf,note,color,maxV}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),rh=30,H=rows.length*rh+8;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const ml=Math.min(measure(svg,rows.map(label))+12,W*0.42);const nw=measure(svg,rows.map((d)=>vf(value(d))+(note?'  '+note(d):'')))+10;
  const x=d3.scaleLinear([0,maxV||d3.max(rows,value)||1],[ml,Math.max(ml+40,W-nw)]);
  const g=svg.selectAll('g.r').data(rows).join('g').attr('transform',(d,i)=>`translate(0,${i*rh+4})`);
  g.append('text').attr('x',ml-8).attr('y',rh/2).attr('dy','.35em').attr('text-anchor','end').attr('fill','var(--color-fg)').style('font-size','var(--cds-font-size-caption)').text(label);
  g.append('rect').attr('x',ml).attr('y',5).attr('height',rh-12).attr('rx',4).attr('width',(d)=>Math.max(2,x(value(d))-ml)).attr('fill',(d)=>color?color(d):RED);
  const t=g.append('text').attr('x',(d)=>x(value(d))+6).attr('y',rh/2).attr('dy','.35em').style('font-size','var(--cds-font-size-caption)');
  t.append('tspan').attr('fill','var(--color-fg)').attr('font-weight',500).text((d)=>vf(value(d)));
  if(note)t.append('tspan').attr('fill','var(--color-fg-muted)').text((d)=>'  '+note(d));
  el.style.minHeight=H+'px';
}

/* country paired bars */
function paired(el,rows){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),rh=40,H=rows.length*rh+8;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const ml=measure(svg,rows.map((d)=>d.pais))+12;const x=d3.scaleLinear([0,d3.max(rows,(d)=>Math.max(d.pct_impr,d.pct_seg))],[ml,W-60]);
  const g=svg.selectAll('g.r').data(rows).join('g').attr('transform',(d,i)=>`translate(0,${i*rh+4})`);
  g.append('text').attr('x',ml-8).attr('y',rh/2).attr('dy','.35em').attr('text-anchor','end').attr('fill','var(--color-fg)').style('font-size','var(--cds-font-size-caption)').text((d)=>d.pais);
  for(const [k,c,yy] of [['pct_impr','var(--cds-chart-muted)',4],['pct_seg',RED,19]]){
    g.append('rect').attr('x',ml).attr('y',yy).attr('height',13).attr('rx',4).attr('width',(d)=>Math.max(2,x(d[k])-ml)).attr('fill',c);
    g.append('text').attr('x',(d)=>x(d[k])+5).attr('y',yy+10).style('font-size','var(--cds-font-size-caption)').attr('fill','var(--color-fg-muted)').text((d)=>F.pct(d[k]));}
  el.style.minHeight=H+'px';
}


/* stacked / simple weekly bars */
function wbars(el,rows,{keys,colors,labels,tip,ref}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),H=230;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const tot=(d)=>keys.reduce((s,k)=>s+(d[k]||0),0);const y=d3.scaleLinear([0,Math.max(d3.max(rows,tot)||1,ref?ref.value*1.08:0)],[H-24,10]).nice();
  const ml=measure(svg,y.ticks(4).map(F.int))+10;const x=d3.scaleBand(rows.map((d)=>d.semana),[ml,W-6]).padding(0.25);
  svg.append('g').attr('transform',`translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(F.int).tickSize(-(W-ml-6))).call(cleanAxis).call((g)=>g.select('.domain').remove());
  const step=Math.ceil(rows.length/(W/46));svg.append('g').attr('transform',`translate(0,${H-24})`).call(d3.axisBottom(x).tickValues(rows.map((d)=>d.semana).filter((d,i)=>i%step===0)).tickFormat(wk).tickSize(0).tickPadding(8)).call(cleanAxis);
  keys.forEach((k,i)=>{svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth())
    .attr('y',(d)=>y(keys.slice(0,i+1).reduce((s,kk)=>s+(d[kk]||0),0))).attr('height',(d)=>y(keys.slice(0,i).reduce((s,kk)=>s+(d[kk]||0),0))-y(keys.slice(0,i+1).reduce((s,kk)=>s+(d[kk]||0),0))).attr('fill',colors[i]);});
  if(ref&&ref.value!=null){const yy=y(ref.value);svg.append('line').attr('x1',ml).attr('x2',W-6).attr('y1',yy).attr('y2',yy).attr('stroke','var(--color-fg)').attr('stroke-width',1.5).attr('stroke-dasharray','5 4');
    svg.append('text').attr('x',W-8).attr('y',yy-6).attr('text-anchor','end').style('font-size','var(--cds-font-size-caption)').attr('fill','var(--color-fg)').attr('font-weight',500).text(ref.label);}
  const t=tipFor(el);svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',0).attr('height',H-24).attr('fill','transparent')
    .on('mousemove',(ev,d)=>showTip(el,t,ev,[`Semana ${d.semana.slice(-2)} · desde ${d.inicio}`,...tip(d)])).on('mouseleave',()=>hideTip(t));
  el.style.minHeight=H+'px';
}
/* vertical grouped bars: two values per category */
function gbars(el,rows,{label,a,b,ca,cb,la,lb,tf}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),H=230;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const y=d3.scaleLinear([0,d3.max(rows,(d)=>Math.max(d[a],d[b]))||1],[H-24,10]).nice();
  const ml=measure(svg,y.ticks(4).map(tf))+10;const x=d3.scaleBand(rows.map(label),[ml,W-6]).padding(0.25);const x2=d3.scaleBand([a,b],[0,x.bandwidth()]).padding(0.08);
  svg.append('g').attr('transform',`translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(tf).tickSize(-(W-ml-6))).call(cleanAxis).call((g)=>g.select('.domain').remove());
  const step=Math.ceil(rows.length/(W/46));svg.append('g').attr('transform',`translate(0,${H-24})`).call(d3.axisBottom(x).tickValues(rows.map(label).filter((d,i)=>i%step===0)).tickSize(0).tickPadding(8)).call(cleanAxis);
  for(const [k,c] of [[a,ca],[b,cb]])svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(label(d))+x2(k)).attr('width',x2.bandwidth()).attr('y',(d)=>y(d[k])).attr('height',(d)=>y(0)-y(d[k])).attr('rx',2).attr('fill',c);
  const t=tipFor(el);svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(label(d))).attr('width',x.bandwidth()).attr('y',0).attr('height',H-24).attr('fill','transparent')
    .on('mousemove',(ev,d)=>showTip(el,t,ev,[label(d),`${la}: ${tf(d[a])}`,`${lb}: ${tf(d[b])}`])).on('mouseleave',()=>hideTip(t));
  el.style.minHeight=H+'px';
}
function pairs(el,rows,{label,a,b,ca,cb,fmt}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),rh=34,H=rows.length*rh+8;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const ml=measure(svg,rows.map(label))+12;const x=d3.scaleLinear([0,d3.max(rows,(d)=>Math.max(d[a],d[b]))],[ml,W-56]);
  const g=svg.selectAll('g.r').data(rows).join('g').attr('transform',(d,i)=>`translate(0,${i*rh+4})`);
  g.append('text').attr('x',ml-8).attr('y',rh/2).attr('dy','.35em').attr('text-anchor','end').attr('fill','var(--color-fg)').style('font-size','var(--cds-font-size-caption)').text(label);
  for(const [k,c,yy] of [[a,ca,3],[b,cb,16]]){g.append('rect').attr('x',ml).attr('y',yy).attr('height',11).attr('rx',4).attr('width',(d)=>Math.max(2,x(d[k])-ml)).attr('fill',c);
    g.append('text').attr('x',(d)=>x(d[k])+5).attr('y',yy+9).style('font-size','var(--cds-font-size-caption)').attr('fill','var(--color-fg-muted)').text((d)=>fmt(d[k]));}
  el.style.minHeight=H+'px';
}
function drawComunidad(){
  document.querySelectorAll('#comunidad [data-f][data-source]').forEach((el)=>{const src=el.dataset.source;const st=dash.data(src).status;if(st!=='ok')return;const d=dash.data(src).data;
    const row=Array.isArray(d)?d.find((r)=>[...new URLSearchParams(el.getAttribute('data-where')||'')].every(([k,v])=>String(r[k])===v)):d;if(row)el.textContent=fmt(row[el.dataset.field],el.dataset.f);});
  const ls=document.getElementById('ch-li-sem');if(dash.data('li_sem').status==='error')failLine(ls);else{const r=rowsOf('li_sem');if(r.length){ls.classList.remove('dash-skeleton');wbars(ls,r,{keys:['organicos','paid'],colors:['var(--cds-chart-muted)',RED],tip:(d)=>[`Netos: ${F.int(d.netos)}`,`Paid: ${F.int(d.paid)}`,`Orgánicos: ${F.int(d.organicos)}`,`Impresiones orgánicas: ${F.int(d.impresiones)}`]});}}
  const is=document.getElementById('ch-ig-sem');if(dash.data('ig_sem').status==='error')failLine(is);else{const r=rowsOf('ig_sem');if(r.length){is.classList.remove('dash-skeleton');wbars(is,r,{keys:['ganados'],colors:[RED],tip:(d)=>[`Ganados: ${F.int(d.ganados)}`,`Perdidos: ${F.int(d.perdidos)}`,`Publicaciones: ${F.int(d.publicaciones)}`,`Visualizaciones: ${F.compact(d.visualizaciones)}`]});}}
  for(const [id,red] of [['ch-temas-li','LinkedIn'],['ch-temas-ig','Instagram']]){const el=document.getElementById(id);if(dash.data('org_temas').status==='error'){failLine(el);continue;}
    const r=rowsOf('org_temas').filter((x)=>x.red===red).sort((a,b)=>b.media-a.media);if(!r.length)continue;el.classList.remove('dash-skeleton');const top=r[0].tema;
    hbars(el,r,{label:(d)=>d.tema,value:(d)=>d.media,vf:F.int,note:(d)=>`${d.n} publ.`,color:(d)=>d.tema===top?RED:'var(--cds-chart-muted)'});}
  const ee=document.getElementById('ch-esen');if(dash.data('es_en').status==='error')failLine(ee);else{const r=rowsOf('es_en');if(r.length){ee.classList.remove('dash-skeleton');pairs(ee,r,{label:(d)=>d.fecha.slice(8,10)+'/'+d.fecha.slice(5,7),a:'es',b:'en',ca:RED,cb:'var(--cds-chart-muted)',fmt:F.int});}}
  const pp=document.getElementById('ch-paises-org');if(dash.data('li_paises').status==='error')failLine(pp);else{const r=rowsOf('li_paises').map((x)=>({pais:x.pais,v:Number(x.pct_seguidores)}));if(r.length){pp.classList.remove('dash-skeleton');hbars(pp,r,{label:(d)=>d.pais,value:(d)=>d.v,vf:F.pct,color:(d)=>d.pais==='España'?RED:'var(--cds-chart-muted)'});}}
  const safe=(u,ok)=>ok.some((p)=>String(u).startsWith(p));
  const tbl=(sel,src,sortK,limit,cols,host)=>{const rows=rowsOf(src).slice().sort((a,b)=>Number(b[sortK])-Number(a[sortK])).slice(0,limit);
    document.querySelector(sel+' tbody').replaceChildren(...rows.map((r)=>{const tr=document.createElement('tr');tr.dataset.key=r.post_id;
      cols.forEach(([k,c],i)=>{const td=document.createElement('td');if(c)td.className=c;if(i===0&&safe(r.url,host)){const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener';a.textContent=r[k];td.append(a);}else td.textContent=c==='num'?(r[k]===''?'—':F.int(Number(r[k]))):r[k];tr.append(td);});return tr;}));};
  const LIM=new Map(rowsOf('li_imgs').map((r)=>[r.clave,r.img]));
  const tile=(p,i,{src,host,id,img,meta,metrics})=>{const t=document.createElement('article');t.className='spb-tile';t.id=id;
    const mk=(tag,cls,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source',src);e.setAttribute('data-field',field);e.setAttribute('data-where','post_id='+p.post_id);e.textContent=txt;return e;};
    const ph=document.createElement('div');ph.className='ph';if(img&&String(img).startsWith('data:image/jpeg;base64,')){const im=document.createElement('img');im.src=img;im.alt=p.titulo;im.loading='lazy';ph.append(im);}
    const rk=document.createElement('span');rk.className='rank';rk.textContent='#'+(i+1);ph.append(rk);
    const bd=document.createElement('div');bd.className='bd';const m=document.createElement('div');m.className='spb-kl';m.textContent=meta;
    const tt=document.createElement('div');tt.className='tt';const ti=mk('span','','titulo',p.titulo);if(String(p.url).startsWith(host)){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener';a.append(ti);tt.append(a);}else tt.append(ti);
    const mm=document.createElement('div');mm.className='mm';for(const [l,f] of metrics){if(p[f]==='')continue;const d=document.createElement('div');d.append(mk('b','',f,F.int(Number(p[f]))),l);mm.append(d);}
    bd.append(m,tt,mm);t.append(ph,bd);return t;};
  const lg=document.getElementById('li-gal');
  if(dash.data('li_posts').status==='error')failLine(lg);else{const P=rowsOf('li_posts').slice().sort((a,b)=>Number(b.impresiones)-Number(a.impresiones)).slice(0,12);
    if(P.length){lg.classList.remove('dash-skeleton');lg.replaceChildren(...P.map((p,i)=>tile(p,i,{src:'li_posts',host:'https://www.linkedin.com/',id:'li-'+p.post_id.replace(':','-'),img:LIM.get(p.post_id),meta:p.fecha.slice(8,10)+'/'+p.fecha.slice(5,7)+' · '+p.idioma+' · '+p.tema,metrics:[['impresiones','impresiones'],['reacciones','reacciones'],['clics','clics']]})));}}
  const gal=document.getElementById('ig-gal');
  if(dash.data('ig_posts').status==='error')failLine(gal);else{const P=rowsOf('ig_posts').slice().sort((a,b)=>Number(b.alcance)-Number(a.alcance));const IM=new Map(rowsOf('ig_imgs').map((r)=>[r.post_id,r.img]));
    if(P.length){gal.classList.remove('dash-skeleton');gal.replaceChildren(...P.map((p,i)=>{const t=document.createElement('article');t.className='spb-tile';t.id='ig-'+p.post_id;
      const mk=(tag,cls,src,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source',src);e.setAttribute('data-field',field);e.setAttribute('data-where','post_id='+p.post_id);e.textContent=txt;return e;};
      const ph=document.createElement('div');ph.className='ph';const src=IM.get(p.post_id);
      if(src&&String(src).startsWith('data:image/jpeg;base64,')){const img=document.createElement('img');img.src=src;img.alt=p.titulo;img.loading='lazy';img.setAttribute('data-source','ig_imgs');img.setAttribute('data-where','post_id='+p.post_id);ph.append(img);}
      const rk=document.createElement('span');rk.className='rank';rk.textContent='#'+(i+1);ph.append(rk);
      const bd=document.createElement('div');bd.className='bd';const meta=document.createElement('div');meta.className='spb-kl';meta.textContent=p.fecha.slice(8,10)+'/'+p.fecha.slice(5,7)+' · '+p.formato+' · '+p.tema;
      const tt=document.createElement('div');tt.className='tt';if(String(p.url).startsWith('https://www.instagram.com/')){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener';a.append(mk('span','','ig_posts','titulo',p.titulo));tt.append(a);}else tt.append(mk('span','','ig_posts','titulo',p.titulo));
      const mm=document.createElement('div');mm.className='mm';const kv=(l,f,v)=>{const d=document.createElement('div');const b=mk('b','','ig_posts',f,v);d.append(b,l);return d;};
      mm.append(kv('alcance','alcance',F.int(Number(p.alcance))),kv('interacc.','interacciones',F.int(Number(p.interacciones))));if(p.seguidores!=='')mm.append(kv('seguid.','seguidores',F.int(Number(p.seguidores))));
      bd.append(meta,tt,mm);t.append(ph,bd);return t;}));}}
}

function drawMeta(){
  document.querySelectorAll('#meta [data-f][data-source], #meta .spb-note [data-source="meta_total"]').forEach((el)=>{const src=el.dataset.source;if(dash.data(src).status!=='ok')return;const d=dash.data(src).data;
    let row;if(el.hasAttribute('data-row'))row=d[Number(el.dataset.row)];else if(el.hasAttribute('data-where'))row=d.find((r)=>[...new URLSearchParams(el.getAttribute('data-where'))].every(([k,v])=>String(r[k])===v));else row=d;
    if(!row)return;const v=row[el.dataset.field];const f=el.dataset.f;el.textContent=f?fmt(Number(v),f):v;});
  const sem=document.getElementById('ch-meta-sem');const cpf=document.getElementById('ch-meta-cpf');
  if(dash.data('meta_sem').status==='error'){failLine(sem);failLine(cpf);}else{const r=rowsOf('meta_sem').filter((x)=>x.inversion_eur>0||x.ganados>0);if(r.length){sem.classList.remove('dash-skeleton');cpf.classList.remove('dash-skeleton');
    wbars(sem,r.map((x)=>({...x,inicio:x.inicio_semana})),{keys:['resto','paid'],colors:['var(--cds-chart-muted)',RED],tip:(d)=>[`Paid: ${F.int(d.paid)}`,`Resto: ${F.int(d.resto)}`,`Ganados (Metricool): ${F.int(d.ganados)}`,`Inversión: ${F.eur(d.inversion_eur)}`,`CPF: ${fmt(d.cpf,'eur2')}`].concat(d.completa?[]:['Semana incompleta'])});
    weekly(cpf,r.filter((x)=>x.inversion_eur>0),'cpf');}}
  const dim=dash.params().mdim||'tier';document.getElementById('mdimname').textContent={tier:'tier',tema:'tema',formato:'formato',idioma:'idioma'}[dim];
  document.querySelectorAll('#mdimchips [data-mdim]').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.mdim===dim)));
  const de=document.getElementById('ch-meta-dims');if(dash.data('meta_dims').status==='error')failLine(de);else{const r=rowsOf('meta_dims').filter((x)=>x.dim===dim&&x.cpf!=null).sort((a,b)=>a.cpf-b.cpf);
    if(r.length){de.classList.remove('dash-skeleton');const best=r[0].valor;hbars(de,r,{label:(d)=>d.valor,value:(d)=>d.cpf,vf:(v)=>fmt(v,'eur2'),note:(d)=>`${F.int(d.seguidores)} seg. · ${F.d2(d.seg_mil)}‰ · ${F.eur(d.inversion_eur)}`,color:(d)=>d.valor===best?RED:'var(--cds-chart-muted)'});}}
  const gal=document.getElementById('meta-gal');
  if(dash.data('meta_piezas').status==='error')failLine(gal);else{const P=rowsOf('meta_piezas').slice().sort((a,b)=>b.seguidores-a.seguidores).slice(0,12);const IM=new Map(rowsOf('meta_imgs').map((r)=>[r.post_ig,r.img]));
    if(P.length){gal.classList.remove('dash-skeleton');gal.replaceChildren(...P.map((p,i)=>{const t=document.createElement('article');t.className='spb-tile';t.id='mp-'+p.post_ig;
      const mk=(tag,cls,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source','meta_piezas');e.setAttribute('data-field',field);e.setAttribute('data-where','post_ig='+encodeURIComponent(p.post_ig));e.textContent=txt;return e;};
      const ph=document.createElement('div');ph.className='ph';const src=IM.get(p.post_ig);
      if(src&&String(src).startsWith('data:image/jpeg;base64,')){const img=document.createElement('img');img.src=src;img.alt=p.pieza;img.loading='lazy';img.setAttribute('data-source','meta_imgs');img.setAttribute('data-where','post_ig='+encodeURIComponent(p.post_ig));ph.append(img);}
      const rk=document.createElement('span');rk.className='rank';rk.textContent='#'+(i+1);ph.append(rk);
      const bd=document.createElement('div');bd.className='bd';const meta=document.createElement('div');meta.className='spb-kl';meta.textContent=p.fecha_post.slice(8,10)+'/'+p.fecha_post.slice(5,7)+' · '+p.formato+' · '+p.idiomas+' · '+p.tiers;
      const tt=document.createElement('div');tt.className='tt';if(String(p.url).startsWith('https://www.instagram.com/')){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener';a.append(mk('span','','pieza',p.pieza));tt.append(a);}else tt.append(mk('span','','pieza',p.pieza));
      const mm=document.createElement('div');mm.className='mm';const kv=(l,f,v)=>{const d=document.createElement('div');d.append(mk('b','',f,v),l);return d;};
      mm.append(kv('seguid.','seguidores',F.int(p.seguidores)),kv('CPF','cpf',fmt(p.cpf,'eur2')),kv('invertido','inversion_eur',F.eur(p.inversion_eur)));
      bd.append(meta,tt,mm);t.append(ph,bd);return t;}));}}
  const q=document.getElementById('mq').value.trim().toLowerCase();const allP=rowsOf('meta_piezas_det');drawFilters('ig-filt','ig_',allP);
  let P=applyFilters(allP,'ig_').sort((a,b)=>b.seguidores-a.seguidores||b.inversion_eur-a.inversion_eur);if(q)P=P.filter((p)=>(p.pieza+' '+p.post_ig).toLowerCase().includes(q));
  document.getElementById('ig-count').textContent=P.length===allP.length?`${allP.length} filas`:`${P.length} de ${allP.length} filas`;
  const enc=(s)=>encodeURIComponent(s);
  document.querySelector('#t-meta-piezas tbody').replaceChildren(...P.map((p)=>{const tr=document.createElement('tr');tr.dataset.key=enc(p.post_ig)+','+enc(p.tier)+','+enc(p.idioma);
    const vals=[[p.pieza],[p.tier],[p.idioma],[p.fecha_post.slice(8,10)+'/'+p.fecha_post.slice(5,7)],[p.tema],[p.formato],[F.eur(p.inversion_eur),'num'],[F.int(p.impresiones),'num'],[F.int(p.seguidores),'num'],[fmt(p.cpf,'eur2'),'num'],[fmt(p.ctr,'pct2'),'num']];
    vals.forEach(([t,c],i)=>{const td=document.createElement('td');if(c)td.className=c;if(i===0&&String(p.url).startsWith('https://www.instagram.com/')){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener';a.textContent=t;td.append(a);}else td.textContent=t;tr.append(td);});return tr;}));
  const ES={ACTIVE:'Activa',PAUSED:'Pausada'};const cr=new Map(rowsOf('meta_camp_ratios').map((r)=>[r.campaign_id,r]));
  document.querySelector('#t-meta-camp tbody').replaceChildren(...rowsOf('meta_campanas').slice().sort((a,b)=>Number(b.inversion_eur)-Number(a.inversion_eur)).map((c)=>{const tr=document.createElement('tr');tr.dataset.key=c.campaign_id;const x=cr.get(c.campaign_id);
    for(const [t,cl] of [[c.etiqueta],[ES[c.estado]||c.estado],[c.inicio],[c.fin||'—'],[F.eur(Number(c.inversion_eur)),'num'],[F.int(Number(c.impresiones)),'num'],[F.int(Number(c.alcance)),'num'],[F.d1(Number(c.frecuencia)),'num'],[x?F.int(x.seguidores):'—','num'],[fmt(x?.cpf,'eur2'),'num']]){const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);}return tr;}));
  document.querySelector('#t-meta-mes tbody').replaceChildren(...rowsOf('meta_mes').map((m)=>{const tr=document.createElement('tr');tr.dataset.key=m.mes;
    for(const [t,c] of [[m.etiqueta],[String(m.dias)],[F.eur(m.inversion_eur),'num'],[F.int(m.impresiones),'num'],[F.int(m.seguidores),'num'],[fmt(m.cpf,'eur2'),'num']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
  const pl=document.getElementById('ch-meta-plat');if(dash.data('meta_plat').status==='error')failLine(pl);else{const r=rowsOf('meta_plat');if(r.length){pl.classList.remove('dash-skeleton');
    wbars(pl,r,{keys:['instagram','facebook'],colors:[RED,'var(--cds-chart-muted)'],tip:(d)=>[`Instagram: ${F.eur(d.instagram)}`,`Facebook: ${F.eur(d.facebook)}`]});}}
}

/* two-series weekly lines */
function lines2(el,rows,{a,b,ca,cb,la,lb,tf,log}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),H=240;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const vals=rows.flatMap((d)=>[d[a],d[b]]).filter((v)=>v!=null&&v>0);const lo=log?Math.max(0.1,d3.min(vals)*0.8):0,hi=d3.max(vals)||1;
  const y=(log?d3.scaleLog([lo,hi],[H-24,10]):d3.scaleLinear([0,hi],[H-24,10])).nice();
  const ticks=log?y.ticks(4).filter((v,i,arr)=>arr.length<=6||[1,2,5].includes(Number(String(v)[0]))):y.ticks(4);
  const ml=measure(svg,ticks.map(tf))+10;const x=d3.scalePoint(rows.map((d)=>d.semana),[ml+8,W-10]);
  svg.append('g').attr('transform',`translate(${ml},0)`).call(d3.axisLeft(y).tickValues(ticks).tickFormat(tf).tickSize(-(W-ml-6))).call(cleanAxis).call((g)=>g.select('.domain').remove());
  const step=Math.ceil(rows.length/(W/46));svg.append('g').attr('transform',`translate(0,${H-24})`).call(d3.axisBottom(x).tickValues(rows.map((d)=>d.semana).filter((d,i)=>i%step===0)).tickFormat(wk).tickSize(0).tickPadding(8)).call(cleanAxis);
  for(const [k,c] of [[a,ca],[b,cb]]){const pts=rows.filter((d)=>d[k]!=null&&d[k]>0);
    svg.append('path').datum(pts).attr('d',d3.line().x((d)=>x(d.semana)).y((d)=>y(d[k]))).attr('fill','none').attr('stroke',c).attr('stroke-width',2).attr('stroke-linejoin','round').attr('stroke-linecap','round');
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx',(d)=>x(d.semana)).attr('cy',(d)=>y(d[k])).attr('r',3.5).attr('fill',c).attr('opacity',(d)=>d.completa?1:.45);}
  const t=tipFor(el);const bw=x.step();
  svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)-bw/2).attr('width',bw).attr('y',0).attr('height',H-24).attr('fill','transparent')
    .on('mousemove',(ev,d)=>showTip(el,t,ev,[`Semana ${d.semana.slice(-2)} · desde ${d.inicio}${d.completa?'':' (incompleta)'}`,`${la}: ${d[a]==null?'—':tf(d[a])}`,`${lb}: ${d[b]==null?'—':tf(d[b])}`])).on('mouseleave',()=>hideTip(t));
  el.style.minHeight=H+'px';
}
function fillMarks(scope){document.querySelectorAll(scope+' [data-f][data-source]').forEach((el)=>{const src=el.dataset.source;if(dash.data(src).status!=='ok')return;const d=dash.data(src).data;
  let row;if(el.hasAttribute('data-row'))row=d[Number(el.dataset.row)];else if(el.hasAttribute('data-where'))row=d.find((r)=>[...new URLSearchParams(el.getAttribute('data-where'))].every(([k,v])=>String(r[k])===v));else row=d;
  if(row)el.textContent=fmt(Number(row[el.dataset.field]),el.dataset.f);});}
function drawObjetivos(){
  const tb=document.querySelector('#t-objseg tbody');const sum=document.getElementById('obj-sum');
  if(dash.data('obj_seguidores').status==='error'||dash.data('obj_red').status==='error'){if(tb)failLine(tb);if(sum)failLine(sum);return;}
  const gi=(v)=>new Intl.NumberFormat('es-ES',{useGrouping:'always',maximumFractionDigits:0}).format(v);const dm=(d)=>Number(d.slice(8,10))+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Number(d.slice(5,7))-1];
  const rr=new Map(rowsOf('obj_red').map((r)=>[r.red,r]));const rows=rowsOf('obj_seguidores');if(!rows.length||!rr.size)return;
  const tot=dash.data('obj_total').data;document.querySelectorAll('[data-source="obj_total"][data-field="hasta"]').forEach((e)=>{if(tot&&tot.hasta)e.textContent=dm(tot.hasta);});
  const prog=(c)=>{const pg=document.createElement('div');pg.className='spb-prog';const t=document.createElement('div');t.className='tr';const i=document.createElement('i');i.style.width=Math.min(100,(c.avance||0)*100)+'%';if(c.avance>=0.9)i.className='hi';t.append(i);const v=document.createElement('span');v.textContent=fmt(c.avance,'pct');pg.append(t,v);return pg;};
  const pill=(o)=>{const c=rr.get(o.red)||{};const done=c.avance>=1;const pl=document.createElement('span');pl.className='spb-pill'+(done?' ok':'');pl.textContent=done?'Cumplido':(o.estado==='No lanzado'?'Pendiente':o.estado);return pl;};
  const build=(cols)=>rows.map((o)=>{const c=rr.get(o.red)||{};const tr=document.createElement('tr');tr.dataset.key=o.red;
    for(const [k,cl] of cols){const e=document.createElement('td');if(cl)e.className=cl;
      if(k==='red')e.textContent=o.red;else if(k==='objetivo')e.textContent=gi(Number(o.objetivo_anual));else if(k==='a30')e.textContent=gi(Number(o.conseguidos));
      else if(k==='desde')e.textContent=c.desde_30sep==null?'sin dato':(c.desde_30sep>=0?'+':'−')+gi(Math.abs(c.desde_30sep));
      else if(k==='hoy'){const b=document.createElement('b');b.textContent=gi(c.hoy);e.append(b);if(c.dato_hasta)e.append(' ',Object.assign(document.createElement('span'),{className:'spb-note',textContent:'a '+dm(c.dato_hasta)}));}
      else if(k==='faltan')e.textContent=c.faltan?gi(c.faltan):'—';else if(k==='avance')e.append(prog(c));else if(k==='estado')e.append(pill(o));tr.append(e);}return tr;});
  if(tb)tb.replaceChildren(...build([['red'],['objetivo','num'],['a30','num'],['desde','num'],['hoy','num'],['faltan','num'],['avance'],['estado']]));
  const td2=document.querySelector('#t-objdef tbody');if(td2)td2.replaceChildren(...build([['red'],['objetivo','num'],['hoy','num'],['avance'],['estado']]));
  if(!sum)return;const j=rows.map((o)=>({...o,...rr.get(o.red)}));const gap=j.slice().sort((x,y)=>y.faltan-x.faltan).slice(0,2);const best=j.slice().sort((x,y)=>y.avance-x.avance)[0];
  const done=j.filter((o)=>o.avance>=1),next=j.filter((o)=>o.avance<1&&o.estado==='Con ads').sort((x,y)=>y.faltan-x.faltan)[0];void gap;void best;
  sum.textContent=(done.length?'Objetivo cumplido: '+done.map((o)=>o.red+', al '+fmt(o.avance,'pct')).join(' y ')+'. ':'')+(next?'Con más recorrido: '+next.red+', con '+gi(next.faltan)+' seguidores pendientes.':'');
}
/* ---------- Resumen: titulares (learning → gráfico → recomendación) ---------- */
const MUTED='var(--cds-chart-muted)';
const TIT_MIN=5,TIT_MAX=10;
const DECISORES=new Set(['CXO','VP','Owner','Partner','Director']);
/* Catálogo de gráficos que puede citar data/resumen.json en «grafico». src: fuentes que usa (para el estado de carga y la trazabilidad). */
const GRAFICOS={
  objetivos:{src:['obj_red','obj_seguidores','obj_total'],tpl:'g-objetivos',chart:false,
    draw:()=>{fillMarks('#resumen');drawObjetivos();}},
  ig_ritmo:{src:['ig_ritmo'],legend:[['Crecimiento neto semanal',RED],['Ritmo necesario','line']],
    draw:(el)=>{const d=dash.data('ig_ritmo').data;if(!d.rows.length)return false;
      wbars(el,d.rows,{keys:['netos'],colors:[RED],ref:d.necesario!=null?{value:d.necesario,label:'Necesario: '+F.int(Math.round(d.necesario))+' por semana'}:null,
        tip:(r)=>[`Crecimiento neto: ${F.int(r.netos)}`,`Necesario: ${F.int(Math.round(d.necesario))}`]});}},
  cpf_canal:{src:['serie','meta_sem','canales'],tpl:'g-canales',legend:[['LinkedIn (sin atípico)',MUTED],['Instagram',RED]],
    draw:(el)=>{fillMarks('#resumen');const m=new Map();const get=(w,d)=>{let g=m.get(w);if(!g){g={semana:w,inicio:d,li_inv:0,li_seg:0,ig_inv:0,ig_seg:0,completa:true};m.set(w,g);}return g;};
      for(const r of rowsOf('serie')){if(r.vista!=='limpio')continue;const g=get(r.semana,r.inicio_semana);g.li_inv+=r.inversion_eur;g.li_seg+=r.seguidores;if(!r.completa)g.completa=false;}
      for(const r of rowsOf('meta_sem')){if(!(r.inversion_eur>0))continue;const g=get(r.semana,r.inicio_semana);g.ig_inv+=r.inversion_eur;g.ig_seg+=r.paid;if(!r.completa)g.completa=false;}
      const rows=[...m.values()].map((g)=>({...g,li_cpf:g.li_seg?g.li_inv/g.li_seg:null,ig_cpf:g.ig_seg?g.ig_inv/g.ig_seg:null})).sort((x,y)=>x.semana<y.semana?-1:1);if(!rows.length)return false;
      lines2(el,rows,{a:'li_cpf',b:'ig_cpf',ca:MUTED,cb:RED,la:'LinkedIn',lb:'Instagram',tf:(v)=>nf(v<10?2:0).format(v)+' €',log:true});}},
  ig_temas_cpf:{src:['meta_dims'],
    draw:(el)=>{const r=rowsOf('meta_dims').filter((x)=>x.dim==='tema'&&x.cpf!=null).sort((x,y)=>x.cpf-y.cpf);if(!r.length)return false;
      hbars(el,r,{label:(d)=>d.valor,value:(d)=>d.cpf,vf:(v)=>fmt(v,'eur2'),note:(d)=>`${F.int(d.seguidores)} seg. · ${F.eur(d.inversion_eur)}`,color:(d)=>d.cpf<1?RED:MUTED});}},
  tier_cpf:{src:['dims','meta_dims'],legend:[['LinkedIn',MUTED],['Instagram',RED]],
    draw:(el)=>{const li=new Map(rowsOf('dims').filter((x)=>x.vista==='todo'&&x.dim==='tier').map((x)=>[x.valor,x.cpf]));const ig=new Map(rowsOf('meta_dims').filter((x)=>x.dim==='tier').map((x)=>[x.valor,x.cpf]));
      const r=[...new Set([...li.keys(),...ig.keys()])].filter(Boolean).sort().map((t)=>({tier:t,li:li.get(t)??0,ig:ig.get(t)??0}));if(!r.length)return false;
      pairs(el,r,{label:(d)=>d.tier,a:'li',b:'ig',ca:MUTED,cb:RED,fmt:(v)=>v?fmt(v,'eur2'):'—'});}},
  org_temas_ig:{src:['org_temas'],
    draw:(el)=>{const r=rowsOf('org_temas').filter((x)=>x.red==='Instagram').sort((x,y)=>y.media-x.media);if(!r.length)return false;const top=r[0].tema;
      hbars(el,r,{label:(d)=>d.tema,value:(d)=>d.media,vf:F.int,note:(d)=>`${d.n} publ.`,color:(d)=>d.tema===top?RED:MUTED});}},
  es_en:{src:['es_en'],legend:[['Español',RED],['Inglés',MUTED]],
    draw:(el)=>{const r=rowsOf('es_en');if(!r.length)return false;
      gbars(el,r,{label:(d)=>d.fecha.slice(8,10)+'/'+d.fecha.slice(5,7),a:'es',b:'en',ca:RED,cb:MUTED,la:'Español',lb:'Inglés',tf:F.int});}},
  ig_semanal:{src:['meta_sem'],legend:[['Paid (Meta Ads)',RED],['Resto',MUTED]],
    draw:(el)=>{const r=rowsOf('meta_sem').filter((x)=>Number(x.ganados)>0||Number(x.paid)>0).map((x)=>({semana:x.semana,inicio:x.inicio_semana,paid:Number(x.paid)||0,resto:Math.max(Number(x.resto)||0,0),completa:x.completa}));if(!r.length)return false;
      wbars(el,r,{keys:['paid','resto'],colors:[RED,MUTED],tip:(d)=>[`Paid: ${F.int(d.paid)}`,`Resto: ${F.int(d.resto)}`,...(d.completa?[]:['Semana incompleta'])]});}},
  li_piezas:{src:['semanal','campanas'],
    draw:(el)=>{const cp=new Map(rowsOf('campanas').map((c)=>[String(c.campaign_id),c]));const g=new Map();
      for(const w of rowsOf('semanal')){if(w.semana<'2026-W42')continue;const c=cp.get(String(w.campaign_id));if(!c)continue;const NM={GraficoSemanal:'Gráfico semanal','Recomendacao Mensal':'Recomendação Mensal','Quote Bruno Molino Minuto a fondo':'Bruno Molino · Minutos a Fundo','Video Live Encontro Digital':'Live Encontro Digital','Wealth Planing':'Wealth Planning','Blog CLN':'Blog Credit Linked Notes'};const base=String(c.pieza).replace(/\s*-\s*(BRA|ES|EN|MX)\s*$/,'');const k=(NM[base]||base)+' · '+c.idioma;
        const o=g.get(k)||{k,inv:0,seg:0};o.inv+=Number(w.inversion_eur)||0;o.seg+=Number(w.seguidores)||0;g.set(k,o);}
      const all=[...g.values()];const avg=all.reduce((s,o)=>s+o.inv,0)/Math.max(1,all.reduce((s,o)=>s+o.seg,0));
      const r=all.filter((o)=>o.seg>=10).map((o)=>({...o,cpf:o.inv/o.seg})).sort((x,y)=>x.cpf-y.cpf);if(!r.length)return false;
      hbars(el,r,{label:(d)=>d.k,value:(d)=>d.cpf,vf:(v)=>fmt(v,'eur2'),note:(d)=>`${F.int(d.seg)} seg. · ${F.eur(d.inv)}`,color:(d)=>d.cpf<avg?RED:MUTED});}},
  seniority:{src:['aud_sen'],
    draw:(el)=>{const r=rowsOf('aud_sen').slice().sort((x,y)=>y.seg_mil-x.seg_mil);if(!r.length)return false;
      hbars(el,r,{label:(d)=>d.seniority,value:(d)=>d.seg_mil,vf:(v)=>F.d1(v)+'‰',note:(d)=>F.pct(d.pct_impr)+' de impr.',color:(d)=>DECISORES.has(d.seniority)?RED:MUTED});}},
};
let titKey='';
function buildTitulares(box,rows){
  const mk=(tag,cls,r,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(field){e.setAttribute('data-source','resumen');e.setAttribute('data-field',field);e.setAttribute('data-where','id='+r.id);}if(txt!=null)e.textContent=txt;return e;};
  const kick=(n,txt)=>{const k=document.createElement('div');k.className='spb-tit-k';if(n){const b=document.createElement('span');b.className='n';b.textContent=n;k.append(b);}k.append(txt);return k;};
  box.replaceChildren(...rows.map((r,i)=>{const n=String(i+1).padStart(2,'0');const art=document.createElement('article');art.className='spb-tit';art.id='tit-'+r.id;
    // 1 · Learning
    const h=document.createElement('header');h.className='spb-tit-h';const hn=document.createElement('span');hn.className='n';hn.textContent=n;const ht=document.createElement('span');ht.className='t';ht.textContent=r.nombre||r.grafico_titulo||'';if(r.nombre){ht.setAttribute('data-source','resumen');ht.setAttribute('data-field','nombre');ht.setAttribute('data-where','id='+r.id);}h.append(hn,ht);
    const l=document.createElement('div');l.className='spb-card spb-tit-l';
    const cf=document.createElement('div');cf.className='spb-tit-cifra';cf.append(mk('span','spb-icifra',r,'cifra',r.cifra),mk('span','spb-note',r,'cifra_label',r.cifra_label));
    l.append(kick('','Learning'),cf,mk('p','spb-titular',r,'learning',r.learning));if(r.detalle)l.append(mk('p','spb-tit-d',r,'detalle',r.detalle));
    // 2 · Gráfico
    const g=document.createElement('div');g.className='spb-card spb-tit-g';const G=GRAFICOS[r.grafico];
    g.append(kick('','Gráfico'),mk('h3','',r,'grafico_titulo',r.grafico_titulo));if(r.grafico_nota)g.append(mk('p','spb-note',r,'grafico_nota',r.grafico_nota));
    const body=document.createElement('div');body.className='spb-tit-body';g.append(body);
    if(!G){const f=document.createElement('p');f.className='spb-note';f.textContent='Gráfico no disponible ('+r.grafico+').';body.append(f);}
    else{if(G.tpl)body.append(document.getElementById(G.tpl).content.cloneNode(true));
      if(G.chart!==false){const c=document.createElement('div');c.className='spb-chart dash-skeleton';c.id='ch-tit-'+r.id;c.setAttribute('data-source',G.src.join(' '));if(G.tpl)c.style.marginTop='var(--cds-gap-md)';body.append(c);
        if(G.legend){const lg=document.createElement('div');lg.className='spb-legend';for(const [t,col] of G.legend){const sp=document.createElement('span');const sw=document.createElement('i');sw.className=col==='line'?'spb-sw spb-sw-line':'spb-sw';if(col!=='line')sw.style.background=col;sp.append(sw,t);lg.append(sp);}body.append(lg);}}}
    // 3 · Recomendación
    const rc=document.createElement('div');rc.className='spb-card spb-tit-r';rc.append(kick('','Recomendación'),mk('p','',r,'recomendacion',r.recomendacion));
    if(r.ref){const meta=document.createElement('div');meta.className='spb-tit-meta';const a=document.createElement('a');a.href='#lectura';a.textContent='Ver análisis en Lectura IA';a.dataset.ref=r.ref;meta.append(a);rc.append(meta);}art.append(h,l,g,rc);return art;}));
}
function drawOverview(){
  const box=document.getElementById('tit-list');const st=dash.data('resumen').status;
  if(st==='error'){failLine(box);titKey='';return;}if(st!=='ok')return;
  const rows=rowsOf('resumen').slice().sort((a,b)=>Number(a.orden)-Number(b.orden)).slice(0,TIT_MAX);
  if(rows.length<TIT_MIN)console.warn(`Resumen: ${rows.length} titulares (mínimo ${TIT_MIN})`);
  const key=rows.map((r)=>r.id+':'+r.grafico+':'+(r.nombre||'')).join('|');if(key!==titKey){buildTitulares(box,rows);titKey=key;}box.classList.remove('dash-skeleton');box.style.minHeight='';
  for(const r of rows){const G=GRAFICOS[r.grafico];if(!G)continue;const el=document.getElementById('ch-tit-'+r.id);
    const sts=G.src.map((s)=>dash.data(s).status);
    if(sts.includes('error')){if(el)failLine(el);else G.draw();continue;}if(sts.some((x)=>x!=='ok'))continue;
    if(el){el.querySelector('.spb-fail')?.remove();if(G.draw(el)!==false)el.classList.remove('dash-skeleton');}else G.draw();}
}
document.getElementById('tit-list').addEventListener('click',(e)=>{const a=e.target.closest('a[data-ref]');if(!a)return;e.preventDefault();stopWall();show('lectura');
  requestAnimationFrame(()=>document.getElementById('ia-'+a.dataset.ref)?.scrollIntoView({behavior:'smooth',block:'start'}));});

/* filter chips: one choice per dimension, kept in dash params */
const FDIMS=[['tier','Tier'],['idioma','Idioma'],['formato','Formato'],['tema','Tema']];
function drawFilters(boxId,prefix,rows){const box=document.getElementById(boxId);const p=dash.params();
  box.replaceChildren(...FDIMS.map(([k,l])=>{const row=document.createElement('div');row.className='fr';const lab=document.createElement('span');lab.className='fl';lab.textContent=l;row.append(lab);
    const vals=[...new Set(rows.map((r)=>r[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));const cur=p[prefix+k]??null;
    for(const v of [null,...vals]){const b=document.createElement('button');b.className='spb-chip';b.type='button';b.textContent=v??'Todos';b.setAttribute('aria-pressed',String(cur===v));b.dataset.k=prefix+k;b.dataset.v=v??'';row.append(b);}
    return row;}));}
function applyFilters(rows,prefix){const p=dash.params();return rows.filter((r)=>FDIMS.every(([k])=>{const v=p[prefix+k];return v==null||r[k]===v;}));}
for(const [id] of [['li-filt'],['ig-filt']])document.getElementById(id).addEventListener('click',(e)=>{const b=e.target.closest('button[data-k]');if(b)dash.setParams({[b.dataset.k]:b.dataset.v||null});});

/* ---------- tabs & wall ---------- */
const tabs=[...document.querySelectorAll('.spb-tab')];
const pages=[...document.querySelectorAll('.spb-pg')];
let current='resumen';
function show(id,link=true){current=id;tabs.forEach((t)=>t.setAttribute('aria-selected',String(t.dataset.tab===id)));
  pages.forEach((p)=>{const on=p.dataset.tab===id;p.hidden=!on;p.classList.toggle('on',on);});draw();if(link)dash.setLink(id);}
tabs.forEach((t)=>t.addEventListener('click',()=>{stopWall();show(t.dataset.tab);}));
let wall=null,wallT0=0;const WALL_MS=15000;const bar=document.getElementById('wallbar');const wbtn=document.getElementById('muro');
function stopWall(){if(wall){clearInterval(wall);wall=null;}bar.hidden=true;wbtn.textContent='▶ Modo muro';document.getElementById('spb').classList.remove('spb-wall');}
wbtn.addEventListener('click',()=>{if(wall){stopWall();return;}document.getElementById('spb').classList.add('spb-wall');bar.hidden=false;wbtn.textContent='■ Parar muro';wallT0=Date.now();
  wall=setInterval(()=>{const e=Date.now()-wallT0;bar.firstElementChild.style.width=Math.min(100,e/WALL_MS*100)+'%';if(e>=WALL_MS){const order=['resumen','linkedin','meta','comunidad','lectura','audiencia','empresas','activaciones'];const i=order.indexOf(current);show(order[(i+1)%order.length],false);wallT0=Date.now();}},200);});
const lim=document.getElementById('limpio');lim.addEventListener('change',()=>dash.setParams({vista:lim.checked?'limpio':'todo'}));
document.getElementById('dimchips').addEventListener('click',(e)=>{const b=e.target.closest('[data-dim]');if(b)dash.setParams({dim:b.dataset.dim});});
let sortKey='inversion_eur',sortDesc=true;
document.querySelector('#t-camp thead').addEventListener('click',(e)=>{const b=e.target.closest('button[data-s]');if(!b)return;const k=b.dataset.s;if(sortKey===k)sortDesc=!sortDesc;else{sortKey=k;sortDesc=b.hasAttribute('data-n');}draw();});
document.getElementById('q').addEventListener('input',()=>draw());
document.getElementById('mdimchips').addEventListener('click',(e)=>{const b=e.target.closest('[data-mdim]');if(b)dash.setParams({mdim:b.dataset.mdim});});
document.getElementById('mq').addEventListener('input',()=>draw());
document.getElementById('nivchips').addEventListener('click',(e)=>{const b=e.target.closest('[data-niv]');if(b)dash.setParams({enivel:b.dataset.niv});});
document.getElementById('eq').addEventListener('input',()=>draw());
document.getElementById('cmpchips').addEventListener('click',(e)=>{const b=e.target.closest('[data-cmp]');if(b)dash.setParams({ecmp:b.dataset.cmp});});

/* ---------- drawing ---------- */
function setText(el,txt){el.textContent=txt;el.classList.remove('dash-skeleton');}
function drawResumen(){
  const v=vista();const k=rowsOf('kpis').find((r)=>r.vista===v&&r.periodo==='actual');
  document.querySelectorAll('#kpis [data-k]').forEach((el)=>{el.setAttribute('data-source','kpis');el.setAttribute('data-field',el.dataset.k);el.setAttribute('data-where',`vista=${v}&periodo=actual`);
    if(dash.data('kpis').status==='error'){el.textContent='—';return;}if(k)setText(el,fmt(k[el.dataset.k],el.dataset.f));});
  document.querySelectorAll('#kpis [data-d]').forEach((el)=>{el.setAttribute('data-source','kpis');el.setAttribute('data-field',el.dataset.d);el.setAttribute('data-where',`vista=${v}&periodo=actual`);
    const d=k?k[el.dataset.d]:null;el.className='spb-kd';if(d==null){el.textContent='';return;}
    const good=el.dataset.good==='neutral'?null:(el.dataset.good==='up'?d>0:d<0);el.classList.add(Math.abs(d)<0.005?'spb-flat':good==null?'spb-flat':good?'spb-good':'spb-bad');
    el.textContent=(d>0?'+':d<0?'−':'')+nf(1).format(Math.abs(d)*100)+' % vs 4 sem. anteriores';});
  const rg=document.getElementById('rango');if(k)rg.textContent=`· semanas ISO ${k.desde.slice(-2)}–${k.hasta.slice(-2)}`;
  const s=rowsOf('serie').filter((r)=>r.vista===v);
  for(const [id,kind] of [['ch-seg','seg'],['ch-cpf','cpf'],['ch-imp','imp']]){const el=document.getElementById(id);
    if(dash.data('serie').status==='error'){failLine(el);continue;}if(!s.length)continue;el.classList.remove('dash-skeleton');el.querySelector('.spb-fail')?.remove();weekly(el,s,kind);}
  const tb=document.querySelector('#t-mes tbody');const mr=new Map(rowsOf('mensual_ratios').map((r)=>[r.mes,r]));
  tb.replaceChildren(...rowsOf('mensual').map((m)=>{const tr=document.createElement('tr');tr.dataset.key=m.mes;
    for(const [t,c] of [[m.etiqueta],[m.dias_con_datos],[F.eur(Number(m.inversion_eur)),'num'],[F.int(Number(m.impresiones)),'num'],[F.int(Number(m.clics)),'num'],[F.int(Number(m.seguidores)),'num'],[fmt(mr.get(m.mes)?.cpf,'eur2'),'num']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
  document.querySelector('#t-atip tbody').replaceChildren(...rowsOf('atipicas').slice().sort((a,b)=>b.impresiones-a.impresiones).map((c)=>{const tr=document.createElement('tr');tr.dataset.key=c.campaign_id;
    for(const [t,cl] of [[c.campana],[c.inicio],[c.fin],[F.eur(c.inversion_eur),'num'],[F.int(c.impresiones),'num'],[F.int(c.clics_landing),'num'],[F.int(c.clics),'num'],[F.int(c.seguidores),'num']]){const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;if(!cl)td.style.wordBreak='break-word';tr.append(td);}return tr;}));
}
function drawLectura(){
  const box=document.getElementById('ia-list');const st=dash.data('ia').status;if(st==='error'){failLine(box);return;}if(st!=='ok')return;box.classList.remove('dash-skeleton');box.style.minHeight='';
  const TIPO_RANK={Oportunidad:0,Aprendizaje:0,Alerta:1};const rk=(r)=>TIPO_RANK[r.tipo]??3;
  const rows=rowsOf('ia').filter((r)=>r.id!=='T0').sort((a,b)=>rk(a)-rk(b)||Number(a.orden)-Number(b.orden));
  box.replaceChildren(...rows.map((r,i)=>{const n=String(i+1).padStart(2,'0');const c=document.createElement('article');c.className='spb-band';c.dataset.tipo=r.tipo;c.id='ia-'+r.id;
    const mk=(tag,cls,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source','ia');e.setAttribute('data-field',field);e.setAttribute('data-where','id='+r.id);e.textContent=txt;return e;};
    const h=document.createElement('header');h.className='spb-band-h';
    const num=document.createElement('span');num.className='n';num.textContent=n;
    const ttl=document.createElement('div');ttl.className='tt';
    const tag=document.createElement('div');tag.className='spb-band-tag';const cf0=document.createElement('span');cf0.append('Confianza ',mk('span','','confianza',String(r.confianza||'').toLowerCase()));tag.append(mk('span','pill','tipo',r.tipo),cf0);
    ttl.append(tag,mk('h3','','titulo',r.titulo));
    const cf=document.createElement('div');cf.className='spb-band-cifra';cf.append(mk('div','spb-icifra','cifra',r.cifra),mk('div','spb-note','cifra_label',r.cifra_label));
    h.append(num,ttl,cf);
    const cols=document.createElement('div');cols.className='spb-band-cols';
    const col=(lbl,field,cls)=>{const d=document.createElement('div');d.className='spb-card spb-band-c'+(cls?' '+cls:'');const k=document.createElement('div');k.className='spb-tit-k';k.textContent=lbl;d.append(k,mk('p','',field,r[field]));return d;};
    cols.append(col('Qué vemos','hallazgo'),col('Por qué puede estar pasando','por_que','hip'),col('Qué haríamos','accion','act'));
    c.append(h,cols);return c;}));
}
function drawContenidos(){
  const v=vista();const dim=dash.params().dim||'tier';document.getElementById('dimname').textContent={tier:'tier',idioma:'idioma',tema:'tema',formato:'formato'}[dim];
  document.querySelectorAll('#dimchips [data-dim]').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.dim===dim)));
  const el=document.getElementById('ch-dims');
  if(dash.data('dims').status==='error')failLine(el);else{const rows=rowsOf('dims').filter((r)=>r.vista===v&&r.dim===dim&&r.cpf!=null).sort((a,b)=>a.cpf-b.cpf);
    if(rows.length){el.classList.remove('dash-skeleton');const best=rows[0].valor;hbars(el,rows,{label:(d)=>d.valor,value:(d)=>d.cpf,vf:(v)=>fmt(v,'eur2'),note:(d)=>`${F.int(d.seguidores)} seg. · ${F.d1(d.seg_mil)}‰`,color:(d)=>d.valor===best?RED:'var(--cds-chart-muted)'});}}
  const cl=document.getElementById('cre-list');const top=rowsOf('top_creatives');const cr=new Map(rowsOf('creatividades').map((c)=>[c.creative_id,c]));
  if(dash.data('creatividades').status==='error'||dash.data('top_creatives').status==='error')failLine(cl);
  else if(top.length&&cr.size){cl.classList.remove('dash-skeleton');cl.replaceChildren(...top.map((t)=>{const c=cr.get(t.creative_id);const a=document.createElement('article');a.className='spb-card spb-cre';
    const m=(tag,cls,src,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source',src);e.setAttribute('data-field',field);e.setAttribute('data-where','creative_id='+t.creative_id);e.textContent=txt;return e;};
    const badges=document.createElement('div');badges.style.display='flex';badges.style.gap='var(--cds-gap-xs)';badges.style.flexWrap='wrap';badges.append(m('span','spb-badge','creatividades','formato',c.formato),m('span','spb-badge','creatividades','idioma',c.idioma),m('span','spb-badge','creatividades','tier',c.tier));
    const row=document.createElement('div');row.className='row';
    const kv=(lbl,node)=>{const d=document.createElement('div');const l=document.createElement('div');l.className='meta';l.textContent=lbl;node.classList.add('v');d.append(l,node);return d;};
    row.append(kv('Seguidores',m('div','','creatividades','seguidores',F.int(Number(c.seguidores)))),kv('CPF',m('div','','top_creatives','cpf',fmt(t.cpf,'eur2'))),kv('Inversión',m('div','','creatividades','inversion_eur',F.eur(Number(c.inversion_eur)))));
    const LI=new Map(rowsOf('li_imgs').map((r)=>[r.clave,r.img]));const src=LI.get(c.ref_publicacion)||LI.get('creative:'+t.creative_id);
    if(src&&String(src).startsWith('data:image/jpeg;base64,')){const ph=document.createElement('div');ph.className='crimg';const im=document.createElement('img');im.src=src;im.alt=c.etiqueta;im.loading='lazy';ph.append(im);a.append(ph);}
    a.append(badges,m('div','meta','creatividades','etiqueta',c.etiqueta),m('div','copy','creatividades','copy',c.copy),row);return a;}));}
  const q=document.getElementById('q').value.trim().toLowerCase();const rat=new Map(rowsOf('camp_ratios').map((r)=>[r.campaign_id,r]));
  drawFilters('li-filt','li_',rowsOf('campanas'));let rows=applyFilters(rowsOf('campanas'),'li_').map((c)=>({...c,...(rat.get(c.campaign_id)||{})}));if(q)rows=rows.filter((r)=>(r.etiqueta+' '+r.campana).toLowerCase().includes(q));
  {const tot=rowsOf('campanas').length;document.getElementById('li-count').textContent=rows.length===tot?`${tot} campañas`:`${rows.length} de ${tot} campañas`;}
  const num=['inversion_eur','impresiones','seguidores','ctr','cpf'].includes(sortKey);rows.sort((a,b)=>{const x=num?Number(a[sortKey]??-1):String(a[sortKey]),y=num?Number(b[sortKey]??-1):String(b[sortKey]);return (x<y?-1:x>y?1:0)*(sortDesc?-1:1);});
  document.querySelectorAll('#t-camp th').forEach((th)=>{const b=th.querySelector('button');th.setAttribute('aria-sort',b&&b.dataset.s===sortKey?(sortDesc?'descending':'ascending'):'none');});
  const ES={ACTIVE:'Activa',PAUSED:'Pausada',COMPLETED:'Finalizada'};
  document.querySelector('#t-camp tbody').replaceChildren(...rows.map((r)=>{const tr=document.createElement('tr');tr.dataset.key=r.campaign_id;
    for(const [t,c] of [[r.etiqueta],[ES[r.estado]||r.estado],[r.formato],[F.eur(Number(r.inversion_eur)),'num'],[F.int(Number(r.impresiones)),'num'],[fmt(r.ctr,'pct2'),'num'],[F.int(Number(r.seguidores)),'num'],[fmt(r.cpf,'eur2'),'num'],[r.atipico||'—',r.atipico==='Sí'?'spb-flag':'']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
}
function drawAudiencia(){
  fillMarks('#audiencia');
  const ie=document.getElementById('ch-ig-edad');if(dash.data('ig_aud_edad_cmp').status==='error')failLine(ie);else{const r=rowsOf('ig_aud_edad_cmp');if(r.length){ie.classList.remove('dash-skeleton');pairs(ie,r,{label:(d)=>d.edad,a:'pct_impr',b:'pct_seg',ca:'var(--cds-chart-muted)',cb:RED,fmt:F.pct});}}
  const ip=document.getElementById('ch-ig-pais');if(dash.data('ig_aud_pais_cmp').status==='error')failLine(ip);else{const r=rowsOf('ig_aud_pais_cmp').slice().sort((a,b)=>Math.max(b.pct_seg,b.pct_inv)-Math.max(a.pct_seg,a.pct_inv));if(r.length){ip.classList.remove('dash-skeleton');pairs(ip,r,{label:(d)=>d.pais,a:'pct_inv',b:'pct_seg',ca:'var(--cds-chart-muted)',cb:RED,fmt:F.pct});}}
  const DEC=new Set(['CXO','VP','Owner','Partner','Director']);
  const s=document.getElementById('ch-sen');if(dash.data('aud_sen').status==='error')failLine(s);else{const r=rowsOf('aud_sen').slice().sort((a,b)=>b.seg_mil-a.seg_mil);if(r.length){s.classList.remove('dash-skeleton');hbars(s,r,{label:(d)=>d.seniority,value:(d)=>d.seg_mil,vf:(v)=>F.d1(v)+'‰',note:(d)=>F.pct(d.pct_impr)+' de impr.',color:(d)=>DEC.has(d.seniority)?RED:'var(--cds-chart-muted)'});}}
  const p=document.getElementById('ch-pais');if(dash.data('aud_pais').status==='error')failLine(p);else{const r=rowsOf('aud_pais').slice().sort((a,b)=>b.pct_seg-a.pct_seg);if(r.length){p.classList.remove('dash-skeleton');paired(p,r);}}
  const f=document.getElementById('ch-fun');if(dash.data('aud_fun').status==='error')failLine(f);else{const r=rowsOf('aud_fun').slice().sort((a,b)=>b.seg_mil-a.seg_mil);if(r.length){f.classList.remove('dash-skeleton');const mx=r[0].funcion;hbars(f,r,{label:(d)=>d.funcion,value:(d)=>d.seg_mil,vf:(v)=>F.d1(v)+'‰',color:(d)=>d.funcion===mx?RED:'var(--cds-chart-muted)'});}}
}
function drawEmpresas(){
  fillMarks('#empresas');
  const st=dash.data('empresas').status;const all=rowsOf('empresas').filter((r)=>!r.motivo);
  const top=document.getElementById('ch-emp-top');
  if(st==='error')failLine(top);else if(all.length){top.classList.remove('dash-skeleton');const r=all.slice().sort((a,b)=>b.interacciones-a.interacciones).slice(0,15);
    hbars(top,r,{label:(d)=>d.empresa.length>34?d.empresa.slice(0,33)+'…':d.empresa,value:(d)=>d.interacciones,vf:F.int,note:(d)=>F.pct(d.tasa)+' · '+d.nivel,color:(d)=>d.nivel==='Alto'||d.nivel==='Muy alto'?RED:'var(--cds-chart-muted)'});}
  const nv=document.getElementById('ch-emp-niv');const tot=dash.data('empresas_tot');
  if(tot.status==='error')failLine(nv);else if(tot.status==='ok'){nv.classList.remove('dash-skeleton');const t=tot.data;const k={'Muy alto':'muy_alto','Alto':'alto','Medio':'medio','Bajo':'bajo','Sin calificar':'sin_calificar'};
    hbars(nv,NIVELES.map((n)=>({n,v:t[k[n]]})),{label:(d)=>d.n,value:(d)=>d.v,vf:F.int,note:(d)=>F.pct(d.v/t.empresas)+' de las empresas',color:(d)=>d.n==='Alto'||d.n==='Muy alto'?RED:'var(--cds-chart-muted)'});}
  const niv=dash.params().enivel||'';document.querySelectorAll('#nivchips [data-niv]').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.niv===niv)));
  const q=document.getElementById('eq').value.trim().toLowerCase();
  let rows=all.filter((r)=>(!niv||r.nivel===niv)&&(!q||r.empresa.toLowerCase().includes(q)));
  rows.sort((a,b)=>NIVELES.indexOf(a.nivel)-NIVELES.indexOf(b.nivel)||b.interacciones-a.interacciones);
  document.getElementById('emp-count').textContent=rows.length===all.length?`${F.int(all.length)} empresas`:`${F.int(rows.length)} de ${F.int(all.length)} empresas`;
  const tb=document.querySelector('#t-emp tbody');if(st==='error'){failLine(tb);}else tb.replaceChildren(...rows.map((r)=>{const tr=document.createElement('tr');tr.dataset.key=encodeURIComponent(r.empresa);
    const td=(t,cl)=>{const e=document.createElement('td');if(t!=null)e.textContent=t;if(cl)e.className=cl;tr.append(e);return e;};
    td(r.empresa);const n=td();const pl=document.createElement('span');pl.className='spb-nv';pl.dataset.n=r.nivel;pl.textContent=r.nivel;n.append(pl);
    td(F.int(r.impresiones),'num');td(F.int(r.clics),'num');td(F.int(r.interacciones),'num');td(fmt(r.tasa,'pct'),'num');return tr;}));
  const dim=dash.params().ecmp||'pais';document.querySelectorAll('#cmpchips [data-cmp]').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.cmp===dim)));
  const cm=document.getElementById('ch-emp-cmp');
  if(dash.data('aud_cmp').status==='error')failLine(cm);else{const r=rowsOf('aud_cmp').filter((d)=>d.dimension===dim).map((d)=>({...d,pct_ads:Number(d.pct_ads),pct_seg:Number(d.pct_seg)}))
    .sort((a,b)=>Math.max(b.pct_ads,b.pct_seg)-Math.max(a.pct_ads,a.pct_seg)).slice(0,14);
    if(r.length){cm.classList.remove('dash-skeleton');pairs(cm,r,{label:(d)=>d.segmento,a:'pct_ads',b:'pct_seg',ca:'var(--cds-chart-muted)',cb:RED,fmt:F.pct});}}
}
function drawActivaciones(){
  const b=new Map(rowsOf('boosts').map((r)=>[r.campaign_id,r]));
  document.querySelector('#t-boost tbody').replaceChildren(...rowsOf('campanas').filter((c)=>b.has(c.campaign_id)).sort((x,y)=>x.etiqueta<y.etiqueta?-1:1).map((c)=>{const tr=document.createElement('tr');tr.dataset.key=c.campaign_id;
    for(const [t,cl] of [[c.etiqueta],[c.inicio],[c.fin],[c.presupuesto_eur?F.eur(Number(c.presupuesto_eur)):'—','num'],[F.eur(Number(c.inversion_eur)),'num'],[fmt(b.get(c.campaign_id).ejecutado,'pct'),'num'],[F.int(Number(c.seguidores)),'num']]){const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);}return tr;}));
  const ma=new Map(rowsOf('meta_activas').map((r)=>[r.campaign_id,r]));
  document.querySelector('#t-meta-boost tbody').replaceChildren(...rowsOf('meta_campanas').filter((c)=>ma.has(c.campaign_id)).sort((x,y)=>x.etiqueta<y.etiqueta?-1:1).map((c)=>{const tr=document.createElement('tr');tr.dataset.key=c.campaign_id;
    for(const [t,cl] of [[c.etiqueta],[c.inicio],[c.fin||'—'],[F.eur(Number(c.inversion_eur)),'num']]){const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);}return tr;}));
}
function drawConexiones(){
  const enc=(s)=>encodeURIComponent(s);fillMarks('#conexiones');
  drawObjetivos();
  document.querySelector('#t-obj tbody').replaceChildren(...rowsOf('objetivos').map((o)=>{const tr=document.createElement('tr');tr.dataset.key=enc(o.kpi)+','+enc(o.canal);
    for(const [t,c] of [[o.kpi],[o.canal],[o.unidad],[o.objetivo_mensual||'—'],[o.objetivo_anual||'—'],[o.estado,'spb-pend']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
}
function draw(){
  const t=rowsOf('ia').find((r)=>r.id==='T0');if(t)setText(document.getElementById('titular'),t.titulo);
  document.querySelectorAll('[data-source="ia"][data-where="id=T0"]').forEach((el)=>{if(t&&el.id!=='titular')el.textContent=t[el.dataset.field];});
  document.querySelectorAll('.spb-period [data-source="mensual"], [data-source="objetivos"][data-where]').forEach((el)=>{const src=el.dataset.source;const w=new URLSearchParams(el.getAttribute('data-where'));
    const r=rowsOf(src).find((x)=>[...w].every(([a,b])=>String(x[a])===b));if(r)el.textContent=el.dataset.field==='objetivo_mensual'?(r.objetivo_mensual?r.objetivo_mensual+' · ':''):r[el.dataset.field];});
  lim.checked=vista()==='limpio';
  ({resumen:drawOverview,linkedin:()=>{drawResumen();drawContenidos();},comunidad:drawComunidad,meta:drawMeta,lectura:drawLectura,audiencia:drawAudiencia,empresas:drawEmpresas,activaciones:drawActivaciones,conexiones:drawConexiones})[current]();
}
dash.onData(()=>draw());
const named=pages.find((p)=>p.id===location.hash.slice(1));show(named?named.id:'resumen',false);
