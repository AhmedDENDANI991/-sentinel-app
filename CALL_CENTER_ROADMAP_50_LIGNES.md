# CAHIER DES CHARGES TECHNIQUE
# Centre d'Appel Intelligent - 50 Lignes Ooredoo
# Configuration Ultra-Premium

---

## 1. ARCHITECTURE GLOBALE

```
                          ┌─────────────────────────────────────┐
                          │         CLOUD (SaaS)                │
                          │                                     │
                          │  ┌───────────┐   ┌──────────────┐  │
                          │  │  3CX /    │   │   NLP/NLG    │  │
                          │  │  Asterisk  │   │  (Claude AI) │  │
                          │  │  Cloud     │   │              │  │
                          │  └─────┬─────┘   └──────┬───────┘  │
                          │        │                 │          │
                          │  ┌─────┴─────────────────┴───────┐ │
                          │  │       CRM Integration          │ │
                          │  │    (API REST + Webhooks)       │ │
                          │  └───────────────┬────────────────┘ │
                          └─────────────────┼──────────────────┘
                                            │ Internet
                                            │ (VPN sécurisé)
                          ┌─────────────────┼──────────────────┐
                          │     SITE ENTREPRISE               │
                          │                 │                   │
         ┌────────────────┼─────────────────┼───────┐          │
         │                │                 │       │          │
    ┌────┴────┐     ┌─────┴────┐     ┌─────┴────┐  │          │
    │ GoIP-16 │     │ GoIP-16  │     │ GoIP-16  │  │          │
    │ 16 SIM  │     │ 16 SIM   │     │ 16 SIM   │  │          │
    │ Ooredoo │     │ Ooredoo  │     │ Ooredoo  │  │          │
    └────┬────┘     └─────┬────┘     └────┬─────┘  │          │
         │                │               │        │          │
         └────────────────┼───────────────┘        │          │
                          │ SIP Trunk               │          │
                    ┌─────┴──────┐                  │          │
                    │  Switch    │                  │          │
                    │  Réseau    │                  │          │
                    └─────┬──────┘                  │          │
                          │                         │          │
              ┌───────────┼───────────┐             │          │
              │           │           │             │          │
         ┌────┴──┐   ┌────┴──┐  ┌────┴──┐          │          │
         │Agent 1│   │Agent 2│  │Agent N│   (PC+Casque)       │
         └───────┘   └───────┘  └───────┘          │          │
                                                    │          │
         ┌──────────────────────────────────┐      │          │
         │  Superviseur (Dashboard temps    │      │          │
         │  réel + Wallboard TV)            │      │          │
         └──────────────────────────────────┘      │          │
                                                    │          │
         ┌──────────────────────────────────┐      │          │
         │  Serveur NAS (Backup appels)     │      │          │
         └──────────────────────────────────┘      │          │
└──────────────────────────────────────────────────┘
```

---

## 2. LISTE DU MATERIEL A ACHETER

### 2.1 Gateways GSM (Conversion SIM Ooredoo → VoIP)

| # | Equipement | Qté | Prix unitaire | Total | Fournisseur |
|---|-----------|-----|---------------|-------|-------------|
| 1 | **GoIP-16** (16 ports SIM) | 3 | 450 EUR | 1 350 EUR | AliExpress / Hybertone |
| 2 | **Antennes GSM externes** (meilleur signal) | 6 | 15 EUR | 90 EUR | AliExpress |
| 3 | **SIM Ooredoo** (forfait voix illimité) | 50 | Existant | 0 | Ooredoo |
| 4 | Câbles Ethernet Cat6 (3m) | 3 | 5 EUR | 15 EUR | Local |

> **Note** : 3 x GoIP-16 = 48 ports. 2 ports de réserve en cas de panne SIM.
> Alternative premium : **Dinstar DWG2000G-16G** x3 (plus fiable, ~600 EUR/unité)

### 2.2 Postes Agents

| # | Equipement | Qté | Prix unitaire | Total |
|---|-----------|-----|---------------|-------|
| 5 | **Casques USB Jabra Evolve2 40** | 50 | 80 EUR | 4 000 EUR |
| 6 | Alternative budget : **Plantronics Blackwire 3220** | 50 | 40 EUR | 2 000 EUR |

### 2.3 Réseau

