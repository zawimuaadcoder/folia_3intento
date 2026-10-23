const questions = [
 {key:'volume',title:'¿Cuántos nuevos pacientes empiezan un tratamiento al mes?',description:'Usa una media realista de los últimos tres meses. Piensa en el tratamiento capilar que quieres impulsar.',options:[['1-5','Entre 1 y 5 pacientes'],['6-10','Entre 6 y 10 pacientes'],['11-25','Entre 11 y 25 pacientes'],['25+','Más de 25 pacientes'],['0','Todavía no tengo pacientes']]},
 {key:'ticket',title:'¿Cuál es tu ticket medio por paciente?',description:'Selecciona el importe total medio que factura tu clínica por ese mismo tratamiento.',options:[['under1000','Menos de 1.000 €'],['1000-2500','De 1.000 € a menos de 2.500 €'],['2500-5000','De 2.500 € a menos de 5.000 €'],['5000-7500','De 5.000 € a 7.500 €'],['7500+','Más de 7.500 €']]},
 {key:'team',title:'¿Tienes un equipo que gestione las nuevas consultas?',description:'Alguien que responda, haga seguimiento y acompañe al interesado hasta su valoración en la clínica.',options:[['no','No, lo gestionamos cuando podemos'],['yes','Sí, tenemos una persona o equipo responsable']]},
 {key:'zone',title:'¿Dónde quieres captar nuevos pacientes?',description:'Indica la ciudad o provincia de España en la que quieres impulsar tu captación.'},
 {key:'goal',title:'¿Qué quieres mejorar ahora en tu clínica?',description:'Elige tu prioridad. Enfocaremos el diagnóstico en lo que más importa para tu crecimiento.',options:[['volume','Recibir más solicitudes de valoración'],['quality','Atraer contactos con más interés real'],['conversion','Convertir más valoraciones en pacientes'],['cost','Reducir el coste de captar un paciente'],['scale','Aumentar el volumen de tratamientos']]}
];
const volumeValues={'1-5':3,'6-10':8,'11-25':18,'0':0};
const ticketValues={'1000-2500':1750,'2500-5000':3750,'5000-7500':6250};
function validateStep(index,a){
 const q=questions[index];if(!q)return '';
 if(q.key==='zone')return typeof a.zone==='string'&&a.zone.trim().length>=2&&a.zone.trim().length<=100?'':'Indica una ciudad o provincia (entre 2 y 100 caracteres).';
 if(!q.options.some(o=>o[0]===a[q.key]))return 'Selecciona una opción para continuar.';
 if(q.key==='volume'&&a.volume==='25+'&&(!Number.isInteger(Number(a.volumeExact))||Number(a.volumeExact)<=25||Number(a.volumeExact)>10000))return 'Indica tu media mensual: un número entero mayor de 25.';
 if(q.key==='ticket'&&(a.ticket==='under1000'||a.ticket==='7500+')){const n=Number(a.ticketExact);if(!Number.isFinite(n)||n<=0||n>1000000||(a.ticket==='under1000'&&n>=1000)||(a.ticket==='7500+'&&n<=7500))return a.ticket==='under1000'?'Indica un importe mayor de 0 € e inferior a 1.000 €.':'Indica un importe mayor de 7.500 €.';}
 return '';
}
function calculate(a){
 for(let i=0;i<questions.length;i++){const error=validateStep(i,a);if(error)throw new Error(error);}
 const currentPatients=a.volume==='25+'?Number(a.volumeExact):volumeValues[a.volume];
 const ticket=(a.ticket==='under1000'||a.ticket==='7500+')?Number(a.ticketExact):ticketValues[a.ticket];
 // An explicit exploration target, never an empirically predicted uplift.
 const targetPatients=currentPatients===0?2:Math.ceil(currentPatients*1.25);
 const extraPatients=targetPatients-currentPatients;
 const currentRevenue=currentPatients*ticket,targetRevenue=targetPatients*ticket;
 const assumedConversion=.2;
 return {currentPatients,ticket,targetPatients,extraPatients,currentRevenue,targetRevenue,additionalRevenue:targetRevenue-currentRevenue,growthPercent:currentPatients?Math.round(extraPatients/currentPatients*100):null,additionalOpportunities:Math.ceil(extraPatients/assumedConversion),assumedValuations:currentPatients/assumedConversion,assumedConversion,conversionAlternative:currentPatients?targetPatients/(currentPatients/assumedConversion):null,illustrative:true};
}
function validateContact(c){if(typeof c?.name!=='string'||c.name.trim().length<3||c.name.length>120)return 'Introduce tu nombre completo.';if(typeof c.email!=='string'||c.email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(c.email))return 'Introduce un email válido.';if(typeof c.phone!=='string'||!/^[+\d\s().-]+$/.test(c.phone)||c.phone.replace(/\D/g,'').length<9||c.phone.replace(/\D/g,'').length>15)return 'Introduce un teléfono válido, con prefijo si es internacional.';return '';}

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const number=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(n);
const modal=$('#calculator-modal'),content=$('#modal-content'),legal=$('#legal-modal');
let opener=null,step=0,answers={},contact={name:'',email:'',phone:'',marketing:false},result=null,leadSaved=false,busy=false,booked=false;
let config={demo:true,calendarUrl:'',metaPixelId:'',privacyUrl:'',legalUrl:'',cookiesUrl:''};
let configReady=fetch('/api/config').then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{config={...config,...c};}).catch(()=>{config.demo=true;});
const submissionIds={};
const newId=()=>crypto.randomUUID();
function submissionKey(type){const signature=JSON.stringify({answers,contact,type});return submissionIds[signature]??(submissionIds[signature]=newId());}

