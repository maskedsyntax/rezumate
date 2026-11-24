#!/bin/zsh
# Cut "The Reveal" (Suno, ~122.5 BPM) onto the video's 120 BPM grid.
# Each piece is time-stretched so its beats land exactly on the video timeline.
#   video 0-4    <- track 9.73-13.65   (lead-in under the hook)
#   video 4-18   <- track 13.65-27.36  (main beat, 28 beats)
#   video 18-28  <- track 44.29-53.90  (breath + final section, hit at 53.90 -> 28.0)
#   video 28-31  <- track 53.90-55.60  (hit ring-out, same stretch)
cd "${0:A:h}"
IN=assets/the-reveal.wav
OUT=../out/music.wav
f() { python3 -c "print(($2-$1)/$3)"; }
A=$(f 9.73 13.65 4); B=$(f 13.65 27.36 14); C=$(f 44.29 53.90 10)
ffmpeg -y -loglevel error -i $IN -filter_complex "
[0]asplit=3[i1][i2][i3];
[i1]atrim=9.73:13.65,asetpts=N/SR/TB,atempo=${A}[a];
[i2]atrim=13.65:27.36,asetpts=N/SR/TB,atempo=${B}[b];
[i3]atrim=44.29:55.60,asetpts=N/SR/TB,atempo=${C},apad=whole_dur=13[c];
[a][b]acrossfade=d=0.012:c1=tri:c2=tri[ab];
[ab][c]acrossfade=d=0.012:c1=tri:c2=tri,atrim=0:31,apad=whole_dur=31[m]" -map "[m]" -ar 48000 $OUT
# Add a long reverb tail to the final hit so the end card isn't silent
python3 - "$OUT" <<'PY'
import sys, wave, numpy as np
p = sys.argv[1]; w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float).reshape(-1, ch) / 32768; w.close()
rng = np.random.default_rng(3)
n = int(3.2 * sr); t = np.arange(n) / sr
a, b = int(27.85 * sr), int(29.0 * sr)
out = x.copy()
for c in range(ch):
    ir = rng.standard_normal(n) * np.exp(-t / 0.75)
    IR = np.fft.rfft(ir, 4 * n); f = np.fft.rfftfreq(4 * n, 1 / sr); IR /= np.sqrt(1 + (f / 4000) ** 4)
    seg = x[a:b, c]
    wet = np.fft.irfft(np.fft.rfft(seg, 4 * n) * IR, 4 * n)[: len(seg) + n]
    wet /= np.abs(wet).max() + 1e-9
    end = min(len(out), a + len(wet))
    out[a:end, c] += wet[: end - a] * 0.22
fade = np.ones(len(out)); k0 = int(29.8 * sr); fade[k0:] = np.linspace(1, 0, len(out) - k0)
out *= fade[:, None]
out /= max(1.0, np.abs(out).max() / 0.95)
w = wave.open(p, "wb"); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
PY
