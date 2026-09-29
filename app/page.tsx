'use client';
import {FormEvent,useMemo,useState} from 'react';

const roles=[
 'Chargé(e) achats & logistique',
 'Magasinier(e) MGX & Stock',
 'Community Manager',
 'Financier analytique',
 'Chargé(e) ADV',
 'Comptable analytique',
 'Chargé(e) recrutement expatriés asiatiques',
 'Coordinateur(trice) technique marchés & travaux',
 'Réceptionniste',
 'Serveuse',
 'Agent administratif',
 'Office Manager',
 'Chargé(e) achats détaché(e) en Chine'
];

const roleQuestions:Record<string,string[]>={
 'Chargé(e) achats & logistique':[
  'Expliquez votre maîtrise du concept de micro-entrepreneur / micro-importation et son impact sur les achats et la logistique.',
  'Décrivez une négociation fournisseur réussie avec résultat chiffré.',
  'Quels Incoterms, documents transport et étapes de sourcing Chine maîtrisez-vous ?',
  'Comment pilotez-vous coût, délai, qualité, risque fournisseur et disponibilité ?',
  'Quels outils utilisez-vous : ERP, Excel/Sheets, IA, suivi fournisseurs, tableaux de bord ?',
  'Quel résultat concret pouvez-vous livrer dans les 30 premiers jours ?'
 ],
 'Magasinier(e) MGX & Stock':[
  'Quels WMS/ERP/outils de stock, scanners, codes-barres ou QR avez-vous utilisés ?',
  'Comment garantissez-vous l’exactitude du stock et organisez-vous les inventaires tournants ?',
  'Maîtrisez-vous FIFO/FEFO, emplacements, picking, réception, préparation et traçabilité ?',
  'Donnez un exemple chiffré de réduction d’écarts, pertes, ruptures ou temps de préparation.',
  'Quel niveau avez-vous sur Excel/Sheets et tableaux de bord digitaux ?',
  'Que mettriez-vous en place durant vos 30 premiers jours ?'
 ],
 'Community Manager':[
  'Quelles plateformes maîtrisez-vous et avec quels résultats mesurables ?',
  'Donnez vos meilleurs KPI : reach, engagement, leads, conversion, coût par lead ou ventes.',
  'Quels outils de création, montage, planification, analytics et IA utilisez-vous ?',
  'Comment construisez-vous un calendrier éditorial orienté business ?',
  'Comment gérez-vous commentaires, crise, réputation et réponses rapides ?',
  'Quel plan de contenu lanceriez-vous durant les 30 premiers jours ?'
 ],
 'Financier analytique':[
  'Quels reportings de marge, coûts, cash-flow, budget et rentabilité maîtrisez-vous ?',
  'Donnez un exemple de décision améliorée grâce à votre analyse financière.',
  'Quels outils utilisez-vous : Excel avancé, Power BI, ERP, SQL ou autres ?',
  'Comment construisez-vous un P&L analytique par projet, activité ou centre de coût ?',
  'Comment suivez-vous prévisionnel, réel, écarts et actions correctives ?',
  'Quel tableau de bord livreriez-vous dans les 30 premiers jours ?'
 ],
 'Chargé(e) ADV':[
  'Décrivez votre maîtrise du cycle commande-client : devis, commande, livraison, facturation, règlement.',
  'Quels KPI ADV suivez-vous : backlog, OTIF, délais, litiges, DSO, encaissement ?',
  'Quels ERP/CRM/outils digitaux avez-vous utilisés ?',
  'Comment gérez-vous une commande urgente avec plusieurs intervenants ?',
  'Donnez un résultat chiffré obtenu en ADV ou service client.',
  'Quel processus amélioreriez-vous durant les 30 premiers jours ?'
 ],
 'Comptable analytique':[
  'Comment structurez-vous centres de coûts, sections analytiques et clés de répartition ?',
  'Quels travaux de clôture, rapprochement, contrôle et justification maîtrisez-vous ?',
  'Quels outils utilisez-vous : ERP comptable, Excel avancé, BI ?',
  'Donnez un exemple d’anomalie de coût détectée et corrigée.',
  'Comment reliez-vous comptabilité générale, analytique et pilotage opérationnel ?',
  'Quel reporting mensuel mettriez-vous en place ?'
 ],
 'Chargé(e) recrutement expatriés asiatiques':[
  'Quels pays/régions d’Asie connaissez-vous pour le sourcing de profils ?',
  'Quels canaux utilisez-vous pour sourcer, qualifier et négocier avec des candidats expatriés ?',
  'Décrivez les étapes que vous maîtrisez pour visa, permis de travail, contrat, légalisation et onboarding.',
  'Quelles langues utilisez-vous professionnellement avec les candidats et partenaires ?',
  'Donnez un exemple de recrutement international mené de bout en bout.',
  'Quel pipeline de recrutement pouvez-vous construire en 30 jours ?'
 ],
 'Coordinateur(trice) technique marchés & travaux':[
  'Quels types de marchés, lots techniques ou travaux avez-vous coordonnés ?',
  'Comment suivez-vous planning, budget, qualité, réserves, situations et sous-traitants ?',
  'Quels outils utilisez-vous : MS Project, AutoCAD, ERP, Excel, BIM ou autres ?',
  'Donnez un exemple de dérive chantier détectée et corrigée.',
  'Comment gérez-vous réunions, comptes rendus, visas, réception et levée de réserves ?',
  'Quel tableau de pilotage mettriez-vous en place dès le premier mois ?'
 ],
 'Réceptionniste':[
  'Décrivez votre expérience accueil, standard, visiteurs, agendas et coordination interne.',
  'Quelles langues utilisez-vous avec aisance ?',
  'Quels outils bureautiques, agendas et systèmes d’accueil maîtrisez-vous ?',
  'Comment gérez-vous plusieurs visiteurs/appels urgents simultanément ?',
  'Donnez un exemple d’amélioration de qualité d’accueil.',
  'Que mettriez-vous en place durant la première semaine ?'
 ],
 'Serveuse':[
  'Décrivez votre expérience service, prise de commande, encaissement et relation client.',
  'Quel niveau de cadence et de volume avez-vous déjà géré ?',
  'Maîtrisez-vous caisse/POS, hygiène, mise en place et gestion des réclamations ?',
  'Êtes-vous disponible pour horaires variables, soirées ou week-ends selon planning ?',
  'Donnez un exemple d’excellent service client.',
  'Comment contribuez-vous à augmenter qualité, rapidité et satisfaction ?'
 ],
 'Agent administratif':[
  'Quels processus administratifs maîtrisez-vous : courrier, dossiers, classement, achats, factures, tableaux de suivi ?',
  'Quels outils digitaux utilisez-vous au quotidien ?',
  'Comment sécurisez-vous l’exactitude et la traçabilité des documents ?',
  'Donnez un exemple de procédure administrative simplifiée ou accélérée.',
  'Comment gérez-vous priorités, urgences et délais ?',
  'Quel système de suivi mettriez-vous en place dès la première semaine ?'
 ],
 'Office Manager':[
  'Quels périmètres avez-vous pilotés : fournisseurs, bureaux, agendas, déplacements, budget, événements, services généraux ?',
  'Donnez un exemple d’économie, de gain de temps ou d’amélioration de service chiffré.',
  'Quels outils digitaux utilisez-vous pour organiser et suivre l’activité ?',
  'Comment gérez-vous plusieurs dirigeants, prestataires et urgences en parallèle ?',
  'Comment structurez-vous standards, procédures et contrôle qualité du bureau ?',
  'Quel plan 30 jours proposeriez-vous ?'
 ],
 'Chargé(e) achats détaché(e) en Chine':[
  'Dans quelles villes/provinces chinoises pouvez-vous travailler ou vous déplacer ?',
  'Quel niveau avez-vous en anglais et/ou mandarin pour négocier ?',
  'Décrivez votre expérience sourcing usines, audits, échantillons, QC et négociation.',
  'Comment vérifiez-vous fournisseur, capacité, qualité, délais et conformité avant paiement ?',
  'Êtes-vous disponible pour une affectation prolongée en Chine et déplacements fréquents ?',
  'Quel résultat achats pouvez-vous sécuriser durant les 30 premiers jours ?'
 ]
};

