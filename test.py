#!/usr/bin/env python3
"""
resume_tagging.py

Takes a PDF resume, extracts text, scores against tag-keywords, and returns up to 4 best-fit tags.

Usage:
  python resume_tagging.py /path/to/resume.pdf
  python resume_tagging.py /path/to/resume.pdf --max-tags 4 --min-score 2 --show-matches
  python resume_tagging.py /path/to/resume.pdf --json

Notes:
- Works best on text-based PDFs. If your resume PDF is a scanned image, you’ll need OCR (e.g., pytesseract).
- Keyword scoring is simple and explainable: counts occurrences of tag keywords/phrases (case-insensitive),
  with slightly higher weight for strong action verbs.
"""

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Tuple

# -----------------------------
# TAGS + KEYWORDS (customizable)
# -----------------------------
TAGS: Dict[str, List[str]] = {
    # Service & Leadership
    "Volunteering": ["mobilized", "contributed", "championed", "altruism", "coordinated"],
    "Advocacy / Civic": ["represented", "campaigned", "lobbied", "grassroots", "navigated"],
    "Mentorship": ["cultivated", "empowered", "coached", "advised", "fostered"],
    "Greek-Life": ["organized", "presided", "recruited", "philanthropic", "liaison"],

    # Technical & Analytical
    "STEM": ["science", "tech", "engineering", "math" "engineered", "validated", "optimized", "analytical", "systematic"],
    "Computing": ["programmed", "deployed", "automated", "architecture", "debugging", "python", "java", "scripting"],
    "Research": ["synthesized", "investigated", "quantified", "methodology", "published"],
    "Design": ["conceptualized", "prototyped", "iterative", "visual", "user-centric", "art", "drawing", "sculpt"],

    # Growth & Business
    "Professional-Development": ["accelerated", "certified", "refined", "proactive", "specialized"],
    "Business": ["scaled", "strategized", "negotiated", "profitability", "operations", "start up", "startup", "start-up", "entrepreneur", "pitch"],
    "Skill-Building": ["mastered", "executed", "streamlined", "proficient", "technical"],
    "Health": ["rehabilitated", "assessed", "clinical", "wellness", "compliance", "medic", "anatomy"],

    # Creative & Communication
    "Music": ["composed", "performed", "collaborated", "technical", "disciplined", "music", "instrument", "vocal"],
    "Performing-Arts": ["directed", "produced", "ensemble", "presence", "coordination", "preform", "story"],
    "Media / Publication": ["edited", "authored", "circulated", "digital", "storytelling"],
    "Gaming": ["strategic", "logic", "collaborative", "competitive", "troubleshooting"],

    # Identity & Culture
    "Identity": ["intersectionality", "advocacy", "authentic", "perspective", "awareness"],
    "Identity-Support": ["facilitated", "inclusive", "outreach", "equitable", "safe-space"],
    "Culture": ["cross-cultural", "multilingual", "global", "heritage", "sensitivity"],
    "Religion / Spirituality": ["community", "ethics", "chaplaincy", "pastoral", "tradition"],
}

# Optional: category groups (not used for scoring, just for display/reporting if you want)
CATEGORY: Dict[str, str] = {
    "Volunteering": "Service & Leadership",
    "Advocacy / Civic": "Service & Leadership",
    "Mentorship": "Service & Leadership",
    "Greek-Life": "Service & Leadership",
    "STEM": "Technical & Analytical",
    "Computing": "Technical & Analytical",
    "Research": "Technical & Analytical",
    "Design": "Technical & Analytical",
    "Professional-Development": "Growth & Business",
    "Business": "Growth & Business",
    "Skill-Building": "Growth & Business",
    "Health": "Growth & Business",
    "Music": "Creative & Communication",
    "Performing-Arts": "Creative & Communication",
    "Media / Publication": "Creative & Communication",
    "Gaming": "Creative & Communication",
    "Identity": "Identity & Culture",
    "Identity-Support": "Identity & Culture",
    "Culture": "Identity & Culture",
    "Religion / Spirituality": "Identity & Culture",
}

# Increase weight for “strong action verbs” (still explainable + simple)
STRONG_VERB_MULTIPLIER = 1.35
STRONG_VERBS = {
    "engineered", "optimized", "deployed", "automated", "investigated",
    "quantified", "published", "prototyped", "scaled", "negotiated",
    "directed", "produced", "authored", "coached", "mobilized",
    "organized", "represented", "facilitated"
}

# -----------------------------
# PDF TEXT EXTRACTION
# -----------------------------
def extract_text_from_pdf(path: str) -> str:
    """
    Best-effort PDF text extraction.
    Uses pdfplumber if available, else PyPDF2 as fallback.
    """
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(path) as pdf:
            pages = [(p.extract_text() or "") for p in pdf.pages]
        return "\n".join(pages)
    except Exception:
        pass

    try:
        from PyPDF2 import PdfReader  # type: ignore
        reader = PdfReader(path)
        pages = []
        for p in reader.pages:
            pages.append(p.extract_text() or "")
        return "\n".join(pages)
    except Exception as e:
        raise RuntimeError(
            "Could not extract text from PDF. "
            "Try installing pdfplumber (recommended) or ensure the PDF is not scanned.\n"
            f"Original error: {e}"
        )

