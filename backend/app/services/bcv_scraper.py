import requests
from bs4 import BeautifulSoup
import re
import logging
import urllib3

# El BCV usa un certificado que no está en el bundle de Railway/Docker
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

BCV_URL = 'https://www.bcv.org.ve/'
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    )
}


def obtener_tasa_bcv() -> float | None:
    """Scrape BCV website for today's USD/VES rate. Returns float or None."""
    try:
        resp = requests.get(BCV_URL, headers=HEADERS, timeout=15, verify=False)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        # Strategy 1: look for the USD strong tag in #dolar section
        dolar_div = soup.find(id='dolar')
        if dolar_div:
            strong = dolar_div.find('strong')
            if strong:
                valor = _parse_valor(strong.get_text())
                if valor:
                    return valor

        # Strategy 2: search for a number near "USD" or "DÓLAR"
        for tag in soup.find_all(['strong', 'span', 'div', 'td']):
            text = tag.get_text(strip=True)
            if re.search(r'USD|DÓLAR|DOLAR', text, re.I):
                # Look for sibling/child with a number
                parent = tag.parent
                if parent:
                    for sibling in parent.find_all(True):
                        valor = _parse_valor(sibling.get_text())
                        if valor and valor > 1:
                            return valor

        # Strategy 3: find any number that looks like a VES rate (> 10, < 10_000_000)
        all_text = soup.get_text()
        matches = re.findall(r'\b(\d{1,7}[,\.]\d{4})\b', all_text)
        for match in matches:
            valor = _parse_valor(match)
            if valor and 10 < valor < 10_000_000:
                return valor

    except Exception as e:
        logger.warning(f"BCV scraper failed: {e}")

    return None


def _parse_valor(text: str) -> float | None:
    """Parse a string like '36,3849' or '36.3849' to float."""
    text = text.strip().replace('\xa0', '').replace(' ', '')
    # Venezuelan format uses comma as decimal separator
    text = re.sub(r'[^\d,\.]', '', text)
    if not text:
        return None
    try:
        # If comma present and it's the decimal sep (e.g. "36,3849")
        if ',' in text and '.' not in text:
            text = text.replace(',', '.')
        elif ',' in text and '.' in text:
            # Thousand sep is period, decimal is comma: "1.234,56"
            text = text.replace('.', '').replace(',', '.')
        return float(text)
    except ValueError:
        return None