| # | Equipement | Qté | Prix unitaire | Total |
|---|-----------|-----|---------------|-------|
| 7 | **Switch PoE 48 ports** (TP-Link TL-SG1048) | 1 | 250 EUR | 250 EUR |
| 8 | **Routeur/Firewall** (MikroTik RB4011 ou pfSense) | 1 | 200 EUR | 200 EUR |
| 9 | **Connexion Internet** fibre (2 lignes pour redondance) | 2 | Abonnement | - |

### 2.4 Supervision

| # | Equipement | Qté | Prix unitaire | Total |
|---|-----------|-----|---------------|-------|
| 10 | **TV 55" Wallboard** (dashboard temps réel) | 1 | 300 EUR | 300 EUR |
| 11 | **Mini PC** pour affichage wallboard | 1 | 150 EUR | 150 EUR |

### 2.5 Stockage Enregistrements

| # | Equipement | Qté | Prix unitaire | Total |
|---|-----------|-----|---------------|-------|
| 12 | **NAS Synology DS220+** (backup local) | 1 | 300 EUR | 300 EUR |
| 13 | **Disque dur 4 To** x2 (RAID 1) | 2 | 100 EUR | 200 EUR |

> 50 lignes x 8h/jour x 22 jours = ~1 To/mois d'enregistrements

---

### BUDGET TOTAL MATERIEL

| Config | Total |
|--------|-------|
| **Premium** (Jabra + Dinstar) | ~8 500 EUR |
| **Budget** (Plantronics + GoIP) | ~4 500 EUR |

---

## 3. LOGICIELS & SERVICES (ABONNEMENTS MENSUELS)

### 3.1 Plateforme Centre d'Appel

| Option | Prix/mois | Capacité | Recommandation |
|--------|-----------|----------|----------------|
| **3CX Enterprise Cloud** | 300 EUR/an (50 agents) | 50 appels simultanés | RECOMMANDE |
| **VICIdial** (open source) | 0 EUR (self-hosted) | Illimité | Si expertise IT interne |
| **Issabel PBX** (open source) | 0 EUR | Illimité | Alternative |

### 3.2 IA Conversationnelle (NLP/NLG)

| Service | Prix/mois | Usage |
|---------|-----------|-------|
| **Claude API** (Anthropic) | ~50-100 EUR | Analyse sentiment, résumé appels |
| **Whisper API** (OpenAI) | ~30 EUR | Transcription automatique des appels |
| **ElevenLabs** (optionnel) | ~25 EUR | Voix IA réaliste pour IVR |

### 3.3 Autres Services

| Service | Prix/mois | Usage |
|---------|-----------|-------|
| **VPS Cloud** (si self-hosted) | 30 EUR | Hébergement Asterisk/VICIdial |
| **Google Drive / OneDrive** | 10 EUR | Backup cloud enregistrements |
| **VPN** (WireGuard) | 0 EUR | Sécurisation connexion |

### BUDGET MENSUEL TOTAL

| Poste | Mensuel |
|-------|---------|
| Plateforme Call Center | 25 EUR (3CX) ou 30 EUR (VPS) |
| IA (NLP + Transcription) | 80-130 EUR |
| Backup Cloud | 10 EUR |
| **TOTAL** | **~115 - 195 EUR/mois** |
| + Forfaits Ooredoo 50 lignes | Selon abonnement actuel |

---

## 4. CONFIGURATION TECHNIQUE DETAILLEE

### 4.1 Configuration GoIP-16 (x3)

