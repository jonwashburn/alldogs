"""Check crawler-visible social metadata without JavaScript or private data."""
from html.parser import HTMLParser
from pathlib import Path
import struct
import sys

IMAGE = 'assets/all-dogs-social-barack-close-20260917.png'
URL = 'https://alldogs.wtf/' + IMAGE
PAGES = ('index.html', 'welcome/index.html', 'dog-pound/index.html', 'dog-pound/application/index.html')


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'head':
            self.in_head = True
        if tag == 'meta' and self.in_head:
            attrs = dict(attrs)
            key = attrs.get('property') or attrs.get('name')
            if key and key.startswith(('og:', 'twitter:')):
                assert key not in self.tags, f'Duplicate metadata: {key}'
                self.tags[key] = attrs.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'head':
            self.in_head = False


def check(root, generated=False):
    image = (root / IMAGE).read_bytes()
    assert image[:8] == b'\x89PNG\r\n\x1a\n', 'Share image must be a real PNG'
    width, height = struct.unpack('>II', image[16:24])
    assert (width, height) == (1774, 887)
    assert 0 < len(image) < 5_000_000
    pages = list(PAGES)
    if generated:
        pages += ['vouch/1/index.html', 'vouch/10000/index.html']
    for name in pages:
        parser = Head()
        parser.feed((root / name).read_text())
        tags = parser.tags
        assert tags['og:image'] == tags['twitter:image'] == URL, name
        assert tags['twitter:card'] == 'summary_large_image', name
        assert tags['twitter:title'] == tags['og:title'] != '', name
        assert tags['twitter:description'] == tags['og:description'] != '', name
        assert tags['og:image:type'] == 'image/png', name
        assert int(tags['og:image:width']) == width, name
        assert int(tags['og:image:height']) == height, name
        assert tags['og:image:alt'] == tags['twitter:image:alt'] != '', name
        if name.startswith('vouch/'):
            assert tags['og:url'] == 'https://alldogs.wtf/' + name.removesuffix('/index.html'), name
    print(f'Social preview checks passed for {len(pages)} pages; {width}x{height}, {len(image)} bytes.')


if __name__ == '__main__':
    check(Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.'), '--generated' in sys.argv)
