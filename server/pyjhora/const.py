#!/usr/bin/env python
# -*- coding: UTF-8 -*-
"""
PyJHora Constants Module
Adapted from PyJHora library for server-side use
"""
import os

_APP_VERSION = "1.0.0"

_sep = os.path.sep
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
_EPHIMERIDE_DATA_PATH = os.path.join(ROOT_DIR, 'data', 'ephe')
_LANGUAGE_PATH = os.path.join(ROOT_DIR, 'lang')
_world_city_csv_file = os.path.join(ROOT_DIR, 'data', 'world_cities_with_tz.csv')
_open_elevation_api_url = lambda lat, long: f'https://api.open-elevation.com/api/v1/lookup?locations={lat},{long}'

_DEFAULT_LANGUAGE = 'en'
_DEFAULT_LANGUAGE_LIST_STR = 'list_values_'
_DEFAULT_LANGUAGE_MSG_STR = 'msg_strings_'
_DEFAULT_YOGA_JSON_FILE_PREFIX = "yoga_msgs_"
_DEFAULT_RAJA_YOGA_JSON_FILE_PREFIX = "raja_yoga_msgs_"
_DEFAULT_DOSHA_JSON_FILE_PREFIX = "dosha_msgs_"
_DEFAULT_PREDICTION_JSON_FILE_PREFIX = "prediction_msgs_"
_INCLUDE_URANUS_TO_PLUTO = True

_degree_symbol = "°"
_minute_symbol = u'\u2019'
_second_symbol = '"'
_retrogade_symbol = '℞'
_ascendant_symbol = 'L'

_planet_symbols = ['ℒ', '☉', '☾', '♂', '☿', '♃', '♀', '♄', '☊', '☋']
_zodiac_symbols = ['\u2648', '\u2649', '\u264A', '\u264B', '\u264C', '\u264D', 
                   '\u264E', '\u264F', '\u2650', '\u2651', '\u2652', '\u2653']

available_languages = {"English": 'en', 'Tamil': 'ta', 'Telugu': 'te', 
                       'Hindi': "hi", 'Kannada': 'ka', 'Malayalam': 'ml'}

division_chart_factors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60, 81, 108, 144]

day_rulers = [[0, 1, 2, 3, 4, 5, 6, -1], [1, 2, 3, 4, 5, 6, -1, 0], [2, 3, 4, 5, 6, -1, 0, 1],
              [3, 4, 5, 6, -1, 0, 1, 2], [4, 5, 6, -1, 0, 1, 2, 3], [5, 6, -1, 0, 1, 2, 3, 4],
              [6, -1, 0, 1, 2, 3, 4, 5]]
night_rulers = [[4, 5, 6, -1, 0, 1, 2, 3], [5, 6, -1, 0, 1, 2, 3, 4], [6, -1, 0, 1, 2, 3, 4, 5],
                [0, 1, 2, 3, 4, 5, 6, -1], [1, 2, 3, 4, 5, 6, -1, 0], [2, 3, 4, 5, 6, -1, 0, 1],
                [3, 4, 5, 6, -1, 0, 1, 2]]

_TROPICAL_MODE = False
_ephe_path = _EPHIMERIDE_DATA_PATH

sidereal_year = 365.256364
lunar_year = 354.36707
savana_year = 360
average_gregorian_year = 365.2425
tropical_year = 365.242190
human_life_span_for_dhasa = 120.0

adhipati_list = [8, 5, 0, 1, 2, 7, 4, 6, 3]
mahadasa = {8: 7, 5: 20, 0: 6, 1: 10, 2: 7, 7: 18, 4: 16, 6: 19, 3: 17}

available_horoscope_calculation_methods = ['drik', 'ss']
_DEFAULT_AYANAMSA_MODE = 'LAHIRI'
human_life_span_for_vimsottari_dhasa = 120
vimsottari_adhipati_list = [8, 5, 0, 1, 2, 7, 4, 6, 3]
vimsottari_dict = {8: 7, 5: 20, 0: 6, 1: 10, 2: 7, 7: 18, 4: 16, 6: 19, 3: 17}

rasi_names_en = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

natural_benefics = [4, 5]
natural_malefics = [0, 2, 6, 7, 8]
feminine_planets = [1, 3, 5, 6]
masculine_planets = [0, 2, 4]

nakshatra_lords = [8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3]

house_lords_dict = {0: [4], 1: [3], 2: [0, 7], 3: [2, 5], 4: [8, 11], 5: [1, 6], 6: [9, 10], 7: [10], 8: [7]}

movable_signs = [0, 3, 6, 9]
fixed_signs = [1, 4, 7, 10]
dual_signs = [2, 5, 8, 11]

odd_signs = [0, 2, 4, 6, 8, 10]
even_signs = [1, 3, 5, 7, 9, 11]

fire_signs = [0, 4, 8]
earth_signs = [1, 5, 9]
air_signs = [2, 6, 10]
water_signs = [3, 7, 11]

east_signs = [0, 4, 8]
south_signs = [1, 5, 9]
west_signs = [2, 6, 10]
north_signs = [3, 7, 11]

bhaava_madhya_method = 1
DEFAULT_CUSTOM_VARGA_FACTOR = 1
use_24hour_format_in_to_dms = True
check_database_for_world_cities = False

_arudha_lagnas_included_in_chart = {1: 'AL', 2: 'A2', 3: 'A3', 4: 'A4', 5: 'A5', 6: 'A6',
                                     7: 'A7', 8: 'A8', 9: 'A9', 10: 'A10', 11: 'A11', 12: 'UL'}

yogam_lords_and_avayogis = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0),
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0),
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0),
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6)
]

_solar_upagraha_list = ['dhuma', 'vyatipaata', 'parivesha', 'indrachaapa', 'upaketu']
_other_upagraha_list = ['kaala', 'mrityu', 'artha_prabhakara', 'yama', 'gulika', 'maandi']
_special_lagna_list = ['bhava_lagna', 'hora_lagna', 'ghati_lagna', 'vighati_lagna', 'sree_lagna',
                       'varnada_lagna', 'pranapada_lagna', 'indu_lagna', 'bhrigu_bindhu']