// Meta Pixel. The ID comes from the META_PIXEL_ID environment variable (served by /api/config);
// without it nothing is loaded and track() is a no-op.
function loadPixel(id){
 if(!/^\d{5,20}$/.test(String(id||''))||window.fbq)return;
 const f=window.fbq=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments);};
 window._fbq=f;f.push=f;f.loaded=true;f.version='2.0';f.queue=[];
 const s=document.createElement('script');s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(s);
 f('init',String(id));f('track','PageView');
}
const track=(event,data,eventID)=>{window.fbq?.('track',event,data||{},eventID?{eventID}:undefined);};
// Cookie consent: the pixel only loads after the visitor accepts.
const CONSENT_KEY='mhfc-cookie-consent';
const readConsent=()=>{try{return localStorage.getItem(CONSENT_KEY);}catch{return null;}};
const saveConsent=v=>{try{localStorage.setItem(CONSENT_KEY,v);}catch{}};
function showCookieBanner(){
 if($('.cookie-banner'))return;
 document.body.insertAdjacentHTML('beforeend','<div class="cookie-banner" role="region" aria-label="Preferencias de cookies"><p>Usamos cookies de Meta para medir nuestras campañas. Solo se activan si las aceptas. <button type="button" data-legal-cookies>Más información</button></p><div><button type="button" class="button button-secondary" data-consent="denied">Rechazar</button><button type="button" class="button button-dark" data-consent="granted">Aceptar</button></div></div>');
 const banner=$('.cookie-banner');
 $('[data-legal-cookies]',banner).addEventListener('click',()=>openLegal('cookies'));
 $$('[data-consent]',banner).forEach(b=>b.addEventListener('click',()=>{saveConsent(b.dataset.consent);banner.remove();if(b.dataset.consent==='granted')loadPixel(config.metaPixelId);}));
}
configReady.then(()=>{
 if(!/^\d{5,20}$/.test(String(config.metaPixelId||'')))return;
 const consent=readConsent();
 if(consent==='granted')loadPixel(config.metaPixelId);else if(consent!=='denied')showCookieBanner();
});

const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion&&'IntersectionObserver'in window){document.documentElement.classList.add('js-motion');const reveal=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('pending');reveal.unobserve(e.target);}}),{threshold:.08});$$('.reveal').forEach(e=>{e.classList.add('pending');reveal.observe(e);});}
const menu=$('.menu-toggle'),nav=$('.navigation');
const closeMenu=()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menú');nav.classList.remove('open');};
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');nav.classList.toggle('open',open);});
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
if('IntersectionObserver'in window){const active=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){$$('.nav-link').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}}),{rootMargin:'-15% 0px -55% 0px'});['metodo','calculadora'].forEach(id=>active.observe(document.getElementById(id)));}

