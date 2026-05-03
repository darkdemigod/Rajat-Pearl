#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Jyotisha Platform — Chart Calculation Engine
Uses pyswisseph (Swiss Ephemeris) for accurate planetary positions.
Reads JSON from stdin, writes JSON to stdout.
"""
import json, sys, os, math

# ── Swiss Ephemeris import ──────────────────────────────────────────────────
try:
    import swisseph as swe
    SWE_AVAILABLE = True
except ImportError:
    SWE_AVAILABLE = False

# ── Constants ───────────────────────────────────────────────────────────────
PLANET_IDS  = [swe.SUN, swe.MOON, swe.MARS, swe.MERCURY,
               swe.JUPITER, swe.VENUS, swe.SATURN, swe.MEAN_NODE, -1]  # -1 = Ketu
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
# Nakshatra lord indices: 0=Sun,1=Moon,2=Mars,3=Mercury,4=Jupiter,5=Venus,6=Saturn,7=Rahu,8=Ketu
NAKSHATRA_LORDS = [8,5,0,1,2,7,4,6,3, 8,5,0,1,2,7,4,6,3, 8,5,0,1,2,7,4,6,3]

# Vimsottari: years per planet in the dasha order
VIMSOTTARI_YEARS = {0:6, 1:10, 2:7, 3:17, 4:16, 5:20, 6:19, 7:18, 8:7}
VIMSOTTARI_ORDER = [8,0,1,2,7,4,6,3,5]  # Ke,Su,Mo,Ma,Ra,Ju,Sa,Me,Ve

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

# ── Helpers ─────────────────────────────────────────────────────────────────
def timezone_to_offset(tz) -> float:
    """Accept numeric (5.5), string numeric ('5.5'), or IANA name ('Asia/Kolkata')."""
    try:
        return float(tz)
    except (TypeError, ValueError):
        pass
    tz = str(tz).strip()
    KNOWN = {
        'Asia/Kolkata': 5.5, 'Asia/Calcutta': 5.5,
        'America/New_York': -5.0, 'America/Los_Angeles': -8.0,
        'Europe/London': 0.0, 'Europe/Paris': 1.0, 'Europe/Berlin': 1.0,
        'Asia/Tokyo': 9.0, 'Asia/Shanghai': 8.0, 'Asia/Singapore': 8.0,
        'Australia/Sydney': 10.0, 'Pacific/Auckland': 12.0,
        'America/Chicago': -6.0, 'America/Denver': -7.0,
        'Asia/Dubai': 4.0, 'Asia/Karachi': 5.0, 'Asia/Dhaka': 6.0,
        'Asia/Kathmandu': 5.75, 'Asia/Colombo': 5.5,
    }
    return KNOWN.get(tz, 5.5)


def jd_to_date_str(jd: float) -> str:
    """Convert Julian Day to YYYY-MM-DD string."""
    if not SWE_AVAILABLE:
        return "N/A"
    y, m, d, _ = swe.revjul(jd)
    return f"{y:04d}-{m:02d}-{d:02d}"


def lon_to_rasi_deg(lon: float):
    lon = lon % 360
    rasi   = int(lon / 30)
    degree = lon % 30
    return rasi, degree


def lon_to_dms(lon: float) -> str:
    lon = lon % 360
    deg = int(lon % 30)
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


def get_strength(planet_idx: int, rasi: int) -> str:
    if EXALTATION.get(planet_idx) == rasi:
        return 'exalted'
    if DEBILITATION.get(planet_idx) == rasi:
        return 'debilitated'
    if rasi in OWN_SIGNS.get(planet_idx, []):
        return 'own'
    return 'normal'


def calc_divisional(lon: float, factor: int):
    """Compute Varga chart rasi for a planet longitude."""
    lon = lon % 360
    rasi_d1      = int(lon / 30)
    within_sign  = lon % 30
    seg          = 30.0 / factor
    division     = int(within_sign / seg)
    if factor == 9:                           # Navamsa
        start = [0, 4, 8][rasi_d1 % 3]
        div_rasi = (start + division) % 12
    elif factor == 2:                         # Hora
        div_rasi = 3 if within_sign < 15 else 9
        if rasi_d1 % 2 == 1:
            div_rasi = 9 if within_sign < 15 else 3
    elif factor == 3:                         # Drekkana
        div_rasi = (rasi_d1 + division * 4) % 12
    elif factor == 12:                        # Dwadasamsa
        div_rasi = (rasi_d1 + division) % 12
    else:
        div_rasi = (rasi_d1 * factor + division) % 12
    div_deg = (within_sign % seg) / seg * 30
    return div_rasi, div_deg


# ── Vimsottari Dasha ────────────────────────────────────────────────────────
def compute_vimsottari(moon_lon: float, birth_jd: float):
    """Return list of maha dashas with start/end dates and fractions."""
    nak_size       = 360 / 27
    nak_idx        = int(moon_lon / nak_size) % 27
    nak_lord_idx   = NAKSHATRA_LORDS[nak_idx]  # planet index (0-8)
    within_nak     = moon_lon % nak_size
    frac_elapsed   = within_nak / nak_size
    frac_remaining = 1.0 - frac_elapsed

    # First dasha: partial
    first_planet_idx  = nak_lord_idx
    first_order_pos   = VIMSOTTARI_ORDER.index(first_planet_idx)

    DAYS_PER_YEAR = 365.25
    dashas = []
    current_jd = birth_jd

    for k in range(9):
        order_pos   = (first_order_pos + k) % 9
        planet_idx  = VIMSOTTARI_ORDER[order_pos]
        full_years  = VIMSOTTARI_YEARS[planet_idx]
        full_days   = full_years * DAYS_PER_YEAR

        if k == 0:
            years_remaining = full_years * frac_remaining
            days = years_remaining * DAYS_PER_YEAR
        else:
            years_remaining = full_years
            days = full_days

        start_jd = current_jd
        end_jd   = current_jd + days

        dashas.append({
            'planet':    PLANET_NAMES[planet_idx],
            'years':     full_years,
            'startDate': jd_to_date_str(start_jd),
            'endDate':   jd_to_date_str(end_jd),
            'order':     k,
        })
        current_jd = end_jd

    return dashas, nak_idx


# ── Main calculation ─────────────────────────────────────────────────────────
def calculate_chart(data: dict) -> dict:
    date_str     = data.get('date', '1997-03-10')
    time_str     = data.get('time', '11:40')
    latitude     = float(data.get('latitude',  26.9124))
    longitude    = float(data.get('longitude', 75.7873))
    tz_raw       = data.get('timezone', 5.5)
    tz_offset    = timezone_to_offset(tz_raw)
    ayanamsa_key = data.get('ayanamsaMode', 'LAHIRI').upper()
    chart_type   = data.get('chartType', 'D1')

    # Parse date/time
    parts   = date_str.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    tparts  = time_str.replace(':', ':').split(':')
    hour    = int(tparts[0])
    minute  = int(tparts[1]) if len(tparts) > 1 else 0
    second  = int(tparts[2]) if len(tparts) > 2 else 0

    utc_hour = hour + minute/60 + second/3600 - tz_offset

    if not SWE_AVAILABLE:
        raise RuntimeError("pyswisseph not installed. Run: pip install pyswisseph")

    jd = swe.julday(year, month, day, utc_hour)

    # Set ayanamsa
    sid_mode = AYANAMSA_MODES.get(ayanamsa_key, swe.SIDM_LAHIRI)
    swe.set_sid_mode(sid_mode)
    ayanamsa_val = swe.get_ayanamsa_ut(jd)

    flags_sid   = swe.FLG_SIDEREAL | swe.FLG_SPEED
    flags_trop  = swe.FLG_SPEED

    factor = DIVISIONAL_FACTORS.get(chart_type, 1)

    # ── Planet positions ──────────────────────────────────────────────────
    planet_lons_d1 = []   # sidereal D1 longitudes
    planets_out    = []

    for i, pid in enumerate(PLANET_IDS):
        if pid == -1:
            # Ketu = Rahu + 180
            rahu_lon = planet_lons_d1[7]
            lon_d1 = (rahu_lon + 180) % 360
            speed  = -planet_lons_d1[7]   # just a marker
            retro  = True
        else:
            res    = swe.calc_ut(jd, pid, flags_sid)
            lon_d1 = res[0][0] % 360
            speed  = res[0][3]              # deg/day
            retro  = (speed < 0) and i not in [0, 1, 7, 8]

        planet_lons_d1.append(lon_d1)

        # Varga longitude
        if factor == 1:
            rasi, deg = lon_to_rasi_deg(lon_d1)
        else:
            rasi, deg = calc_divisional(lon_d1, factor)

        nak_idx, pada = lon_to_nakshatra(lon_d1)
        nak_lord_name = PLANET_NAMES[NAKSHATRA_LORDS[nak_idx]]

        strength = get_strength(i, rasi) if i < 7 else 'normal'

        planets_out.append({
            'planet':       i,
            'name':         PLANET_NAMES[i],
            'shortName':    PLANET_SHORT[i],
            'longitude':    round(lon_d1, 4),
            'rasi':         rasi,
            'rasiName':     RASI_NAMES[rasi],
            'degree':       round(deg, 4),
            'dms':          lon_to_dms(lon_d1),
            'nakshatra':    nak_idx,
            'nakshatraName':NAKSHATRA_NAMES[nak_idx],
            'nakshatraLord': nak_lord_name,
            'pada':         pada,
            'retrograde':   bool(retro),
            'strength':     strength,
            'speed':        round(speed, 6),
        })

    # ── Ascendant ─────────────────────────────────────────────────────────
    try:
        cusps, ascmc = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
        asc_lon = ascmc[0] % 360
        mc_lon  = ascmc[1] % 360
    except Exception:
        # Fallback: approximate RAMC method
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

    # House positions
    for p in planets_out:
        p['house'] = (p['rasi'] - asc_rasi) % 12 + 1

    houses_out = []
    for h in range(12):
        hrasi = (asc_rasi + h) % 12
        houses_out.append({
            'house':    h + 1,
            'rasi':     hrasi,
            'rasiName': RASI_NAMES[hrasi],
            'longitude': round((asc_lon + h * 30) % 360, 4),
            'degree':   round(asc_deg, 4),
        })

    # ── Panchanga ─────────────────────────────────────────────────────────
    sun_lon  = planet_lons_d1[0]
    moon_lon = planet_lons_d1[1]

    tithi_val  = (moon_lon - sun_lon) % 360
    tithi_idx  = int(tithi_val / 12)
    paksha     = 'Shukla' if tithi_idx < 15 else 'Krishna'
    karana_idx = int(tithi_val / 6) % 11
    yoga_idx   = int(((sun_lon + moon_lon) % 360) / (360/27)) % 27

    moon_nak, moon_pada = lon_to_nakshatra(moon_lon)
    sun_nak,  _         = lon_to_nakshatra(sun_lon)
    moon_rasi, _        = lon_to_rasi_deg(moon_lon)

    weekday = int(jd + 1.5) % 7

    # Sunrise/sunset approximation (civil twilight based on lat/lon)
    approx_sunrise = f"{max(5, min(7, 6 + int(-latitude * 0.02))):02d}:30:00"
    approx_sunset  = f"{min(20, max(17, 18 + int(latitude * 0.02))):02d}:30:00"

    panchanga = {
        'tithi': {
            'number': tithi_idx + 1,
            'name':   TITHI_NAMES[tithi_idx],
            'deity':  TITHI_DEITIES[tithi_idx],
            'paksha': paksha,
        },
        'nakshatra': {
            'number': moon_nak + 1,
            'name':   NAKSHATRA_NAMES[moon_nak],
            'lord':   PLANET_NAMES[NAKSHATRA_LORDS[moon_nak]],
            'pada':   moon_pada,
        },
        'yoga':   {'number': yoga_idx + 1, 'name': YOGA_NAMES[yoga_idx]},
        'karana': {'number': karana_idx + 1, 'name': KARANA_NAMES[karana_idx]},
        'vaara':      weekday,
        'vaaraName':  WEEKDAY_NAMES[weekday],
        'rasi':       moon_rasi,
        'rasiName':   RASI_NAMES[moon_rasi],
        'sunSign':    int(sun_lon / 30) % 12,
        'sunSignName':RASI_NAMES[int(sun_lon / 30) % 12],
        'sunrise':    approx_sunrise,
        'sunset':     approx_sunset,
        'moonrise':   '19:30:00',
        'moonset':    '07:00:00',
        'ayanamsa':   round(ayanamsa_val, 6),
        'ayanamsaMode': ayanamsa_key,
        'rahuKalam':  {'start': '10:30', 'end': '12:00'},
        'gulikaKalam':{'start': '07:30', 'end': '09:00'},
        'yamaGandam': {'start': '13:30', 'end': '15:00'},
    }

    # ── Vimsottari Dasha ─────────────────────────────────────────────────
    dashas, birth_nak = compute_vimsottari(moon_lon, jd)

    return {
        'ascendant': {
            'longitude':  round(asc_lon, 4),
            'rasi':       asc_rasi,
            'rasiName':   RASI_NAMES[asc_rasi],
            'degree':     round(asc_deg, 4),
            'dms':        lon_to_dms(asc_lon),
        },
        'mc': {
            'longitude': round(mc_lon, 4),
            'rasi':      mc_rasi,
            'rasiName':  RASI_NAMES[mc_rasi],
            'degree':    round(mc_deg, 4),
        },
        'planets':          planets_out,
        'houses':           houses_out,
        'panchanga':        panchanga,
        'vimsottariDasha':  dashas,
        'chartType':        chart_type,
        'ayanamsa':         round(ayanamsa_val, 6),
        'julianDay':        round(jd, 6),
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
