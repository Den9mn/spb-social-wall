
const NUM=['inversion_eur','impresiones','clics','clics_landing','clics_pagina','seguidores','interacciones','reacciones','comentarios','compartidos','visualizaciones_video'];

dash.calc('atipicas',{inputs:['campanas'],title:'Campañas con tráfico atípico',
  description:'Campañas con al menos 500 clics, 90% o más de clics a landing y menos de 0,2 seguidores por mil impresiones.',
  fn:(campanas)=>campanas.filter((c)=>{const cl=Number(c.clics);return cl>=500&&Number(c.clics_landing)/cl>=0.9&&Number(c.seguidores)/Number(c.impresiones)*1000<0.2;})
    .map((c)=>({campaign_id:c.campaign_id,etiqueta:c.etiqueta,inversion_eur:Number(c.inversion_eur),impresiones:Number(c.impresiones),clics:Number(c.clics),clics_landing:Number(c.clics_landing),seguidores:Number(c.seguidores)}))});

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

/* ---------- helpers ---------- */
const nf=(d)=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
const F={signed:(v)=>(v>0?'+':v<0?'−':'')+nf(0).format(Math.abs(v)),pct0:(v)=>v==null?'—':nf(0).format(v*100)+' %',txt:(v)=>String(v).slice(8,10)+'/'+String(v).slice(5,7),int:(v)=>nf(0).format(v),eur:(v)=>nf(0).format(v)+' €',eur2:(v)=>v==null?'—':nf(2).format(v)+' €',pct:(v)=>v==null?'—':nf(1).format(v*100)+' %',pct2:(v)=>v==null?'—':nf(2).format(v*100)+' %',
  compact:(v)=>new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1}).format(v),d1:(v)=>nf(1).format(v)};
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
function wbars(el,rows,{keys,colors,labels,tip}){
  el.querySelectorAll('svg').forEach((s)=>s.remove());const W=Math.max(el.clientWidth,280),H=230;
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const tot=(d)=>keys.reduce((s,k)=>s+(d[k]||0),0);const y=d3.scaleLinear([0,d3.max(rows,tot)||1],[H-24,10]).nice();
  const ml=measure(svg,y.ticks(4).map(F.int))+10;const x=d3.scaleBand(rows.map((d)=>d.semana),[ml,W-6]).padding(0.25);
  svg.append('g').attr('transform',`translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(F.int).tickSize(-(W-ml-6))).call(cleanAxis).call((g)=>g.select('.domain').remove());
  const step=Math.ceil(rows.length/(W/46));svg.append('g').attr('transform',`translate(0,${H-24})`).call(d3.axisBottom(x).tickValues(rows.map((d)=>d.semana).filter((d,i)=>i%step===0)).tickFormat(wk).tickSize(0).tickPadding(8)).call(cleanAxis);
  keys.forEach((k,i)=>{svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth())
    .attr('y',(d)=>y(keys.slice(0,i+1).reduce((s,kk)=>s+(d[kk]||0),0))).attr('height',(d)=>y(keys.slice(0,i).reduce((s,kk)=>s+(d[kk]||0),0))-y(keys.slice(0,i+1).reduce((s,kk)=>s+(d[kk]||0),0))).attr('fill',colors[i]);});
  const t=tipFor(el);svg.append('g').selectAll('rect').data(rows).join('rect').attr('x',(d)=>x(d.semana)).attr('width',x.bandwidth()).attr('y',0).attr('height',H-24).attr('fill','transparent')
    .on('mousemove',(ev,d)=>showTip(el,t,ev,[`Semana ${d.semana.slice(-2)} · desde ${d.inicio}`,...tip(d)])).on('mouseleave',()=>hideTip(t));
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
  wall=setInterval(()=>{const e=Date.now()-wallT0;bar.firstElementChild.style.width=Math.min(100,e/WALL_MS*100)+'%';if(e>=WALL_MS){const order=['resumen','comunidad','lectura','contenidos','audiencia','activaciones'];const i=order.indexOf(current);show(order[(i+1)%order.length],false);wallT0=Date.now();}},200);});
const lim=document.getElementById('limpio');lim.addEventListener('change',()=>dash.setParams({vista:lim.checked?'limpio':'todo'}));
document.getElementById('dimchips').addEventListener('click',(e)=>{const b=e.target.closest('[data-dim]');if(b)dash.setParams({dim:b.dataset.dim});});
let sortKey='inversion_eur',sortDesc=true;
document.querySelector('#t-camp thead').addEventListener('click',(e)=>{const b=e.target.closest('button[data-s]');if(!b)return;const k=b.dataset.s;if(sortKey===k)sortDesc=!sortDesc;else{sortKey=k;sortDesc=b.hasAttribute('data-n');}draw();});
document.getElementById('q').addEventListener('input',()=>draw());

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
}
function drawLectura(){
  const box=document.getElementById('ia-list');const st=dash.data('ia').status;if(st==='error'){failLine(box);return;}if(st!=='ok')return;box.classList.remove('dash-skeleton');
  const rows=rowsOf('ia').filter((r)=>r.id!=='T0').sort((a,b)=>Number(a.orden)-Number(b.orden));
  box.replaceChildren(...rows.map((r)=>{const c=document.createElement('article');c.className='spb-card spb-ins';c.dataset.tipo=r.tipo;c.id='ia-'+r.id;
    const mk=(tag,cls,field,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('data-source','ia');e.setAttribute('data-field',field);e.setAttribute('data-where','id='+r.id);e.textContent=txt;return e;};
    const tag=document.createElement('div');tag.className='spb-tag';const t1=mk('strong','','tipo',r.tipo);const t2=mk('span','','confianza',r.confianza);tag.append(t1,document.createTextNode('· Confianza:'),t2);
    const lb=(s)=>{const e=document.createElement('div');e.className='lbl';e.textContent=s;return e;};
    const own=document.createElement('div');own.className='spb-own';own.append(document.createTextNode('Responsable: '),mk('span','','responsable',r.responsable),document.createTextNode(' · Fecha: '),mk('span','','fecha',r.fecha));
    c.append(tag,mk('div','spb-icifra','cifra',r.cifra),mk('div','spb-note','cifra_label',r.cifra_label),mk('h3','','titulo',r.titulo),lb('Qué vemos'),mk('p','','hallazgo',r.hallazgo),lb('Por qué puede estar pasando'),mk('p','','por_que',r.por_que),lb('Qué haríamos'),mk('p','','accion',r.accion),own);return c;}));
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
  let rows=rowsOf('campanas').map((c)=>({...c,...(rat.get(c.campaign_id)||{})}));if(q)rows=rows.filter((r)=>(r.etiqueta+' '+r.campana+' '+r.formato+' '+r.estado).toLowerCase().includes(q));
  const num=['inversion_eur','impresiones','seguidores','ctr','cpf'].includes(sortKey);rows.sort((a,b)=>{const x=num?Number(a[sortKey]??-1):String(a[sortKey]),y=num?Number(b[sortKey]??-1):String(b[sortKey]);return (x<y?-1:x>y?1:0)*(sortDesc?-1:1);});
  document.querySelectorAll('#t-camp th').forEach((th)=>{const b=th.querySelector('button');th.setAttribute('aria-sort',b&&b.dataset.s===sortKey?(sortDesc?'descending':'ascending'):'none');});
  const ES={ACTIVE:'Activa',PAUSED:'Pausada',COMPLETED:'Finalizada'};
  document.querySelector('#t-camp tbody').replaceChildren(...rows.map((r)=>{const tr=document.createElement('tr');tr.dataset.key=r.campaign_id;
    for(const [t,c] of [[r.etiqueta],[ES[r.estado]||r.estado],[r.formato],[F.eur(Number(r.inversion_eur)),'num'],[F.int(Number(r.impresiones)),'num'],[fmt(r.ctr,'pct2'),'num'],[F.int(Number(r.seguidores)),'num'],[fmt(r.cpf,'eur2'),'num'],[r.atipico||'—',r.atipico==='Sí'?'spb-flag':'']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
}
function drawAudiencia(){
  const DEC=new Set(['CXO','VP','Owner','Partner','Director']);
  const s=document.getElementById('ch-sen');if(dash.data('aud_sen').status==='error')failLine(s);else{const r=rowsOf('aud_sen').slice().sort((a,b)=>b.seg_mil-a.seg_mil);if(r.length){s.classList.remove('dash-skeleton');hbars(s,r,{label:(d)=>d.seniority,value:(d)=>d.seg_mil,vf:(v)=>F.d1(v)+'‰',note:(d)=>F.pct(d.pct_impr)+' de impr.',color:(d)=>DEC.has(d.seniority)?RED:'var(--cds-chart-muted)'});}}
  const p=document.getElementById('ch-pais');if(dash.data('aud_pais').status==='error')failLine(p);else{const r=rowsOf('aud_pais').slice().sort((a,b)=>b.pct_seg-a.pct_seg);if(r.length){p.classList.remove('dash-skeleton');paired(p,r);}}
  const f=document.getElementById('ch-fun');if(dash.data('aud_fun').status==='error')failLine(f);else{const r=rowsOf('aud_fun').slice().sort((a,b)=>b.seg_mil-a.seg_mil);if(r.length){f.classList.remove('dash-skeleton');const mx=r[0].funcion;hbars(f,r,{label:(d)=>d.funcion,value:(d)=>d.seg_mil,vf:(v)=>F.d1(v)+'‰',color:(d)=>d.funcion===mx?RED:'var(--cds-chart-muted)'});}}
}
function drawActivaciones(){
  const b=new Map(rowsOf('boosts').map((r)=>[r.campaign_id,r]));
  document.querySelector('#t-boost tbody').replaceChildren(...rowsOf('campanas').filter((c)=>b.has(c.campaign_id)).sort((x,y)=>x.etiqueta<y.etiqueta?-1:1).map((c)=>{const tr=document.createElement('tr');tr.dataset.key=c.campaign_id;
    for(const [t,cl] of [[c.etiqueta],[c.inicio],[c.fin],[c.presupuesto_eur?F.eur(Number(c.presupuesto_eur)):'—','num'],[F.eur(Number(c.inversion_eur)),'num'],[fmt(b.get(c.campaign_id).ejecutado,'pct'),'num'],[F.int(Number(c.seguidores)),'num']]){const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);}return tr;}));
}
function drawConexiones(){
  const enc=(s)=>encodeURIComponent(s);
  document.querySelector('#t-obj tbody').replaceChildren(...rowsOf('objetivos').map((o)=>{const tr=document.createElement('tr');tr.dataset.key=enc(o.kpi)+','+enc(o.canal);
    for(const [t,c] of [[o.kpi],[o.canal],[o.unidad],[o.objetivo_mensual||'—'],[o.objetivo_anual||'—'],[o.estado,'spb-pend']]){const td=document.createElement('td');td.textContent=t;if(c)td.className=c;tr.append(td);}return tr;}));
}
function draw(){
  const t=rowsOf('ia').find((r)=>r.id==='T0');if(t)setText(document.getElementById('titular'),t.titulo);
  document.querySelectorAll('[data-source="ia"][data-where="id=T0"]').forEach((el)=>{if(t&&el.id!=='titular')el.textContent=t[el.dataset.field];});
  document.querySelectorAll('.spb-period [data-source="mensual"], [data-source="objetivos"][data-where]').forEach((el)=>{const src=el.dataset.source;const w=new URLSearchParams(el.getAttribute('data-where'));
    const r=rowsOf(src).find((x)=>[...w].every(([a,b])=>String(x[a])===b));if(r)el.textContent=el.dataset.field==='objetivo_mensual'?(r.objetivo_mensual?r.objetivo_mensual+' · ':''):r[el.dataset.field];});
  lim.checked=vista()==='limpio';
  ({resumen:drawResumen,comunidad:drawComunidad,lectura:drawLectura,contenidos:drawContenidos,audiencia:drawAudiencia,activaciones:drawActivaciones,conexiones:drawConexiones})[current]();
}
dash.onData(()=>draw());
const named=pages.find((p)=>p.id===location.hash.slice(1));show(named?named.id:'resumen',false);
