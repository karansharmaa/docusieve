import re
from collections import Counter
from typing import Dict, List, Tuple


# Keep common tech tokens (c++, c#, tcp/ip, ipv4/ipv6, l2/l3, ci/cd, 32-bit, etc.)
TOKEN_RE = re.compile(r"[a-z0-9]+(?:[+\-/#.][a-z0-9]+)*|c\+\+|c#")

STOPWORDS = {
    "a", "an", "the", "and", "or", "to", "of", "in", "on", "for", "with", "by", "as", "at", "from",
    "is", "are", "be", "this", "that", "it", "you", "we", "they", "their", "our", "your", "when",
    "also", "will", "should", "have", "has", "had", "must", "can", "could", "would", "may", "might",
    "into", "than", "then", "through", "across", "within", "over", "under", "up", "down", "out",
}


def tokenize(text: str) -> List[str]:
    """
    Lowercase, then extract 'tech-friendly' tokens.
    Examples preserved: c++, c#, tcp/ip, ipv4/ipv6, l2/l3, ci/cd, 32-bit
    """
    text = text.lower()
    return TOKEN_RE.findall(text)


def make_ngrams(tokens: List[str], n: int) -> List[str]:
    return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def phrase_counter(tokens: List[str], ns: Tuple[int, ...] = (2, 3)) -> Counter:
    c = Counter()
    for n in ns:
        c.update(make_ngrams(tokens, n))
    return c


def phrase_weight(phrase: str) -> float:
    # trigram > bigram
    n = phrase.count(" ") + 1
    return 2.0 if n == 3 else 1.0


def is_skillish_phrase(phrase: str) -> bool:
    """
    Filters out filler n-grams.
    Keeps phrases that look like skills/tech and drops those with stopwords.
    """
    words = phrase.split()

    # Drop anything containing stopwords (kills "of the", "with a", etc.)
    if any(w in STOPWORDS for w in words):
        return False

    # Drop phrases with very short tokens (but allow common short tech tokens)
    allowed_short = {"c", "go", "js", "os", "ip", "ai", "ml", "db", "ui", "ux"}
    for w in words:
        if len(w) < 3 and w not in allowed_short:
            return False

    return True


def basic_overlap_score(resume_text: str, jd_text: str) -> Dict:
    resume_tokens = tokenize(resume_text)
    jd_tokens = tokenize(jd_text)

    resume_vocab = set(resume_tokens)
    jd_vocab = set(jd_tokens)

    token_overlap = resume_vocab & jd_vocab

    # Keyword overlap score (original meaning)
    keyword_score = (len(token_overlap) / len(jd_vocab) * 100) if jd_vocab else 0.0

    # Phrase scoring (bigrams + trigrams)
    # Use normalized token stream so "tcp/ip" and "l2/l3" can match.
    resume_norm = " ".join(resume_tokens)

    jd_phrases = phrase_counter(jd_tokens, ns=(2, 3))

    # Filter junk phrases
    filtered_phrases = {p for p in jd_phrases.keys() if is_skillish_phrase(p)}

    phrase_hits = []
    phrase_misses = []
    for p in filtered_phrases:
        if p in resume_norm:
            phrase_hits.append(p)
        else:
            phrase_misses.append(p)

    total_phrase_weight = sum(phrase_weight(p) for p in filtered_phrases) or 1.0
    hit_phrase_weight = sum(phrase_weight(p) for p in phrase_hits)
    phrase_score = 100.0 * hit_phrase_weight / total_phrase_weight

    # Combined score (same weights you used)
    combined_score = 0.75 * keyword_score + 0.25 * phrase_score

    return {
        # Backward-compatible fields
        "score": round(keyword_score, 2),
        "jd_vocab_size": len(jd_vocab),
        "resume_vocab_size": len(resume_vocab),
        "overlap_count": len(token_overlap),
        "overlap_examples": sorted(list(token_overlap))[:20],

        # New fields
        "phrase_score": round(phrase_score, 2),
        "phrase_hits": sorted(phrase_hits)[:50],
        "phrase_misses": sorted(phrase_misses)[:50],
        "combined_score": round(combined_score, 2),
        "phrase_total": len(filtered_phrases),
    }
