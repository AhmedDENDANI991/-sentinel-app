export const runtime='edge';
const clean=(v:unknown)=>String(v??'').trim();
function bytes(b64:string){const raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
export async function POST(req:Request){try{
 const body=await req.json() as {id?:string;filename?:string;candidate?:string;pdf_base64?:string};
 const id=clean(body.id).toUpperCase();if(!/^\d{8}-[A-F0-9]{8}$/.test(id))return Response.json({ok:false,error:'Référence invalide.'},{status:400});
 const b64=clean(body.pdf_base64);if(!b64||b64.length>12000000)return Response.json({ok:false,error:'PDF absent ou trop volumineux.'},{status:400});
 const token=process.env.WHATSAPP_TOKEN,phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID,admin=(process.env.WHATSAPP_ADMIN_NUMBER||'213770795995').replace(/\D/g,''),version=process.env.WHATSAPP_GRAPH_VERSION||'v23.0';
 if(!token||!phoneId)return Response.json({ok:false,code:'CONFIG_REQUIRED',error:'WhatsApp Business Cloud API non configurée.'},{status:503});
 const filename=clean(body.filename)||`ELITE_Candidature_${id}.pdf`,candidate=clean(body.candidate)||'Candidat',fd=new FormData();
 fd.append('messaging_product','whatsapp');fd.append('file',new Blob([bytes(b64)],{type:'application/pdf'}),filename);
 const up=await fetch(`https://graph.facebook.com/${version}/${phoneId}/media`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd});const uj=await up.json() as {id?:string,error?:unknown};if(!up.ok||!uj.id)return Response.json({ok:false,error:'Échec upload PDF WhatsApp.',detail:uj.error||uj},{status:502});
 const msg=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:admin,type:'document',document:{id:uj.id,filename,caption:`ELITE | OFFRE | ${id} | ${candidate}`}})});
 const mj=await msg.json() as {messages?:Array<{id:string}>,error?:unknown};if(!msg.ok||!mj.messages?.[0]?.id)return Response.json({ok:false,error:'Échec envoi PDF WhatsApp.',detail:mj.error||mj},{status:502});
 return Response.json({ok:true,status:'ENVOYE',message_id:mj.messages[0].id,reference:id});
 }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:'Erreur serveur'},{status:500})}}
