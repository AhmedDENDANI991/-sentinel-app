import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';

type D=Record<string,string|number|boolean|null|undefined>;
const clean=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const ascii=(v:unknown)=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/€/g,'EUR').replace(/≤/g,'<=').replace(/≥/g,'>=');

const required=[
 'submission_token','role_primary','role_motivation','nom','prenom','telephone','email','ville','experience_years','last_job','education',
 'french_level','english_level','availability','start_date','driving_license','vehicle_available','mobility_national','mobility_international',
 'passport_valid','extended_travel','flexible_hours','work_orientation','best_result','deliverable_30','result_90','digital_tools','excel_level',
 'ai_usage','quality_proof','fixed_salary_dzd','variable_salary_dzd','variable_basis','variable_trigger','accuracy','consent',
 'role_q1','role_q2','role_q3','role_q4','role_q5','role_q6'
];

async function makeRef(token:string){
 const bytes=new TextEncoder().encode(token);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const hex=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,8).toUpperCase();
 const d=new Date(),date=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
 return `REC-${date}-${hex}`;
}
function wrap(text:string,max=72){const words=text.split(/\s+/),out:string[]=[];let line='';for(const w of words){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out}

function fitIndicators(data:D){
 const availability=clean(data.availability);
 const within7=['IMMÉDIATE','SOUS 3 JOURS','SOUS 7 JOURS'].includes(availability);
 const vehicle=clean(data.vehicle_available)==='OUI'&&clean(data.driving_license)==='OUI';
 const mobility=clean(data.mobility_national)==='OUI'||clean(data.mobility_international)==='OUI';
 const resultOriented=['RÉSULTATS MESURABLES','OBJECTIFS / KPI','LIVRABLES','QUALITÉ + RAPIDITÉ','MIXTE'].includes(clean(data.work_orientation));
 const digital=['AVANCÉ','EXPERT'].includes(clean(data.excel_level))||clean(data.ai_usage)==='OUI';
 const exp=num(data.experience_years);
 const status=within7&&vehicle?'CIBLE PRIORITAIRE':within7?'A EXAMINER - VEHICULE/PERMIS':'HORS DELAI CIBLE';
 return {within7,vehicle,mobility,resultOriented,digital,exp,status};
}

async function buildPdf(data:D,id:string){
 const doc=await PDFDocument.create();
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.08,.08,.07),gold=rgb(.70,.56,.33),gray=rgb(.40,.39,.36),line=rgb(.86,.83,.77),paper=rgb(.98,.97,.94);
 const W=595.28,H=841.89,m=44;let page=doc.addPage([W,H]),y=H-44;
 const header=()=>{page.drawText('ELITE',{x:m,y,font:bold,size:24,color:ink});page.drawText('DOSSIER CANDIDATURE - RECRUTEMENT',{x:m,y:y-24,font:bold,size:10,color:gold});page.drawText(ascii(id),{x:W-m-172,y,font:bold,size:9,color:gray});y-=52;page.drawLine({start:{x:m,y},end:{x:W-m,y},thickness:1,color:line});y-=22};
 const newPage=()=>{page=doc.addPage([W,H]);y=H-44;header()};
 const section=(t:string)=>{if(y<120)newPage();page.drawRectangle({x:m-5,y:y-5,width:W-2*m+10,height:23,color:paper});page.drawText(ascii(t),{x:m,y,font:bold,size:12,color:ink});y-=26};
 const row=(label:string,value:unknown)=>{
  const val=ascii(value)||'-',lines=wrap(val,65),h=Math.max(25,lines.length*12+8);
  if(y-h<50)newPage();
  page.drawText(ascii(label),{x:m,y,font:bold,size:8.2,color:gray});
  lines.forEach((s,i)=>page.drawText(s,{x:m+172,y:y-i*12,font,size:9.2,color:ink}));
  y-=h;page.drawLine({start:{x:m,y:y+5},end:{x:W-m,y:y+5},thickness:.45,color:line});
 };
 header();
 const f=fitIndicators(data);
 section('1. Poste et identite');
 row('Poste prioritaire',data.role_primary);row('2e choix',data.role_secondary);row('3e choix',data.role_tertiary);row('Motivation',data.role_motivation);
 row('Nom / Prenom',`${clean(data.nom)} ${clean(data.prenom)}`);row('Telephone',data.telephone);row('Email',data.email);row('Ville',data.ville);row('Experience (annees)',data.experience_years);row('Dernier poste',data.last_job);row('Employeur / secteur',data.last_company);row('Formation',data.education);row('Certifications',data.certifications);row('CV / LinkedIn',data.cv_link);
 section('2. Langues, disponibilite et mobilite');
 row('Francais',data.french_level);row('Anglais',data.english_level);row('Autres langues',data.other_languages);row('Disponibilite',data.availability);row('Date de prise de fonction',data.start_date);row('Permis',data.driving_license);row('Vehicule disponible',data.vehicle_available);row('Mobilite nationale',data.mobility_national);row('Mobilite internationale',data.mobility_international);row('Passeport valide',data.passport_valid);row('Missions prolongees',data.extended_travel);row('Horaires flexibles',data.flexible_hours);row('Contraintes operationnelles',data.constraints);
 newPage();
 section('3. Resultats et maturite digitale');
 row('Mode evaluation prefere',data.work_orientation);row('Meilleur resultat chiffre',data.best_result);row('Livrable 30 jours',data.deliverable_30);row('Resultat 90 jours',data.result_90);row('Outils digitaux',data.digital_tools);row('Excel / Sheets',data.excel_level);row('Usage IA',data.ai_usage);row('Exemple digitalisation',data.digital_example);row('Preuve de qualite',data.quality_proof);
 section('4. Pretentions remuneration');
 row('Fixe mensuel net (DZD)',data.fixed_salary_dzd);row('Variable mensuel cible (DZD)',data.variable_salary_dzd);row('Base souhaitee du variable',data.variable_basis);row('Declencheur du variable',data.variable_trigger);row('Modele de variable',data.variable_model);
 section('5. Expertise specifique du poste');
 for(let i=1;i<=6;i++){row(clean(data[`role_q${i}_label`])||`Question ${i}`,data[`role_q${i}`])}
 newPage();
 section('6. Indicateurs de pre-tri operationnel');
 row('Statut cible',f.status);row('Prise de fonction <= 7 jours',f.within7?'OUI':'NON');row('Permis + vehicule',f.vehicle?'OUI':'NON');row('Mobilite utile',f.mobility?'OUI':'NON');row('Orientation resultats',f.resultOriented?'OUI':'NON');row('Maturite digitale visible',f.digital?'OUI':'A CONFIRMER');row('Experience declaree',`${f.exp} an(s)`);
 section('7. Declaration');
 row('Exactitude',data.accuracy);row('Consentement',data.consent);row('Notes',data.notes);
 page.drawText('Note: le pre-tri repose sur les exigences operationnelles du poste. Aucune situation familiale ou caracteristique personnelle non pertinente n est utilisee.',{x:m,y:y-8,font,size:7.8,color:gray,maxWidth:W-2*m,lineHeight:10});
 return doc.save();
}

