import re,sys
D='/Users/rakeshgangwar/SuperJackfruit/superpipeline-worktrees/vibes-sweep-plan/apps/web/e2e/reference/mockups/'
def fg(name):
  s=open(D+name+'.html').read()
  i=s.find('class="fg')
  i=s.rfind('<',0,i)
  # find matching end of div.fg: count div depth
  depth=0;j=i
  for m in re.finditer(r'<(/?)div\b[^>]*>',s[i:]):
    depth+= -1 if m.group(1) else 1
    if depth==0: j=i+m.end();break
  t=s[i:j]
  t=re.sub(r' data-dc-tpl="\d+"','',t)
  t=re.sub(r'<span class="sc-interp">(.*?)</span>',r'\1',t,flags=re.S)
  t=re.sub(r'<svg[^>]*>.*?</svg>',lambda m: '<svg'+(' aria-label="'+re.search(r'aria-label="([^"]*)"',m.group(0)).group(1)+'"' if 'aria-label' in m.group(0)[:300] else '')+(' mood='+re.search(r'data-mood="(\w+)"',m.group(0)).group(1) if 'data-mood' in m.group(0) else '')+(' '+re.search(r'width="(\d+)"',m.group(0)).group(1) if 'width=' in m.group(0)[:200] else '')+'/>',t,flags=re.S)
  t=re.sub(r'\n\s*\n+','\n',t)
  return t
for n in sys.argv[1:]:
  open(n+'.txt','w').write(fg(n))
