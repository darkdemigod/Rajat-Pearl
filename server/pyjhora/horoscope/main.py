#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora Main Horoscope Module
Adapted from PyJHora library for server-side use
Main entry point for horoscope calculations
"""

from datetime import date
from .. import const, utils
from ..panchanga import drik
from .chart import house, charts

_lang_path = const._LANGUAGE_PATH
chara_karakas = ['atma_karaka', 'amatya_karaka', 'bhratri_karaka', 'maitri_karaka',
                 'pitri_karaka', 'putra_karaka', 'jnaati_karaka', 'data_karaka']

dhasavarga_dict = {}

class Horoscope:
    """
    Main Horoscope class for calculating and storing horoscope information
    """
    
    def __init__(self, place_with_country_code=None, latitude=None, longitude=None,
                 timezone_offset=None, date_in=None, birth_time=None,
                 ayanamsa_mode="LAHIRI", ayanamsa_value=None,
                 calculation_type='drik', years=1, months=1, sixty_hours=1,
                 pravesha_type=0, bhava_madhya_method=1, language='en'):
        """
        Initialize a Horoscope object
        
        Args:
            place_with_country_code: Place name with country (e.g., "Chennai, India")
            latitude: Latitude of birth place
            longitude: Longitude of birth place
            timezone_offset: Timezone offset from UTC in hours
            date_in: Date object or tuple (year, month, day)
            birth_time: Birth time string "HH:MM:SS" or tuple (hour, minute, second)
            ayanamsa_mode: Ayanamsa calculation mode
            ayanamsa_value: Custom ayanamsa value (if any)
            calculation_type: 'drik' or 'ss' (Surya Siddhanta)
            years: Years for annual chart
            months: Months for annual chart
            sixty_hours: 60-hour periods
            pravesha_type: Pravesha type for annual charts
            bhava_madhya_method: Method for bhava calculation
            language: Language code for strings
        """
        self._language = language
        self._bhava_madhya_method = bhava_madhya_method
        self.place_name = place_with_country_code or "Unknown"
        self.latitude = latitude or 0.0
        self.longitude = longitude or 0.0
        self.timezone_offset = timezone_offset or 0.0
        self.pravesha_type = pravesha_type
        self._22nd_drekkana = {}
        self._64th_navamsa = {}
        
        if date_in is None:
            today = date.today()
            self.Date = drik.Date(today.year, today.month, today.day)
        elif hasattr(date_in, 'year'):
            self.Date = drik.Date(date_in.year, date_in.month, date_in.day)
        else:
            self.Date = drik.Date(date_in[0], date_in[1], date_in[2])
        
        self.Place = drik.Place(self.place_name, self.latitude, self.longitude, self.timezone_offset)
        self.julian_utc = utils.gregorian_to_jd(self.Date)
        
        if birth_time is not None:
            if isinstance(birth_time, str):
                birth_time = birth_time.strip().replace('AM', '').replace('PM', '')
                btArr = birth_time.split(':')
                self.birth_time = (int(btArr[0]), int(btArr[1]), int(btArr[2]) if len(btArr) > 2 else 0)
            else:
                self.birth_time = birth_time
            
            hour_fraction = self.birth_time[0] + self.birth_time[1]/60 + self.birth_time[2]/3600
            self.julian_day = self.julian_utc + hour_fraction / 24
        else:
            self.birth_time = (12, 0, 0)
            self.julian_day = self.julian_utc + 0.5
        
        self.calculation_type = calculation_type.lower()
        self.ayanamsa_mode = ayanamsa_mode.upper()
        
        drik.set_ayanamsa_mode(self.ayanamsa_mode, ayanamsa_value, self.julian_day)
        self.ayanamsa_value = drik.get_ayanamsa_value(self.julian_day)
        
        self.years = years
        self.months = months
        self.sixty_hours = sixty_hours
        
        self.julian_years = drik.next_solar_date(self.julian_day, self.Place, years, months, sixty_hours)
        self.julian_years_utc = utils.julian_day_utc(self.julian_day, self.Place)
    
    def get_calendar_information(self):
        """
        Get panchanga/calendar information for the birth date
        
        Returns:
            dict: Calendar information including tithi, nakshatra, yoga, etc.
        """
        jd = self.julian_day
        place = self.Place
        
        calendar_info = {
            'place': self.place_name,
            'latitude': utils.to_dms(self.latitude, is_lat_long='lat', as_string=True),
            'longitude': utils.to_dms(self.longitude, is_lat_long='long', as_string=True),
            'timezone_offset': f"{self.timezone_offset:.2f}",
            'date': f"{self.Date.year}-{self.Date.month:02d}-{self.Date.day:02d}",
            'time': f"{self.birth_time[0]:02d}:{self.birth_time[1]:02d}:{self.birth_time[2]:02d}",
        }
        
        vaaram = drik.vaara(jd)
        calendar_info['vaara'] = utils.DAYS_LIST[vaaram]
        calendar_info['vaara_index'] = vaaram
        
        sunrise_data = drik.sunrise(self.julian_utc, place)
        calendar_info['sunrise'] = sunrise_data[1]
        
        sunset_data = drik.sunset(self.julian_utc, place)
        calendar_info['sunset'] = sunset_data[1]
        
        moonrise_data = drik.moonrise(self.julian_utc, place)
        calendar_info['moonrise'] = moonrise_data[1]
        
        moonset_data = drik.moonset(self.julian_utc, place)
        calendar_info['moonset'] = moonset_data[1]
        
        _tithi = drik.tithi(jd, place)
        tithi_index = _tithi[0]
        paksha = 'Shukla' if tithi_index <= 15 else 'Krishna'
        calendar_info['tithi'] = {
            'index': tithi_index,
            'name': utils.TITHI_LIST[tithi_index - 1],
            'paksha': paksha,
            'deity': utils.TITHI_DEITIES[tithi_index - 1],
        }
        
        _nakshatra = drik.nakshatra(jd, place)
        calendar_info['nakshatra'] = {
            'index': _nakshatra[0],
            'name': utils.NAKSHATRA_LIST[_nakshatra[0] - 1],
            'pada': _nakshatra[1],
            'lord': utils.PLANET_NAMES[utils.nakshathra_lord(_nakshatra[0])],
        }
        
        _yoga = drik.yoga(jd, place)
        calendar_info['yoga'] = {
            'index': _yoga[0],
            'name': utils.YOGAM_LIST[_yoga[0] - 1],
        }
        
        _karana = drik.karana(jd, place)
        calendar_info['karana'] = {
            'index': _karana[0],
            'name': utils.KARANA_LIST[(_karana[0] - 1) % 11],
        }
        
        _raasi = drik.raasi(jd, place)
        calendar_info['moon_rasi'] = {
            'index': _raasi[0],
            'name': utils.RAASI_LIST[_raasi[0] - 1],
            'longitude': _raasi[1],
        }
        
        _lunar_month = drik.lunar_month(jd, place)
        calendar_info['lunar_month'] = {
            'index': _lunar_month[0],
            'name': utils.MONTH_LIST[_lunar_month[0] - 1],
            'is_adhik': _lunar_month[1],
            'is_nija': _lunar_month[2],
        }
        
        _samvatsara = drik.samvatsara(self.Date, place)
        calendar_info['samvatsara'] = {
            'index': _samvatsara,
            'name': utils.YEAR_LIST[_samvatsara],
        }
        
        elapsed = drik.elapsed_year(jd, _lunar_month[0])
        calendar_info['kali_year'] = elapsed[0]
        calendar_info['vikrama_year'] = elapsed[1]
        calendar_info['saka_year'] = elapsed[2]
        
        rahu_kaalam = drik.raahu_kaalam(jd, place)
        calendar_info['rahu_kalam'] = {'start': rahu_kaalam[0], 'end': rahu_kaalam[1]}
        
        gulika_kaalam = drik.gulikai_kaalam(jd, place)
        calendar_info['gulika_kalam'] = {'start': gulika_kaalam[0], 'end': gulika_kaalam[1]}
        
        yama_gandam = drik.yamaganda_kaalam(jd, place)
        calendar_info['yama_gandam'] = {'start': yama_gandam[0], 'end': yama_gandam[1]}
        
        abhijit = drik.abhijit_muhurta(jd, place)
        calendar_info['abhijit_muhurta'] = {'start': abhijit[0], 'end': abhijit[1]}
        
        durmuhurtam = drik.durmuhurtam(jd, place)
        calendar_info['durmuhurtam'] = {'start': durmuhurtam[0], 'end': durmuhurtam[1]}
        
        return calendar_info
    
    def get_planet_positions(self, divisional_chart_factor=1, chart_method=1):
        """
        Get planetary positions for a specific divisional chart
        
        Args:
            divisional_chart_factor: Chart division (1=D1, 9=D9, etc.)
            chart_method: Chart calculation method
        
        Returns:
            list: List of planet positions with rasi and longitude
        """
        return charts.divisional_chart(
            self.julian_day, self.Place,
            ayanamsa_mode=self.ayanamsa_mode,
            divisional_chart_factor=divisional_chart_factor,
            chart_method=chart_method,
            years=self.years, months=self.months, sixty_hours=self.sixty_hours,
            calculation_type=self.calculation_type,
            pravesha_type=self.pravesha_type
        )
    
    def get_house_chart(self):
        """
        Get house (bhava) chart information
        
        Returns:
            list: List of house information with planets
        """
        planet_positions = self.get_planet_positions()
        
        asc_rasi = 0
        for planet, (rasi, _) in planet_positions:
            if planet == 'L':
                asc_rasi = rasi
                break
        
        house_chart = [[] for _ in range(12)]
        for planet, (rasi, longitude) in planet_positions:
            house_index = (rasi - asc_rasi) % 12
            planet_name = 'Asc' if planet == 'L' else utils.PLANET_NAMES[planet] if isinstance(planet, int) else str(planet)
            house_chart[house_index].append({
                'planet': planet_name,
                'rasi': utils.RAASI_LIST[rasi],
                'longitude': longitude
            })
        
        return house_chart
    
    def to_dict(self):
        """
        Convert horoscope to dictionary format for JSON serialization
        
        Returns:
            dict: Complete horoscope information
        """
        return {
            'birth_info': {
                'place': self.place_name,
                'latitude': self.latitude,
                'longitude': self.longitude,
                'timezone': self.timezone_offset,
                'date': f"{self.Date.year}-{self.Date.month:02d}-{self.Date.day:02d}",
                'time': f"{self.birth_time[0]:02d}:{self.birth_time[1]:02d}:{self.birth_time[2]:02d}",
            },
            'calculation_info': {
                'ayanamsa_mode': self.ayanamsa_mode,
                'ayanamsa_value': self.ayanamsa_value,
                'calculation_type': self.calculation_type,
            },
            'calendar': self.get_calendar_information(),
            'planet_positions': self._format_planet_positions(),
            'house_chart': self.get_house_chart(),
        }
    
    def _format_planet_positions(self):
        """Format planet positions for JSON output"""
        positions = self.get_planet_positions()
        formatted = []
        for planet, (rasi, longitude) in positions:
            planet_name = 'Ascendant' if planet == 'L' else utils.PLANET_NAMES[planet] if isinstance(planet, int) else str(planet)
            formatted.append({
                'planet': planet_name,
                'rasi': utils.RAASI_LIST[rasi],
                'rasi_index': rasi,
                'longitude': round(longitude, 2),
                'longitude_dms': utils.to_dms(longitude, is_lat_long='plong')
            })
        return formatted


def calculate_horoscope(place=None, latitude=None, longitude=None, timezone=None,
                        date_str=None, time_str=None, ayanamsa='LAHIRI'):
    """
    Convenience function to calculate a horoscope
    
    Args:
        place: Place name
        latitude: Latitude
        longitude: Longitude
        timezone: Timezone offset
        date_str: Date string "YYYY-MM-DD"
        time_str: Time string "HH:MM:SS"
        ayanamsa: Ayanamsa mode
    
    Returns:
        dict: Horoscope data as dictionary
    """
    if date_str:
        parts = date_str.split('-')
        date_obj = drik.Date(int(parts[0]), int(parts[1]), int(parts[2]))
    else:
        today = date.today()
        date_obj = drik.Date(today.year, today.month, today.day)
    
    horo = Horoscope(
        place_with_country_code=place,
        latitude=latitude,
        longitude=longitude,
        timezone_offset=timezone,
        date_in=date_obj,
        birth_time=time_str or "12:00:00",
        ayanamsa_mode=ayanamsa
    )
    
    return horo.to_dict()
