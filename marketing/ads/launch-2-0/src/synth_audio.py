"""Synthesize the soundtrack for the Rezumate 2.0 launch video (32 s, 120 BPM).

Hook (0-4 s) is light and sparse; the groove drops at 4.0 s when the phone
rises; a fill leads into the final hit at 28.0 s (end card). UI sound effects
are placed on the same timeline as index.html. Output: ../out/audio.wav
Run: python3 synth_audio.py  (needs numpy only)
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).parent.parent / "out"
OUT.mkdir(exist_ok=True)
BPM = 120
BEAT = 60 / BPM
DUR = 32.0
rng = np.random.default_rng(11)
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, sec=None):
    total = n / SR
    t = np.arange(n) / SR
    e = np.ones(n) * s
    e = np.where(t < a, t / max(a, 1e-6), e)
    dm = (t >= a) & (t < a + d)
    e = np.where(dm, 1 - (1 - s) * (t - a) / max(d, 1e-6), e)
    rm = t > total - r
    e = np.where(rm, e * np.clip((total - t) / max(r, 1e-6), 0, 1), e)
    return e


def lowpass(x, cutoff):
    """One-pole lowpass; cutoff may be scalar or per-sample array."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha[i] * (x[i] - acc)
        y[i] = acc
    return y


def lowpass_fft(x, cutoff, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** (2 * order))
    return np.fft.irfft(X, len(x))


def highpass_fft(x, cutoff, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    with np.errstate(divide="ignore"):
        X *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X, len(x))


def bandpass_fft(x, lo, hi):
    return highpass_fft(lowpass_fft(x, hi), lo)


def saw(freq, t, voices=3, detune=0.12):
    out = np.zeros_like(t)
    for v in range(voices):
        d = (v - (voices - 1) / 2) * detune
        f = freq * 2 ** (d / 12)
        ph = rng.random()
        out += 2 * ((f * t + ph) % 1.0) - 1
    return out / voices


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    s = sig[: j - i] * gain
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += s * l * 1.414
    buf[i:j, 1] += s * r * 1.414


