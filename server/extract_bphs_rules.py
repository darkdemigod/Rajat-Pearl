#!/usr/bin/env python3
"""
Extract ALL astrological rules from BPHS Santhanam translation (45 chapters, Vol.1).
Captures both titled slokas (ALL-CAPS headings) and plain numbered slokas.
"""
import re, json, sys, subprocess, os

PDF_PATH = "/home/runner/workspace/attached_assets/Jyotish_BPHS_Santhanam_whole_no_sanskrit_1777767144573.pdf"
TEXT_PATH = "/tmp/bphs_text.txt"

CHAPTER_NAMES = {
    1:"The Creation", 2:"Great Incarnations", 3:"Planetary Characters and Description",
    4:"Zodiacal Signs Described", 5:"Special Ascendants", 6:"Sixteen Divisions of a Sign",
    7:"Divisional Consideration", 8:"Aspects of the Signs", 9:"Evils at Birth",
    10:"Antidotes for Evils", 11:"Judgement of Houses", 12:"Effects of First House",
    13:"Effects of Second House", 14:"Effects of Third House", 15:"Effects of Fourth House",
    16:"Effects of Fifth House", 17:"Effects of Sixth House", 18:"Effects of Seventh House",
    19:"Effects of Eighth House", 20:"Effects of Ninth House", 21:"Effects of Tenth House",
    22:"Effects of Eleventh House", 23:"Effects of Twelfth House",
    24:"Effects of the Bhava Lords", 25:"Effects of Non-Luminous Planets",
    26:"Evaluation of Planetary Aspects", 27:"Evaluation of Strengths",
    28:"Ishta and Kashta Balas", 29:"Bhava Padas", 30:"Upa Pada",
    31:"Argala or Planetary Intervention", 32:"Planetary Karakatwas",
    33:"Effects of Karakamsa", 34:"Yogakarakas", 35:"Nabhasa Yogas",
    36:"Many Other Yogas", 37:"Lunar Yogas", 38:"Solar Yogas",
    39:"Raja Yogas", 40:"Yogas for Royal Association", 41:"Yogas for Wealth",
    42:"Combinations for Penury", 43:"Longevity", 44:"Maraka Planets",
    45:"Avasthas of Planets",
}

CATEGORY_MAP = {
    **{ch:"yoga" for ch in [33,34,35,36,37,38,39,40,41]},
    **{ch:"prediction" for ch in [9,10,42,43,44]},
    **{ch:"house_effects" for ch in range(11,25)},
    **{ch:"general" for ch in [3,4,5,6,7,8,25,26,27,28,29,30,31,32]},
    **{ch:"general" for ch in [45]},
}

SLOKA_CATEGORY = {
    # Richer category based on chapter section
}

def cat(ch):
    return CATEGORY_MAP.get(ch, "general")

def clean(t):
    t = re.sub(r'\s+', ' ', t.replace('\x0c',''))
    return t.strip()

def title_case(t):
    # Preserve some abbreviations
    words = []
    for w in t.lower().split():
        words.append(w.capitalize())
    return ' '.join(words)