function closeModal(){modal.close();}
modal.addEventListener('close',()=>{if(!legal.open)document.body.classList.remove('modal-open');opener?.focus();});
$('[data-close]').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{const r=modal.getBoundingClientRect();if(e.target===modal&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeModal();});
async function openCalculator(el){await configReady;opener=el;closeMenu();render();modal.showModal();document.body.classList.add('modal-open');$('#modal-title')?.focus();}
$$('[data-calculator]').forEach(b=>b.addEventListener('click',()=>openCalculator(b)));

function setScreen(html,label,percent){content.innerHTML=html;$('#step-label').textContent=label;$('#progress').style.width=percent+'%';modal.scrollTop=0;content.style.animation='none';requestAnimationFrame(()=>{content.style.animation='';});requestAnimationFrame(()=>$('#modal-title')?.focus({preventScroll:true}));}
function title(t,d){return `<h2 id="modal-title" tabindex="-1">${t}</h2>${d?`<p class="intro">${d}</p>`:''}`;}
function field(label,name,value='',type='text',extra=''){return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHTML(value)}" ${extra}></label>`;}
function actions(next,back='Volver'){return `<p class="error" id="form-error" role="alert"></p><div class="form-actions"><button class="button button-blue" type="submit">${next}</button><button class="button button-secondary" type="button" data-back>${back}</button></div>`;}
function error(message){$('#form-error').textContent=message;}
function exactField(){if(step===0&&answers.volume==='25+')return field('¿Cuántos pacientes al mes, aproximadamente?','volumeExact',answers.volumeExact??'','number','min="26" max="10000" step="1" required inputmode="numeric"');if(step===1&&(answers.ticket==='under1000'||answers.ticket==='7500+'))return field('Importe medio por tratamiento (€)','ticketExact',answers.ticketExact??'','number',`min="${answers.ticket==='under1000'?'1':'7501'}" max="${answers.ticket==='under1000'?'999.99':'1000000'}" step="0.01" required inputmode="decimal"`);return '';}
function render(){
 if(step<5){const q=questions[step];let fields=q.options?`<fieldset class="options" aria-label="${escapeHTML(q.title)}">${q.options.map(([v,l])=>`<label class="option"><input type="radio" name="${q.key}" value="${v}" ${answers[q.key]===v?'checked':''} required><span>${escapeHTML(l)}</span></label>`).join('')}</fieldset><div id="exact-field">${exactField()}</div>`:field('Ciudad o provincia *','zone',answers.zone??'','text','required minlength="2" maxlength="100" autocomplete="address-level2" placeholder="Ej.: Madrid"');
 setScreen(`<form id="step-form">${title(q.title,q.description)}${fields}${actions(step===4?'Calcular mi proyección':'Continuar')}</form>`,`PASO ${step+1} DE 5`,(step+1)*20);
 $('#step-form').addEventListener('change',e=>{if(e.target.name===q.key){if(answers[q.key]!==e.target.value)leadSaved=false;answers[q.key]=e.target.value;const exact=$('#exact-field');if(exact)exact.innerHTML=exactField();}});
 $('#step-form').addEventListener('input',e=>{if(e.target.name){if(answers[e.target.name]!==e.target.value)leadSaved=false;answers[e.target.name]=e.target.value;}});
 $('#step-form').addEventListener('submit',e=>{e.preventDefault();for(const [k,v]of new FormData(e.currentTarget))answers[k]=v;const msg=validateStep(step,answers);if(msg)return error(msg);step++;if(step===5&&leadSaved){result=calculate(answers);step=6;}render();});
 $('[data-back]').addEventListener('click',()=>{if(step===0)closeModal();else{step--;render();}});return;
 }
 if(step===5)return renderGate();return renderResults();
}
function contactFields(){return field('Nombre completo *','name',contact.name,'text','required minlength="3" maxlength="120" autocomplete="name" placeholder="Tu nombre y apellidos"')+field('Email profesional *','email',contact.email,'email','required maxlength="254" autocomplete="email" placeholder="nombre@tuclinica.com"')+field('Teléfono *','phone',contact.phone,'tel','required minlength="9" maxlength="25" autocomplete="tel" placeholder="+34 600 000 000"')+`<label class="honeypot" aria-hidden="true">Sitio web<input name="website" tabindex="-1" autocomplete="off"></label><p class="privacy-copy">Usaremos tus datos para entregarte el análisis y contactar contigo sobre tu diagnóstico. <button type="button" data-privacy>Privacidad</button></p>${config.marketingEnabled?`<label class="consent"><input name="marketing" type="checkbox" ${contact.marketing?'checked':''}>Quiero recibir también consejos de captación (opcional).</label>`:''}`;}
function demoNote(){return config.demo?'<p class="demo-note">Vista previa: puedes probar el recorrido con datos ficticios. No se enviará ni guardará ningún contacto.</p>':'';}
function readContact(form){const d=new FormData(form);contact={name:String(d.get('name')??'').trim(),email:String(d.get('email')??'').trim(),phone:String(d.get('phone')??'').trim(),marketing:d.has('marketing')};return String(d.get('website')??'');}
function bindContactDraft(form){form.addEventListener('input',e=>{if(['name','email','phone'].includes(e.target.name))contact[e.target.name]=e.target.value;if(e.target.name==='marketing')contact.marketing=e.target.checked;});$('[data-privacy]',form)?.addEventListener('click',()=>openLegal('privacy'));}
async function submitData(eventType,website=''){const payload={eventType,submissionId:submissionKey(eventType),answers,contact,website,note:'',source:'mhfc-web',consentVersion:'2026-09-25'};const response=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data;try{data=await response.json();}catch{throw Error('No hemos podido conectar. Tus respuestas siguen aquí; inténtalo de nuevo.');}if(!response.ok)throw Error(data.message||'No hemos podido enviar los datos. Inténtalo de nuevo.');return {...data,submissionId:payload.submissionId};}
function setBusy(form,on,label='Preparando tu análisis…'){busy=on;$$('button,input,textarea',form).forEach(el=>el.disabled=on);const submit=$('button[type=submit]',form);if(on){submit.dataset.label=submit.innerHTML;submit.textContent=label;}else submit.innerHTML=submit.dataset.label||submit.innerHTML;form.setAttribute('aria-busy',String(on));}
function renderGate(){setScreen(`<form id="lead-form">${title('Tu proyección está lista.','Desbloquea el análisis de tu clínica: tu punto de partida, un escenario de crecimiento y las oportunidades que necesitarías para alcanzarlo.')}${demoNote()}${contactFields()}${actions('Ver mi proyección','Revisar mis datos')}</form>`,'ANÁLISIS PREPARADO',100);const form=$('#lead-form');bindContactDraft(form);$('[data-back]').addEventListener('click',()=>{step=4;render();});form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const trap=readContact(form);const msg=validateContact(contact);if(msg)return error(msg);setBusy(form,true);try{const d=await submitData('analysis',trap);result=d.result||calculate(answers);leadSaved=true;if(!config.demo&&!trap)track('Lead',{content_name:'Calculadora de potencial'},d.submissionId);step=6;render();}catch(err){error(err.message);}finally{if(form.isConnected)setBusy(form,false);busy=false;}});}
const goalCopy={volume:'Tu palanca: generar más valoraciones',quality:'Tu palanca: atraer oportunidades con interés real',conversion:'Tu palanca: convertir más valoraciones en pacientes',cost:'Tu palanca: revisar el coste de captación',scale:'Tu palanca: crecer sin perder capacidad de atención'};