def write(path, stereo):
    peak = np.max(np.abs(stereo)) or 1
    stereo = stereo / peak * 0.89
    data = (stereo * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------------------------------------------------------------- instruments

def kick(dur=0.45, punch=1.0):
    t = t_axis(dur)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25 * punch
    return np.tanh((body + click) * 1.6)


def hat(dur=0.08, open_=False):
    t = t_axis(0.3 if open_ else dur)
    n = highpass_fft(rng.standard_normal(len(t)), 7000)
    return n * np.exp(-t * (14 if open_ else 60)) * 0.5


def clap(dur=0.3):
    t = t_axis(dur)
    n = bandpass_fft(rng.standard_normal(len(t)), 900, 5000)
    e = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += (t >= off) * np.exp(-(t - off).clip(0) * (90 if k < 2 else 16))
    return n * e * 0.6


def pluck(freq, dur=0.35):
    t = t_axis(dur)
    s = saw(freq, t, voices=2, detune=0.08)
    s = lowpass(s, 600 + 5200 * np.exp(-t * 18))
    return s * np.exp(-t * 9)


def pad(freqs, dur, bright=1400):
    t = t_axis(dur)
    s = sum(saw(f, t, voices=3, detune=0.16) for f in freqs) / len(freqs)
    s = lowpass_fft(s, bright)
    return s * env_adsr(len(t), a=0.35, d=0.2, s=0.9, r=0.5)


def sub(freq, dur):
    t = t_axis(dur)
    return np.sin(2 * np.pi * freq * t) * env_adsr(len(t), a=0.005, d=0.05, s=0.8, r=0.06)


# ---------------------------------------------------------------- music bed

N = int(DUR * SR)
music = np.zeros((N, 2))
bar = BEAT * 4

C = [60, 64, 67]
G = [59, 62, 67]
Am = [57, 60, 64]
F = [57, 60, 65]

# Hook: bars 0-1 (0-4 s). Filtered pad + soft plucks, a riser into 4.0
for b, ch in enumerate([C, G]):
    at = b * bar
    place(music, pad([midi(n) for n in ch], bar + 0.4, bright=900 + b * 400), at, 0.30)
    for s16 in range(0, 16, 2):
        n = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12][(s16 // 2) % 4]
        place(music, pluck(midi(n)), at + s16 * BEAT / 4, 0.07, pan=-0.4 if s16 % 4 else 0.4)
    for beat in range(4):
        place(music, hat(0.04), at + beat * BEAT + BEAT / 2, 0.10, pan=0.3)
rt = t_axis(1.5)
riser = bandpass_fft(rng.standard_normal(len(rt)), 400, 9000)
riser = lowpass(riser, 400 + 9000 * (rt / rt[-1]) ** 2) * (rt / rt[-1]) ** 2.2
place(music, riser, 2.5, 0.42)

# Groove: bars 2-13 (4-28 s), C G Am F
prog = [C, G, Am, F] * 3
for i, ch in enumerate(prog):
    b = 2 + i
    at = b * bar
    root = ch[0] - 24 if ch[0] >= 60 else ch[0] - 12
    p = pad([midi(n) for n in ch] + [midi(ch[0] + 12)], bar + 0.3, bright=2400)
    tt = np.arange(len(p)) / SR
    sc = 1 - 0.6 * np.exp(-((tt % BEAT) * 11))
    place(music, p * sc, at, 0.26)
    for e in range(8):
        s = sub(midi(root), BEAT / 2 * 0.9) + 0.25 * lowpass_fft(saw(midi(root), t_axis(BEAT / 2 * 0.9), voices=1), 500)
        place(music, s, at + e * BEAT / 2, 0.32 if e % 2 else 0.2)
    for beat in range(4):
        place(music, kick(), at + beat * BEAT, 0.8)
    for s16 in range(16):
        t16 = at + s16 * BEAT / 4
        if s16 % 4 == 2:
            place(music, hat(0.3, open_=True), t16, 0.18, pan=0.2)
        elif s16 % 2 == 1:
            place(music, hat(0.03), t16, 0.07, pan=-0.3)
    for beat in (1, 3):
        place(music, clap(), at + beat * BEAT, 0.36)
    arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
    for s16 in range(16):
        pl = pluck(midi(arp[s16 % 4]))
        pan = -0.45 if s16 % 2 else 0.45
        place(music, pl, at + s16 * BEAT / 4, 0.10, pan=pan)
        place(music, pl * 0.4, at + s16 * BEAT / 4 + BEAT * 0.75, 0.10, pan=-pan)

# Drop accent at 4.0 s
place(music, kick(0.9, punch=1.3), 4.0, 0.6)
ct = t_axis(1.8)
place(music, highpass_fft(rng.standard_normal(len(ct)), 5000) * np.exp(-ct * 2.2), 4.0, 0.18)

# Privacy beat (25.5-28): duck the groove a little so the lines land
duck = np.ones(N)
a, b = int(25.5 * SR), int(27.25 * SR)
duck[a:b] = 0.6
music *= duck[:, None]

# Fill 27.25-28.0, then the final hit
music[int(27.25 * SR):int(28.0 * SR)] *= 0.25
for k in range(12):
    place(music, clap(0.12), 27.25 + k * (0.75 / 12), 0.13 + 0.025 * k)
place(music, riser[-int(0.75 * SR):], 27.25, 0.35)

hit = 28.0
place(music, kick(0.9, punch=1.3), hit, 1.0)
cym_t = t_axis(2.6)
place(music, highpass_fft(rng.standard_normal(len(cym_t)), 5000) * np.exp(-cym_t * 1.6), hit, 0.2)
final = pad([midi(n) for n in [48, 55, 60, 64, 67, 72]], 4.0, bright=2600) * np.exp(-t_axis(4.0) * 0.5)
place(music, final, hit, 0.5)
for k, n in enumerate([72, 76, 79, 84]):
    place(music, pluck(midi(n), 1.2), hit + 0.12 * k, 0.15, pan=(-0.4 + 0.27 * k))
place(music, sub(midi(36), 3.2) * np.exp(-t_axis(3.2) * 1.0), hit, 0.4)

music = np.tanh(music * 1.1) / 1.1

# ---------------------------------------------------------------- SFX
def mono_to_stereo(x, width=0.0):
    return np.stack([x, x], axis=1)


def sfx_tap():
    t = t_axis(0.09)
    body = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 90)
    n = bandpass_fft(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 160) * 0.5
    return body * 0.6 + n


def sfx_whoosh(dur=0.5, up=True):
    t = t_axis(dur)
    n = rng.standard_normal(len(t))
    x = t / t[-1]
    cutoff = (300 + 6000 * x ** 1.5) if up else (6000 - 5500 * x ** 0.7)
    s = lowpass(n, cutoff)
    s = highpass_fft(s, 150)
    e = np.sin(np.pi * x) ** 1.5
    return s * e


def sfx_thud():
    t = t_axis(0.35)
    f = 70 + 90 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
    paper = bandpass_fft(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 45) * 0.35
    return s + paper


def sfx_chime(notes=(76, 83, 88), spacing=0.07, dur=1.4):
    out = np.zeros(int((dur + spacing * len(notes)) * SR))
    for k, n in enumerate(notes):
        t = t_axis(dur)
        f = midi(n)
        s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.12 * np.sin(2 * np.pi * f * 3.98 * t))
        s *= np.exp(-t * 3.2) * np.minimum(1, t * 400)
        i = int(k * spacing * SR)
        out[i:i + len(s)] += s
    return out / len(notes)


