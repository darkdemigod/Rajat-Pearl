#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora House Module
Contains house (bhava) calculation functions
"""

from ... import const

def get_house_lord(house_index):
    """
    Get the lord (ruler) of a house
    
    Args:
        house_index: House number (0-11, 0=Aries, 1=Taurus, etc.)
    
    Returns:
        int: Planet index that rules the house
    """
    house_lords = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4]
    return house_lords[house_index % 12]

def get_planets_in_house(house_index, planet_positions):
    """
    Get list of planets in a specific house
    
    Args:
        house_index: House number (0-11)
        planet_positions: List of planet positions
    
    Returns:
        list: Planet indices in the house
    """
    planets = []
    for planet, (rasi, _) in planet_positions:
        if rasi == house_index:
            planets.append(planet)
    return planets

def aspect_planets(planet_index, planet_positions):
    """
    Get houses aspected by a planet
    
    Args:
        planet_index: Planet index (0=Sun, 1=Moon, etc.)
        planet_positions: List of planet positions
    
    Returns:
        list: House indices aspected by the planet
    """
    graha_drishti = {
        0: [7], 1: [7], 2: [4, 7, 8], 3: [7],
        4: [5, 7, 9], 5: [7], 6: [3, 7, 10], 7: [7], 8: [7]
    }
    
    base_aspects = graha_drishti.get(planet_index, [7])
    
    planet_house = None
    for p, (rasi, _) in planet_positions:
        if p == planet_index:
            planet_house = rasi
            break
    
    if planet_house is None:
        return []
    
    aspected_houses = [(planet_house + asp) % 12 for asp in base_aspects]
    return aspected_houses

def get_house_strength(house_index, planet_positions):
    """
    Calculate the strength of a house
    
    Args:
        house_index: House number (0-11)
        planet_positions: List of planet positions
    
    Returns:
        float: Strength score of the house
    """
    strength = 0.0
    
    planets_in_house = get_planets_in_house(house_index, planet_positions)
    for planet in planets_in_house:
        if planet in const.natural_benefics:
            strength += 1.0
        elif planet in const.natural_malefics:
            strength -= 0.5
    
    lord = get_house_lord(house_index)
    for planet, (rasi, _) in planet_positions:
        if planet == lord:
            if rasi in const.movable_signs:
                strength += 0.5
            elif rasi in const.fixed_signs:
                strength += 0.75
            break
    
    return strength

def get_bhava_madhya(ascendant_longitude, house_number, method=1):
    """
    Calculate bhava madhya (house cusp) for a house
    
    Args:
        ascendant_longitude: Longitude of the ascendant
        house_number: House number (1-12)
        method: Calculation method (1=Equal House, 2=Sripathi, etc.)
    
    Returns:
        float: Longitude of the house cusp
    """
    if method == 1:
        return (ascendant_longitude + (house_number - 1) * 30) % 360
    else:
        return (ascendant_longitude + (house_number - 1) * 30) % 360