```
┌─────────────────────────────────────────────────┐
│  CONFIGURATION GoIP-16 (par boîtier)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  Réseau:                                         │
│    IP statique LAN     : 192.168.1.10/11/12     │
│    Passerelle           : 192.168.1.1            │
│    DNS                  : 8.8.8.8 / 8.8.4.4     │
│                                                  │
│  SIP:                                            │
│    SIP Server           : <IP_3CX_CLOUD>        │
│    SIP Port             : 5060                   │
│    Transport            : UDP (ou TLS pour sécu) │
│    Registration         : Oui                    │
│    Expire               : 300s                   │
│    DTMF                 : RFC2833                │
│                                                  │
│  Codec (ordre priorité):                         │
│    1. G.711a (alaw) - Meilleure qualité          │
│    2. G.729 - Economie bande passante            │
│                                                  │
│  GSM:                                            │
│    Bande                : 900/1800 MHz           │
│    SMS Forward          : Activé → CRM           │
│    USSD                 : Désactivé              │
│    Gain micro           : 3                      │
│    Gain speaker         : 3                      │
│                                                  │
│  Routage (par canal SIM):                        │
│    Canal 1  → Extension SIP 1001                 │
│    Canal 2  → Extension SIP 1002                 │
│    ...                                           │
│    Canal 16 → Extension SIP 1016                 │
│                                                  │
│  Failover:                                       │
│    Si canal occupé → round-robin vers libre      │
│    Si SIM hors service → alerte email            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.2 Configuration 3CX Cloud

```
┌─────────────────────────────────────────────────┐
│  CONFIGURATION 3CX ENTERPRISE                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  TRUNKS SIP (3 trunks = 3 GoIP):                │
│    Trunk 1 : GoIP-16 #1 → 16 canaux            │
│    Trunk 2 : GoIP-16 #2 → 16 canaux            │
│    Trunk 3 : GoIP-16 #3 → 16 canaux            │
│    Total   : 48 canaux simultanés               │
│                                                  │
│  EXTENSIONS (50 agents):                         │
│    1001 → Agent 01 (Nom, email, mobile)         │
│    1002 → Agent 02                               │
│    ...                                           │
│    1050 → Agent 50                               │
│                                                  │
│  FILES D'ATTENTE:                                │
│    Q100 → File Commerciale (20 agents)          │
│    Q200 → File SAV/Support (15 agents)          │
│    Q300 → File Réclamations (10 agents)         │
│    Q400 → File VIP (5 agents)                   │
│                                                  │
│  IVR (Serveur Vocal Interactif):                │
│    "Bienvenue chez [Entreprise]"                │
│    1 → Service Commercial    → Q100             │
│    2 → Support Technique     → Q200             │
│    3 → Réclamation           → Q300             │
│    * → Parler à un agent     → Q100             │
│    Timeout 10s → Q100                            │
│                                                  │
│  ENREGISTREMENT:                                 │
│    Mode          : Tous les appels (IN + OUT)    │
│    Format        : WAV 16kHz mono                │
│    Stockage      : Cloud + NAS local             │
│    Rétention     : 12 mois                       │
│    Accès         : Superviseur + Admin seulement │
│                                                  │
│  REGLES D'APPEL SORTANT:                         │
│    07xxxxxxxx → Trunk round-robin (load balance) │
│    05xxxxxxxx → Trunk round-robin                │
│    06xxxxxxxx → Trunk round-robin                │
│    Préfixe 0   → National                        │
│    Préfixe 00  → BLOQUE (sauf autorisation)      │
│                                                  │
│  HORAIRES:                                       │
│    Dim-Jeu : 08:00 - 17:00 → Agents             │
│    Ven-Sam : Fermé → Message vocal               │
│    Jours fériés : Fermé → Message vocal          │
│                                                  │
│  SUPERVISION:                                    │
│    Wallboard     : TV temps réel                 │
│    Listen/Whisper: Superviseur écoute discrète   │
│    Barge-in      : Superviseur prend l'appel     │
│    Rapports      : Quotidien + Hebdo + Mensuel   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.3 Configuration Réseau / Firewall

