"""Build a single frame-aligned clock from an episode plan and measured WAVs."""
from pathlib import Path
import argparse,json,math,wave

def build(plan,durations,basis='measured_wav'):
    fps=plan.get('fps',24)
    if not isinstance(fps,int) or not 1<=fps<=60:raise ValueError('fps must be an integer in 1..60')
    def number(v):
        if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0:raise ValueError('timing must be finite and nonnegative')
        return v
    def frame(t):return math.ceil((t-1e-9)*fps)/fps
    lines=plan['narration'];by={x['id']:x for x in lines}
    if len(by)!=len(lines):raise ValueError('duplicate narration id')
    known=set(plan.get('source_ids',[]))
    for l in lines:
        d=number(durations[l['id']])
        if d<=0:raise ValueError('voice duration must be positive: '+l['id'])
        refs=set(l.get('source_ids',[]))
        if l.get('role','fact')=='fact' and not refs:raise ValueError('fact needs source_ids: '+l['id'])
        if refs-known:raise ValueError('unknown source reference: '+l['id'])
    intro=number(plan.get('opening_seconds',4));secs=[{'id':'logo','t0':0,'t1':frame(intro)}];scheduled=[];used=set()
    def section(sid,ids,min_seconds=0):
        if sid in {x['id']for x in secs}:raise ValueError('duplicate scene id: '+sid)
        if not ids:raise ValueError('scene has no narration: '+sid)
        start=secs[-1]['t1'];t=start+.25
        for k in ids:
            if k in used:raise ValueError('narration scheduled twice: '+k)
            used.add(k);at=frame(t);scheduled.append(dict(by[k],t=at,duration=durations[k],scene=sid));t=at+durations[k]+.4
        secs.append({'id':sid,'t0':start,'t1':frame(max(start+number(min_seconds),t))})
    if plan.get('host_line'):section('host',[plan['host_line']])
    stories=plan['stories']
    if not stories:raise ValueError('at least one story required')
    for i,s in enumerate(stories):
        bridge=s.get('bridge');ids=list(s['line_ids'])
        if i and (not bridge or not bridge.get('relation','').strip()):raise ValueError('later story needs an explicit editorial relation')
        if bridge:
            if by[bridge['line_id']].get('role')!='editorial':raise ValueError('bridge must be labelled editorial')
            ids.insert(0,bridge['line_id'])
        section(s['id'],ids,s.get('min_seconds',0))
    section('outro',[plan['goodbye_line']]);last=scheduled[-1]
    secs[-1]['t1']=frame(last['t']+last['duration']+.3)
    if used!=set(by):raise ValueError('unused narration ids: '+','.join(sorted(set(by)-used)))
    for a,b in zip(scheduled,scheduled[1:]):
        if a['t']+a['duration']>b['t']-.15:raise ValueError('narration overlap')
    return {'fps':fps,'dur':secs[-1]['t1'],'secs':secs,'lines':scheduled,'hits':{s['id']+'_begin':s['t0']for s in secs},'duration_basis':basis,'end_gap':secs[-1]['t1']-last['t']-last['duration'],'source_window':plan.get('source_window'),'status':'TIMING_OK','scope':'timing and source-reference presence only; no semantic or listening approval'}

def srt(tl):
    def stamp(t):
        n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
    out=[]
    for i,l in enumerate(tl['lines']):
        end=min(l['t']+l['duration']+.3,tl['lines'][i+1]['t']-.06 if i+1<len(tl['lines'])else tl['dur'])
        out.append(f"{i+1}\n{stamp(l['t'])} --> {stamp(end)}\n{l['zh']}\n"+(l.get('en','')+'\n'if l.get('en')else''))
    return '\n'.join(out)

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('plan',type=Path);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--voices',type=Path);g.add_argument('--durations',type=Path,help='explicit externally measured durations or clearly labelled fixtures');ap.add_argument('--out',type=Path,required=True);a=ap.parse_args()
    plan=json.loads(a.plan.read_text(encoding='utf-8'))
    if a.voices:
        durations={}
        for l in plan['narration']:
            with wave.open(str(a.voices/(l['id']+'.wav')),'rb')as w:durations[l['id']]=w.getnframes()/w.getframerate()
        basis='measured_wav'
    else:durations=json.loads(a.durations.read_text(encoding='utf-8'));basis='provided_json_unverified'
    tl=build(plan,durations,basis);a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(tl,ensure_ascii=False,indent=2),encoding='utf-8');a.out.with_suffix('.srt').write_text(srt(tl),encoding='utf-8');print(json.dumps({'status':tl['status'],'duration':tl['dur'],'lines':len(tl['lines']),'duration_basis':basis}))

if __name__=='__main__':main()
