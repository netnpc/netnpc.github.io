#!/usr/bin/env python3
"""
Stamps static assets with a version to defeat browser/CDN caching.

Background:
  GitHub Pages serves js/*.js with `cache-control: max-age=600`.
  index.html references js/main.js, which imports './game.js', and so on down
  the chain with no version marker anywhere -- so after a code change users can
  keep running the old files for up to 10 minutes. The symptom looks like
  "I changed it but nothing happened".

How it works:
  A UTC timestamp is injected into:
    - window.__BUILD__ in index.html
    - <script src="js/main.js?v=..."> in index.html
    - every from './xxx.js?v=...' inside js/*.js
  The rewritten files are then re-added to the staging area.

  Using the short hash of the commit about to be created is not possible
  (the commit does not exist yet), so a timestamp is used instead: unique
  enough, and independent of the commit hash.

Usage: run from the pre-commit hook, or by hand before publishing.
"""
import os, re, subprocess, time, sys

ROOT = subprocess.check_output(
    ['git', 'rev-parse', '--show-toplevel']).decode().strip()

# Version stamp: UTC timestamp, second precision.
VER = time.strftime('%Y%m%d%H%M%S', time.gmtime())

IMP = re.compile(r"""(from\s+['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
SCRIPT_SRC = re.compile(r"""(<script\s+type="module"\s+src=")([^"'?]+\.js)(?:\?v=[^"']*)?(")""")
BUILD_LIT = re.compile(r"""(window\.__BUILD__\s*=\s*['"])[^'"]*(['"])""")


def stamp(text):
    text = IMP.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={VER}{m.group(3)}', text)
    text = SCRIPT_SRC.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={VER}{m.group(3)}', text)
    text = BUILD_LIT.sub(lambda m: f'{m.group(1)}{VER}{m.group(2)}', text)
    return text


# Only touch the html/js files that are staged.
staged = subprocess.check_output(
    ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    cwd=ROOT).decode().split('\n')

targets = [f for f in staged if f.endswith(('.html', '.js')) and not f.startswith('vendor/')]
changed = []
for rel in targets:
    full = os.path.join(ROOT, rel)
    if not os.path.exists(full):
        continue
    with open(full, 'r', encoding='utf-8') as f:
        body = f.read()
    new = stamp(body)
    if new != body:
        with open(full, 'w', encoding='utf-8') as f:
            f.write(new)
        subprocess.run(['git', 'add', rel], cwd=ROOT, check=True)
        changed.append(rel)

if changed:
    print(f'[version-stamp] v={VER} -> {", ".join(changed)}')
else:
    print(f'[version-stamp] v={VER} (nothing to rewrite)')