// Embedded booking calendar shown at the end of the calculator.
const isCalendly=u=>/(^|\.)calendly\.com$/.test(u.hostname);
function calendarSrc(){
 try{const u=new URL(config.calendarUrl);if(u.protocol!=='https:')return '';
  if(isCalendly(u)){u.searchParams.set('embed_domain',location.hostname||'localhost');u.searchParams.set('embed_type','Inline');u.searchParams.set('hide_gdpr_banner','1');if(contact.name)u.searchParams.set('name',contact.name);if(contact.email)u.searchParams.set('email',contact.email);}
  return u.href;}catch{return '';}
}
function bookingBlock(){
 const src=calendarSrc();
 if(!src)return '<div class="booking"><h3>Reserva tu auditoría gratuita</h3><p>La agenda de auditorías estará disponible próximamente.</p></div>';
 return `<div class="booking" id="booking"><h3>Reserva tu auditoría gratuita</h3><p>Elige el día y la hora que mejor te encajen. Revisaremos qué podría estar limitando tu crecimiento y qué tendría que cambiar para acercarte a este escenario.</p>${booked?'<p class="booking-done" role="status">¡Llamada reservada! Te hemos enviado la confirmación por email.</p>':''}<div class="booking-frame"><iframe src="${escapeHTML(src)}" title="Calendario para reservar la auditoría gratuita" loading="lazy" allow="payment"></iframe></div><p class="booking-fallback">¿No ves el calendario? <a href="${escapeHTML(config.calendarUrl)}" target="_blank" rel="noopener noreferrer">Ábrelo en otra pestaña</a>.</p></div>`;
}
window.addEventListener('message',e=>{
 let origin;try{origin=new URL(e.origin);}catch{return;}
 if(!isCalendly(origin)||e.data?.event!=='calendly.event_scheduled'||booked)return;
 booked=true;track('Schedule',{content_name:'Auditoría gratuita'});
 const box=$('#booking');if(box&&!$('.booking-done',box))$('.booking-frame',box).insertAdjacentHTML('beforebegin','<p class="booking-done" role="status">¡Llamada reservada! Te hemos enviado la confirmación por email.</p>');
});