async function sendWhatsApp(pdfBytes:Uint8Array,id:string,candidate:string,role:string){
 const token=(process.env.WHATSAPP_TOKEN||'').trim();
 const phoneId=(process.env.WHATSAPP_PHONE_NUMBER_ID||'').trim();
 const version=(process.env.WHATSAPP_GRAPH_VERSION||'').trim();
 const admin=(process.env.WHATSAPP_ADMIN_NUMBER||'213770795995').replace(/\D/g,'');
 if(!token||!phoneId||!version)return {status:'CONFIG_REQUIRED' as const};
 const fd=new FormData();
 fd.append('messaging_product','whatsapp');
 fd.append('file',new Blob([pdfBytes],{type:'application/pdf'}),`ELITE_Recrutement_${id}.pdf`);
 const up=await fetch(`https://graph.facebook.com/${version}/${phoneId}/media`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd});
 const uj=await up.json() as {id?:string,error?:unknown};
 if(!up.ok||!uj.id)throw new Error(`WhatsApp media upload failed: ${JSON.stringify(uj.error||uj)}`);
 const msg=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:admin,type:'document',document:{id:uj.id,filename:`ELITE_Recrutement_${id}.pdf`,caption:`ELITE | RECRUTEMENT | ${id} | ${candidate} | ${role}`}})
 });
 const mj=await msg.json() as {messages?:Array<{id:string}>,error?:unknown};
 if(!msg.ok||!mj.messages?.[0]?.id)throw new Error(`WhatsApp send failed: ${JSON.stringify(mj.error||mj)}`);
 return {status:'ENVOYE' as const,message_id:mj.messages[0].id};
}

export async function POST(req:Request){
 try{
  const data=await req.json() as D;
  for(const k of required)if(!clean(data[k]))return Response.json({ok:false,error:`Champ requis manquant : ${k}`},{status:400});
  if(clean(data.accuracy)!=='OUI'||clean(data.consent)!=='OUI')return Response.json({ok:false,error:'Les declarations finales doivent etre acceptees.'},{status:400});
  const id=await makeRef(clean(data.submission_token));
  const pdfBytes=await buildPdf(data,id);
  let wa:{status:string,message_id?:string,error?:string}={status:'CONFIG_REQUIRED'};
  try{wa=await sendWhatsApp(pdfBytes,id,`${clean(data.prenom)} ${clean(data.nom)}`,clean(data.role_primary))}catch(e){wa={status:'ERREUR',error:e instanceof Error?e.message:'Erreur WhatsApp'}}
  const b64=btoa(Array.from(pdfBytes,b=>String.fromCharCode(b)).join(''));
  return Response.json({ok:true,id,filename:`ELITE_Recrutement_${id}.pdf`,whatsapp_status:wa.status,whatsapp_message_id:wa.message_id||null,pdf_base64:b64,fit:fitIndicators(data)});
 }catch(e){
  return Response.json({ok:false,error:e instanceof Error?e.message:'Erreur serveur'},{status:500});
 }
}