# -----------------------------
# TEXT NORMALIZATION + MATCHING
# -----------------------------
def normalize(text: str) -> str:
    # Lowercase, unify hyphens, collapse whitespace
    t = text.lower()
    t = t.replace("\u2010", "-").replace("\u2011", "-").replace("\u2012", "-").replace("\u2013", "-").replace("\u2014", "-")
    t = re.sub(r"\s+", " ", t)
    return t

def keyword_pattern(keyword: str) -> re.Pattern:
    """
    Builds a regex pattern that matches keyword as:
    - a whole word (for simple words)
    - or a phrase with flexible whitespace/hyphen (for multiword / hyphenated terms)
    """
    k = keyword.lower().strip()
    # Allow flexible whitespace around hyphens and spaces
    k_escaped = re.escape(k)
    k_escaped = k_escaped.replace(r"\-", r"[\s\-]+")  # treat hyphen as space/hyphen group
    k_escaped = k_escaped.replace(r"\ ", r"[\s\-]+")  # spaces can also match hyphen/space
    # Word boundaries help for single words; for phrases they’re still okay.
    return re.compile(rf"\b{k_escaped}\b", re.IGNORECASE)

@dataclass
class TagScore:
    tag: str
    score: float
    raw_hits: Dict[str, int]

def score_tags(text: str) -> List[TagScore]:
    t = normalize(text)
    scores: List[TagScore] = []

    for tag, keywords in TAGS.items():
        hits: Dict[str, int] = {}
        total = 0.0

        for kw in keywords:
            pat = keyword_pattern(kw)
            count = len(pat.findall(t))
            if count > 0:
                hits[kw] = count

                # Weight strong verbs slightly higher
                weight = STRONG_VERB_MULTIPLIER if kw.lower() in STRONG_VERBS else 1.0
                total += count * weight

        scores.append(TagScore(tag=tag, score=total, raw_hits=hits))

    # Sort by score desc, then by number of unique keywords matched desc, then alpha
    scores.sort(
        key=lambda s: (s.score, len(s.raw_hits), s.tag),
        reverse=True
    )
    return scores

def choose_top_tags(scores: List[TagScore], max_tags: int, min_score: float) -> List[TagScore]:
    chosen = [s for s in scores if s.score >= min_score]
    return chosen[:max_tags]

# -----------------------------
# CLI
# -----------------------------
def main():
    ap = argparse.ArgumentParser(description="Auto-tag a resume PDF by keyword matching.")
    ap.add_argument("pdf", nargs="?", default="Resume.pdf", help="Path to resume PDF")
    ap.add_argument("--max-tags", type=int, default=4, help="Maximum number of tags to return (default: 4)")
    ap.add_argument("--min-score", type=float, default=1.0, help="Minimum score to consider a tag (default: 1.0)")
    ap.add_argument("--show-matches", action="store_true", help="Show which keywords matched each selected tag")
    ap.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    args = ap.parse_args()

    text = extract_text_from_pdf(args.pdf)
    if not text.strip():
        raise SystemExit(
            "No text extracted. If your resume is a scanned PDF image, you’ll need OCR (e.g., pytesseract)."
        )

    scores = score_tags(text)
    top = choose_top_tags(scores, max_tags=args.max_tags, min_score=args.min_score)

    if args.json:
        out = {
            "pdf": args.pdf,
            "max_tags": args.max_tags,
            "min_score": args.min_score,
            "selected": [
                {
                    "tag": s.tag,
                    "category": CATEGORY.get(s.tag, ""),
                    "score": round(s.score, 3),
                    "matches": s.raw_hits
                } for s in top
            ],
            "all_scores": [
                {
                    "tag": s.tag,
                    "category": CATEGORY.get(s.tag, ""),
                    "score": round(s.score, 3),
                    "matches": s.raw_hits
                } for s in scores
            ]
        }
        print(json.dumps(out, indent=2))
        return

    if not top:
        print("No tags met the minimum score.")
        print("Tip: lower --min-score or expand the keyword lists.")
        return

    print(f"Selected tags (max {args.max_tags}):")
    for s in top:
        cat = CATEGORY.get(s.tag, "—")
        print(f"- {s.tag}  [{cat}]  score={s.score:.2f}")
        if args.show_matches:
            # Pretty print hits
            for kw, c in sorted(s.raw_hits.items(), key=lambda kv: (-kv[1], kv[0])):
                print(f"    • {kw}: {c}")

    # Optional: show a quick leaderboard (top 8)
    print("\nTop scores:")
    for s in scores[:8]:
        print(f"  {s.tag:22s} score={s.score:.2f}  hits={len(s.raw_hits)}")

main()