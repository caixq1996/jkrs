from __future__ import annotations
import json, subprocess, sys, time
from pathlib import Path
import numpy as np
import soundfile as sf
import joe_us_piper_voice
from piper.config import SynthesisConfig
from piper.voice import PiperVoice

ROOT=Path('/mnt/data/pin2patch-work')
SRC=ROOT/'assets'/'demo-video'
OUT=ROOT/'assets'/'demo-video-human'
items=json.loads((OUT/'narration.json').read_text())
indices=[int(x) for x in sys.argv[1:]]
voice=PiperVoice.load(joe_us_piper_voice.model_path(), joe_us_piper_voice.config_path())
config=SynthesisConfig(length_scale=1.03, noise_scale=.60, noise_w_scale=.74, normalize_audio=True, volume=.94)

def run(cmd): subprocess.run(cmd, check=True)
def duration(path):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],check=True,capture_output=True,text=True)
    return float(r.stdout.strip())
for i in indices:
    item=items[i]; sid=item['id']; print(f'synth {sid}',flush=True)
    chunks=list(voice.synthesize(item['text'], syn_config=config))
    sr=chunks[0].sample_rate
    silence=np.zeros(round(sr*.16), dtype=np.float32)
    pieces=[]
    for j,ch in enumerate(chunks):
        pieces.append(ch.audio_float_array)
        if j+1<len(chunks): pieces.append(silence)
    raw=OUT/f'{sid}.raw.wav'; wav=OUT/f'{sid}.wav'; mp4=OUT/f'{sid}.mp4'
    sf.write(raw,np.concatenate(pieces),sr,subtype='PCM_16')
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af','aresample=48000,highpass=f=65,lowpass=f=12000,acompressor=threshold=-21dB:ratio=2:attack=18:release=240:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=8,adelay=260,apad=pad_dur=0.50','-ar','48000','-ac','1',str(wav)])
    d=duration(wav)
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(SRC/f'{sid}.png'),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p','-c:v','libx264','-preset','veryfast','-tune','stillimage','-r','30','-c:a','aac','-b:a','160k','-t',f'{d:.3f}','-shortest','-movflags','+faststart',str(mp4)])
    print(f'{sid} {d:.2f}s',flush=True)
