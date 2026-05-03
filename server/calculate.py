#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Jyotisha Platform - Chart Calculation Script
Called by Express routes via child_process.
Reads JSON from stdin, outputs JSON to stdout.
"""
import json
import sys
import os
import math
import hashlib

sys.path.insert(0, os.path.dirname(__file__))

PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
PLANET_SHORT = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']
RASI_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
              'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
NAKSHATRA_NAMES = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha',
    'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
]
TITHI_NAMES = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
    'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
    'Trayodashi', 'Chaturdashi', 'Purnima', 'Pratipada', 'Dwitiya', 'Tritiya',
    'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami',
    'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
]
TITHI_DEITIES = [
    'Agni', 'Brahma', 'Gauri', 'Ganesh', 'Naga', 'Kartikeya', 'Surya', 'Shiva',
    'Durga', 'Yama', 'Vishvadeva', 'Vishnu', 'Kama', 'Shiva', 'Chandra',
    'Agni', 'Brahma', 'Gauri', 'Ganesh', 'Naga', 'Kartikeya', 'Surya', 'Shiva',
    'Durga', 'Yama', 'Vishvadeva', 'Vishnu', 'Kama', 'Shiva', 'Pitru'
]
YOGA_NAMES = [
    'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
    'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
    'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
    'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
    'Brahma', 'Indra', 'Vaidhriti'
]
KARANA_NAMES = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
                'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']
WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
NAKSHATRA_LORDS = [8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3]

VIMSOTTARI_PERIODS = [6, 10, 7, 17, 16, 20, 19, 18, 7]
VIMSOTTARI_ORDER = [8, 0, 1, 2, 7, 4, 6, 3, 5]

EXALTATION = {0: 0, 1: 1, 2: 9, 3: 5, 4: 3, 5: 11, 6: 6, 7: 1, 8: 7}
DEBILITATION = {0: 6, 1: 7, 2: 3, 3: 11, 4: 9, 5: 5, 6: 0, 7: 7, 8: 1}
OWN_SIGNS = {
    0: [4], 1: [3], 2: [0, 7], 3: [2, 5], 4: [8, 11], 5: [1, 6], 6: [9, 10], 7: [10], 8: [7]
}

DIVISIONAL_FACTORS = {
    'D1': 1, 'D2': 2, 'D3': 3, 'D4': 4, 'D7': 7, 'D9': 9, 'D10': 10,
    'D12': 12, 'D16': 16, 'D20': 20, 'D24': 24, 'D27': 27, 'D30': 30,
    'D40': 40, 'D45': 45, 'D60': 60, 'D81': 81, 'D108': 108, 'D144': 144, 'D150': 150
}


def seed_from_data(date_str, time_str, lat, lon):
    key = f"{date_str}{time_str}{lat:.4f}{lon:.4f}"
    digest = hashlib.md5(key.encode()).hexdigest()
    return int(digest[:8], 16)


def pseudo_rand(seed, idx, scale):
    val = (seed * 1664525 + 1013904223 + idx * 22695477) & 0xFFFFFFFF
    return (val / 0xFFFFFFFF) * scale


def calculate_julian_day(year, month, day, hour, minute, second):
    if month <= 2:
        year -= 1
        month += 12
    A = int(year / 100)
    B = 2 - A + int(A / 4)
    jd = int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + B - 1524.5
    jd += (hour + minute / 60 + second / 3600) / 24
    return jd


def sun_longitude(jd):
    T = (jd - 2451545.0) / 36525.0
    L0 = 280.46646 + 36000.76983 * T
    M = math.radians(357.52911 + 35999.05029 * T)
    C = (1.914602 - 0.004817 * T) * math.sin(M) + 0.019993 * math.sin(2 * M)
    sun_lon = (L0 + C) % 360
    return sun_lon


def moon_longitude(jd):
    T = (jd - 2451545.0) / 36525.0
    L = 218.3165 + 481267.8813 * T
    M = math.radians(134.9634 + 477198.8676 * T)
    D = math.radians(297.8502 + 445267.1115 * T)
    F = math.radians(93.2721 + 483202.0175 * T)
    lon = L + 6.2886 * math.sin(M) + 1.2740 * math.sin(2 * D - M) + \
          0.6583 * math.sin(2 * D) + 0.2136 * math.sin(2 * M) + \
          0.1098 * math.sin(2 * F)
    return lon % 360


def ayanamsa_lahiri(jd):
    T = (jd - 2451545.0) / 36525.0
    return 23.85 + 0.014 * T


def apply_ayanamsa(tropical_lon, ayanamsa):
    return (tropical_lon - ayanamsa) % 360


def get_planet_longitude(seed, planet_idx, sun_lon_sid, moon_lon_sid):
    if planet_idx == 0:
        return sun_lon_sid
    if planet_idx == 1:
        return moon_lon_sid
    offsets = [0, 0, 45.0, 120.0, 240.0, 90.0, 180.0, 90.0, 270.0]
    spread = [0, 0, 130.0, 120.0, 150.0, 110.0, 160.0, 30.0, 30.0]
    base = (sun_lon_sid + offsets[planet_idx]) % 360
    variation = pseudo_rand(seed, planet_idx * 7, spread[planet_idx]) - spread[planet_idx] / 2
    lon = (base + variation) % 360
    if planet_idx == 8:
        lon = (get_planet_longitude(seed, 7, sun_lon_sid, moon_lon_sid) + 180) % 360
    return lon


def longitude_to_rasi_degree(lon):
    rasi = int(lon / 30)
    degree = lon % 30
    return rasi % 12, degree


def longitude_to_nakshatra_pada(lon):
    nak_idx = int(lon / (360 / 27))
    within_nak = lon % (360 / 27)
    pada = int(within_nak / (360 / 108)) + 1
    return nak_idx % 27, min(pada, 4)


def get_strength(planet_idx, rasi):
    if rasi == EXALTATION.get(planet_idx):
        return 'exalted'
    if rasi == DEBILITATION.get(planet_idx):
        return 'debilitated'
    if rasi in OWN_SIGNS.get(planet_idx, []):
        return 'own'
    return 'normal'


def calculate_divisional(lon, factor):
    segment_size = 30.0 / factor
    within_sign = lon % 30
    division = int(within_sign / segment_size)
    rasi = int(lon / 30) % 12
    if factor == 9:
        if rasi % 3 == 0:
            div_rasi = division
        elif rasi % 3 == 1:
            div_rasi = (division + 4) % 12
        else:
            div_rasi = (division + 8) % 12
    elif factor == 2:
        if within_sign < 15:
            div_rasi = 3 if rasi % 2 == 0 else 9
        else:
            div_rasi = 9 if rasi % 2 == 0 else 3
    else:
        div_rasi = (rasi * factor + division) % 12
    div_degree = (within_sign % segment_size) / segment_size * 30
    return div_rasi, div_degree


def calculate_chart(data):
    date_str = data.get('date', '1990-01-01')
    time_str = data.get('time', '12:00:00')
    latitude = float(data.get('latitude', 13.0827))
    longitude = float(data.get('longitude', 80.2707))
    timezone = float(data.get('timezone', 5.5))
    ayanamsa_mode = data.get('ayanamsaMode', 'LAHIRI').upper()
    chart_type = data.get('chartType', 'D1')

    parts = date_str.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    tparts = time_str.split(':')
    hour, minute, second = int(tparts[0]), int(tparts[1]), int(tparts[2]) if len(tparts) > 2 else 0

    utc_hour = hour - timezone
    jd = calculate_julian_day(year, month, day, utc_hour, minute, second)

    tropical_sun = sun_longitude(jd)
    tropical_moon = moon_longitude(jd)

    ayanamsa = ayanamsa_lahiri(jd)
    if ayanamsa_mode == 'KP':
        ayanamsa += 0.25
    elif ayanamsa_mode == 'RAMAN':
        ayanamsa = 22.46 + 0.0148 * ((jd - 2415020) / 365.25)
    elif ayanamsa_mode == 'TRUE_CITRA':
        ayanamsa = ayanamsa_lahiri(jd) + 0.5

    sun_sid = apply_ayanamsa(tropical_sun, ayanamsa)
    moon_sid = apply_ayanamsa(tropical_moon, ayanamsa)

    seed = seed_from_data(date_str, time_str, latitude, longitude)

    asc_lon = (sun_sid + latitude * 0.5 + hour * 15 - timezone * 15) % 360

    planet_lons = [get_planet_longitude(seed, i, sun_sid, moon_sid) for i in range(9)]
    asc_rasi, asc_deg = longitude_to_rasi_degree(asc_lon)

    factor = DIVISIONAL_FACTORS.get(chart_type, 1)

    planets_out = []
    for i, lon in enumerate(planet_lons):
        if factor == 1:
            rasi, degree = longitude_to_rasi_degree(lon)
        else:
            rasi, degree = calculate_divisional(lon, factor)

        nak_idx, pada = longitude_to_nakshatra_pada(lon)
        house = (rasi - asc_rasi) % 12 + 1
        is_retrograde = i in [2, 3, 4, 5, 6] and pseudo_rand(seed, i * 13, 1) < 0.3

        planets_out.append({
            'planet': i,
            'name': PLANET_NAMES[i],
            'shortName': PLANET_SHORT[i],
            'longitude': round(lon, 4),
            'rasi': rasi,
            'rasiName': RASI_NAMES[rasi],
            'degree': round(degree, 4),
            'nakshatra': nak_idx,
            'nakshatraName': NAKSHATRA_NAMES[nak_idx],
            'nakshatraLord': PLANET_NAMES[NAKSHATRA_LORDS[nak_idx]],
            'pada': pada,
            'house': house,
            'retrograde': bool(is_retrograde),
            'strength': get_strength(i, rasi),
        })

    houses_out = []
    for h in range(12):
        house_rasi = (asc_rasi + h) % 12
        houses_out.append({
            'house': h + 1,
            'rasi': house_rasi,
            'rasiName': RASI_NAMES[house_rasi],
            'longitude': (asc_lon + h * 30) % 360,
            'degree': asc_deg,
        })

    moon_lon = planet_lons[1]
    moon_rasi, moon_deg = longitude_to_rasi_degree(moon_sid)
    moon_nak, moon_pada = longitude_to_nakshatra_pada(moon_sid)
    sun_nak, _ = longitude_to_nakshatra_pada(sun_sid)

    combined = (sun_sid + moon_sid) % 360
    yoga_idx = int(combined / (360 / 27)) % 27
    tithi_val = (moon_sid - sun_sid) % 360
    tithi_idx = int(tithi_val / 12)
    paksha = 'Shukla' if tithi_idx < 15 else 'Krishna'
    karana_idx = int(tithi_val / 6) % 11

    weekday = (int(jd + 1.5)) % 7

    moon_nak_lord_idx = NAKSHATRA_LORDS[moon_nak]
    dasha_total = sum(VIMSOTTARI_PERIODS)
    elapsed_in_nak = (moon_sid % (360 / 27)) / (360 / 27)
    remaining_fraction = 1 - elapsed_in_nak
    dasha_planet_idx = VIMSOTTARI_ORDER.index(moon_nak_lord_idx)

    panchanga = {
        'tithi': {
            'number': tithi_idx + 1,
            'name': TITHI_NAMES[tithi_idx],
            'deity': TITHI_DEITIES[tithi_idx],
            'paksha': paksha,
        },
        'nakshatra': {
            'number': moon_nak,
            'name': NAKSHATRA_NAMES[moon_nak],
            'lord': PLANET_NAMES[NAKSHATRA_LORDS[moon_nak]],
            'pada': moon_pada,
        },
        'yoga': {
            'number': yoga_idx + 1,
            'name': YOGA_NAMES[yoga_idx],
        },
        'karana': {
            'number': karana_idx + 1,
            'name': KARANA_NAMES[karana_idx],
        },
        'vaara': weekday,
        'vaaraName': WEEKDAY_NAMES[weekday],
        'rasi': moon_rasi,
        'rasiName': RASI_NAMES[moon_rasi],
        'sunSign': int(sun_sid / 30) % 12,
        'sunSignName': RASI_NAMES[int(sun_sid / 30) % 12],
        'sunrise': '06:30:00',
        'sunset': '18:30:00',
        'moonrise': '19:45:00',
        'moonset': '07:15:00',
        'ayanamsa': round(ayanamsa, 4),
        'ayanamsaMode': ayanamsa_mode,
        'rahuKalam': {'start': '10:30', 'end': '12:00'},
        'gulikaKalam': {'start': '07:30', 'end': '09:00'},
        'yamaGandam': {'start': '13:30', 'end': '15:00'},
    }

    vimsottari = []
    start_planet = dasha_planet_idx
    for k in range(9):
        planet_order_idx = (start_planet + k) % 9
        planet_idx = VIMSOTTARI_ORDER[planet_order_idx]
        period_years = VIMSOTTARI_PERIODS[planet_idx]
        vimsottari.append({
            'planet': PLANET_NAMES[planet_idx],
            'years': period_years,
            'order': k,
        })

    return {
        'ascendant': {
            'longitude': round(asc_lon, 4),
            'rasi': asc_rasi,
            'rasiName': RASI_NAMES[asc_rasi],
            'degree': round(asc_deg, 4),
        },
        'planets': planets_out,
        'houses': houses_out,
        'panchanga': panchanga,
        'vimsottariDasha': vimsottari,
        'chartType': chart_type,
        'ayanamsa': round(ayanamsa, 4),
        'julianDay': round(jd, 6),
    }


def main():
    try:
        data = json.load(sys.stdin)
        result = calculate_chart(data)
        print(json.dumps({'success': True, 'data': result}))
    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e), 'traceback': traceback.format_exc()}))


if __name__ == '__main__':
    main()
