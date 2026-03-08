"""Language detection and prompt directive utilities."""

_FRENCH_INDICATORS = [
    "je ", "les ", "des ", "dans ", "pour ", "avec ", "sur ", "une ", "mon ",
    "ma ", "est ", "sont ", "nous ", "vous ", "ils ", "\u00eatre ", "avoir ",
    "exp\u00e9rience", "comp\u00e9tences", "formation", "poste", "emploi", "entreprise",
    "responsabilit\u00e9s", "dipl\u00f4me", "ma\u00eetrise", "licence", "stage", "missions",
]


def detect_text_language(text: str) -> str:
    """Heuristic language detection. Returns 'fr' or 'en'.

    Counts French indicator tokens in the first 2000 characters.
    A threshold of 3+ hits classifies as French.
    """
    sample = (text or "").lower()[:2000]
    hits = sum(1 for indicator in _FRENCH_INDICATORS if indicator in sample)
    return "fr" if hits >= 3 else "en"


def resolve_language(requested: str, fallback_text: str = "") -> str:
    """Resolve the final language to use.

    - 'fr'   \u2192 always French
    - 'en'   \u2192 always English
    - 'auto' \u2192 detect from fallback_text
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
