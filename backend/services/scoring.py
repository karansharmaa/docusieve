import re
from collections import Counter
from typing import Dict

def tokenize(text: str):
    text = text.lower()
    # keep only words
    return re.findall(r"[a-zA-Z]+", text)

def basic_overlap_score(resume_text: str, jd_text: str) -> Dict:
    resume_tokens = tokenize(resume_text)
    jd_tokens = tokenize(jd_text)

    resume_vocab = set(resume_tokens)
    jd_vocab = set(jd_tokens)

    overlap = resume_vocab & jd_vocab

    if not jd_vocab:
        score = 0.0
    else:
        score = len(overlap) / len(jd_vocab) * 100

    return {
        "score": round(score, 2),
        "jd_vocab_size": len(jd_vocab),
        "resume_vocab_size": len(resume_vocab),
        "overlap_count": len(overlap),
        "overlap_examples": sorted(list(overlap))[:20],
    }