```
┌─────────────────────────────────────────────────┐
│  CONFIGURATION RESEAU                            │
├─────────────────────────────────────────────────┤
│                                                  │
│  VLAN:                                           │
│    VLAN 10 → Voix (GoIP + Agents) - Priorité    │
│    VLAN 20 → Data (PC, Internet)                │
│    VLAN 30 → Management (Admin)                 │
│                                                  │
│  QoS (Qualité de Service):                       │
│    SIP (port 5060)     → Priority HIGH          │
│    RTP (10000-20000)   → Priority HIGHEST       │
│    HTTP/HTTPS          → Priority NORMAL        │
│                                                  │
│  FIREWALL:                                       │
│    ALLOW : UDP 5060 → 3CX Cloud (SIP)          │
│    ALLOW : UDP 10000-20000 → 3CX Cloud (RTP)   │
│    ALLOW : TCP 443 → 3CX Cloud (HTTPS)         │
│    ALLOW : TCP 5001 → 3CX Cloud (Tunnel)       │
│    DENY  : Tout le reste entrant                │
│                                                  │
│  BANDE PASSANTE REQUISE:                         │
│    Par appel G.711   : 87 kbps                  │
│    Par appel G.729   : 31 kbps                  │
│    50 appels G.711   : 4.35 Mbps                │
│    50 appels G.729   : 1.55 Mbps                │
│    Recommandé        : Fibre 20 Mbps minimum    │
│                                                  │
│  REDONDANCE INTERNET:                            │
│    Ligne 1 : Fibre principale (Algérie Telecom) │
│    Ligne 2 : 4G backup (Ooredoo/Djezzy)        │
│    Failover : Automatique si ligne 1 tombe      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.4 Configuration NLP/NLG (IA)

```
┌─────────────────────────────────────────────────┐
│  CONFIGURATION IA CONVERSATIONNELLE              │
├─────────────────────────────────────────────────┤
│                                                  │
│  MODULE 1 : TRANSCRIPTION TEMPS REEL            │
│    Outil     : OpenAI Whisper API               │
│    Langue    : Arabe (ar) + Français (fr)       │
│    Mode      : Temps réel (streaming)           │
│    Output    : Texte → CRM (champ notes)        │
│                                                  │
│  MODULE 2 : ANALYSE SENTIMENT                   │
│    Outil     : Claude API (Anthropic)           │
│    Trigger   : Fin de chaque appel              │
│    Output    : Score -1 à +1                    │
│                Positif / Neutre / Négatif        │
│    Action    : Si négatif → Alerte superviseur  │
│                                                  │
│  MODULE 3 : RESUME AUTOMATIQUE                  │
│    Outil     : Claude API                       │
│    Trigger   : Fin de chaque appel              │
│    Output    : Résumé 3 lignes + action requise │
│    Stockage  : CRM (fiche client)               │
│                                                  │
│  MODULE 4 : IVR INTELLIGENT (optionnel)         │
│    Outil     : Claude API + ElevenLabs TTS      │
│    Mode      : Le client PARLE au lieu d'appuyer│
│    Exemple   : "Je veux parler au commercial"   │
│                → Route vers Q100 automatiquement │
│                                                  │
│  MODULE 5 : COACHING AGENT TEMPS REEL           │
│    Outil     : Claude API                       │
│    Mode      : Suggestions texte pendant l'appel│
│    Exemple   : "Le client semble frustré,       │
│                 proposez un geste commercial"    │
│                                                  │
│  FLUX DE DONNEES:                                │
│    Appel → Whisper (transcription)              │
│         → Claude (analyse + résumé)             │
│         → CRM (stockage fiche client)           │
│         → Dashboard (KPI temps réel)            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 5. INTEGRATION CRM

