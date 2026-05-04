#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Jyotisha Platform — Chart Calculation Engine v2
Swiss Ephemeris • Correct Vargas • Multi-level Dasha • Shadbala • Yoga Detection
"""
import json, sys, os, math

try:
    import swisseph as swe
    SWE_AVAILABLE = True
except ImportError:
    SWE_AVAILABLE = False

# ── Constants ────────────────────────────────────────────────────────────────
PLANET_IDS   = [swe.SUN, swe.MOON, swe.MARS, swe.MERCURY,
                swe.JUPITER, swe.VENUS, swe.SATURN, swe.MEAN_NODE, -1]
PLANET_NAMES = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
PLANET_SHORT = ['Su','Mo','Ma','Me','Ju','Ve','Sa','Ra','Ke']

RASI_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
              'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

NAKSHATRA_NAMES = [
    'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
    'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
    'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
    'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha',
    'Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'
]
NAKSHATRA_LORDS = [8,5,0,1,2,7,4,6,3, 8,5,0,1,2,7,4,6,3, 8,5,0,1,2,7,4,6,3]

VIMSOTTARI_YEARS  = {0:6, 1:10, 2:7, 3:17, 4:16, 5:20, 6:19, 7:18, 8:7}
VIMSOTTARI_ORDER  = [8,0,1,2,7,4,6,3,5]   # Ke Su Mo Ma Ra Ju Sa Me Ve
VIMSOTTARI_TOTAL  = 120

# Ashtottari (108 year cycle)
# Nak sequence: Rahu,Venus,Sun,Moon,Mars,Mercury,Saturn,Jupiter repeating
ASHTOTTARI_NAK_LORDS = [7,5,0,1,2,3,6,4]*3 + [7,5,0]   # 27 entries
ASHTOTTARI_YEARS      = {0:6, 1:15, 2:8, 3:17, 4:19, 5:21, 6:10, 7:12}
ASHTOTTARI_ORDER      = [7,5,0,1,2,3,6,4]   # Ra Ve Su Mo Ma Me Sa Ju
ASHTOTTARI_TOTAL      = 108

TITHI_NAMES = [
    'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi',
    'Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi',
    'Trayodashi','Chaturdashi','Purnima',
    'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi',
    'Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi',
    'Trayodashi','Chaturdashi','Amavasya'
]
TITHI_DEITIES = [
    'Agni','Brahma','Gauri','Ganesh','Naga','Kartikeya','Surya','Shiva',
    'Durga','Yama','Vishvadeva','Vishnu','Kama','Shiva','Chandra',
    'Agni','Brahma','Gauri','Ganesh','Naga','Kartikeya','Surya','Shiva',
    'Durga','Yama','Vishvadeva','Vishnu','Kama','Shiva','Pitru'
]
YOGA_NAMES = [
    'Vishkumbha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda',
    'Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva',
    'Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan',
    'Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla',
    'Brahma','Indra','Vaidhriti'
]
KARANA_NAMES = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti',
                'Shakuni','Chatushpada','Naga','Kimstughna']
WEEKDAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

EXALTATION   = {0:0, 1:1, 2:9, 3:5, 4:3, 5:11, 6:6}
DEBILITATION = {0:6, 1:7, 2:3, 3:11, 4:9, 5:5, 6:0}
OWN_SIGNS    = {0:[4], 1:[3], 2:[0,7], 3:[2,5], 4:[8,11], 5:[1,6], 6:[9,10]}

# Sign lord: 0=Aries→Mars(2), 1=Taurus→Venus(5) ...
SIGN_LORDS = {0:2,1:5,2:3,3:1,4:0,5:3,6:5,7:2,8:4,9:6,10:6,11:4}

DIVISIONAL_FACTORS = {
    'D1':1,'D2':2,'D3':3,'D4':4,'D7':7,'D9':9,'D10':10,
    'D12':12,'D16':16,'D20':20,'D24':24,'D27':27,'D30':30,
    'D40':40,'D45':45,'D60':60
}

AYANAMSA_MODES = {
    'LAHIRI':       swe.SIDM_LAHIRI if SWE_AVAILABLE else 1,
    'KP':           swe.SIDM_KRISHNAMURTI if SWE_AVAILABLE else 5,
    'RAMAN':        swe.SIDM_RAMAN if SWE_AVAILABLE else 3,
    'TRUE_CITRA':   swe.SIDM_TRUE_CITRA if SWE_AVAILABLE else 27,
    'TRUE_PUSHYA':  swe.SIDM_TRUE_PUSHYA if SWE_AVAILABLE else 29,
    'SURYASIDDHANTA': swe.SIDM_SS_REVATI if SWE_AVAILABLE else 16,
}

DAYS_PER_YEAR = 365.25


# ── Helpers ──────────────────────────────────────────────────────────────────
def timezone_to_offset(tz) -> float:
    try:
        return float(tz)
    except (TypeError, ValueError):
        pass
    KNOWN = {
        'Asia/Kolkata':5.5,'Asia/Calcutta':5.5,'America/New_York':-5.0,
        'America/Los_Angeles':-8.0,'Europe/London':0.0,'Europe/Paris':1.0,
        'Asia/Tokyo':9.0,'Asia/Shanghai':8.0,'Australia/Sydney':10.0,
        'America/Chicago':-6.0,'America/Denver':-7.0,'Asia/Dubai':4.0,
        'Asia/Karachi':5.0,'Asia/Dhaka':6.0,'Asia/Kathmandu':5.75,
    }
    return KNOWN.get(str(tz).strip(), 5.5)


def jd_to_date_str(jd: float) -> str:
    if not SWE_AVAILABLE: return "N/A"
    y, m, d, _ = swe.revjul(jd)
    return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"


def lon_to_rasi_deg(lon: float):
    lon = lon % 360
    return int(lon / 30), lon % 30


def lon_to_dms(lon: float) -> str:
    lon = lon % 360
    deg  = int(lon % 30)
    mins = int((lon % 30 - deg) * 60)
    secs = int(((lon % 30 - deg) * 60 - mins) * 60)
    return f"{deg:02d}°{mins:02d}'{secs:02d}\""


def lon_to_nakshatra(lon: float):
    lon = lon % 360
    nak_size = 360 / 27
    nak_idx  = int(lon / nak_size) % 27
    within   = lon % nak_size
    pada     = min(int(within / (nak_size / 4)) + 1, 4)
    return nak_idx, pada


def get_dignity(planet_idx: int, rasi: int) -> str:
    if EXALTATION.get(planet_idx) == rasi:   return 'exalted'
    if DEBILITATION.get(planet_idx) == rasi: return 'debilitated'
    if rasi in OWN_SIGNS.get(planet_idx, []): return 'own'
    return 'normal'


# ── Varga (Divisional Chart) Calculation ─────────────────────────────────────
def calc_divisional(lon: float, factor: int):
    """
    Compute the rasi (sign index 0-11) for a planet in a divisional chart.
    All formulas follow BPHS / JHora conventions.
    """
    lon   = lon % 360
    sign  = int(lon / 30)
    within = lon % 30

    vedic_odd = (sign % 2 == 0)   # 0-indexed even ↔ Vedic odd (Aries=1st)
    quality   = sign % 3           # 0=movable, 1=fixed, 2=dual (Aries→0, Taurus→1, ...)

    if factor == 1:
        return sign, within

    elif factor == 2:              # Hora — Leo/Cancer split
        if vedic_odd:              # Aries Gemini Leo Libra Sag Aq
            result = 4 if within < 15 else 3   # Leo first, Cancer second
        else:                      # Taurus Cancer Virgo Scorpio Cap Pisces
            result = 3 if within < 15 else 4   # Cancer first, Leo second
        return result, (within % 15)

    elif factor == 3:              # Drekkana — own / 5th / 9th
        div = int(within / 10)
        return (sign + div * 4) % 12, (within % 10)

    elif factor == 4:              # Chaturthamsa — own / 4th / 7th / 10th
        div = int(within / 7.5)
        return (sign + div * 3) % 12, (within % 7.5)

    elif factor == 7:              # Saptamsa
        seg = 30.0 / 7
        div = int(within / seg)
        if vedic_odd:
            result = (sign + div) % 12
        else:
            result = (sign + 6 + div) % 12
        return result, (within % seg)

    elif factor == 9:              # Navamsa — key varga
        # Universal formula: start = (sign × 9) mod 12
        # Fire(Ar,Le,Sg)→Aries(0)  Earth(Ta,Vi,Cp)→Capricorn(9)
        # Air(Ge,Li,Aq)→Libra(6)   Water(Ca,Sc,Pi)→Cancer(3)
        div   = int(within / (30.0 / 9))
        start = (sign * 9) % 12
        return (start + div) % 12, (within % (30.0 / 9))

    elif factor == 10:             # Dasamsa
        div = int(within / 3.0)
        if vedic_odd:              # odd → from own sign
            result = (sign + div) % 12
        else:                      # even → from 9th sign
            result = (sign + 9 + div) % 12
        return result, (within % 3.0)

    elif factor == 12:             # Dwadasamsa — own+successive
        div = int(within / 2.5)
        return (sign + div) % 12, (within % 2.5)

    elif factor == 16:             # Shodasamsa
        seg = 30.0 / 16
        div = int(within / seg)
        start = quality * 4        # movable→Aries(0) fixed→Leo(4) dual→Sag(8)
        return (start + div) % 12, (within % seg)

    elif factor == 20:             # Vimsamsa
        seg = 30.0 / 20
        div = int(within / seg)
        start = [0, 8, 4][quality] # movable→Aries fixed→Sag dual→Leo
        return (start + div) % 12, (within % seg)

    elif factor == 24:             # Chaturvimsamsa / Siddhamsa
        seg = 30.0 / 24
        div = int(within / seg)
        start = 4 if vedic_odd else 3   # odd→Leo(4)  even→Cancer(3)
        return (start + div) % 12, (within % seg)

    elif factor == 27:             # Saptavimsamsa / Nakshatramsa
        seg = 30.0 / 27
        div = int(within / seg)
        # element-based: Fire→Aries(0) Earth→Cancer(3) Air→Libra(6) Water→Capricorn(9)
        elem_start = [0, 3, 6, 9][sign % 4]
        return (elem_start + div) % 12, (within % seg)

    elif factor == 30:             # Trimsamsa — unequal divisions
        if vedic_odd:
            # 0-5° Mars→Aries(0), 5-10° Saturn→Aq(10), 10-18° Jup→Sag(8),
            # 18-25° Merc→Ge(2), 25-30° Venus→Li(6)
            bnd = [(5,0),(10,10),(18,8),(25,2),(30,6)]
        else:
            # 0-5° Venus→Ta(1), 5-12° Merc→Vi(5), 12-20° Jup→Pi(11),
            # 20-25° Sat→Cp(9), 25-30° Mars→Sc(7)
            bnd = [(5,1),(12,5),(20,11),(25,9),(30,7)]
        result = bnd[-1][1]
        for end_d, s in bnd:
            if within < end_d:
                result = s
                break
        return result, (within % 5)

    elif factor == 40:             # Khavedamsa
        seg = 30.0 / 40
        div = int(within / seg)
        start = 0 if vedic_odd else 6
        return (start + div) % 12, (within % seg)

    elif factor == 45:             # Akshavedamsa
        seg = 30.0 / 45
        div = int(within / seg)
        start = quality * 4        # same as D16
        return (start + div) % 12, (within % seg)

    elif factor == 60:             # Shashtiamsa
        div = int(within / 0.5)
        start = 0 if vedic_odd else 6
        return (start + div) % 12, (within % 0.5)

    else:
        seg = 30.0 / factor
        div = int(within / seg)
        return ((sign * factor) % 12 + div) % 12, (within % seg)


# ── Multi-level Vimsottari Dasha ─────────────────────────────────────────────
def compute_pratyantar(antar_idx: int, antar_start_jd: float, antar_days: float) -> list:
    """Level-3: Pratyantar dashas within an antardasha."""
    ap = VIMSOTTARI_ORDER.index(antar_idx)
    pratyantars = []
    cur = antar_start_jd
    for k in range(9):
        sp = (ap + k) % 9
        si = VIMSOTTARI_ORDER[sp]
        sy = VIMSOTTARI_YEARS[si]
        prat_days = (sy / VIMSOTTARI_TOTAL) * antar_days
        pratyantars.append({
            'planet':    PLANET_NAMES[si],
            'startDate': jd_to_date_str(cur),
            'endDate':   jd_to_date_str(cur + prat_days),
        })
        cur += prat_days
    return pratyantars


def compute_antardashas(maha_idx: int, maha_start_jd: float, maha_days: float,
                        include_pratyantar: bool = True) -> list:
    """Level-2: Antardasha within a mahadasha."""
    mp = VIMSOTTARI_ORDER.index(maha_idx)
    antardashas = []
    cur = maha_start_jd
    for k in range(9):
        sp = (mp + k) % 9
        si = VIMSOTTARI_ORDER[sp]
        sy = VIMSOTTARI_YEARS[si]
        # antar_days proportional to maha_days
        antar_days = (sy / VIMSOTTARI_TOTAL) * maha_days
        ad = {
            'planet':    PLANET_NAMES[si],
            'startDate': jd_to_date_str(cur),
            'endDate':   jd_to_date_str(cur + antar_days),
        }
        if include_pratyantar:
            ad['pratyantardashas'] = compute_pratyantar(si, cur, antar_days)
        antardashas.append(ad)
        cur += antar_days
    return antardashas


def compute_vimsottari(moon_lon: float, birth_jd: float) -> tuple:
    """Full 3-level Vimsottari dasha computation."""
    nak_size     = 360.0 / 27
    nak_idx      = int(moon_lon / nak_size) % 27
    nak_lord_idx = NAKSHATRA_LORDS[nak_idx]
    within_nak   = moon_lon % nak_size
    frac_elapsed  = within_nak / nak_size
    frac_remaining = 1.0 - frac_elapsed

    first_op = VIMSOTTARI_ORDER.index(nak_lord_idx)
    dashas = []
    cur = birth_jd

    for k in range(9):
        op  = (first_op + k) % 9
        pi  = VIMSOTTARI_ORDER[op]
        fy  = VIMSOTTARI_YEARS[pi]
        if k == 0:
            days = fy * frac_remaining * DAYS_PER_YEAR
        else:
            days = fy * DAYS_PER_YEAR

        dasha = {
            'planet':       PLANET_NAMES[pi],
            'years':        fy,
            'startDate':    jd_to_date_str(cur),
            'endDate':      jd_to_date_str(cur + days),
            'order':        k,
            'antardashas':  compute_antardashas(pi, cur, days, include_pratyantar=True),
        }
        dashas.append(dasha)
        cur += days

    return dashas, nak_idx


def compute_ashtottari(moon_lon: float, birth_jd: float) -> list:
    """Ashtottari dasha (108-year cycle)."""
    nak_size     = 360.0 / 27
    nak_idx      = int(moon_lon / nak_size) % 27
    nak_lord_idx = ASHTOTTARI_NAK_LORDS[nak_idx]
    within_nak   = moon_lon % nak_size
    frac_remaining = 1.0 - (within_nak / nak_size)

    first_op = ASHTOTTARI_ORDER.index(nak_lord_idx)
    dashas = []
    cur = birth_jd

    for k in range(8):
        op  = (first_op + k) % 8
        pi  = ASHTOTTARI_ORDER[op]
        fy  = ASHTOTTARI_YEARS[pi]
        if k == 0:
            days = fy * frac_remaining * DAYS_PER_YEAR
        else:
            days = fy * DAYS_PER_YEAR

        # Ashtottari antardashas
        ap = ASHTOTTARI_ORDER.index(pi)
        antardashas = []
        acur = cur
        for j in range(8):
            aop = (ap + j) % 8
            api = ASHTOTTARI_ORDER[aop]
            afy = ASHTOTTARI_YEARS[api]
            a_days = (afy / ASHTOTTARI_TOTAL) * days
            antardashas.append({
                'planet': PLANET_NAMES[api],
                'startDate': jd_to_date_str(acur),
                'endDate': jd_to_date_str(acur + a_days),
            })
            acur += a_days

        dashas.append({
            'planet':      PLANET_NAMES[pi],
            'years':       fy,
            'startDate':   jd_to_date_str(cur),
            'endDate':     jd_to_date_str(cur + days),
            'order':       k,
            'antardashas': antardashas,
        })
        cur += days

    return dashas


# ── Shadbala (Planetary Strength) ────────────────────────────────────────────
MEAN_SPEEDS = {0:0.9856, 1:13.1764, 2:0.5240, 3:1.3833, 4:0.0831, 5:1.2000, 6:0.0334}
NAISARGIKA  = {0:60.0, 1:51.43, 2:17.14, 3:25.71, 4:34.29, 5:42.86, 6:8.57}
DIG_BEST    = {0:10, 1:4, 2:10, 3:1, 4:1, 5:4, 6:7}  # best house for each planet

def compute_shadbala(planets: list, asc_rasi: int) -> list:
    results = []
    for p in planets:
        idx = p['planet']
        if idx >= 7: continue   # skip Rahu/Ketu

        rasi  = p['rasi']
        house = p['house']
        lon   = p['longitude']

        # 1. Uchcha Bala — distance from exaltation point (0-60)
        ex_rasi = EXALTATION.get(idx, -1)
        if ex_rasi >= 0:
            ex_lon = ex_rasi * 30 + 15
            d = abs(lon - ex_lon) % 360
            if d > 180: d = 360 - d
            uchcha = round(60 - (d / 180 * 60), 2)
        else:
            uchcha = 30.0

        # 2. Sthana Bala — sign dignity
        dig_map = {'exalted':60.0, 'own':45.0, 'normal':30.0, 'debilitated':15.0}
        sthana = dig_map.get(p.get('strength','normal'), 30.0)

        # 3. Dig Bala — directional strength
        best_h = DIG_BEST.get(idx, 1)
        hdiff  = abs(house - best_h)
        if hdiff > 6: hdiff = 12 - hdiff
        dig = round(60 - (hdiff / 6.0 * 60), 2)

        # 4. Naisargika Bala — natural fixed strength
        nais = NAISARGIKA.get(idx, 30.0)

        # 5. Chesta Bala — motional strength
        spd = abs(p.get('speed', 0))
        mean_spd = MEAN_SPEEDS.get(idx, 1.0)
        if p.get('retrograde') and idx in [2,3,4,5,6]:
            chesta = 60.0
        else:
            chesta = round(min(60.0, (spd / mean_spd) * 30), 2) if mean_spd > 0 else 30.0

        # 6. Drig Bala — aspectual (simplified: neutral)
        drig = 30.0

        total  = uchcha + sthana + dig + nais + chesta + drig
        ishta  = round((uchcha * chesta) ** 0.5, 2)   # Ishta Phala
        kashta = round(((60 - uchcha) * (60 - chesta)) ** 0.5, 2)  # Kashta Phala

        results.append({
            'planet':        p['name'],
            'ucchaBala':     uchcha,
            'sthanaBala':    sthana,
            'digBala':       dig,
            'naisargikaBala': nais,
            'cheshtaBala':   chesta,
            'drigBala':      drig,
            'total':         round(total, 2),
            'ishtaPhala':    ishta,
            'kashtaPhala':   kashta,
            'grade': 'Excellent' if total >= 250 else 'Good' if total >= 200 else 'Average' if total >= 150 else 'Weak',
        })

    return sorted(results, key=lambda x: -x['total'])


# ── Yoga Detection ───────────────────────────────────────────────────────────
def detect_yogas(planets: list, asc_rasi: int) -> list:
    yogas = []
    pm   = {p['name']: p for p in planets}
    h2pl = {}
    for p in planets:
        h2pl.setdefault(p['house'], []).append(p['name'])

    kendra = {1, 4, 7, 10}
    trikona = {1, 5, 9}
    dusthana = {6, 8, 12}

    # ── Pancha Mahapurusha ──────────────────────────────────────────────
    maha_map = {
        'Mars':    ('Ruchaka Yoga',  'Mars in own/exaltation in kendra — fierce, courageous; military/technical excellence.'),
        'Mercury': ('Bhadra Yoga',   'Mercury in own/exaltation in kendra — sharp intellect, eloquence, commercial acumen.'),
        'Jupiter': ('Hamsa Yoga',    'Jupiter in own/exaltation in kendra — noble, wise, learned; spiritual authority.'),
        'Venus':   ('Malavya Yoga',  'Venus in own/exaltation in kendra — artistic brilliance, luxury, magnetic personality.'),
        'Saturn':  ('Sasa Yoga',     'Saturn in own/exaltation in kendra — discipline, leadership in mass service; authority.'),
    }
    for pn, (yname, ydesc) in maha_map.items():
        p = pm.get(pn)
        if p and p['house'] in kendra and p['strength'] in ('exalted','own'):
            yogas.append({'name':yname,'type':'mahapurusha','description':ydesc,
                          'planets':[pn],'houses':[p['house']],'confidence':0.95})

    # ── Gaja Kesari ─────────────────────────────────────────────────────
    moon = pm.get('Moon'); jup = pm.get('Jupiter')
    if moon and jup:
        diff = abs(moon['house'] - jup['house'])
        if diff in (0,3,6,9):
            yogas.append({'name':'Gaja Kesari Yoga','type':'special',
                'description':'Jupiter in kendra from Moon — fame, wealth, intelligence; commanding presence.',
                'planets':['Moon','Jupiter'],'houses':[moon['house'],jup['house']],'confidence':0.9})

    # ── Budha-Aditya ─────────────────────────────────────────────────────
    sun = pm.get('Sun'); mer = pm.get('Mercury')
    if sun and mer:
        d = abs(sun['longitude'] - mer['longitude']) % 360
        if d > 180: d = 360 - d
        if d < 12:
            yogas.append({'name':'Budha-Aditya Yoga','type':'solar',
                'description':'Sun–Mercury conjunction — bright intellect, communication gifts, royal connections.',
                'planets':['Sun','Mercury'],'houses':[sun['house']],'confidence':0.85})

    # ── Parivartana (Exchange) ───────────────────────────────────────────
    checked = set()
    for p1 in planets:
        if p1['planet'] >= 7: continue
        pi1 = p1['planet']
        lord_of_p1_sign = SIGN_LORDS.get(p1['rasi'], -1)
        if lord_of_p1_sign < 0 or lord_of_p1_sign == pi1: continue
        for p2 in planets:
            if p2['planet'] >= 7: continue
            pi2 = p2['planet']
            if pi2 == pi1: continue
            if pi2 != lord_of_p1_sign: continue
            pair = tuple(sorted([pi1, pi2]))
            if pair in checked: continue
            lord_of_p2_sign = SIGN_LORDS.get(p2['rasi'], -1)
            if lord_of_p2_sign == pi1:
                checked.add(pair)
                yogas.append({'name':f'Parivartana Yoga ({p1["name"]}–{p2["name"]})',
                    'type':'exchange',
                    'description':f'{p1["name"]} and {p2["name"]} exchange signs — powerful mutual reception benefiting both house significations.',
                    'planets':[p1['name'],p2['name']],'houses':[p1['house'],p2['house']],'confidence':0.9})

    # ── Neecha Bhanga Raja Yoga ─────────────────────────────────────────
    for p in planets:
        if p['planet'] >= 7 or p['strength'] != 'debilitated': continue
        debil_rasi = p['rasi']
        ex_rasi   = EXALTATION.get(p['planet'], -1)
        debil_lord = SIGN_LORDS.get(debil_rasi, -1)
        ex_lord   = SIGN_LORDS.get(ex_rasi, -1) if ex_rasi >= 0 else -1
        nbr = False
        for ref in [debil_lord, ex_lord]:
            if ref < 0: continue
            rp = next((x for x in planets if x['planet'] == ref), None)
            if rp and rp['house'] in kendra:
                nbr = True; break
        if nbr:
            yogas.append({'name':f'Neecha Bhanga Raja Yoga ({p["name"]})',
                'type':'raja',
                'description':f'{p["name"]} debilitation cancelled — indicates rise after hardship; turns adversity to authority.',
                'planets':[p['name']],'houses':[p['house']],'confidence':0.82})

    # ── Raja Yoga (kendra lord + trikona lord connected) ─────────────────
    def house_rasi(h): return (asc_rasi + h - 1) % 12
    kendra_lords  = {SIGN_LORDS[house_rasi(h)] for h in [1,4,7,10]}
    trikona_lords = {SIGN_LORDS[house_rasi(h)] for h in [1,5,9]}
    checked_rj = set()
    for kl in kendra_lords:
        for tl in trikona_lords:
            if kl == tl: continue  # single planet owning both
            pair = tuple(sorted([kl,tl]))
            if pair in checked_rj: continue
            kp = next((x for x in planets if x['planet']==kl), None)
            tp = next((x for x in planets if x['planet']==tl), None)
            if kp and tp and kp['house'] == tp['house']:
                checked_rj.add(pair)
                yogas.append({'name':f'Raja Yoga ({PLANET_NAMES[kl]}–{PLANET_NAMES[tl]})',
                    'type':'raja',
                    'description':f'Kendra lord {PLANET_NAMES[kl]} conjunct trikona lord {PLANET_NAMES[tl]} — high status, power, recognition.',
                    'planets':[PLANET_NAMES[kl],PLANET_NAMES[tl]],'houses':[kp['house']],'confidence':0.87})

    # ── Dhana Yoga (2L + 11L connected) ────────────────────────────────
    l2 = SIGN_LORDS.get(house_rasi(2), -1)
    l11 = SIGN_LORDS.get(house_rasi(11), -1)
    if l2 >= 0 and l11 >= 0 and l2 != l11:
        p2 = next((x for x in planets if x['planet']==l2), None)
        p11 = next((x for x in planets if x['planet']==l11), None)
        if p2 and p11 and p2['house'] == p11['house']:
            yogas.append({'name':'Dhana Yoga','type':'wealth',
                'description':f'Lords of 2nd ({PLANET_NAMES[l2]}) and 11th ({PLANET_NAMES[l11]}) conjunct — strong wealth accumulation.',
                'planets':[PLANET_NAMES[l2],PLANET_NAMES[l11]],'houses':[p2['house']],'confidence':0.85})

    # ── Vipreet Raja Yoga ───────────────────────────────────────────────
    dust_lords_in_dust = []
    for dh in [6,8,12]:
        dl = SIGN_LORDS.get(house_rasi(dh), -1)
        dp = next((x for x in planets if x['planet']==dl), None)
        if dp and dp['house'] in dusthana:
            dust_lords_in_dust.append(dp['name'])
    if len(dust_lords_in_dust) >= 2:
        yogas.append({'name':'Vipreet Raja Yoga','type':'raja',
            'description':'Lords of dusthana houses placed in other dusthanas — unexpected elevation; turns misfortune to power.',
            'planets':dust_lords_in_dust,'houses':[],'confidence':0.78})

    # ── Chandra-Mangal ──────────────────────────────────────────────────
    mars = pm.get('Mars')
    if moon and mars and moon['house'] == mars['house']:
        yogas.append({'name':'Chandra-Mangal Yoga','type':'wealth',
            'description':'Moon–Mars conjunction — entrepreneurial drive, real estate success, strong earning potential.',
            'planets':['Moon','Mars'],'houses':[moon['house']],'confidence':0.8})

    # ── Kemadruma ───────────────────────────────────────────────────────
    if moon:
        mh = moon['house']
        adj = {(mh % 12) + 1, (mh - 2) % 12 + 1}
        surr = [p for p in planets
                if p['name'] not in ('Moon','Rahu','Ketu','Sun') and p['house'] in adj]
        if not surr:
            yogas.append({'name':'Kemadruma Yoga','type':'challenging',
                'description':'No planets in 2nd/12th from Moon — isolation, instability; mitigated if Moon is strong.',
                'planets':['Moon'],'houses':[mh],'confidence':0.65})

    # ── Gajakesari cancellation check (already done above) ─────────────

    return yogas


# ── Ashtakavarga Basic ────────────────────────────────────────────────────────
def compute_ashtakavarga(planets: list, asc_rasi: int) -> dict:
    """Basic Sarvashtakavarga bindu count per sign."""
    # Contribution tables (from Brihat Parashara): each planet gives 1 bindhu
    # for certain signs relative to its own position. Simplified version.
    CONTRIB = {
        0: [1,2,4,7,8,9,10,11],   # Sun: contributes from 1st,2nd,4th,7th,8th,9th,10th,11th
        1: [3,6,10,11],            # Moon
        2: [1,2,4,7,8,9,10,11],   # Mars
        3: [1,2,4,7,8,9,10,11],   # Mercury
        4: [1,2,3,4,7,8,10,11],   # Jupiter
        5: [1,2,3,4,5,8,9,11],    # Venus
        6: [3,5,6,11],             # Saturn
    }
    sarva = [0] * 12
    for p in planets:
        if p['planet'] >= 7: continue
        pi = p['planet']
        pr = p['rasi']
        offsets = CONTRIB.get(pi, [])
        for off in offsets:
            target = (pr + off - 1) % 12
            sarva[target] += 1
    # Ascendant contribution (same as Sun)
    for off in CONTRIB[0]:
        target = (asc_rasi + off - 1) % 12
        sarva[target] += 1

    return {
        'sarvashtakavarga': [
            {'sign': RASI_NAMES[i], 'rasi': i, 'bindhu': sarva[i]} for i in range(12)
        ],
        'total': sum(sarva),
    }


# ── Main Calculation ──────────────────────────────────────────────────────────
def calculate_chart(data: dict) -> dict:
    date_str     = data.get('date', '1997-10-03')
    time_str     = data.get('time', '11:40')
    latitude     = float(data.get('latitude',  26.9124))
    longitude    = float(data.get('longitude', 75.7873))
    tz_offset    = timezone_to_offset(data.get('timezone', 5.5))
    ayanamsa_key = data.get('ayanamsaMode', 'LAHIRI').upper()
    chart_type   = data.get('chartType', 'D1')

    parts  = date_str.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    tp = time_str.split(':')
    hour = int(tp[0]); minute = int(tp[1]) if len(tp) > 1 else 0
    second = int(tp[2]) if len(tp) > 2 else 0
    utc_hour = hour + minute/60 + second/3600 - tz_offset

    if not SWE_AVAILABLE:
        raise RuntimeError("pyswisseph not installed")

    jd      = swe.julday(year, month, day, utc_hour)
    sid_mode = AYANAMSA_MODES.get(ayanamsa_key, swe.SIDM_LAHIRI)
    swe.set_sid_mode(sid_mode)
    ayanamsa_val = swe.get_ayanamsa_ut(jd)

    flags_sid = swe.FLG_SIDEREAL | swe.FLG_SPEED
    factor    = DIVISIONAL_FACTORS.get(chart_type, 1)

    # ── Planets ───────────────────────────────────────────────────────────
    planet_lons_d1 = []
    planets_out    = []

    for i, pid in enumerate(PLANET_IDS):
        if pid == -1:
            lon_d1 = (planet_lons_d1[7] + 180) % 360
            speed  = 0.0
            retro  = True
        else:
            res    = swe.calc_ut(jd, pid, flags_sid)
            lon_d1 = res[0][0] % 360
            speed  = res[0][3]
            retro  = (speed < 0) and i not in (0, 1, 7, 8)
        planet_lons_d1.append(lon_d1)

        if factor == 1:
            rasi, deg = lon_to_rasi_deg(lon_d1)
        else:
            rasi, deg = calc_divisional(lon_d1, factor)

        nak_idx, pada = lon_to_nakshatra(lon_d1)
        strength = get_dignity(i, rasi) if i < 7 else 'normal'

        planets_out.append({
            'planet':        i,
            'name':          PLANET_NAMES[i],
            'shortName':     PLANET_SHORT[i],
            'longitude':     round(lon_d1, 4),
            'rasi':          rasi,
            'rasiName':      RASI_NAMES[rasi],
            'degree':        round(deg, 4),
            'dms':           lon_to_dms(lon_d1),
            'nakshatra':     nak_idx,
            'nakshatraName': NAKSHATRA_NAMES[nak_idx],
            'nakshatraLord': PLANET_NAMES[NAKSHATRA_LORDS[nak_idx]],
            'pada':          pada,
            'retrograde':    bool(retro),
            'strength':      strength,
            'speed':         round(speed, 6),
        })

    # ── Ascendant ─────────────────────────────────────────────────────────
    try:
        cusps, ascmc = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
        asc_lon = ascmc[0] % 360
        mc_lon  = ascmc[1] % 360
    except Exception:
        gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360
        lmst = (gmst + longitude) % 360
        obl  = 23.439 - 0.0000004 * (jd - 2451545.0)
        asc_trop = math.degrees(math.atan2(
            math.cos(math.radians(lmst)),
            -(math.sin(math.radians(lmst)) * math.cos(math.radians(obl))
              + math.tan(math.radians(latitude)) * math.sin(math.radians(obl)))
        )) % 360
        asc_lon = (asc_trop - ayanamsa_val) % 360
        mc_lon  = (lmst - ayanamsa_val) % 360

    if factor == 1:
        asc_rasi, asc_deg = lon_to_rasi_deg(asc_lon)
    else:
        asc_rasi, asc_deg = calc_divisional(asc_lon, factor)

    mc_rasi, mc_deg = lon_to_rasi_deg(mc_lon)

    for p in planets_out:
        p['house'] = (p['rasi'] - asc_rasi) % 12 + 1

    houses_out = []
    for h in range(12):
        hrasi = (asc_rasi + h) % 12
        houses_out.append({
            'house': h + 1, 'rasi': hrasi, 'rasiName': RASI_NAMES[hrasi],
            'longitude': round((asc_lon + h * 30) % 360, 4),
            'degree': round(asc_deg, 4),
        })

    # ── Panchanga ─────────────────────────────────────────────────────────
    sun_lon  = planet_lons_d1[0]
    moon_lon = planet_lons_d1[1]
    tithi_val  = (moon_lon - sun_lon) % 360
    tithi_idx  = int(tithi_val / 12)
    paksha     = 'Shukla' if tithi_idx < 15 else 'Krishna'
    karana_idx = int(tithi_val / 6) % 11
    yoga_idx   = int(((sun_lon + moon_lon) % 360) / (360.0/27)) % 27
    moon_nak, moon_pada = lon_to_nakshatra(moon_lon)
    moon_rasi, _ = lon_to_rasi_deg(moon_lon)
    weekday = int(jd + 1.5) % 7

    panchanga = {
        'tithi':    {'number':tithi_idx+1,'name':TITHI_NAMES[tithi_idx],
                     'deity':TITHI_DEITIES[tithi_idx],'paksha':paksha},
        'nakshatra':{'number':moon_nak+1,'name':NAKSHATRA_NAMES[moon_nak],
                     'lord':PLANET_NAMES[NAKSHATRA_LORDS[moon_nak]],'pada':moon_pada},
        'yoga':     {'number':yoga_idx+1,'name':YOGA_NAMES[yoga_idx]},
        'karana':   {'number':karana_idx+1,'name':KARANA_NAMES[karana_idx]},
        'vaara':    weekday,'vaaraName':WEEKDAY_NAMES[weekday],
        'rasi':     moon_rasi,'rasiName':RASI_NAMES[moon_rasi],
        'sunSign':  int(sun_lon/30)%12,'sunSignName':RASI_NAMES[int(sun_lon/30)%12],
        'sunrise':'06:30:00','sunset':'18:30:00',
        'moonrise':'19:30:00','moonset':'07:00:00',
        'ayanamsa': round(ayanamsa_val,6),'ayanamsaMode':ayanamsa_key,
        'rahuKalam':{'start':'10:30','end':'12:00'},
        'gulikaKalam':{'start':'07:30','end':'09:00'},
        'yamaGandam':{'start':'13:30','end':'15:00'},
    }

    # ── Compute extras (D1 only for performance) ──────────────────────────
    extras = {}
    if factor == 1:
        vimsottari, birth_nak = compute_vimsottari(moon_lon, jd)
        extras['vimsottariDasha']  = vimsottari
        extras['ashtottariDasha']  = compute_ashtottari(moon_lon, jd)
        extras['shadbala']         = compute_shadbala(planets_out, asc_rasi)
        extras['yogas']            = detect_yogas(planets_out, asc_rasi)
        extras['ashtakavarga']     = compute_ashtakavarga(planets_out, asc_rasi)
        extras['birthNakshatra']   = NAKSHATRA_NAMES[birth_nak]
        extras['birthNakshatraLord'] = PLANET_NAMES[NAKSHATRA_LORDS[birth_nak]]
    else:
        vimsottari, birth_nak = compute_vimsottari(moon_lon, jd)
        extras['vimsottariDasha'] = vimsottari

    return {
        'ascendant': {'longitude':round(asc_lon,4),'rasi':asc_rasi,
                      'rasiName':RASI_NAMES[asc_rasi],'degree':round(asc_deg,4),
                      'dms':lon_to_dms(asc_lon)},
        'mc':        {'longitude':round(mc_lon,4),'rasi':mc_rasi,
                      'rasiName':RASI_NAMES[mc_rasi],'degree':round(mc_deg,4)},
        'planets':   planets_out,
        'houses':    houses_out,
        'panchanga': panchanga,
        'chartType': chart_type,
        'ayanamsa':  round(ayanamsa_val,6),
        'julianDay': round(jd,6),
        **extras,
    }


def main():
    try:
        data   = json.load(sys.stdin)
        result = calculate_chart(data)
        print(json.dumps({'success': True, 'data': result}))
    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e),
                          'traceback': traceback.format_exc()}))


if __name__ == '__main__':
    main()