def extract():
    if not os.path.exists(TEXT_PATH):
        subprocess.run(["pdftotext", "-layout", PDF_PATH, TEXT_PATH], check=True)
    
    with open(TEXT_PATH, encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    n = len(lines)
    print(f"Total lines: {n}", file=sys.stderr)
    
    # Patterns
    chapter_re = re.compile(r'^\s{10,}Chapter\s+(\d+)\s*$', re.IGNORECASE)
    page_re    = re.compile(r'^\s*\d{1,3}\s*$')
    notes_re   = re.compile(r'^\s*Notes\s*:')
    
    # Titled sloka: "   3-6. SOME CAPS TITLE : text..."
    titled_re  = re.compile(
        r'^\s{1,12}(\d+(?:-\d+)?(?:\s+\d+\s*/\s*\d+)?)\.\s+'
        r'([A-Z][A-Z\s\(\)/\-,&\'\.\d\[\]\!\?]{2,90}?)\s*[:\(](.*)'
    )
    # Plain sloka: "   3. text..." or "   3-6. text..."
    plain_re   = re.compile(r'^\s{1,12}(\d+(?:-\d+)?(?:\s+\d+\s*/\s*\d+)?)\.\s+(.+)')
    
    current_chapter = 0
    current_titled  = None   # The active ALL-CAPS section title
    rules = []
    
    # Buffer for current rule
    cur_sloka    = None
    cur_title    = None
    cur_body     = []
    cur_chapter  = 0
    cur_is_titled = False
    
    def flush():
        nonlocal cur_sloka, cur_title, cur_body, cur_chapter, cur_is_titled
        if cur_title and cur_chapter >= 9:
            body = clean(' '.join(cur_body))
            if len(body) > 20:
                rules.append({
                    'chapter': cur_chapter,
                    'sloka': cur_sloka or '',
                    'title': cur_title,
                    'body': body,
                    'category': cat(cur_chapter),
                    'chapter_name': CHAPTER_NAMES.get(cur_chapter, f'Chapter {cur_chapter}'),
                    'is_titled': cur_is_titled,
                })
        cur_sloka = cur_title = None
        cur_body  = []
        cur_is_titled = False
    
    i = 0
    while i < n:
        raw  = lines[i]
        line = raw.rstrip('\n').replace('\x0c','')
        stripped = line.strip()
        i += 1
        
        # Skip empties and page numbers
        if not stripped or page_re.match(line):
            continue
        
        # Chapter header
        cm = chapter_re.match(line)
        if cm:
            flush()
            current_chapter = int(cm.group(1))
            current_titled  = None
            continue
        
        if current_chapter < 9:
            continue
        
        # Notes: end current sloka
        if notes_re.match(stripped):
            flush()
            continue
        
        # Try titled sloka
        tm = titled_re.match(line)
        if tm:
            t_cand = tm.group(2).strip().rstrip(':').strip()
            # Ensure truly uppercase (allow short words like OF, THE, AND)
            lower_words = [w for w in t_cand.split() if len(w)>3 and w != w.upper()]
            if not lower_words and len(t_cand) >= 3:
                flush()
                cur_sloka     = tm.group(1).strip()
                cur_title     = t_cand
                cur_body      = [tm.group(3).strip()] if tm.group(3).strip() else []
                cur_chapter   = current_chapter
                cur_is_titled = True
                current_titled = t_cand
                continue
        
        # Try plain numbered sloka
        pm = plain_re.match(line)
        if pm:
            flush()
            sloka_num  = pm.group(1).strip()
            sloka_text = pm.group(2).strip()
            
            # Generate a descriptive title from first ~6 words
            words = sloka_text.split()[:7]
            auto_title = ' '.join(words)
            if len(auto_title) > 60:
                auto_title = auto_title[:60]
            
            # Prefix with section title if we had one recently
            if current_titled:
                auto_title = f"{current_titled[:40]} - Sloka {sloka_num}"
            else:
                auto_title = f"Ch.{current_chapter} Sloka {sloka_num} - {auto_title}"
            
            cur_sloka   = sloka_num
            cur_title   = auto_title
            cur_body    = [sloka_text]
            cur_chapter = current_chapter
            cur_is_titled = False
            continue
        
        # Accumulate continuation text
        if cur_title is not None:
            cur_body.append(stripped)
    
    flush()
    return rules


def format_rules(raw):
    db_cat = {
        'yoga':'yoga', 'dhasa':'dhasa', 'prediction':'prediction',
        'house_effects':'general', 'ashtaka_varga':'general', 'general':'general'
    }
    final = []
    seen  = set()
    
    for r in raw:
        title = r['title'].strip()
        body  = r['body'].strip()
        if not title or not body or len(body) < 15:
            continue
        
        # Title-case the title
        title_clean = title_case(title)
        ch    = r['chapter']
        sloka = r['sloka']
        ch_name = r['chapter_name']
        
        source_ref = f"BPHS Ch.{ch} ({ch_name})"
        if sloka:
            source_ref += f" Sl.{sloka}"
        
        # Dedup key: chapter + first 45 chars of body
        key = f"ch{ch}_{body[:45].lower().strip()}"
        if key in seen:
            continue
        seen.add(key)
        
        cat_val = db_cat.get(r['category'], 'general')
        
        desc = f"{source_ref}: {body}"
        if len(desc) > 2000: desc = desc[:1997] + '...'
        
        code_body = body[:400] + ('...' if len(body)>400 else '')
        code = f"# {title_clean}\n# Source: {source_ref}\n\n# {code_body}"
        
        # Determine varga applicability based on category/chapter
        if r['category'] in ('house_effects', 'prediction'):
            vargas = ["D1", "D9"]
        elif r['category'] == 'yoga':
            vargas = ["D1", "D9", "D10"]
        elif r['category'] == 'dhasa':
            vargas = ["D1"]
        else:
            vargas = ["D1"]

        final.append({
            'name':               title_clean[:120],
            'category':           cat_val,
            'description':        desc,
            'code':               code,
            'conditions':         {"source": source_ref, "chapter": ch, "sloka": sloka},
            'vargaApplicability': vargas,
            'confidence':         0.85,
            'chapter':            ch_name,
        })
    
    return final


if __name__ == '__main__':
    raw   = extract()
    print(f"Raw extractions: {len(raw)}", file=sys.stderr)
    
    from collections import Counter
    cc = Counter(r['chapter'] for r in raw)
    for ch in sorted(cc):
        print(f"  Ch.{ch:2d} {CHAPTER_NAMES.get(ch,'?'):40s}: {cc[ch]:3d}", file=sys.stderr)
    
    final = format_rules(raw)
    print(f"\nFinal rules: {len(final)}", file=sys.stderr)
    print(json.dumps(final, ensure_ascii=False, indent=2))
