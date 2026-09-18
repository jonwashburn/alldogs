"""Static art-first release checks. No API calls or customer data."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path.cwd()
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.ids = set()
        self.tags = []
        self.feed((ROOT / path).read_text())
        assert not self.stack, (path, 'Unclosed tags', self.stack)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, (self.path, 'Duplicate ID', attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'form':
            assert 'form' not in self.stack, (self.path, 'Nested form')
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        assert self.stack and self.stack[-1] == tag, (self.path, 'Bad closing tag', tag, self.stack[-4:])
        self.stack.pop()

pages = {name: Page(name) for name in ('index.html', 'about/index.html', 'adoption/index.html')}
for name, page in pages.items():
    assert sum(tag == 'h1' for tag, _ in page.tags) == 1, name
    navigation = re.search(r'<nav aria-label="Main navigation">(.*?)</nav>', (ROOT / name).read_text()).group(1)
    assert re.search(r'<a href="/about/"[^>]*>The work</a>', navigation), name
    assert re.search(r'<a href="/adoption/"[^>]*>The rules</a>', navigation), name
    assert 'Join the waitlist' in navigation, name
    assert not any(attrs.get('href') == '/dog-pound/' for _, attrs in page.tags), (name, 'Keep Pound entry behind application')
    for tag, attrs in page.tags:
        for attr in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            if attr in attrs:
                assert set(attrs[attr].split()) <= page.ids, (name, attr, attrs[attr])
        target = attrs.get('href', '')
        if target.startswith('#'):
            assert target[1:] in page.ids, (name, target)
        if tag == 'script' and 'src' in attrs:
            assert (ROOT / attrs['src'].split('?')[0].lstrip('/')).is_file(), (name, attrs['src'])

home = (ROOT / 'index.html').read_text()
guide = (ROOT / 'adoption/index.html').read_text()
about = (ROOT / 'about/index.html').read_text()
script = (ROOT / 'home.js').read_text()
assert [attrs['data-art-name'] for tag, attrs in pages['index.html'].tags if 'data-art-name' in attrs] == ['Barack', 'Amy', 'Afterburn']
assert sum('data-rotating-painting' in attrs for _, attrs in pages['index.html'].tags) == 2
assert sum(tag in ('h1', 'h2', 'h3') for tag, _ in pages['index.html'].tags) == 5  # Main three + application heading + receipt heading.
assert not any(tag == 'video' for tag, _ in pages['index.html'].tags)
assert 'Math.random' not in script and 'fetch(' not in script and 'setInterval' not in script
assert 'setInterval' not in (ROOT / 'home-rotation.js').read_text()
assert 'zombie apocalypse' in home and 'you have to kill it' in home
assert '1 in 20' in home and '50%' in home and 'every dog it reaches' in home
assert 'Preview only. No record is changed.' in home
assert 'application-terms' in pages['index.html'].ids
for phrase in ('seven days', 'One direct adoption per person, ever.', 'does not reserve a dog'):
    assert phrase in home, phrase
for path in ('index.html', 'adoption/index.html', 'dog-pound/application/index.html', 'dog-pound/application/application.js', 'account/account.js', 'account/payments.js'):
    copy = (ROOT / path).read_text().lower()
    for outdated in ('not open yet', 'being connected', 'not connected yet', 'not sending yet', 'when adoption opens', 'will open here when', 'getting the lounge ready'):
        assert outdated not in copy, (path, outdated)
for phrase in ('first resale only', '1 in 20', '50%', 'generation two', 'permanently recorded', 'infection-created', 'cannot be rescued', 'five powers', '1 in 1,600', '0.0625%', 'five days', 'three can be pending', 'successful mint timestamp', 'lifespan and cause of death'):
    assert phrase in guide, phrase
for phrase in ('marie-painting-flow-4k.mp4', 'preload="none"', 'Nobody has a picture.', 'paint-kit', 'exaltedlove.com'):
    assert phrase in about, phrase
for fragment in ('game', 'fates', 'why', 'medium'):
    target = 'adoption/index.html' if fragment in ('game', 'fates') else 'about/index.html'
    assert fragment in pages[target].ids
    assert "'#" + fragment + "'" in script
for field in ('application-form', 'wallet', 'handle', 'website', 'submit-application', 'form-status', 'receipt', 'receipt-code', 'application-email-form', 'notification-email', 'art-updates', 'share-application', 'copy-receipt'):
    assert field in pages['index.html'].ids, field
print('Art-first release checks passed: HTML nesting, unique IDs, references, three-work hang, relocated rules, legacy anchors, modal and preserved form hooks.')
