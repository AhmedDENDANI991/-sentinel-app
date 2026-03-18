"""
C4 - ENRICHER: AI Classification & Contextualization
Tier 1: Deterministic rules engine (covers 70-80% of cases)
Tier 2: LLM classification for ambiguous documents
"""

import re
from typing import Any

# Dendani entities with keywords
ENTITY_KEYWORDS: dict[str, list[str]] = {
    'DENDANI-PROM': ['dendani promotion', 'dendani prom', 'dp immobilier'],
    'ELITE-IMM': ['elite immobiliere', 'elite imm', 'elite immobilier'],
    'SINEMMAR': ['sinemmar', 'snmr'],
    'DENDANI-CONST': ['dendani construction', 'dendani const'],
    'DENDANI-INVEST': ['dendani investissement', 'dendani invest'],
    'DENDANI-HOLDING': ['dendani holding', 'groupe dendani'],
}

# Project keywords
PROJECT_KEYWORDS: dict[str, list[str]] = {
    'IRENE': ['irene', 'projet irene'],
    'ASTERIA': ['asteria', 'projet asteria'],
    'SINEMMAR-IND': ['sinemmar industriel', 'sinemmar ind'],
    'RESIDENCE-A': ['residence a', 'res a', 'résidence a'],
    'RESIDENCE-B': ['residence b', 'res b', 'résidence b'],
    'COMMERCIAL-1': ['centre commercial', 'commercial 1'],
}

# Document type classification keywords
DOC_TYPE_KEYWORDS: dict[str, list[str]] = {
    'FACTURE-ACHAT': ['facture', 'invoice', 'fournisseur', 'bon de commande', 'devis'],
    'FACTURE-VENTE': ['facture de vente', 'promesse de vente', 'acte de vente', 'client'],
    'RELEVE-BANCAIRE': ['releve bancaire', 'relevé bancaire', 'extrait de compte', 'situation de compte'],
    'CONTRAT': ['contrat', 'convention', 'accord', 'protocole', 'avenant'],
    'MARCHE-TRAVAUX': ['marche', 'marché', 'situation de travaux', 'decompte', 'attachement'],
    'PLAN-TECHNIQUE': ['plan', 'facade', 'coupe', 'etage', 'niveau', 'autocad', 'dwg'],
    'PV-REUNION': ['proces verbal', 'procès-verbal', 'pv de reunion', 'compte rendu'],
    'BILAN-COMPTABLE': ['bilan', 'compte de resultat', 'balance', 'grand livre', 'tcr'],
    'ACTE-NOTARIE': ['acte notarie', 'notaire', 'cession', 'constitution'],
    'CORRESPONDANCE': ['lettre', 'courrier', 'email', 'mise en demeure'],
    'PHOTO-CHANTIER': ['photo', 'chantier', 'avancement'],
    'STATUTS': ['statuts', 'registre de commerce', 'rc', 'cnrc'],
    'APPORT-CAPITAL': ['apport', 'capital', 'versement capital', 'augmentation de capital'],
    'RETENUE-GARANTIE': ['retenue de garantie', 'rg', 'mainlevee'],
}

# SCF Account mapping
SCF_ACCOUNTS: dict[str, dict[str, str]] = {
    'FACTURE-ACHAT': {'debit': '601', 'credit': '401', 'journal': 'ACHATS'},
    'FACTURE-VENTE': {'debit': '411', 'credit': '701', 'journal': 'VENTES'},
    'RELEVE-BANCAIRE-CREDIT': {'debit': '512', 'credit': '411', 'journal': 'BANQUE'},
    'RELEVE-BANCAIRE-DEBIT': {'debit': '401', 'credit': '512', 'journal': 'BANQUE'},
    'APPORT-CAPITAL': {'debit': '512', 'credit': '101', 'journal': 'OD'},
    'RETENUE-GARANTIE': {'debit': '411', 'credit': '165', 'journal': 'OD'},
    'MARCHE-TRAVAUX': {'debit': '238', 'credit': '401', 'journal': 'OD'},
}

# Archive path mapping
ARCHIVE_PATHS: dict[str, str] = {
    'FACTURE-ACHAT': 'COMPTABILITE/ACHATS',
    'FACTURE-VENTE': 'COMPTABILITE/VENTES',
    'RELEVE-BANCAIRE': 'COMPTABILITE/BANQUE',
    'CONTRAT': 'CONTRATS',
    'MARCHE-TRAVAUX': 'TRAVAUX',
    'PLAN-TECHNIQUE': 'PLANS',
    'PV-REUNION': 'JURIDIQUE',
    'BILAN-COMPTABLE': 'COMPTABILITE',
    'ACTE-NOTARIE': 'JURIDIQUE',
    'CORRESPONDANCE': 'JURIDIQUE',
    'PHOTO-CHANTIER': 'PHOTOS',
    'STATUTS': 'JURIDIQUE',
    'APPORT-CAPITAL': 'COMPTABILITE',
    'RETENUE-GARANTIE': 'TRAVAUX',
}


