"""Inline the Claude Design component markup (comp2/<Name>.html) into a reel source: {{C:Name}} -> markup."""
import re, sys, os
ROOT = os.path.dirname(os.path.abspath(__file__))
for n in sys.argv[1:]:
    s = open(os.path.join(ROOT, f'r{n}.src.html')).read()
    s = re.sub(r'\{\{C:(\w+)\}\}', lambda m: open(next(p for p in (os.path.join(ROOT, d, m.group(1) + '.html') for d in ('comp3', 'comp2')) if os.path.exists(p))).read(), s)
    open(os.path.join(ROOT, f'reel{n}.html'), 'w').write(s)
