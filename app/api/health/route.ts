export async function GET(){
  return Response.json({ok:true,service:'ELITE recruitment',version:'1.0',form:'unified',pdf:true,whatsapp_env_required:true});
}
