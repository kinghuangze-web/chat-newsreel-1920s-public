"""Behavioral checks for the portable single-clock helper (fictional data only)."""
from pathlib import Path
import copy,importlib.util,json,subprocess,sys,tempfile,unittest,wave
ROOT=Path(__file__).resolve().parents[1];S=ROOT/'skills/codex-1920s-news'
spec=importlib.util.spec_from_file_location('schedule',S/'scripts/schedule.py');schedule=importlib.util.module_from_spec(spec);spec.loader.exec_module(schedule)

class Scheduling(unittest.TestCase):
    def setUp(self):
        self.plan=json.loads((S/'assets/episode.example.json').read_text(encoding='utf-8'));self.d=json.loads((S/'assets/durations.example.json').read_text())
    def test_real_wav_lengths_and_direct_ending(self):
        with tempfile.TemporaryDirectory()as tmp:
            p=Path(tmp)
            for k,d in self.d.items():
                with wave.open(str(p/(k+'.wav')),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b'\0\0'*round(d*24000))
            subprocess.run([sys.executable,str(S/'scripts/schedule.py'),str(S/'assets/episode.example.json'),'--voices',str(p),'--out',str(p/'timeline.json')],check=True,capture_output=True)
            tl=json.loads((p/'timeline.json').read_text(encoding='utf-8'))
            self.assertEqual(tl['duration_basis'],'measured_wav');self.assertEqual([s['id']for s in tl['secs']],['logo','host','workflow','progress','outro'])
            self.assertGreaterEqual(tl['end_gap'],.3-1e-9);self.assertLess(tl['end_gap'],.3+1/24+1e-9)
            for a,b in zip(tl['lines'],tl['lines'][1:]):self.assertLessEqual(a['t']+a['duration']+.15,b['t'])
            self.assertIn('派发之后',(p/'timeline.srt').read_text(encoding='utf-8'))
    def test_missing_editorial_relation_rejected(self):
        self.plan['stories'][1].pop('bridge')
        with self.assertRaisesRegex(ValueError,'editorial relation'):schedule.build(self.plan,self.d)
    def test_fact_without_source_rejected(self):
        self.plan['narration'][1]['source_ids']=[]
        with self.assertRaisesRegex(ValueError,'fact needs'):schedule.build(self.plan,self.d)
    def test_unknown_source_rejected(self):
        self.plan['narration'][1]['source_ids']=['missing']
        with self.assertRaisesRegex(ValueError,'unknown source'):schedule.build(self.plan,self.d)
    def test_duplicate_voice_rejected(self):
        self.plan['stories'][1]['line_ids']=['A1']
        with self.assertRaisesRegex(ValueError,'scheduled twice'):schedule.build(self.plan,self.d)
    def test_invalid_duration_rejected(self):
        for d in [-1,float('nan'),float('inf'),0]:
            data=copy.deepcopy(self.d);data['A1']=d
            with self.assertRaises(ValueError):schedule.build(self.plan,data)
    def test_unverified_json_not_upgraded(self):
        tl=schedule.build(self.plan,self.d,'provided_json_unverified');self.assertEqual(tl['duration_basis'],'provided_json_unverified')

if __name__=='__main__':unittest.main()
