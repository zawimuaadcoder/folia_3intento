"""Inline the Claude Design component markup (comp2/<Name>.html) into a reel source: {{C:Name}} -> markup."""
import re, sys, os
ROOT = os.path.dirname(os.path.abspath(__file__))
for n in sys.argv[1:]:
    s = open(os.path.join(ROOT, f'r{n}.src.html')).read()
    s = re.sub(r'\{\{C:(\w+)\}\}', lambda m: open(os.path.join(ROOT, 'comp2', m.group(1) + '.html')).read(), s)
    open(os.path.join(ROOT, f'reel{n}.html'), 'w').write(s)
