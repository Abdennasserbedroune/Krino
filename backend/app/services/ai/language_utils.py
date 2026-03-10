"""Language detection and prompt directive utilities."""

# Common French function words + CV-specific terms
_FRENCH_INDICATORS = [
    # Function words (high frequency, very reliable)
    " je ", " les ", " des ", " dans ", " pour ", " avec ", " sur ",
    " une ", " mon ", " ma ", " est ", " sont ", " nous ", " vous ",
    " ils ", " du ", " au ", " aux ", " que ", " qui ", " par ",
    " ou ", " et ", " en ", " se ", " ce ",
    # CV section headers
    "exp\u00e9rience", "comp\u00e9tences", "formation", "poste", "emploi",
    "entreprise", "responsabilit\u00e9s", "dipl\u00f4me", "ma\u00eetrise",
    "licence", "stage", "missions", "profil", "objectif",
    "langues", "certifications", "r\u00e9sum\u00e9", "carri\u00e8re",
    # Common French words that simply do not appear in English CVs
    "travail", "ann\u00e9es", "niveau", "domaine", "secteur",
]

# French-specific accent characters — their presence alone is a strong signal
_FRENCH_ACCENT_CHARS = ["\u00e9", "\u00e8", "\u00ea", "\u00e0", "\u00e2", "\u00f4", "\u00fb", "\u00ee", "\u00e7"]


def detect_text_language(text: str) -> str:
    """Heuristic language detection. Returns 'fr' or 'en'.

    Strategy (in order):
    1. Fast accent check: if 3+ distinct French accent chars appear in the
       first 3000 chars the text is almost certainly French.
    2. Indicator word count on first 4000 chars: 4+ hits -> French.
    This double-check prevents misclassification of short or
    English-formatted French CVs.
    """
    if not text:
        return "en"

    sample = text.lower()[:4000]

    # Step 1: accent shortcut (fast)
    accent_hits = sum(1 for ch in _FRENCH_ACCENT_CHARS if ch in sample)
    if accent_hits >= 3:
        return "fr"

    # Step 2: indicator word count
    hits = sum(1 for indicator in _FRENCH_INDICATORS if indicator in sample)
    return "fr" if hits >= 4 else "en"


def resolve_language(requested: str, fallback_text: str = "") -> str:
    """Resolve the final language to use.

    - 'fr'   -> always French
    - 'en'   -> always English
    - 'auto' -> detect from fallback_text
    """
    if requested in ("fr", "en"):
        return requested
    return detect_text_language(fallback_text)


def get_language_directive(language: str) -> str:
    """Return the system-prompt directive for the given language.

    Appended to every system prompt so the model never produces
    mixed-language output.
    """
    if language == "fr":
        return (
            "\n\n"
            "INSTRUCTION OBLIGATOIRE : Tu dois r\u00e9pondre ENTI\u00c8REMENT en fran\u00e7ais. "
            "Tous les textes, \u00e9tiquettes, conseils, points de liste et explications "
            "doivent \u00eatre r\u00e9dig\u00e9s en fran\u00e7ais. "
            "Ne m\u00e9lange pas les langues. "
            "M\u00eame les valeurs JSON doivent \u00eatre en fran\u00e7ais."
        )
    return ""
