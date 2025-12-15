#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora Utils Module
Adapted from PyJHora library for server-side use
Contains common utility functions
"""
import os
import json
import datetime
from . import const

PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
PLANET_SHORT_NAMES = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']

RAASI_LIST = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
              'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
RAASI_SHORT_LIST = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis']

NAKSHATRA_LIST = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
                  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
                  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
                  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
                  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']

TITHI_LIST = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
              'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
              'Trayodashi', 'Chaturdashi', 'Purnima', 'Pratipada', 'Dwitiya', 'Tritiya',
              'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami',
              'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya']

TITHI_DEITIES = ['Agni', 'Brahma', 'Gauri', 'Ganesh', 'Naga', 'Kartikeya',
                 'Surya', 'Shiva', 'Durga', 'Yama', 'Vishvadeva', 'Vishnu',
                 'Kama', 'Shiva', 'Chandra', 'Agni', 'Brahma', 'Gauri',
                 'Ganesh', 'Naga', 'Kartikeya', 'Surya', 'Shiva', 'Durga',
                 'Yama', 'Vishvadeva', 'Vishnu', 'Kama', 'Shiva', 'Pitru']

KARANA_LIST = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
               'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']

YOGAM_LIST = ['Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
              'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
              'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
              'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
              'Brahma', 'Indra', 'Vaidhriti']

PAKSHA_LIST = ['Shukla', 'Krishna']
DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

MONTH_LIST = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
              'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna']

YEAR_LIST = ['Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati', 'Angirasa',
             'Shrimukha', 'Bhava', 'Yuva', 'Dhata', 'Ishvara', 'Bahudhanya',
             'Pramathi', 'Vikrama', 'Vrisha', 'Chitrabhanu', 'Svabhanu', 'Tarana',
             'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikrita',
             'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
             'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava', 'Shubhakrit',
             'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava', 'Plavanga', 'Kilaka',
             'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadi', 'Ananda',
             'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri',
             'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya']

resource_strings = {}

sort_tuple = lambda tup, tup_index, reverse=False: sorted(tup, key=lambda x: x[tup_index], reverse=reverse)
flatten_list = lambda lst: [item for sublist in lst for item in sublist]

from_dms = lambda degs, mins, secs: degs + mins/60 + secs/3600

def from_dms_to_str(dms_list):
    return str(dms_list[0]) + const._degree_symbol + str(dms_list[1]) + const._minute_symbol + str(dms_list[2]) + const._second_symbol

def to_dms_prec(deg):
    d = int(deg)
    mins = (deg - d) * 60
    m = int(mins)
    s = round((mins - m) * 60, 2)
    return [d, m, s]

def to_dms(deg, as_string=True, is_lat_long=None, round_seconds_to_digits=None, 
           round_to_minutes=None, use_24hour_format=None):
    if use_24hour_format is None:
        use_24hour_format = const.use_24hour_format_in_to_dms
    
    sep = ':'
    degree_symbol = const._degree_symbol
    minute_symbol = const._minute_symbol
    second_symbol = const._second_symbol
    
    d = int(deg)
    mins = (deg - d) * 60
    if round_to_minutes:
        m = int(round(mins, 0))
    else:
        m = int(mins)
    ss = (mins - m) * 60
    
    if round_seconds_to_digits is not None:
        s = round(ss, round_seconds_to_digits)
    else:
        s = int(ss)
    
    if as_string:
        if is_lat_long == 'plong':
            return str(d) + degree_symbol + " " + str(abs(m)) + minute_symbol + " " + str(abs(s)) + second_symbol
        elif is_lat_long == 'lat':
            direction = ' N' if d >= 0 else ' S'
            return str(abs(d)) + degree_symbol + " " + str(abs(m)) + minute_symbol + direction
        elif is_lat_long == 'long':
            direction = ' E' if d >= 0 else ' W'
            return str(abs(d)) + degree_symbol + " " + str(abs(m)) + minute_symbol + direction
        else:
            return str(d) + sep + str(abs(m)).zfill(2) + sep + str(abs(s)).zfill(2)
    return [d, m, s]

def gregorian_to_jd(date_obj):
    """Convert gregorian date to Julian Day number"""
    year = date_obj.year if hasattr(date_obj, 'year') else date_obj[0]
    month = date_obj.month if hasattr(date_obj, 'month') else date_obj[1]
    day = date_obj.day if hasattr(date_obj, 'day') else date_obj[2]
    
    if month <= 2:
        year -= 1
        month += 12
    
    A = int(year / 100)
    B = 2 - A + int(A / 4)
    
    jd = int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + B - 1524.5
    return jd

def jd_to_gregorian(jd):
    """Convert Julian Day number to gregorian date"""
    Z = int(jd + 0.5)
    F = jd + 0.5 - Z
    
    if Z < 2299161:
        A = Z
    else:
        alpha = int((Z - 1867216.25) / 36524.25)
        A = Z + 1 + alpha - int(alpha / 4)
    
    B = A + 1524
    C = int((B - 122.1) / 365.25)
    D = int(365.25 * C)
    E = int((B - D) / 30.6001)
    
    day = B - D - int(30.6001 * E) + F
    
    if E < 14:
        month = E - 1
    else:
        month = E - 13
    
    if month > 2:
        year = C - 4716
    else:
        year = C - 4715
    
    hours = (day - int(day)) * 24
    
    return year, month, int(day), hours

def julian_day_utc(jd, place):
    """Get Julian day in UTC"""
    return jd - place.timezone / 24.0 if hasattr(place, 'timezone') else jd

def set_language(language='en'):
    """Set the language for resource strings"""
    global resource_strings
    const._DEFAULT_LANGUAGE = language

def get_fraction(start_time, end_time, current_time):
    """Calculate fraction of time elapsed"""
    if end_time <= start_time:
        return 0.0
    total = end_time - start_time
    elapsed = current_time - start_time
    if elapsed < 0:
        return 0.0
    if elapsed > total:
        return 1.0
    return elapsed / total

def nakshathra_lord(nakshatra_index):
    """Get the lord of a nakshatra (1-27)"""
    if nakshatra_index < 1 or nakshatra_index > 27:
        return 0
    lords = [8, 5, 0, 1, 2, 7, 4, 6, 3]  # Ketu, Venus, Sun, Moon, Mars, Rahu, Mercury, Jupiter, Saturn
    return lords[(nakshatra_index - 1) % 9]

def karana_lord(karana_index):
    """Get the lord of a karana"""
    karana_lords = [0, 5, 4, 1, 2, 3, 6, 7, 8, 8, 1]  # 11 karanas
    if 1 <= karana_index <= 11:
        return karana_lords[karana_index - 1]
    return 0

def get_house_to_planet_dict_from_planet_to_house_dict(planet_to_house_dict):
    """Convert planet_to_house dict to house_to_planet list"""
    h_to_p = ['' for h in range(12)]
    for p, h in planet_to_house_dict.items():
        h_to_p[h] += str(p) + '/'
    h_to_p = [p[:-1] for p in h_to_p]
    return h_to_p

def get_planet_to_house_dict_from_chart(house_to_planet_list):
    """Convert house_to_planet list to planet_to_house dict"""
    p_to_h = {p: h for p in [*range(9)] + [const._ascendant_symbol] 
              for h, planets in enumerate(house_to_planet_list) if str(p) in planets}
    return p_to_h

def get_house_planet_list_from_planet_positions(planet_positions):
    """Convert planet positions to house-planet list"""
    h_to_p = ['' for h in range(12)]
    for sublist in planet_positions:
        p = sublist[0]
        h = sublist[1][0]
        h_to_p[h] += str(p) + '/'
    h_to_p = [x[:-1] for x in h_to_p]
    return h_to_p