function renderResults(){result=result||calculate(answers);const r=result;const current=r.currentPatients,target=r.targetPatients;const zone=escapeHTML(answers.zone);const team=answers.team==='yes'?'Tu equipo de seguimiento puede ser una pieza clave para trabajar estas oportunidades.':'El seguimiento será un punto a revisar: cada consulta necesita una respuesta y un próximo paso.';
 const explanation=current?`Con ${number(r.assumedValuations)} valoraciones al mes, pasar del 20 % al ${number(r.conversionAlternative*100)} % de conversión supondría ${r.extraPatients} pacientes más. Otra vía: ${r.additionalOpportunities} valoraciones adicionales al 20 %. Son alternativas; no se suman.`:`Para conseguir los primeros ${target} pacientes, este escenario plantea ${r.additionalOpportunities} valoraciones al 20 % de conversión. Es un punto de partida ilustrativo, pendiente de validar.`;
 setScreen(`${title(current?`¿Y si tu clínica pasara de ${current} a ${target} pacientes al mes?`:'Un primer escenario para empezar a captar.','Basado en tus respuestas. Exploramos una oportunidad con supuestos visibles; no es una previsión garantizada.')}<div class="result-hero"><strong>${money(r.currentRevenue)} → <span data-count="${r.targetRevenue}" data-money>${money(r.targetRevenue)}</span> / mes</strong><p>Facturación actual estimada → escenario potencial · ingresos brutos</p><div class="result-chart" aria-hidden="true"><span style="--height:30%"></span><span style="--height:40%"></span><span style="--height:52%"></span><span style="--height:57%"></span><span style="--height:70%"></span><span style="--height:80%"></span><span style="--height:100%"></span></div></div><div class="result-metrics"><div><strong>+<span data-count="${r.additionalRevenue}" data-money>${money(r.additionalRevenue)}</span></strong><p>al mes en el escenario</p></div><div><strong>+${r.additionalOpportunities}</strong><p>valoraciones necesarias</p></div><div><strong>${r.growthPercent===null?'—':'+'+r.growthPercent+' %'}</strong><p>${r.growthPercent===null?'sin base para comparar':'crecimiento planteado'}</p></div></div><div class="result-copy"><strong>${goalCopy[answers.goal]}</strong>${explanation}</div><p class="result-copy">${team} En la auditoría contrastaremos este escenario con la demanda y la competencia en ${zone}.</p><details class="assumptions"><summary>Ver mis datos y los supuestos del cálculo</summary><p>${current} pacientes × ${money(r.ticket)} de ticket medio. Se usan los puntos medios de los rangos cerrados y los importes que has indicado en los rangos abiertos.</p><p>Objetivo exploratorio: ${target} pacientes. ${current?'Se plantea un crecimiento del 25 %, redondeado al siguiente paciente.':'Se plantea empezar con 2 pacientes.'} Conversión supuesta del 20 %; no es un dato declarado ni un resultado demostrado de tu clínica. No medimos una mejora real del coste de adquisición.</p><p>Los ingresos no descuentan inversión publicitaria, honorarios ni costes clínicos. Deben validarse capacidad, demanda y conversión antes de tomar decisiones.</p></details><div class="form-actions"><button class="button button-secondary" data-edit>Ajustar mis datos</button></div>${demoNote()}${bookingBlock()}`,'TU PROYECCIÓN · ESCENARIO ILUSTRATIVO',100);
 $('[data-edit]').addEventListener('click',()=>{step=0;render();});animateNumbers();}
