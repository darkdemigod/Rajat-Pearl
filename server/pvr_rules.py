#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
PVR Narasimha Rao — "Lessons on Vedic Astrology" Rule Engine
Implements rules from all 45 lessons as executable Python functions.
Input: chart_data dict from calculate.py
Output: structured life-domain analysis
"""
import json, sys, math

# ── Sign/Planet helpers ──────────────────────────────────────────────────────

RASI = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
        'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
RASI_SHORT = ['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi']

PLANET_SHORT = ['Su','Mo','Ma','Me','Ju','Ve','Sa','Ra','Ke']
PLANET_NAMES = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']

SIGN_LORDS = {0:2,1:5,2:3,3:1,4:0,5:3,6:5,7:2,8:4,9:6,10:6,11:4}
EXALTATION   = {0:0,1:1,2:9,3:5,4:3,5:11,6:6}
DEBILITATION = {0:6,1:7,2:3,3:11,4:9,5:5,6:0}
OWN_SIGNS    = {0:[4],1:[3],2:[0,7],3:[2,5],4:[8,11],5:[1,6],6:[9,10]}

# Natural benefics/malefics (indices)
NATURAL_BENEFICS  = [1,3,4,5]  # Mo,Me,Ju,Ve
NATURAL_MALEFICS  = [0,2,6,7,8]  # Su,Ma,Sa,Ra,Ke

# Marana Karaka Sthana — house where planet is weakest (1-based house numbers)
MKS = {0:12, 1:8, 5:6, 2:7, 3:7, 4:3, 6:1, 7:9}  # Su,Mo,Ve,Ma,Me,Ju,Sa,Ra

# Friendly sign pairs for Parivartana
FRIENDSHIP = {
    0:[1,4,3],     # Su friendly with Mo,Ju,Me... 
    1:[0,2,4],     # Mo
    2:[0,4,6],     # Ma
    3:[0,5,6],     # Me (neutral with Su but listed friendly)
    4:[0,1,2],     # Ju
    5:[2,6,3],     # Ve
    6:[2,5,3],     # Sa
}

# Sirshodaya/Prishtodaya signs (lesson 33)
SIRSHODAYA   = [2,4,5,6,7,10]   # Ge,Le,Vi,Li,Sc,Aq
PRISHTODAYA  = [0,1,3,8,9]      # Ar,Ta,Cn,Sg,Cp
# Pi is Ubhayodaya (11 = index for Pisces... wait, Pisces is index 11)
UBHAYODAYA   = [11]

# ── Data extraction helpers ──────────────────────────────────────────────────

def get_planets(cd):
    """Return list of planet dicts with normalized keys."""
    return cd.get('planets', [])

def get_planet(cd, idx):
    """Get planet by index (0=Su,1=Mo,...,8=Ke). Returns None if not found."""
    for p in get_planets(cd):
        if p.get('planet') == idx or p.get('planet', p.get('index')) == idx:
            return p
    return None

def get_asc(cd):
    return cd.get('ascendant', {})

def asc_sign(cd):
    return get_asc(cd).get('rasi', 0)

def planet_sign(p):
    return p.get('rasi', 0) if p else None

def planet_house(p, asc):
    """House number (1-based) of planet from ascendant sign."""
    if p is None: return None
    return ((p.get('rasi', 0) - asc) % 12) + 1

def house_sign(asc, h):
    """Sign of house h (1-based) from asc."""
    return (asc + h - 1) % 12

def house_lord(sign):
    return SIGN_LORDS[sign % 12]

def is_exalted(p):
    idx = p.get('planet', p.get('index'))
    if idx in EXALTATION:
        return p.get('rasi') == EXALTATION[idx]
    return False

def is_debilitated(p):
    idx = p.get('planet', p.get('index'))
    if idx in DEBILITATION:
        return p.get('rasi') == DEBILITATION[idx]
    return False

def is_retrograde(p):
    return p.get('retrograde', False)

def is_in_own_sign(p):
    idx = p.get('planet', p.get('index'))
    if idx in OWN_SIGNS:
        return p.get('rasi') in OWN_SIGNS[idx]
    return False

def effective_strength(p):
    """PVR rule: debilitated+retrograde=exalted; exalted+retrograde=debilitated (Ma exception)."""
    if p is None: return 'neutral'
    retro = is_retrograde(p)
    deb   = is_debilitated(p)
    exalt = is_exalted(p)
    own   = is_in_own_sign(p)
    idx   = p.get('planet', p.get('index'))
    if deb and retro:
        return 'effective_exalted'    # Neecha bhanga
    if exalt and retro and idx != 2:  # Mars exception
        return 'effective_debilitated'
    if exalt:
        return 'exalted'
    if own:
        return 'own_sign'
    if deb:
        return 'debilitated'
    return 'neutral'

def is_vargottama(cd, planet_idx):
    """Planet in same sign in D1 and D9."""
    d1_sign = None
    d9_sign = None
    for p in get_planets(cd):
        if p.get('planet', p.get('index')) == planet_idx:
            d1_sign = p.get('rasi')
    d9 = cd.get('vargas', {}).get('D9', {}).get('planets', [])
    for p in d9:
        if p.get('planet', p.get('index')) == planet_idx:
            d9_sign = p.get('rasi')
    return d1_sign is not None and d1_sign == d9_sign

def planets_in_house(cd, house_num):
    """Return list of planet dicts in given house (1-based)."""
    asc = asc_sign(cd)
    result = []
    for p in get_planets(cd):
        if planet_house(p, asc) == house_num:
            result.append(p)
    return result

def sign_name(s):
    return RASI[s % 12]

def planet_name(idx):
    return PLANET_NAMES[idx] if 0 <= idx <= 8 else f"P{idx}"

def pname(p):
    return planet_name(p.get('index', -1)) if p else 'Unknown'

def lord_of_house(cd, house_num):
    """Return planet dict that lords over house_num."""
    asc = asc_sign(cd)
    sign = house_sign(asc, house_num)
    lord_idx = house_lord(sign)
    return get_planet(cd, lord_idx)

def house_of_planet(cd, planet_idx):
    """Return 1-based house number of planet."""
    p = get_planet(cd, planet_idx)
    if p is None: return None
    return planet_house(p, asc_sign(cd))

def aspecting_planets(cd, house_num):
    """Planets with rasi drishti to house_num (simplified: full aspect opposites + special)."""
    asc = asc_sign(cd)
    target_sign = house_sign(asc, house_num)
    result = []
    for p in get_planets(cd):
        p_sign = p.get('rasi', 0)
        idx = p.get('planet', p.get('index'))
        # Check rasi drishti (sign aspects): fixed signs aspect all except adjacent
        # Simplified: Mars 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th + all opposite
        # For rule evaluation, use full mutual sign aspect (simplified)
        # Opposite sign always aspects
        if (p_sign + 6) % 12 == target_sign:
            result.append(p)
        # Mars: aspects 4th and 8th from its position
        elif idx == 2 and ((target_sign - p_sign) % 12 in [3, 7]):
            result.append(p)
        # Jupiter: aspects 5th and 9th
        elif idx == 4 and ((target_sign - p_sign) % 12 in [4, 8]):
            result.append(p)
        # Saturn: aspects 3rd and 10th
        elif idx == 6 and ((target_sign - p_sign) % 12 in [2, 9]):
            result.append(p)
    return result

# ── Arudha Pada calculation ──────────────────────────────────────────────────

def calc_arudha(cd, house_num):
    """Calculate Arudha Pada of house_num."""
    asc = asc_sign(cd)
    sign_of_house = house_sign(asc, house_num)
    lord_idx = house_lord(sign_of_house)
    lord_p = get_planet(cd, lord_idx)
    if lord_p is None:
        return sign_of_house  # fallback
    lord_sign = lord_p.get('rasi', sign_of_house)
    steps = (lord_sign - sign_of_house) % 12
    arudha = (lord_sign + steps) % 12
    # Exception: if arudha = own house or 7th from it
    if arudha == sign_of_house:
        arudha = (arudha + 9) % 12  # use 10th from there
    elif arudha == (sign_of_house + 6) % 12:
        arudha = (arudha + 9) % 12
    return arudha

# ── Result builder ───────────────────────────────────────────────────────────

def finding(title, detail, strength='neutral', domain='general', evidence=None):
    return {
        'title': title,
        'detail': detail,
        'strength': strength,   # 'strong','moderate','weak','neutral','warning'
        'domain': domain,
        'evidence': evidence or [],
    }

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 1: PERSONALITY & APPEARANCE
# ══════════════════════════════════════════════════════════════════════════════

def analyze_personality(cd):
    findings = []
    asc = asc_sign(cd)
    asc_lord = lord_of_house(cd, 1)
    al = calc_arudha(cd, 1)  # Arudha Lagna

    findings.append(finding(
        f"Ascendant: {sign_name(asc)}",
        f"The Lagna is {sign_name(asc)}, showing the native's physical constitution, temperament, and overall life direction. "
        f"The Arudha Lagna (public image) falls in {sign_name(al)}.",
        'neutral', 'personality',
        [f"Asc = {sign_name(asc)}", f"AL = {sign_name(al)}"]
    ))

    # Asc lord strength
    if asc_lord:
        s = effective_strength(asc_lord)
        h = planet_house(asc_lord, asc)
        strength_word = {'exalted':'very strong','effective_exalted':'strong (neecha bhanga)',
                         'own_sign':'strong','effective_debilitated':'weak (exalted but retrograde)',
                         'debilitated':'weak','neutral':'moderate'}.get(s,'moderate')
        findings.append(finding(
            f"Ascendant Lord ({pname(asc_lord)}) in {sign_name(planet_sign(asc_lord))}, House {h}",
            f"The Lagna lord {pname(asc_lord)} is {strength_word}, placed in the {ordinal(h)} house. "
            + lord_in_house_meaning(asc_lord.get('planet', asc_lord.get('index')), h),
            'strong' if 'strong' in strength_word else ('weak' if 'weak' in strength_word else 'neutral'),
            'personality',
            [f"LL={pname(asc_lord)}", f"Sign={sign_name(planet_sign(asc_lord))}", f"Strength={s}"]
        ))

    # Vargottama Lagna lord
    if asc_lord and is_vargottama(cd, asc_lord.get('planet', asc_lord.get('index'))):
        findings.append(finding(
            f"{pname(asc_lord)} is Vargottama",
            f"The Lagna lord {pname(asc_lord)} occupies the same sign in both D1 and D9, making it very powerful. "
            "Vargottama planets deliver their significations with exceptional strength throughout the life.",
            'strong', 'personality',
            ['Same sign in D1 and D9']
        ))

    # 3rd/6th from AL: saint vs materialist (PVR lesson on AL)
    h3_from_al = (al + 2) % 12  # 3rd sign from AL (0-indexed offset)
    h6_from_al = (al + 5) % 12
    al_3_planets = [p for p in get_planets(cd) if p.get('rasi') == h3_from_al]
    al_6_planets = [p for p in get_planets(cd) if p.get('rasi') == h6_from_al]
    all_al_36 = al_3_planets + al_6_planets

    if all_al_36:
        mal = [p for p in all_al_36 if p.get('planet', p.get('index')) in NATURAL_MALEFICS]
        ben = [p for p in all_al_36 if p.get('planet', p.get('index')) in NATURAL_BENEFICS]
        if mal:
            desc = "Malefic planets ("+", ".join(pname(p) for p in mal)+") in 3rd/6th from AL indicate a bold, aggressive, materialistic nature. The native fights for what they want and values worldly achievements."
            stre = 'strong' if any(is_exalted(p) for p in mal) else 'moderate'
            if any(is_debilitated(p) for p in mal):
                desc += " However, a debilitated malefic here causes fights but the native may not always win."
                stre = 'warning'
        else:
            desc = "Benefic planets ("+", ".join(pname(p) for p in ben)+") in 3rd/6th from AL indicate a gentle, saintly, non-aggressive nature. The native prefers harmony and spiritual values over material struggles."
            stre = 'moderate'
        findings.append(finding(
            "Temperament from Arudha Lagna",
            desc, stre, 'personality',
            [f"3rd from AL={sign_name(h3_from_al)}", f"6th from AL={sign_name(h6_from_al)}"]
        ))

    # MKS check for Lagna lord
    if asc_lord:
        idx = asc_lord.get('planet', asc_lord.get('index'))
        if idx in MKS:
            mks_house = MKS[idx]
            actual_house = planet_house(asc_lord, asc)
            if actual_house == mks_house:
                findings.append(finding(
                    f"{pname(asc_lord)} in Marana Karaka Sthana (House {mks_house})",
                    f"The Lagna lord {pname(asc_lord)} is placed in its Marana Karaka Sthana (house of death-like suffering, {ordinal(mks_house)} house). "
                    "This significantly weakens the planet's ability to protect the native's vitality and self-expression.",
                    'warning', 'personality',
                    [f"MKS for {pname(asc_lord)} = {ordinal(mks_house)} house"]
                ))

    # Navamsa analysis for inner self (D9)
    d9_asc = cd.get('vargas', {}).get('D9', {}).get('ascendant', {}).get('rasi')
    if d9_asc is not None:
        findings.append(finding(
            f"Navamsa (D9) Ascendant: {sign_name(d9_asc)}",
            f"The D9 Lagna in {sign_name(d9_asc)} reveals the inner dharmic nature and spiritual temperament. "
            "The Navamsa shows past-life abilities and blessings that manifest naturally in this life.",
            'neutral', 'personality',
            [f"D9 Asc = {sign_name(d9_asc)}"]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 2: CAREER & PROFESSION
# ══════════════════════════════════════════════════════════════════════════════

def analyze_career(cd):
    findings = []
    asc = asc_sign(cd)

    # 10th house
    h10_planets = planets_in_house(cd, 10)
    h10_lord = lord_of_house(cd, 10)
    h10_sign = house_sign(asc, 10)

    findings.append(finding(
        f"10th House: {sign_name(h10_sign)}",
        f"The 10th house (karma sthana, career) is {sign_name(h10_sign)}. "
        + sign_career_meaning(h10_sign),
        'neutral', 'career',
        [f"10H = {sign_name(h10_sign)}"]
    ))

    if h10_lord:
        h = planet_house(h10_lord, asc)
        s = effective_strength(h10_lord)
        strength_word = strength_label(s)
        interp = tenth_lord_in_house(h)
        findings.append(finding(
            f"10th Lord ({pname(h10_lord)}) in House {h}",
            f"The 10th lord {pname(h10_lord)} is {strength_word}, placed in the {ordinal(h)} house. {interp}",
            'strong' if 'strong' in strength_word else ('weak' if 'weak' in strength_word else 'moderate'),
            'career',
            [f"10L={pname(h10_lord)}", f"House={h}", f"Strength={s}"]
        ))

    # Planets in 10H
    if h10_planets:
        descs = []
        for p in h10_planets:
            descs.append(planet_in_10H_meaning(p))
        findings.append(finding(
            f"Planets in 10th House: {', '.join(pname(p) for p in h10_planets)}",
            " ".join(descs),
            'strong', 'career',
            [f"{pname(p)} in 10H" for p in h10_planets]
        ))

    # Navamsa 10H for career dharma
    d9 = cd.get('vargas', {}).get('D9', {})
    d9_asc_sign = d9.get('ascendant', {}).get('rasi')
    if d9_asc_sign is not None:
        d9_10h_sign = (d9_asc_sign + 9) % 12
        d9_10h_lord_idx = house_lord(d9_10h_sign)
        findings.append(finding(
            f"D9 10th House: {sign_name(d9_10h_sign)}",
            f"In Navamsa (dharmic chart), the 10th house is {sign_name(d9_10h_sign)}, lorded by {planet_name(d9_10h_lord_idx)}. "
            "This reveals the soul's purpose in career — the deeper dharmic calling behind the professional life.",
            'neutral', 'career',
            [f"D9 10H = {sign_name(d9_10h_sign)}"]
        ))

    # D10 (Dasamsa) ascendant for career chart
    d10 = cd.get('vargas', {}).get('D10', {})
    d10_asc = d10.get('ascendant', {}).get('rasi')
    if d10_asc is not None:
        findings.append(finding(
            f"Dasamsa (D10) Ascendant: {sign_name(d10_asc)}",
            f"The D10 Lagna is {sign_name(d10_asc)}, indicating the style and environment of professional life. "
            "D10 is the primary chart for career analysis. The D10 Lagna lord's strength determines professional success.",
            'neutral', 'career',
            [f"D10 Asc = {sign_name(d10_asc)}"]
        ))

    # Sun placement — power and authority
    su = get_planet(cd, 0)
    if su:
        su_house = planet_house(su, asc)
        _sun_house_desc = {
            1: "Sun in 1st gives strong leadership, royal bearing, and self-confidence.",
            2: "Sun in 2nd gives authoritative speech and government-related income.",
            3: "Sun in 3rd gives courage, initiative, and success in media and writing.",
            4: "Sun in 4th can indicate tension with mother or property but gives government property.",
            5: "Sun in 5th (own-sign trine for Leo) gives intelligence, creativity, and capable children.",
            6: "Sun in 6th gives victory over enemies and success in service or health fields.",
            7: "Sun in 7th affects partnerships; partner may be from government or authority.",
            8: "Sun in 8th can indicate struggles with authority but gives occult insight.",
            9: "Sun in 9th gives strong dharma, father's blessings, and favour from authorities.",
            10: "Sun in 10th (digbala) is excellent for career — government recognition and public success.",
            11: "Sun in 11th gives gains from government, high-placed friends, and elder siblings.",
            12: "Sun in 12th may reduce visibility but grants success in foreign lands or spiritual pursuits.",
        }.get(su_house, "Sun influences the native's relationship with power and authority.")
        findings.append(finding(
            f"Sun in House {su_house} — Power & Authority",
            f"Sun in the {ordinal(su_house)} house governs the native's relationship with authority, government, and the ability to exercise power. "
            + _sun_house_desc,
            'strong' if su_house in [1,5,9,10] else 'neutral',
            'career',
            [f"Su in H{su_house}"]
        ))

    # Check for Mahapurusha yogas in career context
    mahapurusha = check_mahapurusha(cd)
    for yoga_name, planet, detail in mahapurusha:
        findings.append(finding(
            f"Mahapurusha Yoga: {yoga_name}",
            f"{detail} This yoga strongly elevates career success and public recognition.",
            'strong', 'career',
            [yoga_name, pname(planet)]
        ))

    # 6th/10th/11th Upachaya houses (PVR: upachayas are good for career)
    upachaya_planets = []
    for h in [3,6,10,11]:
        for p in planets_in_house(cd, h):
            upachaya_planets.append((p, h))
    if upachaya_planets:
        planet_list = ", ".join(f"{pname(p)} (H{h})" for p,h in upachaya_planets)
        findings.append(finding(
            f"Upachaya House Planets: {planet_list}",
            "Planets in upachaya houses (3,6,10,11) gain strength over time and support career growth. "
            "These positions improve with age and effort, rewarding persistence.",
            'moderate', 'career',
            [f"{pname(p)} in H{h}" for p,h in upachaya_planets]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 3: WEALTH & FINANCES
# ══════════════════════════════════════════════════════════════════════════════

def analyze_wealth(cd):
    findings = []
    asc = asc_sign(cd)
    al = calc_arudha(cd, 1)
    a2 = calc_arudha(cd, 2)  # Dhana Pada

    h2_lord = lord_of_house(cd, 2)
    h11_lord = lord_of_house(cd, 11)
    h2_planets = planets_in_house(cd, 2)
    h11_planets = planets_in_house(cd, 11)

    findings.append(finding(
        f"Dhana Pada (A2): {sign_name(a2)}",
        f"The Arudha of the 2nd house (Dhana Pada) falls in {sign_name(a2)}, showing the tangible manifestation of wealth. "
        "Planets in or aspecting A2 indicate the source and nature of financial gains.",
        'neutral', 'wealth',
        [f"A2 = {sign_name(a2)}"]
    ))

    # 2nd lord (wealth house)
    if h2_lord:
        h = planet_house(h2_lord, asc)
        s = effective_strength(h2_lord)
        findings.append(finding(
            f"2nd Lord ({pname(h2_lord)}) in House {h}",
            f"The 2nd lord (wealth significator) {pname(h2_lord)} is {strength_label(s)}, in the {ordinal(h)} house. "
            + second_lord_in_house(h),
            strength_to_level(s), 'wealth',
            [f"2L={pname(h2_lord)}", f"H={h}"]
        ))

    # 11th lord (gains house)
    if h11_lord:
        h = planet_house(h11_lord, asc)
        s = effective_strength(h11_lord)
        findings.append(finding(
            f"11th Lord ({pname(h11_lord)}) in House {h} — Gains",
            f"The 11th lord (gains, fulfillment of desires) {pname(h11_lord)} is {strength_label(s)}, in the {ordinal(h)} house. "
            + eleventh_lord_in_house(h),
            strength_to_level(s), 'wealth',
            [f"11L={pname(h11_lord)}", f"H={h}"]
        ))

    # Planets in 2H — wealth accumulation
    if h2_planets:
        for p in h2_planets:
            s = effective_strength(p)
            findings.append(finding(
                f"{pname(p)} in 2nd House",
                planet_in_2H(p),
                strength_to_level(s), 'wealth',
                [f"{pname(p)} in 2H"]
            ))

    # Planets in 11H — income
    if h11_planets:
        names = ", ".join(pname(p) for p in h11_planets)
        findings.append(finding(
            f"Planets in 11th House ({names}) — Income",
            "The 11th house is the house of gains and fulfillment of desires. "
            + " ".join(planet_in_11H(p) for p in h11_planets),
            'strong', 'wealth',
            [f"{pname(p)} in 11H" for p in h11_planets]
        ))

    # 2L+11L conjunction / mutual aspect
    if h2_lord and h11_lord:
        h2_sign = planet_sign(h2_lord)
        h11_sign = planet_sign(h11_lord)
        if h2_sign == h11_sign:
            findings.append(finding(
                f"Dhana Yoga: {pname(h2_lord)} & {pname(h11_lord)} Conjunct",
                f"The 2nd lord and 11th lord ({pname(h2_lord)} & {pname(h11_lord)}) are conjunct — a powerful Dhana Yoga. "
                "This combination gives strong wealth accumulation and financial prosperity throughout life.",
                'strong', 'wealth',
                ['2L+11L conjunction', 'Dhana Yoga']
            ))

    # Venus — material comfort (Ve is karaka for luxury/comfort)
    ve = get_planet(cd, 5)
    if ve:
        h = planet_house(ve, asc)
        s = effective_strength(ve)
        findings.append(finding(
            f"Venus in House {h} — Luxury & Comfort",
            f"Venus as karaka of wealth, luxury, and material comforts is placed in the {ordinal(h)} house and is {strength_label(s)}. "
            + venus_wealth(h, s),
            strength_to_level(s), 'wealth',
            [f"Ve in H{h}", f"Strength={s}"]
        ))

    # Jupiter — generalized fortune
    ju = get_planet(cd, 4)
    if ju:
        h = planet_house(ju, asc)
        s = effective_strength(ju)
        findings.append(finding(
            f"Jupiter in House {h} — Fortune & Expansion",
            f"Jupiter as karaka of wealth, wisdom, and expansion is {strength_label(s)} in the {ordinal(h)} house. "
            + jupiter_wealth(h, s),
            strength_to_level(s), 'wealth',
            [f"Ju in H{h}", f"Strength={s}"]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 4: MARRIAGE & RELATIONSHIPS
# ══════════════════════════════════════════════════════════════════════════════

def analyze_marriage(cd):
    findings = []
    asc = asc_sign(cd)
    ul = calc_arudha(cd, 12)  # Upapada Lagna (A12)
    a7 = calc_arudha(cd, 7)

    h7_lord = lord_of_house(cd, 7)
    h7_planets = planets_in_house(cd, 7)
    h7_sign = house_sign(asc, 7)

    findings.append(finding(
        f"7th House: {sign_name(h7_sign)}",
        f"The 7th house (marriage, partnerships) is {sign_name(h7_sign)}. "
        + seventh_house_meaning(h7_sign),
        'neutral', 'relationships',
        [f"7H = {sign_name(h7_sign)}"]
    ))

    findings.append(finding(
        f"Upapada Lagna (UL/A12): {sign_name(ul)}",
        f"The Upapada Lagna (Arudha of 12th house) is {sign_name(ul)}, showing the nature and quality of marriage. "
        "Planets influencing UL reveal spouse qualities. The 2nd from UL shows marriage longevity; afflicted 2nd from UL can indicate separation.",
        'neutral', 'relationships',
        [f"UL = {sign_name(ul)}"]
    ))

    findings.append(finding(
        f"A7 (7th House Arudha): {sign_name(a7)}",
        f"The Arudha of the 7th house (A7) is {sign_name(a7)}, showing the manifested image of spouse and partnerships in the world.",
        'neutral', 'relationships',
        [f"A7 = {sign_name(a7)}"]
    ))

    # 7th lord
    if h7_lord:
        h = planet_house(h7_lord, asc)
        s = effective_strength(h7_lord)
        findings.append(finding(
            f"7th Lord ({pname(h7_lord)}) in House {h}",
            f"The 7th lord {pname(h7_lord)} is {strength_label(s)}, placed in the {ordinal(h)} house. "
            + seventh_lord_in_house(h),
            strength_to_level(s), 'relationships',
            [f"7L={pname(h7_lord)}", f"H={h}"]
        ))

    # MKS for Venus (important for marriage)
    ve = get_planet(cd, 5)
    if ve:
        ve_house = planet_house(ve, asc)
        s = effective_strength(ve)
        findings.append(finding(
            f"Venus in House {ve_house} — Marriage Karaka",
            f"Venus as the natural significator of marriage is in the {ordinal(ve_house)} house and is {strength_label(s)}. "
            + venus_marriage(ve_house, s),
            'warning' if ve_house == 6 else strength_to_level(s),
            'relationships',
            [f"Ve in H{ve_house}", "MKS=6H for Venus" if ve_house == 6 else ""]
        ))

    # Planets in 7H
    if h7_planets:
        for p in h7_planets:
            idx = p.get('planet', p.get('index'))
            findings.append(finding(
                f"{pname(p)} in 7th House",
                planet_in_7H(p),
                'warning' if idx in [7,8,2] else 'moderate',
                'relationships',
                [f"{pname(p)} in 7H"]
            ))

    # 2nd from UL (marriage longevity)
    ul_2nd = (ul + 1) % 12
    ul_2nd_lord_idx = house_lord(ul_2nd)
    ul_2nd_planets = [p for p in get_planets(cd) if p.get('rasi') == ul_2nd]
    ul_2nd_lord = get_planet(cd, ul_2nd_lord_idx)
    if ul_2nd_lord:
        s = effective_strength(ul_2nd_lord)
        mal_in_2nd_ul = [p for p in ul_2nd_planets if p.get('planet', p.get('index')) in NATURAL_MALEFICS]
        if mal_in_2nd_ul and not any(p for p in ul_2nd_planets if p.get('planet', p.get('index')) in NATURAL_BENEFICS):
            findings.append(finding(
                f"2nd from UL: Afflicted — Marriage Under Stress",
                f"The 2nd from UL ({sign_name(ul_2nd)}) has malefic planets ({', '.join(pname(p) for p in mal_in_2nd_ul)}) without benefic protection. "
                "Per PVR's teachings, malefics in 2nd from UL without benefic support indicate potential for marital discord or separation.",
                'warning', 'relationships',
                [f"2nd from UL = {sign_name(ul_2nd)}", "Malefics present"]
            ))
        else:
            findings.append(finding(
                f"2nd from UL: {sign_name(ul_2nd)} — Marriage Longevity",
                f"The 2nd from UL ({sign_name(ul_2nd)}) indicates marriage stability. "
                + ("Benefic planets here protect the marriage." if any(p for p in ul_2nd_planets if p.get('planet', p.get('index')) in NATURAL_BENEFICS) else
                   "The lord's strength determines marital longevity."),
                'moderate', 'relationships',
                [f"2nd from UL = {sign_name(ul_2nd)}"]
            ))

    # D9 7th house (spouse dharma)
    d9 = cd.get('vargas', {}).get('D9', {})
    d9_asc_r = d9.get('ascendant', {}).get('rasi')
    if d9_asc_r is not None:
        d9_7h = (d9_asc_r + 6) % 12
        d9_7h_lord = house_lord(d9_7h)
        findings.append(finding(
            f"D9 7th House: {sign_name(d9_7h)} — Spouse's Nature",
            f"In Navamsa (dharma chart), the 7th house is {sign_name(d9_7h)}, lorded by {planet_name(d9_7h_lord)}. "
            "This shows the inner dharmic nature of the spouse and the spiritual quality of the relationship.",
            'neutral', 'relationships',
            [f"D9 7H = {sign_name(d9_7h)}"]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 5: CHILDREN
# ══════════════════════════════════════════════════════════════════════════════

def analyze_children(cd):
    findings = []
    asc = asc_sign(cd)
    h5_lord = lord_of_house(cd, 5)
    h5_planets = planets_in_house(cd, 5)
    h5_sign = house_sign(asc, 5)
    ju = get_planet(cd, 4)
    a5 = calc_arudha(cd, 5)

    findings.append(finding(
        f"5th House: {sign_name(h5_sign)} — Children",
        f"The 5th house (children, creativity, intelligence) is {sign_name(h5_sign)}. "
        + fifth_house_meaning(h5_sign),
        'neutral', 'children',
        [f"5H = {sign_name(h5_sign)}"]
    ))

    findings.append(finding(
        f"A5 (Putra Pada): {sign_name(a5)}",
        f"The Arudha of the 5th house (A5 / Putra Pada) is {sign_name(a5)}, showing the tangible manifestation of children and recognized abilities/scholarship.",
        'neutral', 'children',
        [f"A5 = {sign_name(a5)}"]
    ))

    # 5th lord
    if h5_lord:
        h = planet_house(h5_lord, asc)
        s = effective_strength(h5_lord)
        findings.append(finding(
            f"5th Lord ({pname(h5_lord)}) in House {h}",
            f"The 5th lord {pname(h5_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + fifth_lord_in_house(h),
            strength_to_level(s), 'children',
            [f"5L={pname(h5_lord)}", f"H={h}"]
        ))

    # Jupiter — karaka for children
    if ju:
        ju_house = planet_house(ju, asc)
        s = effective_strength(ju)
        findings.append(finding(
            f"Jupiter in House {ju_house} — Children Karaka",
            f"Jupiter as the natural significator of children is {strength_label(s)} in the {ordinal(ju_house)} house. "
            + jupiter_children(ju_house, s),
            strength_to_level(s), 'children',
            [f"Ju in H{ju_house}"]
        ))

    # MKS for Jupiter (3rd house is MKS for Jupiter)
    if ju and planet_house(ju, asc) == 3:
        findings.append(finding(
            "Jupiter in Marana Karaka Sthana (3rd House)",
            "Jupiter in its Marana Karaka Sthana (3rd house) is significantly weakened as children karaka. "
            "This placement can create challenges or delays related to children. Look to D7 for detailed assessment.",
            'warning', 'children',
            ['MKS for Ju = 3rd house', 'Jupiter in 3H']
        ))

    # D7 (Saptamsa) for children
    d7 = cd.get('vargas', {}).get('D7', {})
    d7_asc = d7.get('ascendant', {}).get('rasi')
    if d7_asc is not None:
        d7_5h = (d7_asc + 4) % 12
        findings.append(finding(
            f"D7 (Saptamsa) Ascendant: {sign_name(d7_asc)}",
            f"The D7 Saptamsa (divisional chart of children) has Lagna in {sign_name(d7_asc)}. "
            f"The 5th house of D7 is {sign_name(d7_5h)}, which reveals detailed information about children's number, nature, and timing.",
            'neutral', 'children',
            [f"D7 Asc = {sign_name(d7_asc)}"]
        ))

    # Planets in 5H
    if h5_planets:
        for p in h5_planets:
            findings.append(finding(
                f"{pname(p)} in 5th House",
                planet_in_5H(p),
                'warning' if p.get('planet', p.get('index')) in [2,6,7,8] and is_debilitated(p) else 'moderate',
                'children',
                [f"{pname(p)} in 5H"]
            ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 6: SIBLINGS
# ══════════════════════════════════════════════════════════════════════════════

def analyze_siblings(cd):
    findings = []
    asc = asc_sign(cd)
    h3_lord = lord_of_house(cd, 3)
    h3_planets = planets_in_house(cd, 3)
    h3_sign = house_sign(asc, 3)
    ma = get_planet(cd, 2)

    findings.append(finding(
        f"3rd House: {sign_name(h3_sign)} — Siblings",
        f"The 3rd house (siblings, courage, communication) is {sign_name(h3_sign)}. "
        + third_house_meaning(h3_sign),
        'neutral', 'siblings',
        [f"3H = {sign_name(h3_sign)}"]
    ))

    # 3rd lord
    if h3_lord:
        h = planet_house(h3_lord, asc)
        s = effective_strength(h3_lord)
        findings.append(finding(
            f"3rd Lord ({pname(h3_lord)}) in House {h} — Siblings",
            f"The 3rd lord {pname(h3_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + third_lord_in_house(h),
            strength_to_level(s), 'siblings',
            [f"3L={pname(h3_lord)}", f"H={h}"]
        ))

    # Mars — karaka for siblings
    if ma:
        ma_house = planet_house(ma, asc)
        s = effective_strength(ma)
        findings.append(finding(
            f"Mars in House {ma_house} — Siblings Karaka",
            f"Mars as karaka for siblings and courage is {strength_label(s)} in the {ordinal(ma_house)} house. "
            + mars_siblings(ma_house, s),
            strength_to_level(s), 'siblings',
            [f"Ma in H{ma_house}"]
        ))

    # D3 (Drekkana) for siblings
    d3 = cd.get('vargas', {}).get('D3', {})
    d3_asc = d3.get('ascendant', {}).get('rasi')
    if d3_asc is not None:
        findings.append(finding(
            f"D3 (Drekkana) Ascendant: {sign_name(d3_asc)}",
            f"The D3 Drekkana (divisional chart of siblings) has Lagna in {sign_name(d3_asc)}. "
            "D3 is the primary chart for detailed analysis of number, nature, and relationships with siblings.",
            'neutral', 'siblings',
            [f"D3 Asc = {sign_name(d3_asc)}"]
        ))

    # Planets in 3H
    if h3_planets:
        names = ", ".join(pname(p) for p in h3_planets)
        descs = [planet_in_3H(p) for p in h3_planets]
        findings.append(finding(
            f"Planets in 3rd House: {names}",
            " ".join(descs),
            'strong' if any(p.get('planet', p.get('index')) in [2] for p in h3_planets) else 'moderate',
            'siblings',
            [f"{pname(p)} in 3H" for p in h3_planets]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 7: HEALTH & LONGEVITY
# ══════════════════════════════════════════════════════════════════════════════

def analyze_health(cd):
    findings = []
    asc = asc_sign(cd)
    h6_lord = lord_of_house(cd, 6)
    h8_lord = lord_of_house(cd, 8)
    h6_planets = planets_in_house(cd, 6)
    h8_planets = planets_in_house(cd, 8)

    # Ascendant lord strength (most critical for health)
    asc_lord = lord_of_house(cd, 1)
    if asc_lord:
        s = effective_strength(asc_lord)
        findings.append(finding(
            f"Lagna Lord Health Assessment ({pname(asc_lord)})",
            f"The strength of the Lagna lord is the primary indicator of constitution and vitality. "
            f"{pname(asc_lord)} is {strength_label(s)}. "
            + health_from_asc_lord(s),
            strength_to_level(s), 'health',
            [f"LL={pname(asc_lord)}", f"Strength={s}"]
        ))

    # 6th house (disease, enemies)
    h6_sign = house_sign(asc, 6)
    findings.append(finding(
        f"6th House: {sign_name(h6_sign)} — Disease",
        f"The 6th house governs disease, immunity, and obstacles. It is {sign_name(h6_sign)}. "
        + sixth_house_health(h6_sign),
        'neutral', 'health',
        [f"6H = {sign_name(h6_sign)}"]
    ))

    if h6_lord:
        h = planet_house(h6_lord, asc)
        s = effective_strength(h6_lord)
        # Harsha Yoga check (lesson content: 6L in 6H)
        if h == 6:
            findings.append(finding(
                f"Harsha Yoga: {pname(h6_lord)} (6th Lord) in 6th House",
                f"Harsha Yoga occurs when the 6th lord is in its own house. This makes the native cheerful, able to overcome obstacles easily, and generally healthy. The native wins over enemies and difficulties with ease.",
                'strong', 'health',
                ['Harsha Yoga', f"6L {pname(h6_lord)} in 6H"]
            ))
        else:
            findings.append(finding(
                f"6th Lord ({pname(h6_lord)}) in House {h}",
                f"The 6th lord {pname(h6_lord)} is in the {ordinal(h)} house. "
                + sixth_lord_in_house(h, s),
                strength_to_level(s), 'health',
                [f"6L={pname(h6_lord)}", f"H={h}"]
            ))

    # 8th house (longevity, chronic illness, transformation)
    h8_sign = house_sign(asc, 8)
    if h8_lord:
        h = planet_house(h8_lord, asc)
        s = effective_strength(h8_lord)
        # Sarala Yoga (8L in 8H, from PDF)
        if h == 8:
            findings.append(finding(
                f"Sarala Yoga: {pname(h8_lord)} (8th Lord) in 8th House",
                f"Sarala Yoga occurs when the 8th lord is in its own house. Per PVR's teachings, this makes the native straightforward, honest, and forceful. It also gives longevity and the ability to overcome dangers.",
                'strong', 'health',
                ['Sarala Yoga', f"8L {pname(h8_lord)} in 8H"]
            ))
        else:
            findings.append(finding(
                f"8th Lord ({pname(h8_lord)}) in House {h} — Longevity",
                f"The 8th lord (longevity, hidden matters) {pname(h8_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
                + eighth_lord_in_house(h),
                strength_to_level(s), 'health',
                [f"8L={pname(h8_lord)}", f"H={h}"]
            ))

    # Saturn in 8H: hard work and longevity (PVR: judge hard work from 8H from Sa)
    sa = get_planet(cd, 6)
    if sa:
        sa_house = planet_house(sa, asc)
        s = effective_strength(sa)
        findings.append(finding(
            f"Saturn in House {sa_house} — Discipline & Hard Work",
            f"Saturn in the {ordinal(sa_house)} house shows discipline, endurance, and karma. {strength_label(s).capitalize()}. "
            "Per PVR: the 8th house from Saturn reveals the depth of hard work the native will do.",
            'neutral', 'health',
            [f"Sa in H{sa_house}"]
        ))

    # MKS afflictions for all planets
    mks_hits = []
    for idx, mks_house in MKS.items():
        p = get_planet(cd, idx)
        if p and planet_house(p, asc) == mks_house:
            mks_hits.append((p, mks_house))
    if mks_hits:
        for p, mks_house in mks_hits:
            findings.append(finding(
                f"{pname(p)} in Marana Karaka Sthana (House {mks_house})",
                f"{pname(p)} is in its Marana Karaka Sthana ({ordinal(mks_house)} house). "
                "This weakens the planet greatly and can manifest as health issues or suffering related to its significations during its dasha period.",
                'warning', 'health',
                [f"MKS: {pname(p)} in H{mks_house}"]
            ))

    # Ketu in 8H — undiagnosable diseases (lesson 40)
    ke = get_planet(cd, 8)
    if ke and planet_house(ke, asc) == 8:
        ke_sign = planet_sign(ke)
        if ke_sign not in [0, 7]:  # not in own signs
            findings.append(finding(
                "Ketu in 8th House — Ashtama Ketu",
                "Ketu in the 8th house (Ashtama Ketu) in a sign not its own can indicate undiagnosable or mysterious diseases. "
                "Medical examination may not easily reveal the root cause. Spiritual remedies are especially helpful.",
                'warning', 'health',
                ['Ashtama Ketu', 'Ke in 8H']
            ))

    # Badhakasthana
    bk_house = badhaka_house(asc)
    bk_lord = lord_of_house(cd, bk_house)
    bk_sign = house_sign(asc, bk_house)
    findings.append(finding(
        f"Badhakasthana: {ordinal(bk_house)} House ({sign_name(bk_sign)})",
        f"The Badhakasthana (house of unseen enemies and obstacles) is the {ordinal(bk_house)} house ({sign_name(bk_sign)}). "
        f"The Badhaka lord is {pname(bk_lord) if bk_lord else 'unknown'}. "
        "Badhaka lord in 12th house is good; in 6th house is terrible (becomes a visible enemy). "
        + badhaka_detail(bk_lord, bk_house, asc, cd),
        'neutral', 'health',
        [f"Badhaka = {ordinal(bk_house)} house ({sign_name(bk_sign)})"]
    ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 8: SPIRITUALITY & LIBERATION
# ══════════════════════════════════════════════════════════════════════════════

def analyze_spirituality(cd):
    findings = []
    asc = asc_sign(cd)
    ke = get_planet(cd, 8)
    ju = get_planet(cd, 4)
    sa = get_planet(cd, 6)
    mo = get_planet(cd, 1)
    su = get_planet(cd, 0)
    h9_lord = lord_of_house(cd, 9)
    h12_lord = lord_of_house(cd, 12)

    # 9th house — dharma
    h9_sign = house_sign(asc, 9)
    findings.append(finding(
        f"9th House: {sign_name(h9_sign)} — Dharma & Fortune",
        f"The 9th house (dharma, fortune, past-life merit, guru, father) is {sign_name(h9_sign)}. "
        + ninth_house_meaning(h9_sign),
        'neutral', 'spirituality',
        [f"9H = {sign_name(h9_sign)}"]
    ))

    # 9th lord
    if h9_lord:
        h = planet_house(h9_lord, asc)
        s = effective_strength(h9_lord)
        findings.append(finding(
            f"9th Lord ({pname(h9_lord)}) in House {h} — Fortune",
            f"The 9th lord {pname(h9_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + ninth_lord_in_house(h, s),
            strength_to_level(s), 'spirituality',
            [f"9L={pname(h9_lord)}", f"H={h}"]
        ))

    # Ketu — moksha, spirituality
    if ke:
        ke_house = planet_house(ke, asc)
        findings.append(finding(
            f"Ketu in House {ke_house} — Detachment & Spirituality",
            f"Ketu is the planet of past-life wisdom, detachment, and moksha. In the {ordinal(ke_house)} house, "
            + ketu_in_house(ke_house),
            'moderate' if ke_house in [1,5,9,12] else 'neutral',
            'spirituality',
            [f"Ke in H{ke_house}"]
        ))

    # Jupiter — guru, wisdom (lesson 41: strong Ju = wise, dharmic)
    if ju:
        ju_house = planet_house(ju, asc)
        s = effective_strength(ju)
        findings.append(finding(
            f"Jupiter in House {ju_house} — Wisdom & Guru",
            f"A strong Jupiter indicates a wise, dharmic person with access to good teachers. "
            f"Jupiter is {strength_label(s)} in the {ordinal(ju_house)} house. "
            + jupiter_spirituality(ju_house, s),
            strength_to_level(s), 'spirituality',
            [f"Ju in H{ju_house}"]
        ))

    # Saturn — tapas, sanyasi (lesson 41: strong Sa = sanyasi with no desire)
    if sa:
        sa_house = planet_house(sa, asc)
        s = effective_strength(sa)
        if sa_house in [1,5,9] or s in ['exalted','effective_exalted','own_sign']:
            findings.append(finding(
                f"Saturn — Discipline & Detachment",
                f"A strong Saturn (currently {strength_label(s)} in the {ordinal(sa_house)} house) indicates a person capable of great tapas, discipline, and renunciation. Per PVR: strong Sa = sanyasi who works without desire.",
                'strong', 'spirituality',
                [f"Sa in H{sa_house}", f"Strength={s}"]
            ))

    # D20 (Vimsamsa) for spirituality
    d20 = cd.get('vargas', {}).get('D20', {})
    d20_asc = d20.get('ascendant', {}).get('rasi')
    if d20_asc is not None:
        d20_4h = (d20_asc + 3) % 12
        d20_9h = (d20_asc + 8) % 12
        findings.append(finding(
            f"D20 (Vimsamsa) — Spiritual Progress",
            f"The D20 Vimsamsa (chart of spiritual development) has Lagna in {sign_name(d20_asc)}. "
            f"The 4th house ({sign_name(d20_4h)}) shows peace and devotional nature; the 9th house ({sign_name(d20_9h)}) shows dharma and grace. "
            "These houses in D20 reveal the soul's spiritual maturity and the path of progress.",
            'neutral', 'spirituality',
            [f"D20 Asc = {sign_name(d20_asc)}"]
        ))

    # 12th house (moksha, liberation)
    h12_sign = house_sign(asc, 12)
    if h12_lord:
        h = planet_house(h12_lord, asc)
        s = effective_strength(h12_lord)
        # Vimala Yoga (12L in 12H)
        if h == 12:
            findings.append(finding(
                f"Vimala Yoga: {pname(h12_lord)} (12th Lord) in 12th House",
                "Vimala Yoga occurs when the 12th lord is in its own house. This gives purity, generosity, and spiritual inclination. The native tends toward moksha and giving to others. A good indicator for spiritual liberation.",
                'strong', 'spirituality',
                ['Vimala Yoga', f"12L {pname(h12_lord)} in 12H"]
            ))
        else:
            findings.append(finding(
                f"12th Lord ({pname(h12_lord)}) in House {h} — Liberation",
                f"The 12th lord (moksha, losses, foreign lands, liberation) {pname(h12_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
                + twelfth_lord_in_house(h),
                strength_to_level(s), 'spirituality',
                [f"12L={pname(h12_lord)}", f"H={h}"]
            ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 9: FOREIGN TRAVEL & SETTLEMENT
# ══════════════════════════════════════════════════════════════════════════════

def analyze_foreign(cd):
    findings = []
    asc = asc_sign(cd)
    ra = get_planet(cd, 7)
    h12_lord = lord_of_house(cd, 12)
    h12_planets = planets_in_house(cd, 12)
    h9_planets = planets_in_house(cd, 9)
    a12 = calc_arudha(cd, 12)
    a9 = calc_arudha(cd, 9)

    findings.append(finding(
        f"A12 (Upapada/12th Arudha): {sign_name(a12)}",
        f"A12 (Arudha of 12th house) is {sign_name(a12)}, showing the tangible expression of foreign connections, spiritual retreat, and sacrifice.",
        'neutral', 'foreign_travel',
        [f"A12 = {sign_name(a12)}"]
    ))

    findings.append(finding(
        f"A9 (Fortune Arudha): {sign_name(a9)}",
        f"A9 is {sign_name(a9)}, showing the tangible manifestation of fortune and grace. "
        "A9 in the 12th house from Lagna or in a watery/dual sign can indicate fortune from foreign lands.",
        'moderate' if planet_house(get_planet(cd,7) or {'rasi':0}, asc) == 12 else 'neutral',
        'foreign_travel',
        [f"A9 = {sign_name(a9)}"]
    ))

    # Rahu — karaka for foreign travel (PVR: Ra in 12H, or Ra with 12L)
    if ra:
        ra_house = planet_house(ra, asc)
        s = effective_strength(ra)
        foreign_indicators = []
        if ra_house == 12:
            foreign_indicators.append("Rahu in 12th house — very strong indicator of foreign travel/settlement")
        if ra_house == 9:
            foreign_indicators.append("MKS for Rahu (9th house) — foreign connections bring challenges")
        findings.append(finding(
            f"Rahu in House {ra_house} — Foreign Connections",
            f"Rahu is the primary karaka for foreign lands, unconventional paths, and ambition. "
            f"Placed in the {ordinal(ra_house)} house. "
            + rahu_foreign(ra_house),
            'strong' if ra_house in [12,3,6,11] else 'moderate',
            'foreign_travel',
            [f"Ra in H{ra_house}"] + foreign_indicators
        ))

    # 12th house planets
    if h12_planets:
        for p in h12_planets:
            findings.append(finding(
                f"{pname(p)} in 12th House",
                f"{pname(p)} in the 12th house (foreign lands, moksha, expenditure). "
                + planet_in_12H(p),
                'moderate', 'foreign_travel',
                [f"{pname(p)} in 12H"]
            ))

    # 12th lord
    if h12_lord:
        h = planet_house(h12_lord, asc)
        s = effective_strength(h12_lord)
        findings.append(finding(
            f"12th Lord ({pname(h12_lord)}) in House {h} — Foreign Lands",
            f"The 12th lord {pname(h12_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + twelfth_lord_foreign(h),
            strength_to_level(s), 'foreign_travel',
            [f"12L={pname(h12_lord)}", f"H={h}"]
        ))

    # Movable signs in 1H, 7H, 4H, 10H as indicator of travel
    movable = [0,3,6,9]  # Ar,Cn,Li,Cp
    asc_movable = asc in movable
    if asc_movable:
        findings.append(finding(
            f"Movable Ascendant ({sign_name(asc)}) — Travel Inclination",
            f"A movable sign Ascendant ({sign_name(asc)}) gives the native a natural inclination for travel, change of residence, and adaptability to new environments.",
            'moderate', 'foreign_travel',
            [f"Asc={sign_name(asc)} (movable)"]
        ))

    # D4 (Chaturthamsa) for settlement abroad
    d4 = cd.get('vargas', {}).get('D4', {})
    d4_asc = d4.get('ascendant', {}).get('rasi')
    if d4_asc is not None:
        findings.append(finding(
            f"D4 (Chaturthamsa) Ascendant: {sign_name(d4_asc)}",
            f"The D4 Chaturthamsa (divisional chart of fortune from fixed assets and homeland) has Lagna in {sign_name(d4_asc)}. "
            "D4 is used to see permanent settlement, property, and whether the native settles in the homeland or abroad.",
            'neutral', 'foreign_travel',
            [f"D4 Asc = {sign_name(d4_asc)}"]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 10: EDUCATION & LEARNING
# ══════════════════════════════════════════════════════════════════════════════

def analyze_education(cd):
    findings = []
    asc = asc_sign(cd)
    me = get_planet(cd, 3)
    ju = get_planet(cd, 4)
    h4_lord = lord_of_house(cd, 4)
    h5_lord = lord_of_house(cd, 5)

    # 4th house — learning process
    h4_sign = house_sign(asc, 4)
    h4_planets = planets_in_house(cd, 4)
    findings.append(finding(
        f"4th House: {sign_name(h4_sign)} — Education",
        f"The 4th house (learning, education, mother, comforts) is {sign_name(h4_sign)}. "
        + fourth_house_meaning(h4_sign),
        'neutral', 'education',
        [f"4H = {sign_name(h4_sign)}"]
    ))

    if h4_lord:
        h = planet_house(h4_lord, asc)
        s = effective_strength(h4_lord)
        findings.append(finding(
            f"4th Lord ({pname(h4_lord)}) in House {h} — Education",
            f"The 4th lord {pname(h4_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + fourth_lord_in_house(h),
            strength_to_level(s), 'education',
            [f"4L={pname(h4_lord)}", f"H={h}"]
        ))

    # Mercury — intellect, communication, business, learning
    if me:
        me_house = planet_house(me, asc)
        s = effective_strength(me)
        findings.append(finding(
            f"Mercury in House {me_house} — Intellect & Communication",
            f"Mercury as karaka of intellect, communication, and learning is {strength_label(s)} in the {ordinal(me_house)} house. "
            + mercury_education(me_house, s),
            strength_to_level(s), 'education',
            [f"Me in H{me_house}"]
        ))

    # D24 (Siddhamsa) for higher learning
    d24 = cd.get('vargas', {}).get('D24', {})
    d24_asc = d24.get('ascendant', {}).get('rasi')
    if d24_asc is not None:
        d24_4h = (d24_asc + 3) % 12
        d24_8h = (d24_asc + 7) % 12
        d24_11h = (d24_asc + 10) % 12
        findings.append(finding(
            f"D24 (Siddhamsa) — Higher Learning & Occult",
            f"The D24 Siddhamsa (chart of learning and education) has Lagna in {sign_name(d24_asc)}. "
            f"Per PVR: 8H of D24 ({sign_name(d24_8h)}) = aptitude for occult; 11H ({sign_name(d24_11h)}) = actual learning; "
            f"4H ({sign_name(d24_4h)}) = formal education. Planets in these houses in D24 determine the quality and direction of learning.",
            'neutral', 'education',
            [f"D24 Asc = {sign_name(d24_asc)}"]
        ))

    # Vargottama Mercury or Jupiter = exceptional intellect
    if is_vargottama(cd, 3):
        findings.append(finding(
            "Mercury is Vargottama — Exceptional Intellect",
            "Mercury occupying the same sign in D1 and D9 (Vargottama) gives exceptional intelligence, communication ability, and learning capacity.",
            'strong', 'education', ['Mercury Vargottama']
        ))
    if is_vargottama(cd, 4):
        findings.append(finding(
            "Jupiter is Vargottama — Profound Wisdom",
            "Jupiter Vargottama gives profound wisdom, access to high-quality teachers and knowledge, and a natural inclination for deep study.",
            'strong', 'education', ['Jupiter Vargottama']
        ))

    # 5th house — intelligence, creativity
    h5_sign = house_sign(asc, 5)
    if h5_lord:
        h = planet_house(h5_lord, asc)
        s = effective_strength(h5_lord)
        findings.append(finding(
            f"5th Lord ({pname(h5_lord)}) in House {h} — Intelligence",
            f"The 5th lord (intelligence, creativity, scholarship) {pname(h5_lord)} is {strength_label(s)} in the {ordinal(h)} house. "
            + fifth_lord_education(h),
            strength_to_level(s), 'education',
            [f"5L={pname(h5_lord)}", f"H={h}"]
        ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# YOGA DETECTION (PVR-specific yogas)
# ══════════════════════════════════════════════════════════════════════════════

def check_mahapurusha(cd):
    """Returns list of (yoga_name, planet, detail) tuples."""
    result = []
    asc = asc_sign(cd)
    kendras = [1, 4, 7, 10]

    mahapurusha_planets = {
        2: ('Ruchaka Yoga', 'Mars in kendra in own sign/exaltation gives Ruchaka — great courage, military success, leadership.'),
        3: ('Bhadra Yoga', 'Mercury in kendra in own sign/exaltation gives Bhadra — excellent intellect, business acumen, communication.'),
        4: ('Hamsa Yoga', 'Jupiter in kendra in own sign/exaltation gives Hamsa — wisdom, divine grace, respected teacher.'),
        5: ('Malavya Yoga', 'Venus in kendra in own sign/exaltation gives Malavya — beauty, luxury, artistic talent, marital happiness.'),
        6: ('Sasa Yoga', 'Saturn in kendra in own sign/exaltation gives Sasa — discipline, authority over masses, endurance.'),
    }
    for planet_idx, (yoga_name, detail) in mahapurusha_planets.items():
        p = get_planet(cd, planet_idx)
        if p:
            h = planet_house(p, asc)
            if h in kendras and (is_exalted(p) or is_in_own_sign(p) or effective_strength(p) == 'effective_exalted'):
                result.append((yoga_name, p, detail))
    return result

def analyze_yogas(cd):
    """Detect PVR yogas and return findings."""
    findings = []
    asc = asc_sign(cd)
    planets = get_planets(cd)

    # Pancha Mahapurusha yogas
    for yoga_name, p, detail in check_mahapurusha(cd):
        findings.append(finding(
            yoga_name,
            detail,
            'strong', 'yogas',
            [yoga_name, f"{pname(p)} in kendra"]
        ))

    # Gaja Kesari Yoga — Mo and Ju in kendras from each other
    mo = get_planet(cd, 1)
    ju = get_planet(cd, 4)
    if mo and ju:
        mo_sign = planet_sign(mo)
        ju_sign = planet_sign(ju)
        diff = (ju_sign - mo_sign) % 12
        if diff in [0, 3, 6, 9]:
            findings.append(finding(
                "Gaja Kesari Yoga",
                f"Moon and Jupiter are in kendra relationship (Moon in {sign_name(mo_sign)}, Jupiter in {sign_name(ju_sign)}). "
                "Gaja Kesari gives prosperity, long-lasting fame, and the ability to influence many people. The native earns respect from society.",
                'strong', 'yogas',
                ['Mo and Ju in kendra', f"Moon={sign_name(mo_sign)}", f"Jupiter={sign_name(ju_sign)}"]
            ))

    # Vipareeta Raja Yoga — dusthana lords in dusthanas (6/8/12)
    dusthanas = [6, 8, 12]
    vry_count = 0
    for h in dusthanas:
        lord = lord_of_house(cd, h)
        if lord:
            lord_h = planet_house(lord, asc)
            if lord_h in dusthanas and lord_h != h:
                vry_count += 1
    if vry_count >= 1:
        findings.append(finding(
            "Vipareeta Raja Yoga (VRY)",
            f"One or more dusthana lords ({vry_count} found) are placed in other dusthana houses. "
            "VRY causes initial hardships that eventually reverse into great success. The native experiences dramatic reversals of fortune — what starts as a setback becomes a major victory.",
            'strong', 'yogas',
            ['Dusthana lord in dusthana', 'VRY']
        ))

    # Harsha Yoga (6L in 6H)
    lord6 = lord_of_house(cd, 6)
    if lord6 and planet_house(lord6, asc) == 6:
        findings.append(finding(
            "Harsha Yoga",
            f"6th lord {pname(lord6)} is in the 6th house (Harsha Yoga). The native is cheerful, overcomes obstacles easily, and generally enjoys good health. Enemies cannot harm this person.",
            'strong', 'yogas',
            ['Harsha Yoga', f"6L {pname(lord6)} in 6H"]
        ))

    # Sarala Yoga (8L in 8H)
    lord8 = lord_of_house(cd, 8)
    if lord8 and planet_house(lord8, asc) == 8:
        findings.append(finding(
            "Sarala Yoga",
            f"8th lord {pname(lord8)} is in the 8th house (Sarala Yoga). The native is straightforward, honest, and forceful. This yoga also grants longevity and the ability to recover from crises.",
            'strong', 'yogas',
            ['Sarala Yoga', f"8L {pname(lord8)} in 8H"]
        ))

    # Vimala Yoga (12L in 12H)
    lord12 = lord_of_house(cd, 12)
    if lord12 and planet_house(lord12, asc) == 12:
        findings.append(finding(
            "Vimala Yoga",
            f"12th lord {pname(lord12)} is in the 12th house (Vimala Yoga). The native is pure, unblemished, and generous. This yoga supports spiritual liberation and charitable nature.",
            'strong', 'yogas',
            ['Vimala Yoga', f"12L {pname(lord12)} in 12H"]
        ))

    # Parivartana Yoga (mutual exchange)
    checked = set()
    for p in planets:
        idx = p.get('planet', p.get('index'))
        p_sign = planet_sign(p)
        p_lord = house_lord(p_sign)
        if p_lord == idx or p_lord > 8:
            continue
        other = get_planet(cd, p_lord)
        if other:
            other_sign = planet_sign(other)
            if house_lord(other_sign) == idx:
                pair = tuple(sorted([idx, p_lord]))
                if pair not in checked:
                    checked.add(pair)
                    h_a = planet_house(p, asc)
                    h_b = planet_house(other, asc)
                    quality = parivartana_quality(h_a, h_b)
                    findings.append(finding(
                        f"Parivartana Yoga: {pname(p)} & {pname(other)}",
                        f"{pname(p)} in {sign_name(p_sign)} and {pname(other)} in {sign_name(other_sign)} are in mutual exchange (Parivartana). "
                        f"This combines the significations of houses {h_a} and {h_b}. {quality}",
                        'strong' if 'good' in quality.lower() else 'moderate',
                        'yogas',
                        [f"Parivartana: {pname(p)}-{pname(other)}", f"H{h_a}↔H{h_b}"]
                    ))

    # Kemadruma Yoga — no planets in 2H or 12H from Moon
    if mo:
        mo_sign = planet_sign(mo)
        h2_from_mo = (mo_sign + 1) % 12
        h12_from_mo = (mo_sign - 1) % 12
        h2_occupants = [p for p in planets if planet_sign(p) == h2_from_mo]
        h12_occupants = [p for p in planets if planet_sign(p) == h12_from_mo]
        if not h2_occupants and not h12_occupants:
            findings.append(finding(
                "Kemadruma Yoga",
                "No planets occupy the 2nd or 12th sign from Moon (Kemadruma Yoga). This yoga can cause loneliness, lack of support, or struggles with self-image, though its effect depends on whether Moon receives aspects from benefics.",
                'warning', 'yogas',
                ['No planets in 2H/12H from Moon', 'Kemadruma']
            ))

    # Budha-Aditya Yoga (Su+Me)
    su = get_planet(cd, 0)
    me = get_planet(cd, 3)
    if su and me:
        if planet_sign(su) == planet_sign(me):
            findings.append(finding(
                "Budha-Aditya Yoga",
                f"Sun and Mercury are conjunct in {sign_name(planet_sign(su))}. Budha-Aditya Yoga gives intelligence, ability to communicate effectively, recognition from authority, and success in intellectual pursuits.",
                'strong', 'yogas',
                ['Su+Me conjunction', 'Budha-Aditya']
            ))

    # Chandra-Mangal Yoga (Mo+Ma)
    ma = get_planet(cd, 2)
    if mo and ma:
        if planet_sign(mo) == planet_sign(ma):
            findings.append(finding(
                "Chandra-Mangal Yoga",
                f"Moon and Mars conjunct in {sign_name(planet_sign(mo))}. This yoga gives a strong drive, determination, and the ability to accumulate wealth through one's own efforts. The native is bold and enterprising.",
                'strong', 'yogas',
                ['Mo+Ma conjunction', 'Chandra-Mangal']
            ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# DASHA ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def analyze_dasha(cd):
    """Provide interpretive commentary on the running dasha."""
    findings = []
    vd = cd.get('vimsottariDasha', cd.get('dashas', {}).get('vimsottari', []))
    if not vd:
        return findings
    # Find currently running maha dasha by today's date
    import datetime
    today_str = datetime.date.today().isoformat()

    def is_current(entry):
        start = entry.get('startDate', entry.get('start', ''))
        end   = entry.get('endDate',   entry.get('end',   ''))
        if not start or not end:
            return False
        try:
            return start <= today_str <= end
        except Exception:
            return False

    maha = next((m for m in vd if is_current(m)), vd[0] if vd else None)
    if not maha:
        return findings

    asc = asc_sign(cd)
    md_planet = maha.get('planet', '')
    antars = maha.get('antardashas', maha.get('antardasas', []))
    current_antar = next((a for a in antars if is_current(a)), antars[0] if antars else None)

    # Map planet name to index
    p_map = {'Sun':0,'Moon':1,'Mars':2,'Mercury':3,'Jupiter':4,'Venus':5,'Saturn':6,'Rahu':7,'Ketu':8}
    md_idx = p_map.get(md_planet)
    md_p = get_planet(cd, md_idx) if md_idx is not None else None

    md_start = maha.get('startDate', maha.get('start', ''))
    md_end   = maha.get('endDate',   maha.get('end',   ''))

    if md_p:
        md_house = planet_house(md_p, asc)
        md_str = effective_strength(md_p)
        md_sign = planet_sign(md_p)
        findings.append(finding(
            f"Current Mahadasha: {md_planet} ({md_start} – {md_end})",
            f"{md_planet} mahadasha is running. {md_planet} is {strength_label(md_str)} in {sign_name(md_sign)}, placed in the {ordinal(md_house)} house. "
            "The maha dasha lord activates the houses it owns and occupies, bringing those life areas into focus. "
            + dasha_planet_meaning(md_idx, md_house, md_str),
            strength_to_level(md_str), 'dasha',
            [f"MD: {md_planet}", f"H{md_house}", f"Strength={md_str}"]
        ))

    if current_antar:
        ad_planet = current_antar.get('planet', '')
        ad_idx = p_map.get(ad_planet)
        ad_p = get_planet(cd, ad_idx) if ad_idx is not None else None
        ad_start = current_antar.get('startDate', current_antar.get('start', ''))
        ad_end   = current_antar.get('endDate',   current_antar.get('end',   ''))
        if ad_p:
            ad_house = planet_house(ad_p, asc)
            ad_str = effective_strength(ad_p)
            findings.append(finding(
                f"Current Antardasha: {ad_planet} in {md_planet} ({ad_start} – {ad_end})",
                f"Sub-period of {ad_planet} in the {md_planet} major period. {ad_planet} is {strength_label(ad_str)} in the {ordinal(ad_house)} house. "
                "The antardasha modifies the mahadasha results — benefics bring positive sub-period while malefics bring tests and challenges during this sub-period.",
                strength_to_level(ad_str), 'dasha',
                [f"AD: {ad_planet}", f"H{ad_house}"]
            ))

    return findings

# ══════════════════════════════════════════════════════════════════════════════
# HELPER MEANINGS (plain-English interpretations)
# ══════════════════════════════════════════════════════════════════════════════

def ordinal(n):
    if 11 <= n <= 13: return f"{n}th"
    return f"{n}{['th','st','nd','rd','th','th','th','th','th','th'][n%10]}"

def strength_label(s):
    return {'exalted':'exalted (very strong)','effective_exalted':'effectively exalted (neecha bhanga)','own_sign':'in own sign (strong)','effective_debilitated':'effectively debilitated (exalted+retrograde)','debilitated':'debilitated (weak)','neutral':'in neutral position'}.get(s, s)

def strength_to_level(s):
    return {'exalted':'strong','effective_exalted':'strong','own_sign':'strong','effective_debilitated':'weak','debilitated':'weak','neutral':'moderate'}.get(s,'moderate')

def lord_in_house_meaning(planet_idx, house):
    meanings = {
        1: "The Lagna lord in the 1st house gives a strong, self-directed personality with good health and physical vitality.",
        2: "The Lagna lord in the 2nd house emphasizes wealth accumulation, family ties, and effective communication.",
        3: "The Lagna lord in the 3rd house gives courage, initiative, and strong sibling bonds.",
        4: "The Lagna lord in the 4th house gives domestic happiness, love of home, education, and good relationship with mother.",
        5: "The Lagna lord in the 5th house gives intelligence, creativity, and blessings through children.",
        6: "The Lagna lord in the 6th house creates challenges and struggles, but the native is skilled at overcoming obstacles.",
        7: "The Lagna lord in the 7th house gives a partnership-oriented personality; spouse is very important.",
        8: "The Lagna lord in the 8th house can give occult interests, sudden events, and transformative experiences.",
        9: "The Lagna lord in the 9th house gives great fortune, spiritual inclination, and blessings through guru.",
        10: "The Lagna lord in the 10th house gives career success, public recognition, and status.",
        11: "The Lagna lord in the 11th house gives gains, fulfillment of desires, and a network of helpful friends.",
        12: "The Lagna lord in the 12th house gives spiritual inclinations, foreign connections, and sometimes isolation.",
    }
    return meanings.get(house, "")

def sign_career_meaning(sign):
    meanings = [
        "Aries 10H: pioneering, self-starting career; entrepreneurship, military, sports.",
        "Taurus 10H: stable, artistic, financial career; banking, agriculture, beauty industry.",
        "Gemini 10H: communication, trading, media, teaching; multiple career paths.",
        "Cancer 10H: nurturing professions; food, hospitality, social work, property.",
        "Leo 10H: leadership, government, arts, management; desire for recognition.",
        "Virgo 10H: service, healthcare, analysis, precision work; accounting, medicine.",
        "Libra 10H: law, justice, arts, diplomacy, partnerships in career.",
        "Scorpio 10H: research, occult, surgery, investigation, psychology.",
        "Sagittarius 10H: teaching, philosophy, law, religion, long-distance trade.",
        "Capricorn 10H: disciplined, ambitious career; government, corporate, engineering.",
        "Aquarius 10H: technology, social causes, unconventional career, research.",
        "Pisces 10H: spiritual work, healing, arts, charity, medical, spiritual guidance.",
    ]
    return meanings[sign % 12]

def tenth_lord_in_house(h):
    meanings = {
        1:"Career achievements define the native's identity.",
        2:"Career supports family wealth and stability.",
        3:"Career involves communication, writing, or sibling-like partnerships.",
        4:"Career may relate to homeland, education, real estate, or the native works from home.",
        5:"Career in creative, educational, or speculative fields.",
        6:"Career involves service, health, law, or overcoming competition.",
        7:"Career through partnerships, foreign trade, or public relations.",
        8:"Career may be interrupted or transformed; research, occult, or behind-the-scenes work.",
        9:"Career connected to dharma, teaching, law, or foreign countries. Good fortune through career.",
        10:"10th lord in 10th house gives strong career success and ambition.",
        11:"Career brings excellent gains and network connections.",
        12:"Career may involve foreign companies, spiritual work, or service behind the scenes.",
    }
    return meanings.get(h, "")

def planet_in_10H_meaning(p):
    idx = p.get('planet', p.get('index'))
    s = effective_strength(p)
    meanings = {
        0: "Sun in 10H gives authority, government connections, and powerful career. Strong indicator of recognition.",
        1: "Moon in 10H gives public appeal, career in nurturing fields, changing career fortunes.",
        2: "Mars in 10H gives drive, ambition, and often a career in technology, military, or engineering.",
        3: "Mercury in 10H gives success in communication, business, trade, or media.",
        4: "Jupiter in 10H is very auspicious — wise bosses, dharmic career, recognition as a teacher or advisor.",
        5: "Venus in 10H gives artistic career, luxury industry, or diplomatic work.",
        6: "Saturn in 10H gives slow but steady career rise, disciplined work ethic, and ultimate success through perseverance.",
        7: "Rahu in 10H gives an unconventional, ambitious career path with foreign connections.",
        8: "Ketu in 10H can give spiritual or technical career, or detachment from conventional work.",
    }
    base = meanings.get(idx, f"{pname(p)} in 10H influences career.")
    if s in ['debilitated','effective_debilitated']:
        base += " However, the planet's weakness may create career obstacles or delays."
    return base

def seventh_house_meaning(sign):
    meanings = [
        "Aries 7H: spouse is active, independent, and assertive.",
        "Taurus 7H: spouse is stable, artistic, and materially inclined.",
        "Gemini 7H: spouse is communicative, intellectual, and versatile.",
        "Cancer 7H: spouse is nurturing, emotional, and family-oriented.",
        "Leo 7H: spouse is confident, leadership-oriented, and may be prominent.",
        "Virgo 7H: spouse is analytical, service-oriented, and may be health-conscious.",
        "Libra 7H: spouse is balanced, artistic, and relationship-focused.",
        "Scorpio 7H: spouse has depth, intensity, and may have occult interests.",
        "Sagittarius 7H: spouse is philosophical, freedom-loving, and dharmic.",
        "Capricorn 7H: spouse is disciplined, ambitious, and traditional.",
        "Aquarius 7H: spouse is unconventional, intellectual, and humanitarian.",
        "Pisces 7H: spouse is compassionate, spiritual, and artistic.",
    ]
    return meanings[sign % 12]

def seventh_lord_in_house(h):
    meanings = {
        1:"7th lord in 1st: spouse is strongly influenced by the native's personality; good partnership energy.",
        2:"7th lord in 2nd: marriage brings wealth and family connections.",
        3:"7th lord in 3rd: spouse may be known through siblings or communication.",
        4:"7th lord in 4th: marriage related to home, mother's influence, or domestic life.",
        5:"7th lord in 5th: romantic marriage; children may be the basis of the union.",
        6:"7th lord in 6th: marriage may face conflicts, health issues, or separation risk.",
        7:"7th lord in 7th: strong emphasis on partnership and marriage; can marry more than once.",
        8:"7th lord in 8th: secret or sudden marriage; marital transformations; longevity issues.",
        9:"7th lord in 9th: dharmic, lucky marriage; spouse may be from a different culture.",
        10:"7th lord in 10th: career and marriage intertwined; may marry through work.",
        11:"7th lord in 11th: marriage brings gains and fulfillment of desires.",
        12:"7th lord in 12th: marriage to someone from a foreign land or spiritual realm; secret marriage.",
    }
    return meanings.get(h, "")

def venus_marriage(h, s):
    if h == 6:
        return "Venus in the 6th house (its Marana Karaka Sthana) significantly weakens the marriage karaka. Challenges in relationship or delayed/troubled marriage are possible."
    if h == 7:
        return "Venus in 7th gives great love of partnership, beautiful spouse, and generally harmonious marriage."
    if h == 1:
        return "Venus in 1st gives charm, attractiveness, and a loving personality that attracts partners."
    if s in ['exalted', 'effective_exalted', 'own_sign']:
        return "The strength of Venus augurs well for marital happiness and the quality of partnerships."
    return "Venus' placement shapes the nature and quality of romantic relationships."

def planet_in_7H(p):
    idx = p.get('planet', p.get('index'))
    meanings = {
        0:"Sun in 7H creates ego conflicts in marriage; the spouse may be dominant or the native's ego affects relationships.",
        1:"Moon in 7H gives emotional sensitivity in relationships; the native seeks emotional security through partnership.",
        2:"Mars in 7H (Kuja Dosha) creates aggression in relationships; conflicts are common but passion is high.",
        3:"Mercury in 7H gives an intellectually stimulating spouse; marriage involves communication and mental compatibility.",
        4:"Jupiter in 7H is very auspicious — a wise, dharmic, and fortunate spouse; generally happy marriage.",
        5:"Venus in 7H is excellent — a beautiful, loving relationship with strong marital happiness.",
        6:"Saturn in 7H can delay marriage, give a older/serious spouse, and create responsibilities in partnership.",
        7:"Rahu in 7H creates unconventional relationships, attraction to foreign or unusual partners, relationship disruptions.",
        8:"Ketu in 7H can cause detachment in marriage, spiritual or unusual spouse, or a past-life connection.",
    }
    return meanings.get(idx, f"{pname(p)} in 7H affects relationships.")

def fifth_house_meaning(sign):
    signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    return f"{signs[sign%12]} in 5th house shapes the nature of children, creativity, and intelligence according to its elemental qualities."

def fifth_lord_in_house(h):
    meanings = {
        1:"Strong creative personality; children are important to identity.",
        2:"Children bring wealth; creativity expressed through resources.",
        3:"Children may follow creative or communicative careers.",
        4:"Domestic life centered around children; children may live with parents long.",
        5:"5th lord in 5th: excellent for children and creativity; multiple children likely.",
        6:"Challenges with children; health issues or separation from children.",
        7:"Children born after marriage; spouse plays key role in children's upbringing.",
        8:"Occult interests or hidden matters involving children; transformative experiences.",
        9:"Fortunate, dharmic children; children may be spiritually inclined.",
        10:"Children may be career-oriented or achieve public recognition.",
        11:"Gains through children; children fulfill the native's desires.",
        12:"Foreign-born children; spiritual or artistic children; possible challenges.",
    }
    return meanings.get(h, "")

def jupiter_children(h, s):
    if h == 3:
        return "Jupiter in its Marana Karaka Sthana (3rd house) weakens its role as children karaka. Challenges or delays with children are possible. Assess D7 for confirmation."
    if s in ['exalted','effective_exalted','own_sign']:
        return "Strong Jupiter blesses with healthy, intelligent children and abundance in progeny matters."
    if s in ['debilitated','effective_debilitated']:
        return "Weakened Jupiter may bring delays or challenges related to children. Spiritual remedies help."
    return "Jupiter's placement and condition directly influence children and progeny matters."

def planet_in_5H(p):
    idx = p.get('planet', p.get('index'))
    meanings = {
        0:"Sun in 5H gives intelligence, government favor, and proud children.",
        1:"Moon in 5H gives emotional creativity and nurturing children.",
        2:"Mars in 5H gives dynamic creativity but possible abortion/miscarriage issues.",
        3:"Mercury in 5H gives excellent intelligence and communication skills.",
        4:"Jupiter in 5H is excellent — strong children blessing and high intelligence.",
        5:"Venus in 5H gives artistic creativity and love-focused nature.",
        6:"Saturn in 5H can delay children; children may be few but steady.",
        7:"Rahu in 5H gives unconventional children or creative brilliance, but also possible disruptions.",
        8:"Ketu in 5H gives spiritual wisdom and past-life intelligence, but detachment from children.",
    }
    return meanings.get(idx, f"{pname(p)} in 5H.")

def third_house_meaning(sign):
    return f"The 3rd house in {RASI[sign%12]} shows the nature of courage, initiative, and communication style. Siblings take on the qualities of this sign."

def third_lord_in_house(h):
    meanings = {
        1:"3rd lord in 1st: courageous, initiative-driven personality.",
        3:"3rd lord in 3rd: very strong for siblings, courage, and self-effort.",
        6:"3rd lord in 6th: conflicts with siblings; courage used to overcome enemies.",
        8:"3rd lord in 8th: siblings may face difficulties; hidden matters around communication.",
        11:"3rd lord in 11th: gains through siblings and self-efforts; friends through siblings.",
    }
    return meanings.get(h, f"3rd lord in {ordinal(h)} house affects sibling and communication matters.")

def mars_siblings(h, s):
    if h in [1,3,6,11]:
        return f"Mars in {ordinal(h)} house is favorable for courage and sibling relations."
    if h in [2,7,8,12]:
        return f"Mars in {ordinal(h)} house can create friction with siblings or require careful management of courage."
    return "Mars shapes the courageous and assertive qualities related to siblings."

def planet_in_3H(p):
    idx = p.get('planet', p.get('index'))
    meanings = {
        2:"Mars in 3H is excellent — great courage, initiative, and strong siblings.",
        4:"Jupiter in 3H (MKS for Jupiter) weakens wisdom but gives learned siblings.",
        3:"Mercury in 3H gives excellent communication, writing skills, and intellectual siblings.",
        6:"Saturn in 3H gives disciplined communication; siblings may be hardworking.",
        7:"Rahu in 3H gives bold, unconventional courage and unusual siblings.",
        8:"Ketu in 3H gives headless courage — brave but impulsive.",
    }
    return meanings.get(idx, f"{pname(p)} in 3H.")

def health_from_asc_lord(s):
    if s in ['exalted','effective_exalted','own_sign']:
        return "Strong Lagna lord gives robust constitution, good immunity, and resilience through illness."
    if s in ['debilitated','effective_debilitated']:
        return "Weak Lagna lord indicates a delicate constitution requiring care. Health must be monitored."
    return "Moderate constitution; health depends on lifestyle and planetary periods."

def sixth_house_health(sign):
    return f"The 6th house in {RASI[sign%12]} shapes the type of health challenges and the native's ability to overcome them."

def sixth_lord_in_house(h, s):
    good_houses = [6, 8, 12]  # VRY-like positions
    if h in good_houses:
        return "6th lord in a dusthana creates Vipareeta conditions — initial disease struggles transform into recovery."
    if h in [1,4,7,10]:
        return "6th lord in a kendra brings health challenges into prominent life areas."
    return "6th lord's position affects health and the nature of obstacles in life."

def eighth_lord_in_house(h):
    if h == 8:
        return "Sarala Yoga — straightforward, honest nature with ability to recover from crises."
    if h in [1,5,9]:
        return "8th lord in trine gives occult inclinations and resilience through hidden sources of strength."
    if h in [6,12]:
        return "8th lord in 6H or 12H creates Vipareeta conditions — initial struggles lead to eventual victory."
    return f"8th lord in {ordinal(h)} house modifies matters of longevity and sudden transformations."

def badhaka_house(asc):
    movable = [0,3,6,9]
    fixed   = [1,4,7,10]
    dual    = [2,5,8,11]
    if asc in movable:  return 11
    if asc in fixed:    return 9
    if asc in dual:     return 7
    return 11

def badhaka_detail(bk_lord, bk_house, asc, cd):
    if not bk_lord: return ""
    h = planet_house(bk_lord, asc)
    if h == 12:
        return "The Badhaka lord in the 12th house is good — obstacles are distant and can be dissolved through spiritual practice."
    if h == 6:
        return "Badhaka lord in the 6th house is challenging — the unseen enemy becomes visible and creates persistent obstacles."
    return f"The Badhaka lord is in the {ordinal(h)} house, subtly influencing the life."

def ninth_house_meaning(sign):
    return f"The 9th house in {RASI[sign%12]} reveals the nature of dharma, spiritual inclination, and fortune from past-life merit."

def ninth_lord_in_house(h, s):
    if h in [1,5,9]:
        return "9th lord in a trine — excellent for fortune, dharma, and spiritual blessings."
    if h == 10:
        return "9th lord in 10th house creates Dharmakarmaadhipati Yoga — career aligned with dharma; great professional success."
    if h in [6,8,12]:
        return "9th lord in a dusthana brings challenges to fortune or dharma, though VRY-like reversals may eventually bring blessings."
    return f"9th lord shapes fortune and dharmic inclinations through the {ordinal(h)} house."

def ketu_in_house(h):
    meanings = {
        1:"Ketu in 1st gives a spiritual, unusual personality with past-life wisdom.",
        3:"Ketu in 3rd gives headless courage — brave but impulsive communication.",
        4:"Ketu in 4th creates detachment from home and mother; spiritual comfort.",
        5:"Ketu in 5th gives past-life intelligence and spiritual creativity.",
        7:"Ketu in 7th gives detachment in relationships or a spiritually inclined spouse.",
        8:"Ketu in 8th (Ashtama Ketu) can give mysterious, undiagnosable health issues.",
        9:"Ketu in 9th gives a headless spiritual teacher — unconventional dharmic path.",
        12:"Ketu in 12th is excellent for moksha, liberation, and spiritual practice.",
    }
    return meanings.get(h, f"Ketu in {ordinal(h)} house brings past-life karma and detachment to that house's matters.")

def jupiter_spirituality(h, s):
    if h in [1,5,9]:
        return "Jupiter in a trine is a great blessing for wisdom, spiritual growth, and access to divine grace."
    if h == 4:
        return "Jupiter in 4th gives inner peace, devotional nature, and access to good teachers in domestic life."
    if h == 9:
        return "Jupiter in 9th is excellent — the native has a strong guru connection and profound dharmic living."
    return f"Jupiter in {ordinal(h)} house brings its wisdom and expansive nature to those life areas."

def twelfth_lord_in_house(h):
    if h == 12:
        return "Vimala Yoga — pure, generous, spiritual liberation-seeking nature."
    if h == 5:
        return "12th lord in 5th gives spiritual creativity and possible expenses through children or speculation."
    if h == 9:
        return "12th lord in 9th gives spiritual fortune and dharmic losses; possible renunciation."
    return f"12th lord in {ordinal(h)} house shapes the nature of losses, foreign connections, and spiritual seeking."

def rahu_foreign(h):
    if h == 12:
        return "Rahu in 12th house is a strong indicator of foreign travel, settlement abroad, and unconventional spiritual practices."
    if h == 7:
        return "Rahu in 7th gives foreign partnerships, unconventional marriage, and strong desire for foreign connections."
    if h == 6:
        return "Rahu in 6th can give gains through foreigners, unusual work environments, and service to diverse populations."
    if h == 9:
        return "Rahu in 9th (MKS for Rahu) creates confusion around dharma but can give unusual fortune through foreign lands."
    return f"Rahu in {ordinal(h)} house shapes the desire for unconventional, foreign, or hidden matters."

def planet_in_12H(p):
    idx = p.get('planet', p.get('index'))
    meanings = {
        0:"Sun in 12H gives losses of authority or connection to foreign government. Strong spiritual Sun here.",
        1:"Moon in 12H (MKS for Moon) gives emotional sensitivity in isolation; dreams and subconscious are vivid.",
        4:"Jupiter in 12H gives generosity, spiritual wisdom, and possible spiritual detachment.",
        5:"Venus in 12H can give losses through relationships or luxurious expenditure in foreign lands.",
        7:"Rahu in 12H — very strong indicator of foreign lands, unconventional spiritual practices.",
        8:"Ketu in 12H is excellent for moksha, liberation, and ashram life.",
    }
    return meanings.get(idx, f"{pname(p)} in 12H shapes foreign and liberation matters.")

def twelfth_lord_foreign(h):
    if h == 12:
        return "12th lord in 12th — Vimala Yoga; spiritual and foreign matters are very prominent."
    if h in [3,9]:
        return "12th lord in trine to 12th — strong connection to foreign lands and journeys."
    if h == 7:
        return "12th lord in 7th — marriage to a foreigner or strong foreign business partnerships."
    return f"12th lord in {ordinal(h)} house shapes the nature of foreign connections and spiritual practice."

def fourth_house_meaning(sign):
    return f"The 4th house in {RASI[sign%12]} shows the style of education, quality of emotional comfort, and the native's relationship with their homeland."

def fourth_lord_in_house(h):
    if h in [1,4,7,10]:
        return "4th lord in kendra gives comfort, good education, and strong roots."
    if h in [5,9]:
        return "4th lord in trine gives excellent educational fortune and deep emotional blessings."
    if h in [6,8,12]:
        return "4th lord in dusthana can create disruptions in education or home life, but VRY reversals bring eventual comfort."
    return f"4th lord in {ordinal(h)} house shapes education and domestic happiness."

def mercury_education(h, s):
    if h in [1,3,5]:
        return "Mercury in 1H/3H/5H is well-placed for intellect, communication, and academic success."
    if h == 6:
        return "Mercury in 6H can indicate analytical ability for health sciences but some mental agitation."
    if s in ['exalted','own_sign','effective_exalted']:
        return "Strong Mercury gives sharp intellect, excellent communication, and academic success."
    if s in ['debilitated','effective_debilitated']:
        return "Weak Mercury may create communication difficulties or inconsistent academic performance."
    return "Mercury's placement shapes the style and success of learning and communication."

def fifth_lord_education(h):
    if h in [1,5,9]:
        return "5th lord in trine — excellent intelligence, academic achievement, and creative expression."
    if h == 2:
        return "5th lord in 2nd — intelligence applied to wealth creation; good memory for resources."
    if h == 10:
        return "5th lord in 10th — intelligence channeled into career; success through creative work."
    return f"5th lord in {ordinal(h)} house shapes intellectual abilities and creative pursuits."

def second_lord_in_house(h):
    if h == 2:
        return "2nd lord in own house — strong wealth accumulation and family values."
    if h in [5,9,11]:
        return "2nd lord in 5/9/11 — excellent Dhana yoga; wealth comes through fortune, creativity, or gains."
    if h in [6,8,12]:
        return "2nd lord in dusthana — wealth may be hard-earned or come through unconventional means."
    return f"2nd lord in {ordinal(h)} house shapes financial fortune."

def eleventh_lord_in_house(h):
    if h == 11:
        return "11th lord in own house — excellent for gains and fulfillment of desires."
    if h in [1,5,9]:
        return "11th lord in trine — gains through dharma, creativity, and good fortune."
    if h in [2,10]:
        return "11th lord in 2/10 — excellent financial gains through career and family."
    return f"11th lord in {ordinal(h)} house shapes the nature of gains and fulfillment."

def planet_in_2H(p):
    idx = p.get('planet', p.get('index'))
    s = effective_strength(p)
    if idx == 5:
        return "Venus in 2H gives a beautiful, melodious voice, love of luxury, and good wealth accumulation."
    if idx == 4:
        return "Jupiter in 2H gives abundant wealth, wise speech, and family prosperity."
    if idx == 1:
        return "Moon in 2H gives fluctuating wealth but strong family connections."
    if idx == 7:
        return "Rahu in 2H may indicate wealth through unconventional means; PVR warns of possible death by poison."
    if idx == 2:
        return "Mars in 2H can give aggressive speech and wealth through effort or martial activities."
    if idx == 6:
        return "Saturn in 2H gives slow but steady wealth accumulation; disciplined financial habits."
    return f"{planet_name(idx)} in 2H influences wealth and family."

def planet_in_11H(p):
    idx = p.get('planet', p.get('planet', p.get('index')))
    if idx == 4:
        return "Jupiter in 11H is excellent — abundant gains, wise friends, and fulfillment of desires."
    if idx == 5:
        return "Venus in 11H gives gains through beauty, arts, and relationships."
    if idx == 0:
        return "Sun in 11H gives gains from government and powerful friends."
    if idx == 1:
        return "Moon in 11H gives gains from public, masses, and emotional support networks."
    if idx == 2:
        return "Mars in 11H (upachaya) gives gains through effort, competition, and technical skills."
    if idx == 6:
        return "Saturn in 11H (upachaya) gives slow but very substantial gains through disciplined effort."
    return f"{planet_name(idx)} in 11H brings gains and fulfillment."

def venus_wealth(h, s):
    if h in [1,2,4,7,11]:
        return "Venus in these houses supports material comfort and luxury."
    if s in ['exalted','effective_exalted']:
        return "Exalted Venus gives exceptional material comforts and financial prosperity."
    return "Venus shapes the quality of material enjoyment and aesthetic pleasures."

def jupiter_wealth(h, s):
    if h in [2,5,9,11]:
        return "Jupiter in 2/5/9/11 creates strong Dhana Yoga — excellent wealth and prosperity."
    if h in [1,4,7,10]:
        return "Jupiter in kendra gives broad fortune and expansion in career and home."
    if s in ['exalted','effective_exalted']:
        return "Exalted Jupiter (Cancer) gives the highest financial blessings."
    if s == 'debilitated':
        return "Debilitated Jupiter (Capricorn) may reduce financial flow though neecha bhanga if retrograde."
    return "Jupiter's position and strength determine the level of fortune and prosperity."

def dasha_planet_meaning(idx, house, strength):
    if idx is None:
        return ""
    meanings = {
        0: f"Sun dasha brings focus on authority, career, and ego. In {ordinal(house)} house, it activates those life areas.",
        1: f"Moon dasha emphasizes emotions, mind, and public matters. In {ordinal(house)} house, nurturing themes come forward.",
        2: f"Mars dasha brings action, courage, and drive. In {ordinal(house)} house, those matters become active.",
        3: f"Mercury dasha emphasizes intellect, communication, and business. In {ordinal(house)} house, analytical matters emerge.",
        4: f"Jupiter dasha is generally auspicious, bringing expansion and wisdom. In {ordinal(house)} house, dharmic themes expand.",
        5: f"Venus dasha brings love, luxury, and material comforts. In {ordinal(house)} house, those pleasures come forward.",
        6: f"Saturn dasha brings discipline, karma, and hard work. In {ordinal(house)} house, challenges are met with endurance.",
        7: f"Rahu dasha brings ambition, foreign connections, and unconventional experiences in {ordinal(house)} house matters.",
        8: f"Ketu dasha brings detachment, spiritual insights, and past-life karma through {ordinal(house)} house themes.",
    }
    base = meanings.get(idx, "")
    if strength in ['exalted','effective_exalted','own_sign']:
        base += " The planet's strength promises positive dasha results."
    elif strength in ['debilitated','effective_debilitated']:
        base += " The planet's weakness suggests tests and challenges during this period."
    return base

def parivartana_quality(h_a, h_b):
    dusthana = {6,8,12}
    kendra   = {1,4,7,10}
    trikona  = {1,5,9}
    if h_a in dusthana or h_b in dusthana:
        if h_a in dusthana and h_b in dusthana:
            return "Both lords are in dusthana — a strong Vipareeta Raja Yoga. Initial hardships lead to dramatic success."
        return "One lord in dusthana — some VRY effect; challenging period gives way to recovery."
    if (h_a in kendra or h_a in trikona) and (h_b in kendra or h_b in trikona):
        return "Both lords are in kendra/trikona — a powerful Raja Yoga from this exchange."
    return "This exchange combines the significations of both houses and their lords."

# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def run_pvr_analysis(chart_data):
    """Run all PVR domain analyses and return structured JSON."""
    domains = {
        'personality':    ('Personality & Temperament',   analyze_personality),
        'career':         ('Career & Profession',          analyze_career),
        'wealth':         ('Wealth & Finances',            analyze_wealth),
        'relationships':  ('Marriage & Relationships',     analyze_marriage),
        'children':       ('Children & Progeny',           analyze_children),
        'siblings':       ('Siblings & Courage',           analyze_siblings),
        'health':         ('Health & Longevity',           analyze_health),
        'spirituality':   ('Spirituality & Liberation',    analyze_spirituality),
        'foreign_travel': ('Foreign Travel & Settlement',  analyze_foreign),
        'education':      ('Education & Intelligence',     analyze_education),
        'yogas':          ('Special Yogas',                analyze_yogas),
        'dasha':          ('Current Dasha Analysis',       analyze_dasha),
    }
    result = {}
    for key, (title, fn) in domains.items():
        try:
            findings = fn(chart_data)
        except Exception as e:
            findings = [finding(f"Analysis Error", str(e), 'warning', key)]
        result[key] = {
            'title': title,
            'findings': findings,
        }
    return result

if __name__ == '__main__':
    try:
        input_data = json.loads(sys.stdin.read())
        chart_data = input_data.get('chart_data', input_data)
        output = run_pvr_analysis(chart_data)
        print(json.dumps({'success': True, 'data': output}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
