"""Generate public short-link shells; no applicant data is baked into the site."""
from pathlib import Path
import re
import sys

SHORT_LINK_LIMIT = 10000  # Keep in sync with the application API's alias limit.


def build(destination):
    root = Path(destination).resolve()
    template = (root / 'dog-pound/application/index.html').read_text()
    assert 'https://alldogs.wtf/og.png' in template
    assert 'src="/dog-pound/application/application.js?' in template
    assert 'href="/dog-pound/pound.css?' in template
    assert (root / 'og.png').is_file()
    assert (root / 'CNAME').read_text().strip() == 'alldogs.wtf'
    template = re.sub(r'<link\b[^>]*rel="canonical"[^>]*>', '', template)
    template = re.sub(r'<meta\b[^>]*property="og:url"[^>]*>', '', template)
    for number in range(1, SHORT_LINK_LIMIT + 1):
        url = f'https://alldogs.wtf/vouch/{number}'
        metadata = f'<link rel="canonical" href="{url}"><meta property="og:url" content="{url}">'
        page = root / 'vouch' / str(number) / 'index.html'
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(template.replace('</head>', metadata + '</head>'))
    print(f'Published {SHORT_LINK_LIMIT} numeric route shells; application data stays in the API.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: build-vouch-pages.py OUTPUT_DIRECTORY')
    build(sys.argv[1])