function animateNumbers(){if(reduceMotion)return;$$('[data-count]',content).forEach(el=>{const end=Number(el.dataset.count),start=performance.now();function tick(now){if(!el.isConnected)return;const t=Math.min(1,(now-start)/650),value=Math.round(end*(1-(1-t)**3));el.textContent=el.hasAttribute('data-money')?money(value):number(value);if(t<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);});}

const legalTexts={privacy:['Privacidad','Al enviar el formulario, tu nombre, email y teléfono se envían a HubSpot para entregar el análisis y atender tu solicitud. En la vista previa de demostración no se envían datos. Las respuestas del diagnóstico solo se envían si se ha configurado una propiedad para guardarlas.','La información del responsable, los plazos de conservación y el contacto para ejercer tus derechos se incorporarán en la política definitiva antes de activar el envío.'],legal:['Aviso legal','Esta es la web de Marketing Health for Clinics (MHFC).','Los datos identificativos del titular se incorporarán antes de su publicación comercial. Las proyecciones de la calculadora son escenarios ilustrativos y no garantizan resultados.'],cookies:['Cookies','Las respuestas de la calculadora se conservan en la memoria de esta pestaña. El calendario de reserva se carga desde Calendly, que aplica su propia política de cookies.','Si aceptas las cookies, el Pixel de Meta registra la visita, el envío de la calculadora y la reserva de la llamada para medir nuestras campañas. Si las rechazas, no se carga.']};
async function openLegal(kind){await configReady;const url=config[kind==='privacy'?'privacyUrl':kind==='legal'?'legalUrl':'cookiesUrl'];if(url){window.open(url,'_blank','noopener,noreferrer');return;}const [h,...ps]=legalTexts[kind];$('#legal-title').textContent=h;$('#legal-content').innerHTML=ps.map(p=>`<p>${p}</p>`).join('');if(kind==='cookies'&&config.metaPixelId){$('#legal-content').insertAdjacentHTML('beforeend','<p><button type="button" class="button button-secondary" data-cookie-reset>Cambiar mis preferencias de cookies</button></p>');$('[data-cookie-reset]').addEventListener('click',()=>{try{localStorage.removeItem(CONSENT_KEY);}catch{}legal.close();showCookieBanner();});}legal.showModal();document.body.classList.add('modal-open');}
$$('[data-legal]').forEach(b=>b.addEventListener('click',()=>openLegal(b.dataset.legal)));$('[data-legal-close]').addEventListener('click',()=>legal.close());legal.addEventListener('close',()=>{if(!modal.open)document.body.classList.remove('modal-open');});

/* ===== v3 · motion layer ===== */
const motion=document.documentElement.classList.contains('js-motion');
const header=$('#site-header');
const darkZones=$$('.band-dark');
const onScroll=()=>{header.classList.toggle('is-stuck',scrollY>40);const y=header.offsetHeight/2;header.classList.toggle('is-dark',darkZones.some(z=>{const r=z.getBoundingClientRect();return r.top<=y&&r.bottom>y;}));};
addEventListener('scroll',onScroll,{passive:true});onScroll();

// Hero headline: split into words for a staggered blur-in.
if(motion){let i=0;const h1=$('#hero-title');[...h1.childNodes].forEach(n=>{if(n.nodeType!==3)return;const frag=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){frag.append(w);return;}const s=document.createElement('span');s.className='word';s.style.setProperty('--i',i++);s.textContent=w;frag.append(s);});n.replaceWith(frag);});}

