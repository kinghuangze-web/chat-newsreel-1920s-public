"""Fresh synthetic MP4 checks, never a claim of creative or listening acceptance."""
from pathlib import Path
import importlib.util,json,shutil,subprocess,sys,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1];SCRIPT=ROOT/'skills/codex-1920s-news/scripts/inspect_video.py'
spec=importlib.util.spec_from_file_location('inspect_video',SCRIPT);media=importlib.util.module_from_spec(spec);spec.loader.exec_module(media)

@unittest.skipUnless(shutil.which('ffmpeg')and shutil.which('ffprobe'),'FFmpeg/FFprobe required')
class MediaContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.p=Path(cls.tmp.name);cls.video=cls.p/'synthetic.mp4'
        subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=c=black:size=320x180:rate=24:duration=1','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-af','loudnorm=I=-14:TP=-1.5:LRA=11','-ac','2','-c:a','aac','-movflags','+faststart',str(cls.video)],check=True)
    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()
    def test_technical_pass_keeps_other_categories_unchecked(self):
        r=media.inspect(self.video);self.assertEqual(r['technical']['status'],'PASS')
        for name in ['content','visual','sound']:self.assertEqual(r[name]['status'],'NOT_CHECKED')
        self.assertEqual(len(r['sha256']),64)
        self.assertEqual(media.inspect(self.video,fps=25)['technical']['status'],'FAIL')
    def test_missing_audio_and_wrong_timeline_fail(self):
        silent=self.p/'silent.mp4';subprocess.run(['ffmpeg','-y','-v','error','-i',str(self.video),'-an','-c:v','copy',str(silent)],check=True)
        self.assertIn('missing production audio',media.inspect(silent)['technical']['issues'])
        timeline=self.p/'wrong.json';timeline.write_text(json.dumps({'dur':2,'secs':[],'hits':{}}));report=self.p/'result.json'
        r=subprocess.run([sys.executable,str(SCRIPT),str(self.video),'--timeline',str(timeline),'--out',str(report)],capture_output=True)
        self.assertEqual(r.returncode,1);self.assertIn('timeline and actual video duration differ',json.loads(report.read_text())['technical']['issues'])

    def test_configured_target_is_measured_without_rewriting_input(self):
        softer=self.p/'softer.mp4';subprocess.run(['ffmpeg','-y','-v','error','-i',str(self.video),'-c:v','copy','-af','volume=-2dB','-c:a','aac',str(softer)],check=True)
        default=media.inspect(softer);r=media.inspect(softer,target_lufs=-16)
        self.assertEqual(default['technical']['status'],'FAIL');self.assertEqual(r['technical']['status'],'PASS')
        self.assertEqual(r['technical']['target_lufs'],-16);self.assertEqual(r['sha256'],default['sha256']);self.assertEqual(r['sound']['status'],'NOT_CHECKED')
        for bad in [float('nan'),float('inf'),-71,0]:
            with self.assertRaises(ValueError):media.inspect(softer,target_lufs=bad)

if __name__=='__main__':unittest.main()
