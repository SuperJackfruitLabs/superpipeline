import re,sys
D='/Users/rakeshgangwar/SuperJackfruit/superpipeline-worktrees/vibes-sweep-plan/apps/web/e2e/reference/mockups/'
seen={}
for n in sys.argv[1:]:
  s=open(D+n+'.html').read()
  i=s.find('class="fg')
  s=s[i:]
  for m in re.finditer(r'<svg([^>]*)>(.*?)</svg>',s,flags=re.S):
    if 'data-mood' in m.group(1): continue
    inner=re.sub(r' data-dc-tpl="\d+"','',m.group(2))
    w=re.search(r'width="(\d+)"',m.group(1))
    ctx=re.sub(r'<[^>]+>','',s[m.end():m.end()+200])[:40].strip()
    key=inner
    if key not in seen:
      seen[key]=(w.group(1) if w else '?',ctx,n)
for k,(w,ctx,n) in seen.items(): print(w,'|',ctx.replace('\n',' '),'|',k)