// Hero dashboard flattens as it scrolls into view; floating cards follow the pointer.
const heroArt=$('.hero-art'),hero=$('.hero');
if(motion&&heroArt){
 let ticking=false;const update=()=>{ticking=false;const r=heroArt.getBoundingClientRect();const p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.9)));heroArt.style.setProperty('--p',p.toFixed(3));};
 addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});update();
 if(matchMedia('(pointer:fine)').matches)hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();heroArt.style.setProperty('--mx',((e.clientX-r.left)/r.width*2-1).toFixed(3));heroArt.style.setProperty('--my',((e.clientY-r.top)/r.height*2-1).toFixed(3));});
}

// Hero product UI is laid out at 671 px and scaled to its frame.
$$('[data-app-scale]').forEach(vp=>{const app=vp.firstElementChild;const fit=()=>app.style.setProperty('--s',(vp.clientWidth/671).toFixed(4));fit();new ResizeObserver(fit).observe(vp);});

// Count-up numbers.
function countUp(el,duration=1200){const end=Number(el.dataset.countTo);if(!motion||!Number.isFinite(end)){el.textContent=number(end);return;}const start=performance.now();const tick=now=>{const t=Math.min(1,(now-start)/duration);el.textContent=number(Math.round(end*(1-(1-t)**3)));if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}

// In-view triggers.
$$('.agenda-grid i').forEach((el,i)=>el.style.setProperty('--i',i));
$$('.bars i').forEach((el,i)=>el.style.setProperty('--i',i));
$$('.logos,.benefits').forEach(el=>{el.classList.add('stagger');[...el.children].forEach((c,i)=>c.style.setProperty('--i',i));});
const inView=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;el.classList.add('in-view');$$('[data-count-to]',el).forEach(n=>{if(!n.closest('.stage-panel'))countUp(n);});if(el.matches('.diagnosis-card'))startCycle(el);const fly=$('animateMotion',el);if(fly&&motion){setTimeout(()=>fly.beginElement(),700);setTimeout(()=>el.classList.add('landed'),3700);}inView.unobserve(el);}),{rootMargin:'0px 0px -18% 0px'});
$$('.pain-card,.logos,.benefits,.team,.diagnosis-card,.float-citas').forEach(el=>inView.observe(el));

// Diagnosis card: pointer spotlight and a slow highlight cycle through the three steps.
function startCycle(card){if(!motion)return;const items=$$('li',card);let n=0;card.classList.add('cycling');const step=()=>{items.forEach((li,i)=>li.classList.toggle('is-lit',i===n%items.length));n++;};step();setInterval(step,2400);}
$$('[data-spotlight]').forEach(card=>card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--sx',e.clientX-r.left+'px');card.style.setProperty('--sy',e.clientY-r.top+'px');}));

// FAQ: animate open/close instead of the native jump.
$$('.faq-list details').forEach(d=>{const sum=$('summary',d),body=$('p',d);sum.addEventListener('click',e=>{if(!motion||!body.animate)return;e.preventDefault();if(d.dataset.busy)return;d.dataset.busy='1';
 if(d.open){const h=body.offsetHeight;d.classList.add('closing');const a=body.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});a.onfinish=()=>{d.open=false;delete d.dataset.busy;};}
 else{d.open=true;const h=body.offsetHeight;const a=body.animate([{height:'0px',opacity:0},{height:h+'px',opacity:1}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});a.onfinish=()=>{delete d.dataset.busy;};}});});