def classify_document(
    text: str,
    filename: str,
    metadata: dict[str, Any],
    financial_entities: dict[str, Any],
    entities_ref: list[dict[str, Any]] | None = None,
    projects_ref: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Classify a document using Tier 1 deterministic rules.
    Returns classification with confidence score.
    """
    text_lower = text.lower() if text else ""
    filename_lower = filename.lower()
    combined = text_lower + " " + filename_lower

    result: dict[str, Any] = {
        'entity_code': None,
        'project_code': None,
        'doc_type': None,
        'doc_subtype': None,
        'doc_date': None,
        'period_year': None,
        'period_month': None,
        'amount_ht': None,
        'amount_tva': None,
        'amount_ttc': None,
        'counterparty_name': None,
        'counterparty_nif': None,
        'invoice_number': None,
        'confidence_score': 0.0,
        'classification_method': 'RULES_ENGINE',
        'archive_path': 'NON_CLASSE',
    }

    confidence = 0.0

    # --- Entity detection ---
    # First check custom entities from DB
    if entities_ref:
        for ent in entities_ref:
            code = ent.get('code', '')
            name = ent.get('name', '')
            nif = ent.get('nif', '')
            if code.lower() in combined or name.lower() in combined:
                result['entity_code'] = code
                confidence += 20
                break
            if nif and nif in text:
                result['entity_code'] = code
                result['counterparty_nif'] = nif
                confidence += 25
                break

    # Fallback to keyword matching
    if not result['entity_code']:
        for code, keywords in ENTITY_KEYWORDS.items():
            for kw in keywords:
                if kw in combined:
                    result['entity_code'] = code
                    confidence += 15
                    break
            if result['entity_code']:
                break

    # --- Project detection ---
    if projects_ref:
        for proj in projects_ref:
            code = proj.get('code', '')
            name = proj.get('name', '')
            if code.lower() in combined or name.lower() in combined:
                result['project_code'] = code
                confidence += 20
                break

    if not result['project_code']:
        for code, keywords in PROJECT_KEYWORDS.items():
            for kw in keywords:
                if kw in combined:
                    result['project_code'] = code
                    confidence += 15
                    break
            if result['project_code']:
                break

    # --- Document type detection ---
    best_type = None
    best_score = 0
    for doc_type, keywords in DOC_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > best_score:
            best_score = score
            best_type = doc_type

    if best_type:
        result['doc_type'] = best_type
        result['archive_path'] = ARCHIVE_PATHS.get(best_type, 'NON_CLASSE')
        confidence += min(best_score * 10, 30)

    # --- Financial data extraction ---
    if financial_entities:
        # Amounts
        if 'amount_ttc' in financial_entities and financial_entities['amount_ttc']:
            result['amount_ttc'] = max(financial_entities['amount_ttc'])
            confidence += 10
        if 'amount_ht' in financial_entities and financial_entities['amount_ht']:
            result['amount_ht'] = max(financial_entities['amount_ht'])
            confidence += 5
        if 'amount_tva' in financial_entities and financial_entities['amount_tva']:
            result['amount_tva'] = max(financial_entities['amount_tva'])
        if 'amount_da' in financial_entities and financial_entities['amount_da']:
            if not result['amount_ttc']:
                result['amount_ttc'] = max(financial_entities['amount_da'])
                confidence += 10

        # Invoice number
        if 'invoice_number' in financial_entities and financial_entities['invoice_number']:
            result['invoice_number'] = financial_entities['invoice_number'][0]
            confidence += 5

        # NIF
        if 'nif' in financial_entities and financial_entities['nif']:
            result['counterparty_nif'] = financial_entities['nif'][0]
            confidence += 5

        # Dates
        if 'dates' in financial_entities and financial_entities['dates']:
            result['doc_date'] = financial_entities['dates'][0]
            try:
                parts = result['doc_date'].split('-')
                result['period_year'] = int(parts[0])
                result['period_month'] = int(parts[1])
            except (IndexError, ValueError):
                pass
            confidence += 5

    # Normalize confidence to 0-100
    result['confidence_score'] = min(confidence, 100.0)

    return result


def generate_accounting_entry(classification: dict[str, Any]) -> dict[str, Any] | None:
    """
    Generate an SCF accounting entry proposal based on document classification.
    """
    doc_type = classification.get('doc_type')
    if not doc_type:
        return None

    # Determine specific account type
    account_key = doc_type
    if doc_type == 'RELEVE-BANCAIRE':
        amount = classification.get('amount_ttc', 0) or 0
        account_key = 'RELEVE-BANCAIRE-CREDIT' if amount > 0 else 'RELEVE-BANCAIRE-DEBIT'

    accounts = SCF_ACCOUNTS.get(account_key)
    if not accounts:
        return None

    amount = classification.get('amount_ttc') or classification.get('amount_ht') or 0

    entry = {
        'entry_date': classification.get('doc_date'),
        'journal': accounts['journal'],
        'account_debit': accounts['debit'],
        'account_credit': accounts['credit'],
        'label': _generate_label(classification),
        'amount': abs(amount),
        'entity_code': classification.get('entity_code'),
        'project_code': classification.get('project_code'),
        'confidence_score': classification.get('confidence_score', 0),
        'status': 'AUTO' if classification.get('confidence_score', 0) >= 98 else 'PROPOSED',
    }

    return entry


def _generate_label(classification: dict[str, Any]) -> str:
    """Generate a descriptive accounting label."""
    parts = []
    if classification.get('doc_type'):
        parts.append(classification['doc_type'].replace('-', ' '))
    if classification.get('invoice_number'):
        parts.append(f"N:{classification['invoice_number']}")
    if classification.get('counterparty_name'):
        parts.append(classification['counterparty_name'])
    if classification.get('project_code'):
        parts.append(f"Projet:{classification['project_code']}")
    return " - ".join(parts) if parts else "Ecriture automatique"
