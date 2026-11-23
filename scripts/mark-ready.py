"""Mark lessons as 'available' once both MDX files exist.

Usage: python scripts/mark-ready.py <course-slug> [<course-slug> ...]

Content tests then verify the lesson also has >= 3 exercises.
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'packages', 'content', 'src', 'tracks')
LESSON = re.compile(r"^(\s*lesson\('([a-z0-9-]+)',.*, (\d+))\),$")

for course in sys.argv[1:]:
    track = os.path.join(ROOT, course, 'track.ts')
    lessons_dir = os.path.join(ROOT, course, 'lessons')
    ready = set()
    for module in os.listdir(lessons_dir) if os.path.isdir(lessons_dir) else []:
        for f in os.listdir(os.path.join(lessons_dir, module)):
            slug = f.split('.')[0]
            if all(os.path.exists(os.path.join(lessons_dir, module, f'{slug}.{lang}.mdx')) for lang in ('vi', 'en')):
                ready.add(slug)
    out, changed = [], 0
    for line in open(track, encoding='utf-8').read().split('\n'):
        m = LESSON.match(line)
        if m and m.group(2) in ready:
            line = f"{m.group(1)}, 'available'),"
            changed += 1
        out.append(line)
    open(track, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
    print(f'{course}: {changed} lesson(s) marked available')