// Method: tabs with auto-advance and an animated scene per step.
const method=$('[data-method]');
if(method){
 const tabs=$$('.method-tab',method),panels=$$('.stage-panel',method);let current=0,run=0,visible=false;
 panels.forEach(p=>p.removeAttribute('hidden'));
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function type(el,text,speed,id){el.textContent='';el.classList.add('typing');for(const ch of text){if(id!==run)return false;el.textContent+=ch;await sleep(speed);}el.classList.remove('typing');return true;}
 const scenes={
  async captar(panel,id){const stage=$('.stage-captar',panel);stage.classList.remove('submitted');const count=$('.feed-count',panel);count.textContent='7';$$('.typed',panel).forEach(t=>{t.textContent='';t.classList.remove('typing');});if(!motion){$$('.typed',panel).forEach(t=>t.textContent=t.dataset.text);stage.classList.add('submitted');count.textContent='8';return;}
   await sleep(500);for(const t of $$('.typed',panel)){if(!await type(t,t.dataset.text,55,id))return;await sleep(180);}if(id!==run)return;await sleep(250);stage.classList.add('submitted');await sleep(350);count.textContent='8';count.classList.remove('bump');void count.offsetWidth;count.classList.add('bump');},
  async gestionar(panel,id){const t=$('.ai-text',panel);t.textContent='';if(!motion){t.textContent=t.dataset.text;return;}await sleep(900);await type(t,t.dataset.text,22,id);},
  async atraer(panel){$$('[data-count-to]',panel).forEach(n=>countUp(n,1400));}
 };
 function select(i,focus=false){current=(i+tabs.length)%tabs.length;run++;tabs.forEach((t,k)=>{const on=k===current;t.classList.toggle('is-active',on);t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;});panels.forEach((p,k)=>{const on=k===current;p.classList.toggle('is-active',on);p.inert=!on;p.setAttribute('aria-hidden',String(!on));});if(focus)tabs[current].focus();const cap=$('.method-caption',method);if(cap)cap.textContent=$('p',tabs[current]).textContent;const key=panels[current].id.replace('stage-','');scenes[key]?.(panels[current],run);}
 tabs.forEach((t,i)=>{t.addEventListener('click',()=>select(i));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();select(current+1,true);}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();select(current-1,true);}});$('.tab-progress i',t).addEventListener('animationend',()=>{if(t.classList.contains('is-active'))select(current+1);});});
 method.addEventListener('pointerenter',()=>method.classList.add('is-paused'));method.addEventListener('pointerleave',()=>{if(visible)method.classList.remove('is-paused');});
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;method.classList.toggle('is-paused',!visible);if(visible&&!method.dataset.started){method.dataset.started='1';select(0);}},{threshold:.35}).observe(method);
 method.classList.add('is-paused');select(0);
}

// Scroll-linked: section rails fill, testimonial words light up as you read.
if(motion){
 const rails=$$('.rail-section');
 const quote=$('.testimonial blockquote');let words=[];
 if(quote){const text=quote.textContent;quote.textContent='';text.split(/(\s+)/).forEach(w=>{if(/^\s+$/.test(w)||!w){quote.append(w);return;}const s=document.createElement('span');s.className='w';s.textContent=w;quote.append(s);words.push(s);});}
 const planet=$('[data-planet]');
 let raf=false;const tick=()=>{raf=false;const vh=innerHeight;
  if(planet){const r=planet.getBoundingClientRect();planet.style.setProperty('--rise',Math.min(1,Math.max(0,(vh-r.top)/(vh*.75))).toFixed(3));}
  rails.forEach(sec=>{const line=$('.rail-line',sec);if(!line)return;const r=line.getBoundingClientRect();const f=Math.min(1,Math.max(0,(vh*.6-r.top)/r.height));line.style.setProperty('--fill',f.toFixed(3));});
  if(quote){const r=quote.getBoundingClientRect();const f=Math.min(1,Math.max(0,(vh*.85-r.top)/(vh*.45)));const n=Math.round(f*words.length);words.forEach((w,i)=>w.classList.toggle('lit',i<n));}
 };
 addEventListener('scroll',()=>{if(!raf){raf=true;requestAnimationFrame(tick);}},{passive:true});tick();
 // Primary buttons lean slightly towards the pointer.
 if(matchMedia('(pointer:fine)').matches)$$('.hero-cta,.calc-cta,.header-cta').forEach(b=>{b.classList.add('magnetic');b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.translate=`${((e.clientX-r.left-r.width/2)*.12).toFixed(1)}px ${((e.clientY-r.top-r.height/2)*.2).toFixed(1)}px`;});b.addEventListener('pointerleave',()=>{b.style.translate='';});});
}
