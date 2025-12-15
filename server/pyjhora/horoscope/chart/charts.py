#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora Charts Module
Contains divisional chart calculation functions
"""

from ... import const
from ...panchanga import drik

def divisional_chart(jd, place, ayanamsa_mode='LAHIRI', divisional_chart_factor=1,
                     chart_method=1, years=1, months=1, sixty_hours=1,
                     calculation_type='drik', pravesha_type=0, base_rasi=None,
                     count_from_end_of_sign=None):
    """
    Calculate divisional chart (varga chart)
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
        ayanamsa_mode: Ayanamsa calculation mode
        divisional_chart_factor: Chart division (1=D1/Rasi, 9=D9/Navamsa, etc.)
        chart_method: Chart calculation method
        years: Years for annual chart
        months: Months for annual chart
        sixty_hours: 60-hour periods for annual chart
        calculation_type: 'drik' or 'ss'
        pravesha_type: Pravesha type for annual charts
        base_rasi: Base rasi for special charts
        count_from_end_of_sign: Count direction
    
    Returns:
        list: List of (planet_id, (rasi_index, longitude)) tuples
    """
    base_positions = drik.planet_positions(jd, place, ayanamsa_mode)
    
    if divisional_chart_factor == 1:
        return base_positions
    
    divisional_positions = []
    for planet, (rasi, longitude) in base_positions:
        if divisional_chart_factor == 9:
            navamsa_rasi = int((longitude / 30) * 9) % 12
            navamsa_long = (longitude * 9) % 30
            divisional_positions.append((planet, (navamsa_rasi, navamsa_long)))
        elif divisional_chart_factor == 2:
            hora = 0 if longitude < 15 else 1
            divisional_positions.append((planet, (hora, longitude * 2 % 30)))
        elif divisional_chart_factor == 3:
            drekkana = int(longitude / 10)
            drekkana_rasi = (rasi + drekkana * 4) % 12
            divisional_positions.append((planet, (drekkana_rasi, (longitude * 3) % 30)))
        else:
            divisional_rasi = int((longitude / 30) * divisional_chart_factor) % 12
            divisional_long = (longitude * divisional_chart_factor) % 30
            divisional_positions.append((planet, (divisional_rasi, divisional_long)))
    
    return divisional_positions

def bhava_chart(jd, place, bhava_madhya_method=1):
    """
    Calculate bhava (house) chart
    
    Args:
        jd: Julian Day number
        place: Place namedtuple
        bhava_madhya_method: Method for calculating house cusps
    
    Returns:
        list: List of (bhava_rasi, (start, middle, end), planets_in_bhava) tuples
    """
    planet_positions = drik.planet_positions(jd, place)
    
    asc_rasi = 0
    for planet, (rasi, _) in planet_positions:
        if planet == 'L':
            asc_rasi = rasi
            break
    
    bhava_info = []
    for house_num in range(12):
        bhava_rasi = (asc_rasi + house_num) % 12
        start = bhava_rasi * 30
        middle = start + 15
        end = start + 30
        
        planets_in_bhava = []
        for planet, (rasi, _) in planet_positions:
            if rasi == bhava_rasi:
                planets_in_bhava.append(planet)
        
        bhava_info.append((bhava_rasi, (start, middle, end), planets_in_bhava))
    
    return bhava_info

def get_64th_navamsa(planet_positions):
    """
    Calculate the 64th Navamsa from Moon
    
    Args:
        planet_positions: List of planet positions
    
    Returns:
        dict: 64th navamsa information
    """
    moon_rasi = 3
    for planet, (rasi, longitude) in planet_positions:
        if planet == 1:
            moon_rasi = rasi
            break
    
    navamsa_64 = (moon_rasi + 7) % 12
    return {'rasi': navamsa_64, 'lord': get_rasi_lord(navamsa_64)}

def get_22nd_drekkana(planet_positions):
    """
    Calculate the 22nd Drekkana from Lagna
    
    Args:
        planet_positions: List of planet positions
    
    Returns:
        dict: 22nd drekkana information
    """
    asc_rasi = 0
    for planet, (rasi, _) in planet_positions:
        if planet == 'L':
            asc_rasi = rasi
            break
    
    drekkana_22 = (asc_rasi + 7) % 12
    return {'rasi': drekkana_22, 'lord': get_rasi_lord(drekkana_22)}

def get_rasi_lord(rasi_index):
    """
    Get the lord of a rasi
    
    Args:
        rasi_index: Rasi index (0-11)
    
    Returns:
        int: Planet index that rules the rasi
    """
    rasi_lords = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4]
    return rasi_lords[rasi_index % 12]