def sfx_pop():
    t = t_axis(0.12)
    f = 500 + 900 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)


def sfx_scan():
    t = t_axis(1.6)
    x = t / t[-1]
    s = np.sin(2 * np.pi * np.cumsum(300 + 900 * x) / SR) * 0.3
    s += lowpass(rng.standard_normal(len(t)), 1200 + 3000 * x) * 0.4
    return s * np.sin(np.pi * x) ** 0.8


def sfx_tick():
    t = t_axis(0.03)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 250)


def sfx_swish():
    return sfx_whoosh(0.28, up=False) * 0.8


FX = {
    "tap": sfx_tap(), "whoosh": sfx_whoosh(0.55), "whoosh-down": sfx_whoosh(0.5, up=False),
    "thud": sfx_thud(), "chime": sfx_chime(), "success": sfx_chime((72, 76, 79, 84), 0.06, 1.2),
    "pop": sfx_pop(), "tick": sfx_tick(), "swish": sfx_swish(),
}

# (time, name, gain) on the index.html timeline. Whooshes lead their visual by ~0.2 s.
EVENTS = [
    (0.3, "pop", 0.35),
    (0.0, "swish", 0.3), (0.5, "swish", 0.35),
    (2.12, "thud", 0.9), (2.45, "pop", 0.4),
    (3.75, "whoosh", 0.45), (4.4, "swish", 0.4), (4.95, "pop", 0.4), (5.7, "swish", 0.4),
    (6.15, "tap", 0.55), (7.45, "tap", 0.55),
    (7.8, "whoosh", 0.4), (9.1, "swish", 0.4),
    (11.1, "swish", 0.4), (12.2, "tap", 0.55), (12.3, "swish", 0.35), (13.2, "tap", 0.55), (13.95, "pop", 0.5),
    (14.3, "whoosh", 0.4), (16.8, "swish", 0.4), (18.25, "pop", 0.45),
    (19.3, "whoosh", 0.4), (21.1, "chime", 0.5), (21.15, "pop", 0.4),
    (22.3, "whoosh", 0.4), (23.0, "pop", 0.4),
    (25.3, "whoosh-down", 0.45), (25.75, "pop", 0.35), (26.1, "pop", 0.35), (26.45, "pop", 0.35),
    (28.0, "success", 0.45),
]
for k in range(4):
    EVENTS.append((11.45 + k * 0.09, "pop", 0.22))           # skill chips
for k in range(5):
    EVENTS.append((26.45 + k * 0.06, "tick", 0.2))           # redaction bars
for a, d, step in [(6.3, 0.8, 0.05), (15.4, 1.0, 0.07), (23.2, 1.9, 0.08)]:  # typing
    for k in range(int(d / step)):
        EVENTS.append((a + k * step, "tick", 0.12))
for a, d, n in [(8.35, 1.0, 14), (20.2, 0.9, 12)]:          # score count-ups (ease-out spacing)
    for k in range(n):
        p = k / n
        EVENTS.append((a + d * (1 - (1 - p) ** (1 / 3)), "tick", 0.22))
for k in range(4):
    EVENTS.append((9.45 + k * 0.13, "tick", 0.2))            # breakdown bars

sfx = np.zeros((N, 2))
for at, name, g in EVENTS:
    place(sfx, FX[name], at, g)

fade = np.ones(N)
fade[-int(1.0 * SR):] = np.linspace(1, 0, int(1.0 * SR))
write(OUT / "sfx.wav", sfx * fade[:, None])            # UI sounds only (used in the video)
write(OUT / "music-temp.wav", music * fade[:, None])   # placeholder bed, not used
print("wrote", OUT / "sfx.wav")