```
┌─────────────────────────────────────────────────┐
│  INTEGRATION CRM                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  FONCTIONNALITES:                                │
│                                                  │
│  1. CLICK-TO-CALL                                │
│     Agent clique sur numéro dans CRM            │
│     → Appel déclenché automatiquement           │
│                                                  │
│  2. POPUP ENTRANT                                │
│     Appel entrant → Recherche numéro dans CRM   │
│     → Fiche client s'ouvre automatiquement       │
│     → Historique appels + commandes visible      │
│                                                  │
│  3. LOG AUTOMATIQUE                              │
│     Chaque appel crée une entrée dans CRM:      │
│     - Date/heure                                 │
│     - Durée                                      │
│     - Agent                                      │
│     - Enregistrement (lien)                      │
│     - Transcription                              │
│     - Résumé IA                                  │
│     - Sentiment                                  │
│                                                  │
│  4. QUALIFICATION LEAD                           │
│     Après appel → Formulaire qualification       │
│     → Statut lead mis à jour dans CRM           │
│                                                  │
│  API ENDPOINTS REQUIS:                           │
│     POST /api/calls          (créer appel)      │
│     GET  /api/contacts/:tel  (chercher contact) │
│     PUT  /api/contacts/:id   (MAJ contact)      │
│     POST /api/recordings     (sauver enreg.)    │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 6. PLANNING DE REALISATION

### Phase 1 : Infrastructure (Semaine 1-2)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 1.1 | Commander matériel (GoIP x3, casques, switch) | J1 | Achat |
| 1.2 | Installer fibre + ligne backup 4G | J1-J7 | FAI |
| 1.3 | Configurer réseau (VLAN, QoS, firewall) | J3-J5 | IT Réseau |
| 1.4 | Installer switch + câblage postes agents | J5-J7 | IT Réseau |
| 1.5 | Installer NAS + configurer RAID | J7 | IT Système |
| 1.6 | Tester bande passante + latence | J7 | IT Réseau |

### Phase 2 : Plateforme Call Center (Semaine 2-3)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 2.1 | Créer compte 3CX Cloud Enterprise | J8 | IT Système |
| 2.2 | Configurer GoIP-16 #1 (16 SIM) | J8-J9 | IT Télécom |
| 2.3 | Configurer GoIP-16 #2 (16 SIM) | J9-J10 | IT Télécom |
| 2.4 | Configurer GoIP-16 #3 (16 SIM) | J10-J11 | IT Télécom |
| 2.5 | Créer trunks SIP (GoIP → 3CX) | J11 | IT Télécom |
| 2.6 | Créer 50 extensions agents | J12 | IT Système |
| 2.7 | Configurer files d'attente (Q100-Q400) | J12 | IT Système |
| 2.8 | Configurer IVR + messages vocaux | J13 | IT Système |
| 2.9 | Configurer enregistrement appels | J13 | IT Système |
| 2.10 | Configurer règles d'appels sortants | J14 | IT Système |
| 2.11 | Tests appels entrants/sortants (toutes SIM) | J14-J15 | IT + QA |

### Phase 3 : IA & NLP (Semaine 3-4)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 3.1 | Créer comptes API (Claude, Whisper) | J15 | IT Dev |
| 3.2 | Développer module transcription | J15-J18 | IT Dev |
| 3.3 | Développer module analyse sentiment | J18-J19 | IT Dev |
| 3.4 | Développer module résumé automatique | J19-J20 | IT Dev |
| 3.5 | Tester IA sur appels réels | J20-J21 | IT Dev + QA |

### Phase 4 : Intégration CRM (Semaine 4-5)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 4.1 | Développer API CRM (endpoints) | J22-J25 | IT Dev |
| 4.2 | Intégrer click-to-call | J25-J26 | IT Dev |
| 4.3 | Intégrer popup fiche client | J26-J27 | IT Dev |
| 4.4 | Intégrer log automatique appels | J27-J28 | IT Dev |
| 4.5 | Tests intégration complète | J28-J30 | QA |

### Phase 5 : Supervision & Wallboard (Semaine 5)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 5.1 | Installer TV wallboard + mini PC | J30 | IT |
| 5.2 | Configurer dashboard temps réel | J30-J31 | IT Système |
| 5.3 | Configurer rapports automatiques | J31-J32 | IT Système |
| 5.4 | Configurer alertes superviseur | J32 | IT Système |

### Phase 6 : Formation & Go Live (Semaine 5-6)

| # | Tache | Durée | Responsable |
|---|-------|-------|-------------|
| 6.1 | Former superviseurs (dashboard, écoute) | J33 | Formateur |
| 6.2 | Former agents (softphone, CRM) | J33-J34 | Formateur |
| 6.3 | Go Live pilote (10 agents) | J35-J37 | Tous |
| 6.4 | Ajustements post-pilote | J37-J39 | IT |
| 6.5 | Go Live complet (50 agents) | J40 | Tous |
| 6.6 | Monitoring post-lancement (2 semaines) | J40-J54 | IT |

---

## 7. KPI & DASHBOARD SUPERVISEUR

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLBOARD TEMPS REEL                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ EN COURS │  │ EN ATTENTE│  │  AGENTS  │  │  APPELS  │   │
│  │    23    │  │     5    │  │  42/50   │  │  347/jour│   │
│  │ appels   │  │ en file  │  │  en ligne│  │  total   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  DUREE   │  │  TAUX    │  │ SENTIMENT│  │ ABANDON  │   │
│  │  MOY.    │  │ REPONSE  │  │  MOYEN   │  │  RATE    │   │
│  │  3:42    │  │   94%    │  │  +0.7    │  │   3%     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  AGENTS:                                                     │
│  ┌──────┬────────┬────────┬────────┬──────────┬──────────┐ │
│  │ Ext  │ Agent  │ Status │ Durée  │ Appels/j │ Sentim.  │ │
│  ├──────┼────────┼────────┼────────┼──────────┼──────────┤ │
│  │ 1001 │ Ahmed  │ APPEL  │ 02:15  │    18    │  +0.8    │ │
│  │ 1002 │ Karim  │ DISPO  │  --    │    22    │  +0.6    │ │
│  │ 1003 │ Sara   │ PAUSE  │ 05:00  │    15    │  +0.9    │ │
│  │ 1004 │ Nadia  │ APPEL  │ 08:32  │    12    │  +0.3    │ │
│  │ ...  │ ...    │ ...    │ ...    │   ...    │  ...     │ │
│  └──────┴────────┴────────┴────────┴──────────┴──────────┘ │
│                                                              │
│  FILES D'ATTENTE:                                            │
│  ┌──────────────┬────────┬────────┬──────────┬────────────┐ │
│  │ File         │Attente │ Agents │ Attente  │ SLA        │ │
│  │              │        │ actifs │ max      │ (<30s)     │ │
│  ├──────────────┼────────┼────────┼──────────┼────────────┤ │
│  │ Commercial   │   2    │ 18/20  │  0:25    │  96%       │ │
│  │ Support      │   1    │ 14/15  │  0:12    │  98%       │ │
│  │ Réclamation  │   0    │  8/10  │  0:00    │ 100%       │ │
│  │ VIP          │   0    │  5/5   │  0:00    │ 100%       │ │
│  └──────────────┴────────┴────────┴──────────┴────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. SECURITE

```
┌─────────────────────────────────────────────────┐
│  MESURES DE SECURITE                             │
├─────────────────────────────────────────────────┤
│                                                  │
│  RESEAU:                                         │
│  ✓ VPN entre site et cloud (WireGuard/IPSec)    │
│  ✓ VLAN séparé pour voix                        │
│  ✓ Firewall avec règles strictes                │
│  ✓ Fail2ban sur SIP (anti brute-force)          │
│  ✓ TLS pour signalisation SIP                   │
│  ✓ SRTP pour chiffrement voix                   │
│                                                  │
│  ACCES:                                          │
│  ✓ Authentification 2FA admin/superviseur       │
│  ✓ Rôles : Admin > Superviseur > Agent          │
│  ✓ Logs d'accès conservés 12 mois               │
│  ✓ Mots de passe complexes obligatoires         │
│                                                  │
│  ENREGISTREMENTS:                                │
│  ✓ Chiffrés au repos (AES-256)                  │
│  ✓ Accès superviseur uniquement                 │
│  ✓ Backup automatique quotidien (NAS + cloud)   │
│  ✓ Rétention 12 mois puis suppression auto      │
│                                                  │
│  CONFORMITE:                                     │
│  ✓ Message "cet appel est enregistré"           │
│  ✓ Conforme réglementation algérienne           │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 9. RECAPITULATIF BUDGET