const steps=['Poste','Profil','Mobilité','Performance','Rémunération','Expertise','Validation'];
const yn=<><option value="">Choisir</option><option>OUI</option><option>NON</option></>;

function F({l,n,t='text',r=false,h,s='any',p}:{l:string,n:string,t?:string,r?:boolean,h?:string,s?:string,p?:string}){
 return <label>{l}{r&&<span className="req"> *</span>}{h&&<span className="hint">{h}</span>}<input name={n} type={t} required={r} step={s} placeholder={p}/></label>
}
function Y({l,n,r=false,h}:{l:string,n:string,r?:boolean,h?:string}){
 return <label>{l}{r&&<span className="req"> *</span>}{h&&<span className="hint">{h}</span>}<select name={n} required={r}>{yn}</select></label>
}
function RoleSelect({l,n,r=false}:{l:string,n:string,r?:boolean}){
 return <label>{l}{r&&<span className="req"> *</span>}<select name={n} required={r}><option value="">Choisir</option>{roles.map(x=><option key={x}>{x}</option>)}</select></label>
}

export default function Home(){
 const [step,setStep]=useState(0);
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState<any>(null);
 const [form,setForm]=useState<HTMLFormElement|null>(null);
 const [primary,setPrimary]=useState('');
 const [token]=useState(()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`);
 const progress=useMemo(()=>((step+1)/steps.length)*100,[step]);
 const questions=roleQuestions[primary]||[];

 const next=()=>{
  if(!form)return;
  const section=form.querySelector(`[data-step="${step}"]`)!;
  for(const e of [...section.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[required]')]) if(!e.reportValidity()) return;
  setStep(Math.min(step+1,steps.length-1));
  window.scrollTo({top:520,behavior:'smooth'});
 };

 const serialize=(f:HTMLFormElement)=>{
  const fd=new FormData(f),out:Record<string,string>={submission_token:token};
  for(const [k,v] of fd.entries()){
   const value=String(v);
   out[k]=out[k]?out[k]+', '+value:value;
  }
  questions.forEach((q,i)=>out[`role_q${i+1}_label`]=q);
  return out;
 };

 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity())return;
  setBusy(true);
  try{
   const data=serialize(e.currentTarget);
   const rr=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const j=await rr.json();
   if(!rr.ok||!j.ok)throw new Error(j.error||'Erreur de soumission');
   const bytes=Uint8Array.from(atob(j.pdf_base64),c=>c.charCodeAt(0));
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   setDone({...j,pdf_url:url});
   window.scrollTo({top:0,behavior:'smooth'});
  }catch(x:any){alert(x.message||'Erreur')}finally{setBusy(false)}
 };

 if(done)return <main>
  <section className="hero">
   <div className="brand">ELITE</div>
   <div className="eyebrow">CANDIDATURE ENREGISTRÉE · DOSSIER PDF</div>
   <h1>Votre candidature a été générée</h1>
   <p>Référence unique : <b>{done.id}</b>. Le dossier PDF est la pièce de référence de votre candidature.</p>
  </section>
  <section className="success">
   <h2>Référence <span className="ref">{done.id}</span></h2>
   <div className={`status ${done.whatsapp_status==='ENVOYE'?'ok':'warn'}`}>
    {done.whatsapp_status==='ENVOYE'
      ?'PDF transmis automatiquement au WhatsApp recrutement ELITE.'
      :'PDF généré. La transmission automatique WhatsApp attend la configuration WhatsApp Business Cloud API ELITE.'}
   </div>
   <div className="pdfpreview"><iframe src={done.pdf_url} title="Dossier candidature PDF"/></div>
   <a className="btn secondary" href={done.pdf_url} download={done.filename}>Télécharger le dossier PDF</a>
  </section>
 </main>;

 return <main>
  <section className="hero">
   <div className="brand">ELITE</div>
   <div className="eyebrow">RECRUTEMENT · PRISE DE FONCTION RAPIDE</div>
   <h1>Nous recrutons des profils opérationnels, digitaux et orientés résultats</h1>
   <p>Disponibilité immédiate privilégiée, avec prise de fonction visée sous <b>7 jours maximum</b>. Mobilité nationale ou internationale selon le poste. Permis et véhicule disponibles demandés pour les fonctions concernées par les déplacements.</p>
   <div className="chips"><span className="chip">13 fonctions</span><span className="chip">Résultats mesurables</span><span className="chip">Digital</span><span className="chip">Mobilité</span><span className="chip">Démarrage rapide</span></div>
   <div className="hero-actions"><a className="btn primary" href="#formulaire">COMMENCER MA CANDIDATURE</a><a className="btn secondary" href="#postes">Voir les postes</a></div>
  </section>

  <section className="rule" id="postes">
   <h2>Postes ouverts</h2>
   <div className="jobgrid">{roles.map(r=><div className="job" key={r}>{r}</div>)}</div>
   <p className="small"><b>Un seul formulaire pour tous les postes.</b> Choisissez votre priorité n°1 puis, si utile, deux fonctions alternatives. La sélection se fait sur compétences, résultats, disponibilité, mobilité et adéquation au poste.</p>
  </section>

  <div className="progress"><div style={{width:`${progress}%`}}/></div>

  <form className="card" id="formulaire" ref={setForm} onSubmit={submit}>
   <section data-step="0" style={{display:step===0?'block':'none'}}>
    <h2>1. Poste recherché</h2>
    <p className="desc">Choisissez d’abord le poste pour lequel votre valeur ajoutée est la plus forte.</p>
    <div className="grid">
     <label>Poste prioritaire <span className="req">*</span><select name="role_primary" required value={primary} onChange={e=>setPrimary(e.target.value)}><option value="">Choisir</option>{roles.map(x=><option key={x}>{x}</option>)}</select></label>
     <RoleSelect l="Deuxième choix" n="role_secondary"/>
     <RoleSelect l="Troisième choix" n="role_tertiary"/>
     <F l="Pourquoi ce poste est-il votre priorité ?" n="role_motivation" r/>
     <F l="Lien CV / LinkedIn / portfolio" n="cv_link" p="https://..."/>
    </div>
   </section>

   <section data-step="1" style={{display:step===1?'block':'none'}}>
    <h2>2. Identité et profil professionnel</h2>
    <div className="grid">
     <F l="Nom" n="nom" r/><F l="Prénom" n="prenom" r/>
     <F l="Téléphone WhatsApp" n="telephone" t="tel" r/><F l="Email" n="email" t="email" r/>
     <F l="Ville de résidence" n="ville" r/><F l="Âge professionnel / années d’expérience" n="experience_years" t="number" s="0.5" r/>
     <F l="Dernier poste occupé" n="last_job" r/><F l="Employeur / secteur récent" n="last_company"/>
     <F l="Formation / diplôme principal" n="education" r/><F l="Certifications utiles" n="certifications"/>
     <F l="Niveau français" n="french_level" r p="Ex. courant / professionnel"/><F l="Niveau anglais" n="english_level" r/>
     <F l="Mandarin / autre langue utile" n="other_languages"/>
    </div>
   </section>

   <section data-step="2" style={{display:step===2?'block':'none'}}>
    <h2>3. Disponibilité, véhicule et mobilité</h2>
    <div className="alert ok"><b>Objectif ELITE :</b> prise de fonction immédiate ou au plus tard sous 7 jours.</div>
    <div className="grid">
     <label>Disponibilité <span className="req">*</span><select name="availability" required><option value="">Choisir</option><option>IMMÉDIATE</option><option>SOUS 3 JOURS</option><option>SOUS 7 JOURS</option><option>PLUS DE 7 JOURS</option></select></label>
     <F l="Date exacte possible de prise de fonction" n="start_date" t="date" r/>
     <Y l="Permis de conduire valide ?" n="driving_license" r/>
     <Y l="Véhicule disponible pour les besoins du poste ?" n="vehicle_available" r/>
     <Y l="Mobilité nationale ?" n="mobility_national" r/>
     <Y l="Mobilité internationale ?" n="mobility_international" r/>
     <Y l="Passeport valide ?" n="passport_valid" r/>
     <Y l="Disponible pour missions prolongées hors wilaya/pays ?" n="extended_travel" r/>
     <Y l="Disponible pour horaires variables / urgence si le poste l’exige ?" n="flexible_hours" r/>
     <label className="full">Contraintes réelles pouvant limiter horaires, déplacements ou prise de fonction<textarea name="constraints" placeholder="Indiquez uniquement les contraintes opérationnelles utiles. Ne renseignez pas votre situation familiale."/></label>
    </div>
   </section>

   <section data-step="3" style={{display:step===3?'block':'none'}}>
    <h2>4. Résultats, digital et mode de travail</h2>
    <div className="grid">
     <label>Vous préférez être évalué(e) principalement sur <span className="req">*</span><select name="work_orientation" required><option value="">Choisir</option><option>RÉSULTATS MESURABLES</option><option>OBJECTIFS / KPI</option><option>LIVRABLES</option><option>QUALITÉ + RAPIDITÉ</option><option>HORAIRES / PRÉSENCE</option><option>MIXTE</option></select></label>
     <F l="Votre meilleur résultat professionnel chiffré" n="best_result" r p="Ex. -18% coûts, +35% ventes, 99,2% stock exact..."/>
     <F l="Livrable concret promis dans les 30 premiers jours" n="deliverable_30" r/>
     <F l="Résultat visé sous 90 jours" n="result_90" r/>
     <F l="Outils digitaux maîtrisés" n="digital_tools" r p="ERP, WMS, CRM, Excel, BI, IA, Canva, etc."/>
     <label>Niveau Excel / Google Sheets <span className="req">*</span><select name="excel_level" required><option value="">Choisir</option><option>DÉBUTANT</option><option>INTERMÉDIAIRE</option><option>AVANCÉ</option><option>EXPERT</option></select></label>
     <Y l="Utilisez-vous régulièrement l’IA pour accélérer votre travail ?" n="ai_usage" r/>
     <F l="Exemple d’automatisation ou digitalisation réalisée" n="digital_example"/>
     <F l="Comment prouvez-vous votre qualité de travail ?" n="quality_proof" r/>
    </div>
   </section>

   <section data-step="4" style={{display:step===4?'block':'none'}}>
    <h2>5. Prétentions fixe et variable</h2>
    <p className="desc">Les montants demandés servent à comparer les attentes et le modèle de rémunération. Ils ne valent pas offre d’embauche.</p>
    <div className="grid">
     <F l="Prétention salariale fixe mensuelle NETTE (DZD)" n="fixed_salary_dzd" t="number" s="1000" r/>
     <F l="Prétention variable mensuelle cible (DZD)" n="variable_salary_dzd" t="number" s="1000" r/>
     <label className="full">Sur quoi souhaitez-vous gagner votre variable ? <span className="req">*</span>
      <div className="checkgrid">
       {['LIVRABLES','RAPIDITÉ','QUALITÉ','KPI / OBJECTIFS','ÉCONOMIES / MARGE','VENTES / CA','DÉLAIS','SATISFACTION CLIENT','FIABILITÉ / ZÉRO ERREUR'].map(v=><label className="check" key={v}><input type="checkbox" name="variable_basis" value={v}/><span>{v}</span></label>)}
      </div>
     </label>
     <F l="Seuil ou résultat qui déclencherait selon vous le variable" n="variable_trigger" r/>
     <F l="Votre modèle de variable idéal" n="variable_model" p="Ex. prime par livrable, % économie, bonus KPI..."/>
    </div>
   </section>

   <section data-step="5" style={{display:step===5?'block':'none'}}>
    <h2>6. Expertise spécifique — {primary||'poste choisi'}</h2>
    {!primary?<div className="alert warn">Retournez à l’étape 1 et choisissez votre poste prioritaire.</div>:
     <div className="rolequestions">{questions.map((q,i)=><label key={q}>{i+1}. {q} <span className="req">*</span><textarea name={`role_q${i+1}`} required/></label>)}</div>}
   </section>

   <section data-step="6" style={{display:step===6?'block':'none'}}>
    <h2>7. Validation</h2>
    <div className="metrics">
     <div className="metric"><span>Prise de fonction cible</span><strong>≤ 7 jours</strong></div>
     <div className="metric"><span>Dossier</span><strong>PDF unique</strong></div>
     <div className="metric"><span>Évaluation</span><strong>Résultats</strong></div>
     <div className="metric"><span>Mobilité</span><strong>Selon poste</strong></div>
    </div>
    <label>Informations complémentaires<textarea name="notes"/></label>
    <label className="check"><input type="checkbox" name="accuracy" value="OUI" required/><span>Je confirme que les informations fournies sont exactes et vérifiables.</span></label>
    <label className="check"><input type="checkbox" name="consent" value="OUI" required/><span>J’autorise ELITE à utiliser ces informations pour évaluer ma candidature et me contacter.</span></label>
    <p className="small">Aucune information sur situation matrimoniale, enfants ou autre caractéristique personnelle non pertinente n’est demandée. Les contraintes opérationnelles sont évaluées uniquement par rapport aux exigences réelles du poste.</p>
   </section>

   <div className="nav">
    <button type="button" className="btn secondary" disabled={step===0||busy} onClick={()=>setStep(Math.max(0,step-1))}>Retour</button>
    {step<steps.length-1?<button type="button" className="btn primary" onClick={next}>Continuer</button>:<button type="submit" className="btn primary" disabled={busy}>{busy?'Génération du dossier...':'VALIDER MA CANDIDATURE'}</button>}
   </div>
  </form>
 </main>
}
