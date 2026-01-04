import re
from collections import Counter
from typing import Dict, List, Tuple

STOP = {
  "a","an","the","and","or","to","of","in","on","for","with","by","as","at","from",
  "is","are","be","this","that","it","you","we","they","their","our","your"
}

def is_good_phrase(p: str) -> bool:
    words = p.split()
    # reject if any word is a stopword OR if phrase is mostly stopwords
    stop_count = sum(1 for w in words if w in STOP)
    if stop_count >= 1:
        return False
    return True
def tokenize(text: str) -> List[str]:
    text = text.lower()
    # keep only words (same as you had)
    return re.findall(r"[a-zA-Z]+", text)


def make_ngrams(tokens: List[str], n: int) -> List[str]:
    return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def phrase_counter(tokens: List[str], ns: Tuple[int, ...] = (2, 3)) -> Counter:
    c = Counter()
    for n in ns:
        c.update(make_ngrams(tokens, n))
    return c


def phrase_weight(phrase: str) -> float:
    # trigram gets higher weight than bigram
    n = phrase.count(" ") + 1
    return 2.0 if n == 3 else 1.0


def basic_overlap_score(resume_text: str, jd_text: str) -> Dict:
    resume_tokens = tokenize(resume_text)
    jd_tokens = tokenize(jd_text)

    resume_vocab = set(resume_tokens)
    jd_vocab = set(jd_tokens)
    token_overlap = resume_vocab & jd_vocab

    # --- existing keyword score (unchanged meaning) ---
    keyword_score = (len(token_overlap) / len(jd_vocab) * 100) if jd_vocab else 0.0

    # --- NEW: phrase overlap (bigrams + trigrams) ---
    resume_text_lc = " ".join(resume_tokens)  # normalized resume string
    jd_phrases = phrase_counter(jd_tokens, ns=(2, 3))

    # light filtering to avoid garbage phrases
    # (keeps phrases with 5+ chars and no super-short words-only sequences)
    filtered_phrases = {p for p in jd_phrases.keys() if len(p) >= 5}

    phrase_hits = []
    phrase_misses = []
    for p in filtered_phrases:
        if p in resume_text_lc:
            phrase_hits.append(p)
        else:
            phrase_misses.append(p)

    total_phrase_weight = sum(phrase_weight(p) for p in filtered_phrases) or 1.0
    hit_phrase_weight = sum(phrase_weight(p) for p in phrase_hits)
    phrase_score = 100.0 * hit_phrase_weight / total_phrase_weight

    # --- NEW: combined score (tweak weights later) ---
    combined_score = 0.75 * keyword_score + 0.25 * phrase_score

    return {
        # keep old keys so nothing breaks
        "score": round(keyword_score, 2),
        "jd_vocab_size": len(jd_vocab),
        "resume_vocab_size": len(resume_vocab),
        "overlap_count": len(token_overlap),
        "overlap_examples": sorted(list(token_overlap))[:20],

        # new fields
        "phrase_score": round(phrase_score, 2),
        "phrase_hits": sorted(phrase_hits)[:50],
        "phrase_misses": sorted(phrase_misses)[:50],
        "combined_score": round(combined_score, 2),
        "phrase_total": len(filtered_phrases),
    }
