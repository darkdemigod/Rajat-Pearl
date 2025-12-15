#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora Drik Panchanga Module
Contains astronomical calculation functions for panchanga

For MVP, these are stub functions that return mock data.
In production, these would use Swiss Ephemeris (swisseph) for real calculations.
"""

from collections import namedtuple
from datetime import datetime, date

Date = namedtuple('Date', ['year', 'month', 'day'])
Place = namedtuple('Place', ['name', 'latitude', 'longitude', 'timezone'])

_ayanamsa_mode = 'LAHIRI'
_ayanamsa_value = 24.0

def set_ayanamsa_mode(mode, value=None, jd=None):
    """Set the ayanamsa mode for calculations"""
    global _ayanamsa_mode, _ayanamsa_value
    _ayanamsa_mode = mode
    if value is not None:
        _ayanamsa_value = value

def get_ayanamsa_value(jd):
    """Get the ayanamsa value for a given Julian Day"""
    return _ayanamsa_value

def sunrise(jd, place):
    """
    Calculate sunrise time for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (Julian Day of sunrise, time string HH:MM:SS)
    """
    return (jd, "06:30:00")

def sunset(jd, place):
    """
    Calculate sunset time for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (Julian Day of sunset, time string HH:MM:SS)
    """
    return (jd, "18:30:00")

def moonrise(jd, place):
    """
    Calculate moonrise time for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (Julian Day of moonrise, time string HH:MM:SS)
    """
    return (jd, "19:45:00")

def moonset(jd, place):
    """
    Calculate moonset time for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (Julian Day of moonset, time string HH:MM:SS)
    """
    return (jd, "07:15:00")

def tithi(jd, place):
    """
    Calculate Tithi (lunar day) for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (tithi_number 1-30, start_time, end_time)
        Tithi 1-15 are Shukla Paksha, 16-30 are Krishna Paksha
    """
    return (5, 8.5, 32.5)

def nakshatra(jd, place):
    """
    Calculate Nakshatra (lunar mansion) for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (nakshatra_number 1-27, pada 1-4, start_time, end_time)
    """
    return (10, 2, 5.5, 18.5)

def yoga(jd, place):
    """
    Calculate Yoga (nitya yoga) for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (yoga_number 1-27, start_time, end_time, fraction_remaining)
    """
    return (12, 6.0, 22.0, 0.65)

def yogam(jd, place):
    """
    Alias for yoga function
    """
    return yoga(jd, place)

def karana(jd, place):
    """
    Calculate Karana (half of tithi) for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (karana_number 1-11, start_time, end_time)
    """
    return (3, 8.5, 20.5)

def vaara(jd):
    """
    Calculate Vaara (weekday) for a given Julian Day
    
    Args:
        jd: Julian Day number
    
    Returns:
        int: Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    """
    return int(jd + 1.5) % 7

def raasi(jd, place):
    """
    Calculate Moon's Raasi (zodiac sign) for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (raasi_number 1-12, longitude_in_sign, fraction_remaining)
    """
    return (4, 15.5, 0.48)

def lunar_month(jd, place):
    """
    Calculate lunar month for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple with (name, latitude, longitude, timezone)
    
    Returns:
        tuple: (month_number 1-12, is_adhik_maasa, is_nija_maasa)
    """
    return (8, False, False)

def samvatsara(date_obj, place, zodiac=0):
    """
    Calculate Samvatsara (60-year cycle) for a given date
    
    Args:
        date_obj: Date object or tuple (year, month, day)
        place: Place namedtuple
        zodiac: 0 for lunar, 1 for solar
    
    Returns:
        int: Samvatsara number (0-59)
    """
    year = date_obj.year if hasattr(date_obj, 'year') else date_obj[0]
    return (year - 1987) % 60

def elapsed_year(jd, month_no):
    """
    Calculate Kali, Vikrama, and Saka years
    
    Args:
        jd: Julian Day number
        month_no: Lunar month number
    
    Returns:
        list: [kali_year, vikrama_year, saka_year]
    """
    return [5126, 2082, 1947]

def tamil_solar_month_and_date(date_obj, place):
    """
    Calculate Tamil solar month and date
    
    Args:
        date_obj: Date object
        place: Place namedtuple
    
    Returns:
        tuple: (month_index 0-11, day_number)
    """
    return (7, 15)

def raahu_kaalam(jd, place):
    """
    Calculate Rahu Kalam (inauspicious period)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        tuple: (start_time, end_time)
    """
    return ("09:00:00", "10:30:00")

def gulikai_kaalam(jd, place):
    """
    Calculate Gulika Kalam (inauspicious period)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        tuple: (start_time, end_time)
    """
    return ("13:30:00", "15:00:00")

def yamaganda_kaalam(jd, place):
    """
    Calculate Yama Gandam (inauspicious period)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        tuple: (start_time, end_time)
    """
    return ("12:00:00", "13:30:00")

def abhijit_muhurta(jd, place):
    """
    Calculate Abhijit Muhurta (auspicious period around noon)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        tuple: (start_time, end_time)
    """
    return ("11:48:00", "12:36:00")

def durmuhurtam(jd, place):
    """
    Calculate Durmuhurtam (inauspicious periods)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        tuple: (start_time, end_time)
    """
    return ("08:24:00", "09:12:00")

def planet_positions(jd, place, ayanamsa_mode='LAHIRI'):
    """
    Calculate planetary positions for a given Julian Day and place
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
        ayanamsa_mode: Ayanamsa calculation mode
    
    Returns:
        list: List of (planet_index, (raasi_index, longitude)) tuples
        Planet indices: 0=Lagna, 1=Sun, 2=Moon, 3=Mars, 4=Mercury, 5=Jupiter, 6=Venus, 7=Saturn, 8=Rahu, 9=Ketu
    """
    return [
        ('L', (0, 15.5)),     # Lagna in Aries
        (0, (4, 22.3)),       # Sun in Leo
        (1, (3, 18.7)),       # Moon in Cancer
        (2, (7, 10.2)),       # Mars in Scorpio
        (3, (5, 25.8)),       # Mercury in Virgo
        (4, (1, 8.4)),        # Jupiter in Taurus
        (5, (6, 12.9)),       # Venus in Libra
        (6, (10, 5.6)),       # Saturn in Aquarius
        (7, (0, 28.1)),       # Rahu in Aries
        (8, (6, 28.1)),       # Ketu in Libra
    ]

def planets_in_retrograde(jd, place):
    """
    Get list of planets in retrograde motion
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
    
    Returns:
        list: List of planet indices that are retrograde
    """
    return [6]

def next_solar_date(jd, place, years=1, months=0, sixty_hours=0):
    """
    Calculate next solar return date
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
        years: Number of years to add
        months: Number of months to add
        sixty_hours: Number of 60-hour periods to add
    
    Returns:
        float: Julian Day of the solar return
    """
    return jd + years * 365.25 + months * 30.4375

def dasavarga_from_long(longitude):
    """
    Get rasi and degree from absolute longitude
    
    Args:
        longitude: Absolute longitude (0-360)
    
    Returns:
        tuple: (rasi_index 0-11, degrees_in_sign)
    """
    rasi = int(longitude / 30) % 12
    degrees = longitude % 30
    return (rasi, degrees)

def bhava_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
                chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Bhava Lagna"""
    return (2, 15.5)

def hora_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
               chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Hora Lagna"""
    return (5, 22.3)

def ghati_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
                chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Ghati Lagna"""
    return (8, 10.8)

def vighati_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
                  chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Vighati Lagna"""
    return (11, 5.2)

def pranapada_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
                    chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Pranapada Lagna"""
    return (3, 18.7)

def indu_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
               chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Indu Lagna"""
    return (7, 25.4)

def sree_lagna(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
               chart_method=1, base_rasi=None, count_from_end_of_sign=None):
    """Calculate Sree Lagna"""
    return (1, 12.9)