### Investissement Initial (One-Shot)

| Poste | Budget | Premium |
|-------|--------|---------|
| Gateways GSM (GoIP/Dinstar x3) | 1 350 EUR | 1 800 EUR |
| Casques USB x50 | 2 000 EUR | 4 000 EUR |
| Réseau (switch + routeur) | 450 EUR | 450 EUR |
| Wallboard (TV + mini PC) | 450 EUR | 450 EUR |
| NAS + disques | 500 EUR | 500 EUR |
| **TOTAL ONE-SHOT** | **4 750 EUR** | **7 200 EUR** |

### Budget Mensuel Récurrent

| Poste | Mensuel |
|-------|---------|
| 3CX Cloud Enterprise | 25 EUR |
| IA (Claude API + Whisper) | 80-130 EUR |
| Backup cloud | 10 EUR |
| Forfaits Ooredoo x50 | Existant |
| Internet (fibre x2) | Existant |
| **TOTAL MENSUEL** | **~115 - 165 EUR** |

---

## 10. CONTACTS FOURNISSEURS

| Besoin | Fournisseur | Contact |
|--------|-------------|---------|
| GoIP Gateway | Hybertone (AliExpress) | hybertone.com |
| 3CX License | 3CX Partner Algérie | 3cx.com/partners |
| Casques Jabra | Revendeur local ou Amazon | jabra.com |
| NAS Synology | Revendeur local | synology.com |
| Claude API | Anthropic | console.anthropic.com |
| Whisper API | OpenAI | platform.openai.com |

---

## 11. CHECKLIST PRE-GO-LIVE

```
[ ] Toutes les SIM Ooredoo activées et testées
[ ] 3 GoIP configurés et enregistrés sur 3CX
[ ] 50 extensions créées et testées
[ ] IVR enregistré et fonctionnel
[ ] Files d'attente configurées
[ ] Enregistrement d'appels activé
[ ] Click-to-call CRM fonctionnel
[ ] Popup fiche client fonctionnel
[ ] Transcription IA fonctionnelle
[ ] Wallboard affiché sur TV
[ ] Rapports automatiques configurés
[ ] Backup NAS + cloud fonctionnel
[ ] Formation superviseurs terminée
[ ] Formation agents terminée
[ ] Test de charge (50 appels simultanés)
[ ] Test failover internet (coupure ligne 1)
[ ] Test failover SIM (SIM hors service)
[ ] Documentation technique à jour
```

---

*Document généré le 18/03/2026*
*Version 1.0 — Configuration Ultra-Premium 50 Lignes*
*A transmettre à l'équipe IT pour réalisation*
