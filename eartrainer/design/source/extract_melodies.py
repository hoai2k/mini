#!/usr/bin/env python3
"""Extract short melodies for the ear trainer from published, machine-readable
music datasets, and write them as melody files the app reads.

    python3 eartrainer/design/source/extract_melodies.py

Writes (deterministically; rerunning gives the same files):
    eartrainer/app/data/melodies/leadsheets.js  OpenEWLD (MusicXML lead sheets)
    eartrainer/app/data/melodies/nottingham.js  Nottingham Music Database (ABC)
    eartrainer/app/data/melodies/essen.js       Essen Folksong Collection (**kern),
                                                only with --essen: its CCARH licence allows
                                                personal and academic use but not distributed
                                                teaching material, so the app does not ship it.

Datasets are cloned (shallow) into local/eartrainer-datasets/, which Git
ignores. Nothing here is copied from memory: every note comes from the files.

Common rules for every source:
  * transpose by whole octaves only, so the phrase sits around C4..C6;
  * merge tied notes; durations in quarter-note beats rounded to 3 decimals;
  * drop phrases with fewer than 3 distinct pitches, fewer than 3 or more than
    16 notes, or a range wider than 16 semitones;
  * human-readable Title Case titles, deduplicated (by normalised title)
    against every hand-written melody file and across the generated files.

Python 3 standard library only (music21 is deliberately not used).
"""

from __future__ import annotations

import hashlib
import os
import re
import sqlite3
import subprocess
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "local" / "eartrainer-datasets"
OUT = ROOT / "eartrainer" / "app" / "data" / "melodies"
GENERATED = {"essen.js", "leadsheets.js", "nottingham.js"}

SOURCES = {
    "essen": "https://github.com/ccarh/essen-folksong-collection",
    "openewld": "https://github.com/00sapo/OpenEWLD",
    "nottingham": "https://github.com/jukedeck/nottingham-dataset",
}

LETTER = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ACC = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "##"}


# --------------------------------------------------------------------------
# Downloads


