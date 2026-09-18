#!/usr/bin/env python3
"""Generate static, crawlable HTML pages for published articles from Supabase.

The existing bai-viet.html?id=... URLs remain functional. New/static pages are
published at /bai-viet/<id>.html and are used as canonical URLs and sitemap URLs.
"""
import html
import json
import os
import re
import shutil
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

def normalize_slug(value, fallback_id):
    import unicodedata
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFKD", value)