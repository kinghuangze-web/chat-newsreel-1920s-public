"""Inspect the actual delivery MP4; viewing, semantics and listening remain separate."""
from pathlib import Path
import argparse,hashlib,json,math,re,subprocess

def run(cmd):return subprocess.run(cmd,check=True,capture_output=True,text=True,encoding='utf-8',errors='replace')
def inspect(video,fps=24,allow_silent=False,target_lufs=-14):
    if not math.isfinite(target_lufs) or not -70<=target_lufs<=-5:raise ValueError('target LUFS must be finite and within -70..-5')
    probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]).stdout)
    v=next(s for s in probe['streams']if s['codec_type']=='video');a=next((s for s in probe['streams']if s['codec_type']=='audio'),None)
    n,d=map(int,v['avg_frame_rate'].split('/'));actual=n/d;issues=[]
    if v['codec_name']!='h264' or v.get('pix_fmt')!='yuv420p':issues.append('expected H264/yuv420p')
    if abs(actual-fps)>.001:issues.append('unexpected fps')
    if not a and not allow_silent:issues.append('missing production audio')
    if a and a['codec_name']!='aac':issues.append('expected AAC')
    if a and a.get('channels')!=2:issues.append('expected stereo delivery audio')
    decode='PASS'
    try:run(['ffmpeg','-v','error','-xerror','-i',str(video),'-f','null','-'])
    except subprocess.CalledProcessError:decode='FAIL';issues.append('full decode failed')
    loud=None
    if a:
        measured=run(['ffmpeg','-hide_banner','-nostats','-i',str(video),'-af',f'loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json','-f','null','-'])
        loud=json.loads(re.findall(r'\{[^{}]+\}',measured.stderr,re.S)[-1]);i,tp=float(loud['input_i']),float(loud['input_tp'])
        if not math.isfinite(i)or abs(i-target_lufs)>1:issues.append(f'loudness outside {target_lufs:g} +/-1 LUFS')
        if not math.isfinite(tp)or tp>-1:issues.append('true peak exceeds -1 dBTP or invalid')
    digest=hashlib.sha256()
    with video.open('rb')as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
    return {'file':str(video.resolve()),'sha256':digest.hexdigest(),'bytes':video.stat().st_size,'width':v['width'],'height':v['height'],'fps':actual,'video_duration':float(v['duration']),'container_duration':float(probe['format']['duration']),'frames':int(v.get('nb_frames')or round(float(v['duration'])*actual)),'technical':{'status':'FAIL'if issues else'PASS','issues':issues,'full_decode':decode,'target_lufs':target_lufs,'loudness':loud},'content':{'status':'NOT_CHECKED'},'visual':{'status':'NOT_CHECKED'},'sound':{'status':'NOT_CHECKED','reason':'No human audition or narration ASR is performed by this script'},'allow_silent':allow_silent}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('video',type=Path);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--fps',type=float,default=24);ap.add_argument('--target-lufs',type=float,default=-14,help='episode target; measures input, does not normalize audio');ap.add_argument('--allow-silent',action='store_true',help='technical fixtures only; not a production approval');ap.add_argument('--timeline',type=Path);ap.add_argument('--frames',type=Path);a=ap.parse_args();r=inspect(a.video,a.fps,a.allow_silent,a.target_lufs)
    if a.timeline:
        tl=json.loads(a.timeline.read_text(encoding='utf-8'))
        if abs(tl['dur']-r['video_duration'])>.05:r['technical']['status']='FAIL';r['technical']['issues'].append('timeline and actual video duration differ')
    if a.frames:
        a.frames.mkdir(parents=True,exist_ok=True);last=(r['frames']-1)/r['fps'];times=[0,last]
        if a.timeline:
            for s in tl['secs']:times.extend([s['t0']-.1,s['t0']+.1])
            times.extend(tl.get('hits',{}).values())
        times=sorted({max(0,min(last,math.floor(t*r['fps'])/r['fps']))for t in times if isinstance(t,(float,int))})
        r['frame_samples']=[]
        for i,t in enumerate(times):
            target=a.frames/f'{i:03d}.png';run(['ffmpeg','-y','-v','error','-ss',str(max(0,t-.0001)),'-i',str(a.video),'-frames:v','1',str(target)])
            if not target.exists():raise RuntimeError('sample not produced: '+str(t))
            r['frame_samples'].append({'time':t,'file':str(target.resolve())})
    a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:r[k]for k in ['sha256','fps','video_duration','technical']},ensure_ascii=False));return 0 if r['technical']['status']=='PASS'else 1

if __name__=='__main__':raise SystemExit(main())
