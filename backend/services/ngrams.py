import re 
from collections import Counter

def tokenize(text: str) -> list[str]: 
    text = text.lower()
    text = re.sub(r"[^a-z0-9+\s-]", " ", text)
    return [t for t in text.split() if len(t) > 1]

def ngrams(tokens: list[str], n: int) -> list[str]: 
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]

def extract_phrases(text: str, ns=(2,3)) -> Counter:
    toks = tokenize(text)
    c = Counter()
    for n in ns:
        c.update(ngrams(toks, n))
    return c