def fetch(name: str) -> Path:
    url = SOURCES[name]
    dest = CACHE / url.rstrip("/").split("/")[-1]
    if not (dest / ".git").exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print(f"cloning {url} …", file=sys.stderr)
        subprocess.run(["git", "clone", "-q", "--depth", "1", url, str(dest)], check=True,
                       env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"})
    return dest


def stable_key(s: str) -> str:
    return hashlib.sha1(s.encode()).hexdigest()


# --------------------------------------------------------------------------
# Notes: ('n', letter, alter, octave, beats) or ('r', beats), beats a Fraction


def midi(n) -> int:
    return (n[3] + 1) * 12 + LETTER[n[1]] + n[2]


def merge_rests(ev):
    out = []
    for e in ev:
        if e[0] == "r" and out and out[-1][0] == "r":
            out[-1] = ("r", out[-1][1] + e[1])
        else:
            out.append(e)
    while out and out[0][0] == "r":
        out.pop(0)
    while out and out[-1][0] == "r":
        out.pop()
    return out


def fmt_beats(b) -> str:
    x = round(float(b), 3)
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return s


def place(ev):
    """Shift by octaves so the phrase sits around C4..C6, then check it.
    Returns the notes string, or None if the phrase is unusable."""
    ev = merge_rests(ev)
    notes = [e for e in ev if e[0] == "n"]
    if not (3 <= len(notes) <= 16):
        return None
    ms = [midi(n) for n in notes]
    lo, hi = min(ms), max(ms)
    if hi - lo > 16 or len(set(ms)) < 3:
        return None
    best = None
    for k in range(-4, 5):
        pen = max(0, 60 - (lo + 12 * k)) + max(0, (hi + 12 * k) - 84)
        cand = (pen, abs(k), k)
        if best is None or cand < best:
            best = cand
    k = best[2]
    if lo + 12 * k < 36 or hi + 12 * k > 96:
        return None
    toks = []
    for e in ev:
        if e[0] == "r":
            toks.append(f"r:{fmt_beats(e[1])}")
            continue
        _, letter, alter, octave, beats = e
        if alter not in ACC:
            return None
        name = f"{letter}{ACC[alter]}{octave + k}"
        b = fmt_beats(beats)
        if float(b) <= 0:
            return None
        toks.append(name if b == "1" else f"{name}:{b}")
    return " ".join(toks)


# --------------------------------------------------------------------------
# Titles, ids and deduplication

SMALL = {
    "a", "an", "the", "of", "and", "in", "on", "to", "for", "at", "by", "with", "or", "but",
    "from", "is",
    "der", "die", "das", "den", "dem", "des", "und", "im", "in", "zu", "zum", "zur", "von",
    "vom", "am", "an", "auf", "mit", "ein", "eine", "einen", "einem", "einer",
    "le", "la", "les", "de", "du", "et", "het", "een", "en", "van",
}


def title_case(t: str) -> str:
    words = t.split(" ")
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        if i > 0 and lw in SMALL:
            out.append(lw)
            continue
        # capitalise the first letter (after any leading punctuation), keep the rest lower
        m = re.match(r"^([^A-Za-zÀ-ÿ]*)(.)(.*)$", lw)
        out.append(m.group(1) + m.group(2).upper() + m.group(3) if m else w)
    s = " ".join(out)
    # capitalise after a hyphen or opening parenthesis as well
    s = re.sub(r"([(\-])([a-zà-ÿ])", lambda m: m.group(1) + m.group(2).upper(), s)
    return s


def fold(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def norm(t: str) -> str:
    t = fold(t).lower().replace("&", " and ")
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    t = " ".join({"ye": "you", "thee": "you"}.get(w, w) for w in t.split())
    t = re.sub(r"^(the|a|an|o|oh) ", "", t)
    return t.strip()


def title_keys(t: str) -> set[str]:
    keys = {norm(t), norm(re.sub(r"\(.*?\)", " ", t))}
    keys |= {norm(p) for p in re.findall(r"\((.*?)\)", t)}
    return {k for k in keys if k}


class Library:
    """Titles and ids already used, by hand-written files and by generated ones."""

    def __init__(self):
        self.keys: set[str] = set()
        self.ids: set[str] = set()
        rx_t = re.compile(r"title:\s*(['\"])((?:\\.|(?!\1).)*)\1")
        rx_i = re.compile(r"\bid:\s*'([a-z0-9-]+)'")
        for f in sorted(OUT.glob("*.js")):
            if f.name in GENERATED:
                continue
            src = f.read_text(encoding="utf-8")
            for m in rx_t.finditer(src):
                self.keys |= title_keys(m.group(2).replace("\\'", "'"))
            self.ids |= set(rx_i.findall(src))

    def is_dup(self, title: str) -> bool:
        ks = title_keys(title)
        if ks & self.keys:
            return True
        # a longer title that contains a known multi-word title, or vice versa
        main = norm(re.sub(r"\(.*?\)", " ", title))
        for k in self.keys:
            if " " in k and " " in main and (f" {k} " in f" {main} " or f" {main} " in f" {k} "):
                return True
        return False

    def add(self, title: str, prefix: str = "") -> str:
        self.keys |= title_keys(title)
        base = re.sub(r"[^a-z0-9]+", "-", fold(title).lower()).strip("-")
        base = "-".join(base.split("-")[:7]) or "tune"
        if prefix:
            base = f"{prefix}-{base}"
        mid, n = base, 2
        while mid in self.ids:
            mid, n = f"{base}-{n}", n + 1
        self.ids.add(mid)
        return mid


def js_str(s: str) -> str:
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def write_js(path: Path, header: list[str], sections: list[tuple[str, list[dict]]]):
    lines = [f"// {h}" if h else "//" for h in header]
    lines.append("export default [")
    first = True
    for name, items in sections:
        if not items:
            continue
        if not first:
            lines.append("")
        first = False
        lines.append(f"  // {name}")
        for m in items:
            lines.append(
                f"  {{ id: {js_str(m['id'])}, title: {js_str(m['title'])}, by: {js_str(m['by'])}, "
                f"cat: {js_str(m['cat'])}, bpm: {m['bpm']}, notes: {js_str(m['notes'])} }},"
            )
    lines.append("];")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return sum(len(i) for _, i in sections)


# --------------------------------------------------------------------------
# Essen Folksong Collection (**kern)

ESSEN_REGIONS = [
    # (folder, label, how many to take)
    ("europa/deutschl/kinder", "German", 16),
    ("europa/deutschl/erk", "German", 12),
    ("europa/deutschl/boehme", "German", 8),
    ("europa/deutschl/fink", "German", 5),
    ("europa/deutschl/zuccal", "German", 5),
    ("europa/deutschl/altdeu1", "German", 3),
    ("europa/deutschl/altdeu2", "German", 3),
    ("europa/deutschl/ballad", "German", 3),
    ("europa/deutschl/allerkbd", "German", 3),
    ("europa/elsass", "Alsatian", 6),
    ("europa/lothring", "Lorraine", 6),
    ("europa/schweiz", "Swiss", 10),
    ("europa/oesterrh", "Austrian", 8),
    ("europa/tirol", "Tyrolean", 3),
    ("europa/nederlan", "Dutch", 10),
    ("europa/luxembrg", "Luxembourgish", 3),
    ("europa/france", "French", 8),
    ("europa/england", "English", 4),
    ("europa/italia", "Italian", 4),
    ("europa/danmark", "Danish", 9),
    ("europa/sverige", "Swedish", 8),
    ("europa/czech", "Czech", 6),
    ("europa/polska", "Polish", 8),
    ("europa/magyar", "Hungarian", 8),
    ("europa/romania", "Romanian", 6),
    ("europa/rossiya", "Russian", 6),
    ("europa/ukraina", "Ukrainian", 5),
    ("europa/jugoslav", "Yugoslav", 10),
    ("america/usa", "American", 4),
    ("america/mexico", "Mexican", 3),
    ("asia/china/han", "Chinese", 18),
    ("asia/china/shanxi", "Chinese", 10),
    ("asia/china/natmin", "Chinese", 6),
    ("asia/china/xinhua", "Chinese", 3),
]

KERN_DUR = re.compile(r"(\d+)(\.*)")
KERN_PITCH = re.compile(r"([a-gA-G])\1*")


# Capitalised function words that, in the middle of a mixed-case OTL record,
# mark where a ballad-type heading ends and the song's own first line begins
# ("Die dienende Schwester Es wohnt ein Pfalzgraf ..."): the first line is
# the title people know, so it is kept.
INCIPIT_STARTS = {
    "Es", "Ich", "Als", "Wie", "Ein", "Eine", "Einst", "Da", "Dort", "Wo", "Wer", "Was",
    "Wenn", "Nun", "Mein", "Wir", "Sie", "Er", "Du", "Ach", "O", "Bie", "Vrie", "Det", "Om",
    "Konung", "U", "Je", "Sur", "Dove", "Op", "Wat", "Herr", "Heer", "Af", "Dos",
}
# Tunes the hand-written files already hold under another name, and a
# composed anthem filed among the folk songs.
ESSEN_SKIP = {"allons enfants de la patrie", "god save our lord the king",
              "gott sei des kaisers schutz"}


COUNTRY = {"Dutch": "Netherlands", "Luxembourgish": "Luxembourg", "French": "France",
           "English": "England", "Italian": "Italy", "Danish": "Denmark", "Swedish": "Sweden",
           "Czech": "Czech lands", "Polish": "Poland", "Hungarian": "Hungary",
           "Romanian": "Romania", "Russian": "Russia", "Ukrainian": "Ukraine",
           "Yugoslav": "Yugoslavia", "American": "USA", "Mexican": "Mexico"}
GERMAN_FIRST = {"Es", "Ich", "Ein", "Eine", "Einst", "Dort", "Ach", "Die", "Der", "Das", "Wir",
                "Mein", "Schoen", "Kornschneiden"}
GERMAN_SPEAKING = {"German", "Alsatian", "Lorraine", "Swiss", "Austrian", "Tyrolean"}


def essen_title(raw: str, german: bool = True) -> str | None:
    t = raw.strip()
    t = re.split(r"\s{2,}", t)[0]  # Chinese files append a German gloss after spaces
    if t.count("(") != t.count(")"):
        return None
    t = re.sub(r"\([^)]*\)", " ", t)  # alternative names, variant numbers
    t = re.sub(r"\b(ohne|kyrillischer|mit) Text\b", " ", t, flags=re.I)
    t = re.sub(r"\b[A-Z]\d{3,}\b", "", t)  # catalogue codes like K0123
    words = t.split()
    if t != t.upper():
        for i, w in enumerate(words[1:], 1):
            if w in INCIPIT_STARTS or w[:1] in "'\"":
                words = words[i:]
                break
        # In the ballad collections from outside the German-speaking lands a
        # heading is often a German ballad type run into a foreign first line
        # ("Die Koenigstochter Stander op", "Graf und Nonne Egy magas ...");
        # those that could not be split above are left out.
        if not german and len(words) >= 4 and (
                words[0] in ("Der", "Die", "Das") or words[1] in ("als", "und", "an")):
            return None
    t = " ".join(words)
    t = re.split(r"[,!.;:?]", t)[0]
    t = t.strip(" '\"-")
    if not t or re.search(r"[0-9/\[\]{}]|\bNN\b", t):
        return None
    if not re.fullmatch(r"[A-Za-zÀ-ÿ' \-]+", t):
        return None
    words = t.split()
    if len(words) > 7 or len(t) < 4:
        return None
    if norm(t) in ESSEN_SKIP:
        return None
    return title_case(t)


def parse_kern(text: str):
    """Return (meter_den, key_has_flats, phrases), phrases a list of event lists."""
    phrases, cur, inside = [], [], False
    loose = []  # notes before the first '{' (rare)
    meter_den, tie = None, None
    for line in text.splitlines():
        if not line or line.startswith("!"):
            continue
        tok = line.split("\t")[0]
        if tok.startswith("*"):
            m = re.match(r"\*M\d+/(\d+)", tok)
            if m and meter_den is None:
                meter_den = int(m.group(1))
            continue
        if tok.startswith("=") or tok == ".":
            continue
        tok = tok.split(" ")[0]
        if "q" in tok.lower():  # grace note
            continue
        if "{" in tok:
            inside, cur = True, []
        d = KERN_DUR.search(tok)
        if not d:
            return None
        n = int(d.group(1))
        beats = Fraction(8) if n == 0 else Fraction(4, n)
        add = beats
        for _ in d.group(2):
            add /= 2
            beats += add
        if "r" in tok:
            ev = ("r", beats)
        else:
            p = KERN_PITCH.search(tok)
            if not p:
                return None
            s = p.group(0)
            letter = s[0].upper()
            octave = 3 + len(s) if s[0].islower() else 4 - len(s)
            alter = tok.count("#") - tok.count("-")
            ev = ("n", letter, alter, octave, beats)
        target = cur if inside else loose
        if ev[0] == "n" and tie is not None and ("_" in tok or "]" in tok):
            # continuation of a tie: lengthen the held note
            i = tie
            n0 = target[i]
            target[i] = (n0[0], n0[1], n0[2], n0[3], n0[4] + ev[4])
            if "]" in tok:
                tie = None
        else:
            target.append(ev)
            tie = len(target) - 1 if (ev[0] == "n" and "[" in tok) else None
        if "}" in tok:
            phrases.append(cur)
            cur, inside, tie = [], False, None
    if not phrases:
        return None
    return meter_den or 4, phrases


def essen(lib: Library):
    base = fetch("essen")
    sections, count, seen_prefix = [], 0, set()
    for folder, label, want in ESSEN_REGIONS:
        files = sorted((base / folder).glob("*.krn"), key=lambda p: stable_key(p.name))
        got = []
        for f in files:
            if len(got) >= want:
                break
            text = f.read_bytes().decode("latin-1")
            m = re.search(r"^!!!OTL:\s*(.*)$", text, re.M)
            if not m:
                continue
            title = essen_title(m.group(1), label in GERMAN_SPEAKING)
            if not title or lib.is_dup(title):
                continue
            prefix = " ".join(norm(title).split()[:4])
            if prefix in seen_prefix:  # another variant of a ballad already taken
                continue
            parsed = parse_kern(text)
            if not parsed:
                continue
            den, phrases = parsed
            ev = list(phrases[0])
            if sum(1 for e in ev if e[0] == "n") < 5 and len(phrases) > 1:
                ev = ev + list(phrases[1])
            notes = place(ev)
            if not notes:
                continue
            bpm = {1: 200, 2: 160, 8: 100}.get(den, 110)
            seen_prefix.add(prefix)
            by = f"Traditional ({label})"
            if label in COUNTRY and title.split()[0] in GERMAN_FIRST:
                by = f"Traditional (German, {COUNTRY[label]})"  # German-speaking community
            got.append({"id": lib.add(title), "title": title, "by": by,
                        "cat": "traditional", "bpm": bpm, "notes": notes})
        sections.append((f"{label} ({folder})", got))
        count += len(got)
    header = [
        "Folk songs from the Essen Folksong Collection (category 'traditional'):",
        "the first marked phrase of each song ({ … } in the **kern encoding), or the",
        "first two phrases when the first has fewer than five notes. Shifted by",
        "whole octaves only; regional label from the collection's region folder.",
        "",
        "GENERATED by eartrainer/design/source/extract_melodies.py; do not edit by hand.",
        f"Source: {SOURCES['essen']}",
        "  H. Schaffrath, The Essen Folksong Collection in Kern Format, ed. D. Huron",
        "  (Menlo Park, CA: CCARH, 1995). Data (c) CCARH / estate of Helmut Schaffrath.",
        "Licence: CCARH data licence (license.txt in the repository): academic and",
        "  personal use; CCARH must be acknowledged as the source. It restricts",
        "  inclusion in distributed teaching materials beyond fair use. The melodies",
        "  themselves are anonymous traditional songs; only short incipits are used.",
    ]
    return header, sections, count


# --------------------------------------------------------------------------
# OpenEWLD (MusicXML lead sheets)

HOLIDAY_WORDS = re.compile(
    r"christmas|noel|nowell|santa claus|jingle|housetop|angels|bring a torch|carol|wenceslas|three kings|three ships|sleigh|"
    r"herald angels|bethlehem|midnight clear|holly|what child|rejoice|bleak midwinter|"
    r"joy to the world|silent night|faithful|deck the", re.I)
CLASSICAL = re.compile(
    r"beethoven|debussy|ravel|gounod|rimsky|mendelssohn|grieg|dvo|chopin|schubert|brahms|"
    r"tchaikovsky|bach|mozart|handel|händel|satie|offenbach|elgar|parry|bizet|verdi|puccini|"
    r"liszt|schumann|strauss|rachmaninoff|massenet|delibes|saint-sa|borodin|joseph haydn|vivaldi|"
    r"rossini|wagner|mussorgsky|albeniz|albéniz|granados|fauré|faure|boccherini|brahms|"
    r"pachelbel|clarke|mascagni|lehar|lehár|hassler|massenet|drdla|ponchielli|suppé|suppe|waldteufel|ivanovici|toselli", re.I)
JAZZ_PEOPLE = re.compile(
    r"waller|miley|king oliver|joplin|morton|ellington|armstrong|bix|beiderbecke|"
    r"handy|bernie miller|jimmy van heusen|hoagy|carmichael|parker|monk|gillespie", re.I)
TRAD_COMPOSERS = re.compile(r"stephen foster|traditional|dan emmett|james a\. bland", re.I)
HYMN_PEOPLE = re.compile(r"lowell mason|thomas hastings|charles converse|walford|robert lowry|"
                         r"austin miles|hassler", re.I)
# Corrections taken from the dataset's own folder names (composer-credit
# fields are wrong for these), and tunes that duplicate another entry.
BY_FIX = {"A Hopeless Love Affair": "Fats Waller", "All Alone Monday": "Harry Ruby",
          "Yellow Rose of Texas": "Traditional (American)",
          "Minnie the Moocher": "Cab Calloway & Clarence Gaskill"}
CAT_FIX = {"Por una cabeza": "popular", "Whistle While You Work": "popular",
           "Whispering Hope": "popular", "Little Sir Echo": "popular"}
SKIP_TITLES = {"Oh My Beloved Father"}  # the English version of O mio babbino caro


def xml_root(mxl: Path):
    with zipfile.ZipFile(mxl) as z:
        names = [n for n in z.namelist() if not n.startswith("META-INF") and n.endswith(".xml")]
        try:
            cont = ET.fromstring(z.read("META-INF/container.xml"))
            rf = cont.find(".//rootfile")
            if rf is not None and rf.get("full-path"):
                names = [rf.get("full-path")]
        except KeyError:
            pass
        return ET.fromstring(z.read(names[0]))


def parse_musicxml(root):
    """Return (events, tempo_bpm or None, lyric words) for the first part, one voice."""
    part = root.find("part")
    if part is None:
        return None, None, []
    divisions = 1
    ev, tempo, tie_open = [], None, False
    words: list = []  # (event index, lyric word) for verse 1
    for meas in part.findall("measure"):
        for el in meas:
            if el.tag == "attributes":
                d = el.find("divisions")
                if d is not None and d.text:
                    divisions = int(float(d.text))
            elif el.tag in ("direction", "sound"):
                snd = el if el.tag == "sound" else el.find("sound")
                if tempo is None and snd is not None and snd.get("tempo"):
                    try:
                        tempo = float(snd.get("tempo"))
                    except ValueError:
                        pass
                met = el.find(".//metronome")
                if tempo is None and met is not None:
                    pm, bu = met.find("per-minute"), met.find("beat-unit")
                    try:
                        mult = {"half": 2, "quarter": 1, "eighth": 0.5, "whole": 4}.get(
                            bu.text if bu is not None else "quarter", 1)
                        if met.find("beat-unit-dot") is not None:
                            mult *= 1.5
                        tempo = float(pm.text) * mult
                    except (TypeError, ValueError, AttributeError):
                        pass
            elif el.tag == "forward":
                d = el.find("duration")
                if d is not None:
                    ev.append(("r", Fraction(int(float(d.text)), divisions)))
            elif el.tag == "note":
                if el.find("grace") is not None or el.find("chord") is not None:
                    continue
                d = el.find("duration")
                if d is None:
                    continue
                beats = Fraction(int(float(d.text)), divisions)
                if beats <= 0:
                    continue
                if el.find("rest") is not None:
                    ev.append(("r", beats))
                    tie_open = False
                    continue
                p = el.find("pitch")
                if p is None:
                    continue
                step, octave = p.findtext("step"), int(p.findtext("octave"))
                alter = int(round(float(p.findtext("alter") or 0)))
                ties = {t.get("type") for t in el.findall("tie")}
                if tie_open and "stop" in ties and ev and ev[-1][0] == "n" \
                        and (ev[-1][1], ev[-1][2], ev[-1][3]) == (step, alter, octave):
                    n0 = ev[-1]
                    ev[-1] = (n0[0], n0[1], n0[2], n0[3], n0[4] + beats)
                else:
                    ev.append(("n", step, alter, octave, beats))
                    lyr = next((ly for ly in el.findall("lyric") if ly.get("number", "1") == "1"), None)
                    if lyr is not None and lyr.findtext("text"):
                        syl = lyr.findtext("syllabic") or "single"
                        txt = lyr.findtext("text")
                        if syl in ("middle", "end") and words:
                            words[-1] = (words[-1][0], words[-1][1] + txt)
                        else:
                            words.append((len(ev) - 1, txt))
                tie_open = "start" in ties
    return ev, tempo, words


def incipit(ev, max_notes: int):
    """Opening phrase: from the first note to the first rest or long note
    (>= 2 beats) after at least five notes, at most max_notes notes."""
    out, n = [], 0
    for e in ev:
        if e[0] == "r":
            if n == 0:
                continue
            if n >= 5:
                break
            if e[1] >= 2:  # a long rest before the phrase got going: a pickup, start over
                out, n = [], 0
                continue
            out.append(e)
            continue
        out.append(e)
        n += 1
        if n >= 5 and e[4] >= 2:
            return out
        if n >= max_notes:
            # end on the last reasonably long note if there is one late enough
            idx = [i for i, x in enumerate(out) if x[0] == "n" and x[4] >= Fraction(3, 2)]
            cnt = 0
            for i, x in enumerate(out):
                if x[0] == "n":
                    cnt += 1
                if idx and i == idx[-1] and cnt >= 5:
                    return out[: i + 1]
            return out
    return out if n >= 5 else None


def lyric_word(w: str) -> str:
    return re.sub(r"[^a-z]", "", fold(w).lower())


def title_hook(title: str, words) -> int:
    tw = [lyric_word(w) for w in re.sub(r"\(.*?\)", " ", title).split()]
    tw = [w for w in tw if w][:3]
    if not tw or (len(tw) == 1 and len(tw[0]) < 5):
        return 0
    lw = [(i, lyric_word(w)) for i, w in words]
    lw = [(i, w) for i, w in lw if w]
    for j in range(len(lw) - len(tw) + 1):
        if [w for _, w in lw[j:j + len(tw)]] == tw:
            return lw[j][0] if lw[j][0] > 1 else 0
    return 0


def clean_ewld_title(t: str) -> str:
    t = re.sub(r"\{.*?\}", "", t)
    t = " ".join(t.split()).strip()
    return t


# Credits in the lead sheets that are misspelt or carry notes; mapped by hand.
PERSON_FIX = {
    "Richard Rogers": "Richard Rodgers", "Sebastian Yradien": "Sebastián Yradier",
    "Theodore F.Morse": "Theodore F. Morse", "Harry Tilzer": "Harry Von Tilzer",
    "Peter DeRose": "Peter De Rose", "Richard A Whiting": "Richard A. Whiting",
    "George and Ira Gershwin": "George Gershwin", "Will FYffe": "Will Fyffe",
    "Chancellor Chauncey Olcott": "Chauncey Olcott", "C Austin Miles": "C. Austin Miles",
    "Kenneth Joseph Alford": "Kenneth J. Alford", "Feliz Bernard": "Felix Bernard",
    "G. Puccini": "Giacomo Puccini", "George L Cobb": "George L. Cobb",
    "Johnny S. Black": "Johnny S. Black", "Fred Fischer": "Fred Fisher",
    "Thomas Waller": "Fats Waller", "Joseph M Lacalle": "José M. Lacalle",
    "Andantino in D-flat by Edwin Lemare": "Edwin Lemare",
    "Neapolitan street song transcribed by Teodoro Cottrau": "Teodoro Cottrau",
    "Irish Air adapted by Joseph M.Crofts and/or Francis MacNamara": "Traditional (Irish)",
    "African-American Spiritual": "Traditional (spiritual)",
    "African American Spiritual": "Traditional (spiritual)",
    "tradtional American folk song": "Traditional (American)",
}
TRAD_WORDS = re.compile(r"^(trad\.?|traditional|traditionnel|volksweise|unknown|origin unknown|"
                        r"attributed to .*|hymn version)$", re.I)


def clean_person(p: str) -> str:
    p = p.replace("\u00ad", "")
    p = re.sub(r"\[\d+\]|\(.*?\)|©\s*\d{4}|`?\b\d{3,4}\b", "", p)
    p = " ".join(p.replace(" ,", ",").split()).strip(" ,[]")
    p = PERSON_FIX.get(p, p)
    p = re.sub(r"\s+(based on|adapted by|gleaned by)\b.*$", "", p, flags=re.I)
    low = p.lower()
    if low.startswith("traditional"):
        for kw, lab in (("spiritual", "spiritual"), ("scot", "Scottish"), ("irish", "Irish"),
                        ("english", "English"), ("welsh", "Welsh"), ("american", "American")):
            if kw in low:
                return f"Traditional ({lab})"
        return "Traditional"
    p = re.sub(r"^(\S+ \S+) and (\S+ \S+)$", r"\1 & \2", p)
    if TRAD_WORDS.match(p) or p.lower() == "traditional":
        return "Traditional"
    if p.endswith("'"):
        return ""
    return p


def leadsheets(lib: Library):
    base = fetch("openewld")
    db = sqlite3.connect(base / "OpenEWLD.db")
    deaths = {}
    for name, death in db.execute("select common_name, death from authors"):
        deaths[name] = death
    rows = db.execute(
        "select w.id, w.title, w.first_performance_date, w.path_leadsheet, "
        "(select group_concat(author, '|') from work_author a where a.id = w.id), "
        "(select group_concat(genre, '|') from work_genres g where g.id = w.id), "
        "(select group_concat(style, '|') from work_style s where s.id = w.id) "
        "from works w").fetchall()
    rows.sort(key=lambda r: (r[1] or "").lower())
    cats = {"jazz": [], "popular": [], "traditional": [], "classical": [], "holiday": []}
    for wid, title, date, path, authors, genres, styles in rows:
        title = clean_ewld_title(title or "")
        if not title or title in SKIP_TITLES or lib.is_dup(title):
            continue
        mxl = base / path
        if not mxl.exists():
            continue
        try:
            root = xml_root(mxl)
        except (zipfile.BadZipFile, ET.ParseError, KeyError):
            continue
        composers = [clean_person(c.text or "") for c in root.findall(".//creator[@type='composer']")]
        composers = [c for c in composers if c]
        if composers and all(c == "Traditional" for c in composers):
            composers = []
        authors = [clean_person(a) for a in (authors or "").split("|") if a]
        if any("," in c for c in composers):  # garbled credit such as "Thomas , Harry Brooks"
            composers = []
        people = composers or authors
        year = int(date[:4]) if date and date[:4].isdigit() else None
        people = [p for p in people if p and p != "Traditional"] or ["Traditional"]
        who = BY_FIX.get(title) or " & ".join(dict.fromkeys(people))
        died = [deaths.get(a) for a in authors]
        died_years = [int(str(d)[:4]) for d in died if d and str(d)[:4].isdigit()]
        public = (who.startswith("Traditional") or (year is not None and year <= 1930)
                  or (year is None and authors and len(died_years) == len(authors)
                      and max(died_years) < 1956))
        g = (genres or "") + "|" + (styles or "")
        if HOLIDAY_WORDS.search(title):
            cat = "holiday"
        elif any(CLASSICAL.search(p) for p in people) or ("Classical" in (genres or "") and not year):
            cat = "classical"
        elif who.startswith("Traditional") or HYMN_PEOPLE.search(who) or TRAD_COMPOSERS.search(who) or (
                "Folk, World" in g and (year is None or year < 1900)):
            cat = "traditional"
        elif any(JAZZ_PEOPLE.search(p) for p in people) or (year and 1917 <= year < 1960):
            cat = "jazz"
        else:
            cat = "popular"
        cat = CAT_FIX.get(title, cat)
        ev, tempo, words = parse_musicxml(root)
        if not ev:
            continue
        # Many lead sheets open with an introduction or verse; when the title's
        # opening words are sung later, start the phrase where they are sung.
        start = title_hook(title, words)
        inc = incipit(ev[start:], 10 if public else 8)
        if not inc:
            continue
        notes = place(inc)
        if not notes:
            continue
        bpm = int(round(tempo)) if tempo and 40 <= tempo <= 260 else (
            110 if cat in ("traditional", "holiday") else 120)
        cats[cat].append({"id": lib.add(title), "title": title, "by": who, "cat": cat,
                          "bpm": bpm, "notes": notes})
    header = [
        "Opening phrases of lead sheets from OpenEWLD, the public-domain subset of",
        "the Enhanced Wikifonia Leadsheet Dataset: from the first note to the first",
        "rest or long note after at least five notes, at most 10 notes (8 for any",
        "song that may still be under copyright: only an incipit). Shifted by whole",
        "octaves only. Songbook standards and jazz go in 'jazz'.",
        "",
        "GENERATED by eartrainer/design/source/extract_melodies.py; do not edit by hand.",
        f"Source: {SOURCES['openewld']}",
        "  F. Simonetta, OpenEWLD (2018), doi:10.5281/zenodo.4332855.",
        "Licence: MIT (repository LICENSE); the dataset states that it contains only",
        "  public-domain scores.",
    ]
    names = {"jazz": "Jazz and songbook standards", "popular": "Popular songs",
             "traditional": "Folk songs and spirituals", "classical": "Classical",
             "holiday": "Carols and holiday songs"}
    sections = [(names[c], cats[c]) for c in ("jazz", "popular", "traditional", "classical", "holiday")]
    return header, sections, sum(len(v) for v in cats.values())


# --------------------------------------------------------------------------
# Nottingham Music Database (ABC)

NOTT_FILES = [
    # (file, label for 'by', how many, category)
    ("ashover.abc", "Traditional (English)", 8, "traditional"),
    ("hpps.abc", "Traditional (hornpipe)", 9, "traditional"),
    ("jigs.abc", "Traditional (jig)", 14, "traditional"),
    ("morris.abc", "Traditional (English morris)", 8, "traditional"),
    ("playford.abc", "Traditional (English, Playford)", 6, "traditional"),
    ("reelsa-c.abc", "Traditional (reel)", 4, "traditional"),
    ("reelsd-g.abc", "Traditional (reel)", 4, "traditional"),
    ("reelsh-l.abc", "Traditional (reel)", 4, "traditional"),
    ("reelsm-q.abc", "Traditional (reel)", 4, "traditional"),
    ("reelsr-t.abc", "Traditional (reel)", 4, "traditional"),
    ("reelsu-z.abc", "Traditional (reel)", 4, "traditional"),
    ("slip.abc", "Traditional (slip jig)", 5, "traditional"),
    ("waltzes.abc", "Traditional (waltz)", 8, "traditional"),
    ("xmas.abc", "Traditional (carol)", 5, "holiday"),
]

KEY_FIFTHS = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
              "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7}
MODE_SHIFT = {"": 0, "maj": 0, "ion": 0, "m": -3, "min": -3, "aeo": -3, "dor": -2,
              "mix": -1, "lyd": 1, "phr": -4, "loc": -5}
SHARP_ORDER = "FCGDAEB"


def key_alters(k: str) -> dict:
    m = re.match(r"^\s*([A-G][b#]?)\s*([A-Za-z]*)", k)
    if not m:
        return {}
    tonic, mode = m.group(1), m.group(2).lower()[:3]
    if mode == "m" or m.group(2).lower() in ("m", "min", "minor"):
        mode = "m"
    fifths = KEY_FIFTHS.get(tonic, 0) + MODE_SHIFT.get(mode, 0)
    alt = {}
    if fifths > 0:
        for c in SHARP_ORDER[:fifths]:
            alt[c] = 1
    elif fifths < 0:
        for c in SHARP_ORDER[::-1][: -fifths]:
            alt[c] = -1
    return alt


def parse_abc_tunes(text: str):
    tunes, cur = [], None
    for line in text.splitlines():
        if line.startswith("X:"):
            cur = {"head": {}, "body": []}
            tunes.append(cur)
        elif cur is None:
            continue
        elif line.startswith("%"):
            continue
        elif re.match(r"^[A-Za-z]:", line):
            cur["head"].setdefault(line[0], line[2:].strip())
        elif line.startswith("%"):
            continue
        else:
            cur["body"].append(line.rstrip("\\"))
    return tunes


ABC_TOKEN = re.compile(
    r'"[^"]*"'                       # chord symbol / annotation
    r"|![^!]*!|\+[^+]*\+"            # decorations
    r"|\{[^}]*\}"                    # grace notes
    r"|\((\d)(?::\d*)?(?::\d*)?"     # tuplet
    r"|(\[[^\]|]*\])"                # chord [CEG] (or inline field)
    r"|(\^{1,2}|_{1,2}|=)?([A-Ga-gzx])([',]*)(\d*)(/*)(\d*)"  # note or rest
    r"|(\|+:?|:+\|+:?|\[\d|\|\d|::)"   # bar lines
    r"|(-)"                          # tie
    r"|([<>]+)"                      # broken rhythm
    r"|.", re.S)


def abc_events(body: str, unit: Fraction, key: dict, max_bars: int, bar_len: Fraction):
    """Notes of the opening bars (a pickup does not count as a bar):
    returns a list of (event, bar_index)."""
    ev, bars, fill = [], 0, Fraction(0)
    bar_acc: dict = {}
    tuplet, tuplet_left = Fraction(1), 0
    tie_next, broken = False, None
    started = counted_pickup = False
    for m in ABC_TOKEN.finditer(body):
        s = m.group(0)
        if m.group(1):
            p = int(m.group(1))
            q = {2: 3, 3: 2, 4: 3, 6: 2}.get(p, 2)
            tuplet, tuplet_left = Fraction(q, p), p
            continue
        if m.group(9):
            if started and ev and fill > 0:
                if not (bars == 0 and fill < bar_len and not counted_pickup):
                    bars += 1
                counted_pickup = True
                if bars >= max_bars:
                    break
            fill = Fraction(0)
            bar_acc = {}
            continue
        if m.group(10):
            tie_next = True
            continue
        if m.group(11):
            broken = m.group(11)
            continue
        if m.group(2):
            inner = m.group(2)[1:-1]
            if re.match(r"^[A-Za-z]:", inner):
                continue  # inline field such as [K:G]
            sub = re.search(r"(\^{1,2}|_{1,2}|=)?([A-Ga-g])([',]*)", inner)
            if not sub:
                continue
            tail = re.match(r"(\d*)(/*)(\d*)", body[m.end():])
            groups = sub.groups() + tail.groups()
        elif m.group(4):
            groups = m.group(3, 4, 5, 6, 7, 8)
        else:
            continue
        acc, letter, octs, num, slashes, den = groups
        n = Fraction(int(num)) if num else Fraction(1)
        if slashes:
            n /= int(den) if den else 2 ** len(slashes)
        beats = n * unit * 4 * tuplet
        if tuplet_left:
            tuplet_left -= 1
            if not tuplet_left:
                tuplet = Fraction(1)
        if broken and ev:
            dots = len(broken)
            frac = 1 - Fraction(1, 2 ** dots)
            last = ev[-1][0]
            lb = last[1] if last[0] == "r" else last[4]
            if broken[0] == ">":
                newl, beats = lb * (1 + frac), beats * (1 - frac)
            else:
                newl, beats = lb * (1 - frac), beats * (1 + frac)
            ev[-1] = ((("r", newl) if last[0] == "r" else last[:4] + (newl,)), ev[-1][1])
        broken = None
        started = True
        fill += beats
        if letter in "zx":
            ev.append((("r", beats), bars))
            tie_next = False
            continue
        L = letter.upper()
        octave = 4 if letter.isupper() else 5
        octave += octs.count("'") - octs.count(",")
        if acc:
            alter = {"^": 1, "^^": 2, "_": -1, "__": -2, "=": 0}[acc]
            bar_acc[(L, octave)] = alter
        else:
            alter = bar_acc.get((L, octave), key.get(L, 0))
        note = ("n", L, alter, octave, beats)
        if tie_next and ev and ev[-1][0][0] == "n" and ev[-1][0][1:4] == note[1:4]:
            p = ev[-1][0]
            ev[-1] = (p[:4] + (p[4] + beats,), ev[-1][1])
        else:
            ev.append((note, bars))
        tie_next = False
    return ev


def nott_phrase(ev, max_notes=12):
    """Opening two bars (plus any pickup), ending early on the first long note
    (>= 1.5 beats) after at least five notes; at most max_notes notes."""
    out, n = [], 0
    for e, bar in ev:
        if e[0] == "r":
            if n >= 5:
                break
            out.append(e)
            continue
        out.append(e)
        n += 1
        if n >= max_notes or (n >= 5 and e[4] >= Fraction(3, 2)):
            break
    return out


# Tunes the hand-written files hold under another name (Nos Galan is Deck the
# Halls; Lord of All Hopefulness is sung to Slane), and a joke title.
NOTT_SKIP = {"Nos Galan", "Lord of All Hopefulness", "My Love is Like a Red Red Frog"}


def nott_title(t: str) -> str | None:
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^(.*), The$", r"The \1", t)
    if not t or len(t) < 4 or re.fullmatch(r"[A-Z]{2,5}", t) or "?" in t:
        return None
    if not re.fullmatch(r"[A-Za-z'’ ,.&\-()!]+", t) or re.search(r"\bNo\b", t):
        return None  # numbered tunes ("Cal 1", "Gingerhog's No.2") are left out
    if "missing" in t.lower() or ".." in t or not re.search(r"[A-Za-z]{4}", t):
        return None
    t = t.strip(" !")
    if t.isupper():
        t = t.lower()
    words = t.split(" ")
    # Title Case, but leave inner capitals alone (MacPhail, GlenConnel)
    return " ".join(w.lower() if i and w.lower() in SMALL
                    else re.sub(r"[A-Za-z]", lambda m: m.group(0).upper(), w, count=1)
                    for i, w in enumerate(words))


def nottingham(lib: Library):
    base = fetch("nottingham") / "ABC_cleaned"
    sections, count = [], 0
    for fname, label, want, cat in NOTT_FILES:
        tunes = parse_abc_tunes((base / fname).read_text(encoding="latin-1"))
        tunes.sort(key=lambda t: stable_key(fname + t["head"].get("T", "")))
        got = []
        for t in tunes:
            if len(got) >= want:
                break
            h = t["head"]
            src = h.get("S", "")
            if re.search(r"\b(19|20)\d\d\b", src):  # dated, probably a modern composition
                continue
            title = nott_title(h.get("T", ""))
            if not title or title in NOTT_SKIP or lib.is_dup(title):
                continue
            unit = Fraction(h.get("L", "1/8"))
            body = "\n".join(t["body"])
            body = re.sub(r"^[A-Za-z]:.*$", "", body, flags=re.M)
            meter = h.get("M", "4/4").strip()
            meter = {"C": "4/4", "C|": "2/2"}.get(meter, meter)
            try:
                bar_len = Fraction(meter) * 4
            except (ValueError, ZeroDivisionError):
                bar_len = Fraction(4)
            ev = abc_events(body, unit, key_alters(h.get("K", "C")), 2, bar_len)
            notes = place(nott_phrase(ev))
            if not notes:
                continue
            bpm = 110
            q = re.search(r"(?:\d+/\d+=)?(\d+)", h.get("Q", ""))
            if q and 40 <= int(q.group(1)) <= 260:
                bpm = int(q.group(1))
            c, by = cat, label
            if cat == "holiday" and not re.search(r"christmas|ding dong|noel|carol|boar", title, re.I):
                c, by = "traditional", "Traditional"  # the Christmas file also holds rounds
            got.append({"id": lib.add(title), "title": title, "by": by, "cat": c,
                        "bpm": bpm, "notes": notes})
        sections.append((f"{fname[:-4]}", got))
        count += len(got)
    header = [
        "British and American dance tunes from the Nottingham Music Database:",
        "the pickup and first two bars of each tune, ending early on the first long",
        "note after five notes (at most 12 notes). Shifted by whole octaves only.",
        "Tunes whose source line names a 20th-century date are left out.",
        "",
        "GENERATED by eartrainer/design/source/extract_melodies.py; do not edit by hand.",
        f"Source: {SOURCES['nottingham']} (ABC_cleaned),",
        "  a cleaned copy of Eric Foxley's Nottingham Music Database",
        "  (http://abc.sourceforge.net/NMD/).",
        "Licence: GNU GPL v3 (repository LICENSE.md); the tunes are traditional.",
    ]
    return header, sections, count


# --------------------------------------------------------------------------


def main():
    lib = Library()
    counts = {}
    sources = [("leadsheets.js", leadsheets), ("nottingham.js", nottingham)]
    if "--essen" in sys.argv:
        sources.append(("essen.js", essen))
    for name, fn in sources:
        header, sections, n = fn(lib)
        write_js(OUT / name, header, sections)
        counts[name] = n
    for k, v in counts.items():
        print(f"{k}: {v} melodies")


if __name__ == "__main__":
    main()
