#!/usr/bin/env python3
"""Extract short melodies for the ear trainer from published, machine-readable
music datasets, and write them as melody files the app reads.

    python3 eartrainer/design/source/extract_melodies.py

Writes (deterministically; rerunning gives the same files):
    eartrainer/app/data/melodies/leadsheets.js  OpenEWLD (MusicXML lead sheets)
    eartrainer/app/data/melodies/jazzheads.js   OpenBook jazz standards (LilyPond) and
                                                Charlie Parker's Omnibook heads (MusicXML)
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
import urllib.request
import zipfile
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "local" / "eartrainer-datasets"
OUT = ROOT / "eartrainer" / "app" / "data" / "melodies"
GENERATED = {"essen.js", "leadsheets.js", "nottingham.js", "jazzheads.js"}

SOURCES = {
    "essen": "https://github.com/ccarh/essen-folksong-collection",
    "openewld": "https://github.com/00sapo/OpenEWLD",
    "nottingham": "https://github.com/jukedeck/nottingham-dataset",
    "openbook": "https://github.com/veltzer/openbook",
}
OMNIBOOK_URL = "https://homepages.loria.fr/evincent/omnibook/omnibook_xml.zip"

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


def last_note(ev):
    """Index of the last event if it is a note, looking back past bar markers."""
    for i in range(len(ev) - 1, -1, -1):
        if ev[i][0] == "n":
            return i
        if ev[i][0] != "|":
            return None
    return None


def parse_musicxml(root, skip_first_endings=False):
    """Return (events, tempo_bpm or None, lyric words, mid-word note indices) for
    the first part, one voice. A note is mid-word when its lyric syllable runs on
    into the next note's ("dream-" of "dreamer")."""
    part = root.find("part")
    if part is None:
        return None, None, [], set()
    divisions = 1
    ev, tempo, tie_open = [], None, False
    words: list = []  # (event index, lyric word) for verse 1
    midword: set = set()
    in_first = False
    for mi, meas in enumerate(part.findall("measure")):
        if skip_first_endings:
            # A whole song is read once straight through: the first-time ending
            # is left out and the last-time ending kept.
            ends = [(e.get("number", ""), e.get("type")) for e in meas.findall("barline/ending")]
            starts_first = any(n.split(",")[0].strip() == "1" and "2" not in n and t == "start" for n, t in ends)
            stops_first = any(n.split(",")[0].strip() == "1" and t in ("stop", "discontinue") for n, t in ends)
            if starts_first:
                in_first = True
            if in_first:
                if stops_first:
                    in_first = False
                continue
        if mi:
            ev.append(("|",))  # a bar line
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
                li = last_note(ev)
                if tie_open and "stop" in ties and li is not None \
                        and (ev[li][1], ev[li][2], ev[li][3]) == (step, alter, octave):
                    n0 = ev[li]
                    ev[li] = (n0[0], n0[1], n0[2], n0[3], n0[4] + beats)
                else:
                    ev.append(("n", step, alter, octave, beats))
                    lyr = next((ly for ly in el.findall("lyric") if ly.get("number", "1") == "1"), None)
                    if lyr is not None and lyr.findtext("text"):
                        syl = lyr.findtext("syllabic") or "single"
                        txt = lyr.findtext("text")
                        if syl in ("begin", "middle"):
                            midword.add(len(ev) - 1)
                        if syl in ("middle", "end") and words:
                            words[-1] = (words[-1][0], words[-1][1] + txt)
                        else:
                            words.append((len(ev) - 1, txt))
                tie_open = "start" in ties
    return ev, tempo, words, midword


# --------------------------------------------------------------------------
# Phrases. A melody here is the opening phrase of its tune, ended where a
# musician would hear it end, never cut off mid-line. The finder reads the bar
# lines (and, for lead sheets, the lyrics) in the source and scores each
# possible last note for the signs of a phrase ending: it lands on a downbeat
# (or the middle of a long bar), in the second, fourth or eighth bar; the
# rhythm stops there (the note is clearly longer than the tune's usual pace, or
# a rest follows it); it is a settled note of the key (the home note above
# all, else its third or fifth); it doesn't run straight on into the next
# note; and no sung word is left half-sung. The first clear ending within the
# note limit is the phrase, else the strongest fair one. If there is none, the
# tune is left out rather than cut.

PHRASE_MIN, PHRASE_SCORE, PHRASE_FAIR = 4, 5.5, 4.5


# Krumhansl-Kessler key profiles: how strongly each degree belongs to a key.
KK_MAJOR = (6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88)
KK_MINOR = (6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17)


def key_pc(notes):
    """Pitch class of the major key (or the relative major of the minor key)
    that best fits the notes, weighted by length (Krumhansl-Schmuckler)."""
    w = [0.0] * 12
    for n in notes:
        w[midi(n) % 12] += min(float(n[4]), 2)
    mw = sum(w) / 12

    def corr(profile, t):
        mp = sum(profile) / 12
        a = [w[(t + i) % 12] - mw for i in range(12)]
        b = [x - mp for x in profile]
        den = (sum(x * x for x in a) * sum(x * x for x in b)) ** 0.5 or 1
        return sum(x * y for x, y in zip(a, b)) / den

    best = max([(corr(KK_MAJOR, t), t) for t in range(12)] + [(corr(KK_MINOR, t), (t + 3) % 12) for t in range(12)])
    return best[1]


def phrase_scores(ev, midword=frozenset(), from_note=0):
    """(note index, event index, score) for each note of an event list with bar
    markers. `midword` holds the event indices of notes sung mid-word. With
    `from_note`, a phrase starts at that note (bars count from there) and note
    indices count from it."""
    t, bars, notes = Fraction(0), [Fraction(0)], []
    for i, e in enumerate(ev):
        if e[0] == "|":
            if t > bars[-1]:
                bars.append(t)
        elif e[0] == "r":
            t += e[1]
        else:
            notes.append((i, t, e))
            t += e[4]
    if len(notes) - from_note < PHRASE_MIN:
        return []
    lens = [b - a for a, b in zip(bars, bars[1:])]
    bar_len = max(set(lens), key=lens.count) if lens else Fraction(4)
    start = notes[from_note][1]
    # The first full bar: a pickup (a short first bar, or starting mid-bar) doesn't count.
    full = [b for b in bars if b >= start]
    first = full[0] if full else start
    if len(bars) > 1 and bars[1] - bars[0] < bar_len and start < bars[1]:
        first = bars[1]
    tonic = key_pc([n[2] for n in notes[:32]])
    # The tune's ordinary pace: the middle time from one note to the next.
    gaps = sorted(b[1] - a[1] for a, b in zip(notes[:17], notes[1:17]))
    pace = gaps[len(gaps) // 2] if gaps else Fraction(1)
    out = []
    for k, (i, on, e) in enumerate(notes):
        if k < from_note:
            continue
        nxt = notes[k + 1] if k + 1 < len(notes) else None
        d = (nxt[1] - on) if nxt else e[4]  # sounding length plus any rest after it
        rest = d - e[4]
        last_bar = max(b for b in bars if b <= on)
        pos = on - last_bar
        b = sum(1 for x in bars if first < x <= on) if on >= first else -1
        sc = 0.0
        if pos == 0:
            sc += 1.5
        elif bar_len >= 4 and pos == bar_len / 2:
            sc += 0.75
        if b in (1, 3, 7):
            sc += 1.5
        elif b in (2, 5):
            sc += 0.5
        nb = [x for x in bars if x > on]
        if nb and on + d >= nb[0]:
            sc += 1.0  # it fills out its bar
        if d >= pace * Fraction(3, 2):
            sc += 1.5  # the rhythm stops here
        elif d <= pace:
            sc -= 1.0  # it moves on at the tune's pace
        sc += 1.0 if d >= 2 else 0
        if rest >= Fraction(1, 2):
            sc += 1.5
        rel = (midi(e) - tonic) % 12
        sc += 1.5 if rel in (0, 9) else 0.75 if rel in (4, 7) else 0
        if nxt and rest == 0 and nxt[1] - on < 1 and abs(midi(nxt[2]) - midi(e)) <= 2:
            sc -= 1.5  # runs straight on
        if d < Fraction(3, 4):
            sc -= 1.5
        if i in midword:
            sc -= 5  # never end in the middle of a sung word
        out.append((k - from_note, i, sc))
    return out


def place_phrase(ev, max_notes: int, midword=frozenset()):
    """The opening phrase, as a notes string: the first clear ending within
    max_notes notes that fits the keyboard, else the strongest fair ending,
    else None (the tune is left out rather than cut)."""
    cands = [(k, i, sc) for k, i, sc in phrase_scores(ev, midword) if PHRASE_MIN <= k + 1 <= max_notes]
    for k, i, sc in cands:
        if sc >= PHRASE_SCORE:
            got = place([e for e in ev[: i + 1] if e[0] != "|"])
            if got:
                return got
    for k, i, sc in sorted(cands, key=lambda c: (-c[2], c[0])):
        if sc < PHRASE_FAIR:
            break
        got = place([e for e in ev[: i + 1] if e[0] != "|"])
        if got:
            return got
    return None


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
        ev, tempo, words, midword = parse_musicxml(root)
        if not ev:
            continue
        # Many lead sheets open with an introduction or verse; when the title's
        # opening words are sung later, start the phrase where they are sung.
        start = title_hook(title, words)
        notes = place_phrase(ev[start:], 12, {i - start for i in midword if i >= start})
        if not notes:
            continue
        bpm = int(round(tempo)) if tempo and 40 <= tempo <= 260 else (
            110 if cat in ("traditional", "holiday") else 120)
        cats[cat].append({"id": lib.add(title), "title": title, "by": who, "cat": cat,
                          "bpm": bpm, "notes": notes})
    header = [
        "Opening phrases of lead sheets from OpenEWLD, the public-domain subset of",
        "the Enhanced Wikifonia Leadsheet Dataset: the first phrase of each, ended",
        "where a musician hears it end (see the Phrases section of extract_melodies.py),",
        "at most 12 notes; a song with no complete phrase that short is left out rather",
        "than cut. Shifted by whole octaves only. Songbook standards and jazz go in 'jazz'.",
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


def abc_events(body: str, unit: Fraction, key: dict, max_bars: int, bar_len: Fraction,
               skip_first_endings: bool = False):
    """Notes of the opening bars (a pickup does not count as a bar):
    returns a list of (event, bar_index). With `skip_first_endings` the tune is
    read once straight through, leaving out first-time endings."""
    ev, bars, fill = [], 0, Fraction(0)
    in_first = False
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
            if skip_first_endings:
                if "1" in s:
                    in_first = True
                elif in_first and (":" in s or "2" in s):
                    in_first = False
            if started and ev and fill > 0:
                ev.append((("|",), bars))  # a bar line
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
        if in_first:
            tie_next = False
            continue
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
            ev = abc_events(body, unit, key_alters(h.get("K", "C")), 8, bar_len)
            notes = place_phrase([e for e, _ in ev], 14)
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
        "the first phrase of each tune, ended where a musician hears it end (see the",
        "Phrases section of extract_melodies.py), at most 14 notes; a tune with no",
        "complete phrase that short is left out. Shifted by whole octaves only.",
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
# Jazz heads: OpenBook (LilyPond lead sheets transcribed from the Real Book)
# and Charlie Parker's Omnibook (MusicXML).

LY_TOKEN = re.compile(r'%\{.*?%\}|%[^\n]*|"(?:\\.|[^"\\])*"|\\[A-Za-z]+|#\S+|[{}<>~]|\d+/\d+'
                      r"|[a-gq](?:isis|eses|is|es|s)?[',]*[!?]?(?:\d+|\\breve)?\.*(?:\*\d+(?:/\d+)?)?(?![A-Za-z])"
                      r"|[rRs](?:\d+|\\breve)?\.*(?:\*\d+(?:/\d+)?)?(?![A-Za-z])|=\s*\d+|[A-Za-z]+|\S", re.S)
LY_NOTE = re.compile(r"^([a-g])(isis|eses|is|es|s)?([',]*)[!?]?((?:\d+|\\breve)?)(\.*)(?:\*(\d+)(?:/(\d+))?)?$")
LY_REST = re.compile(r"^([rRs])((?:\d+|\\breve)?)(\.*)(?:\*(\d+)(?:/(\d+))?)?$")
LY_ALTER = {None: 0, "is": 1, "isis": 2, "es": -1, "s": -1, "eses": -2}
LETTERS7 = "CDEFGAB"


def ly_duration(num, dots, mul, div, last):
    """A LilyPond duration (in quarter-note beats); empty means the previous one."""
    if not num:
        base = last
    else:
        base = Fraction(8) if num == "\\breve" else Fraction(4, int(num))
        d = base
        for _ in dots:
            d /= 2
            base += d
    if mul:
        base = base * int(mul) / int(div or 1)
    return base


def parse_lilypond_voice(body: str):
    """Melody events from a LilyPond voice in \\relative c' mode (as OpenBook's
    template wraps it). Grace notes move the relative pitch but are not played;
    repeats are read once, and of an \\alternative only the first ending.
    Returns (events, tempo or None)."""
    toks = [t for t in LY_TOKEN.findall(body) if not t.startswith("%")]
    ev, tempo = [], None
    state = {"step": 28, "last": Fraction(1), "tie": False}
    i = 0

    def note_event(step, alter, beats, grace):
        if grace:
            return
        letter = LETTERS7[step % 7]
        octave = step // 7
        li = last_note(ev)
        if state["tie"] and li is not None and (ev[li][1], ev[li][2], ev[li][3]) == (letter, alter, octave):
            n0 = ev[li]
            ev[li] = (n0[0], n0[1], n0[2], n0[3], n0[4] + beats)
        else:
            ev.append(("n", letter, alter, octave, beats))
        state["tie"] = False

    def rel_step(letter, marks):
        li = "cdefgab".index(letter)
        prev = state["step"]
        best = None
        for octv in range(prev // 7 - 1, prev // 7 + 2):
            st = octv * 7 + li
            if best is None or abs(st - prev) < abs(best - prev):
                best = st
        return best + 7 * marks.count("'") - 7 * marks.count(",")

    def parse_seq(scale, grace, until="}"):
        nonlocal i, tempo
        while i < len(toks):
            t = toks[i]
            i += 1
            if t == until:
                return
            if t == "{":
                parse_seq(scale, grace)
            elif t == "<":  # a chord: play its top note, carry on from its first
                notes = []
                while i < len(toks) and toks[i] != ">":
                    m = LY_NOTE.match(toks[i])
                    if m:
                        st = rel_step(m.group(1), m.group(3))
                        state["step"] = st
                        notes.append((st, LY_ALTER[m.group(2)]))
                    i += 1
                i += 1  # '>'
                dur = toks[i] if i < len(toks) and re.match(r"^\d+\.*$", toks[i]) else ""
                if dur:
                    i += 1
                m = re.match(r"^(\d*)(\.*)$", dur)
                beats = ly_duration(m.group(1), m.group(2), None, None, state["last"])
                state["last"] = beats
                if notes:
                    state["step"] = notes[0][0]
                    top = max(notes)
                    note_event(top[0], top[1], beats * scale, grace)
            elif t == "~":
                state["tie"] = True
            elif t == "|":
                if not grace:
                    ev.append(("|",))  # a bar check: a bar line
            elif t in ("\\tuplet", "\\times"):
                frac = toks[i]
                i += 1
                a, b = (int(x) for x in frac.split("/"))
                f = Fraction(b, a) if t == "\\tuplet" else Fraction(a, b)
                if i < len(toks) and toks[i] == "{":
                    i += 1
                    parse_seq(scale * f, grace)
            elif t in ("\\grace", "\\acciaccatura", "\\appoggiatura", "\\slashedGrace"):
                if i < len(toks) and toks[i] == "{":
                    i += 1
                    parse_seq(scale, True)
                else:
                    parse_note(toks[i], scale, True)
                    i += 1
            elif t == "\\repeat":
                i += 2  # volta N
            elif t == "\\alternative":
                # { {first} {second} ... }: read the first ending, skip the rest
                if i < len(toks) and toks[i] == "{":
                    i += 1
                    first = True
                    while i < len(toks) and toks[i] != "}":
                        if toks[i] == "{":
                            i += 1
                            if first:
                                parse_seq(scale, grace)
                                first = False
                            else:
                                depth = 1
                                while i < len(toks) and depth:
                                    depth += {"{": 1, "}": -1}.get(toks[i], 0)
                                    i += 1
                        else:
                            i += 1
                    i += 1
            elif t == "\\relative":
                m = LY_NOTE.match(toks[i]) if i < len(toks) else None
                if m:
                    state["step"] = 21 + "cdefgab".index(m.group(1)) + 7 * m.group(3).count("'") - 7 * m.group(3).count(",")
                    i += 1
            elif t == "\\transpose":
                raise ValueError("transposed voice")
            elif t == "\\tempo":
                while i < len(toks) and toks[i].startswith('"'):
                    i += 1
                if i + 1 < len(toks) and re.match(r"^\d+\.?$", toks[i]) and toks[i + 1].startswith("="):
                    unit = Fraction(4, int(toks[i].rstrip(".")))
                    if toks[i].endswith("."):
                        unit *= Fraction(3, 2)
                    tempo = float(toks[i + 1].lstrip("= ")) * float(unit)
                    i += 2
            elif t in ("\\key",):
                i += 2
            elif t in ("\\time", "\\partial", "\\bar", "\\mark", "\\clef", "\\set", "\\override", "\\once", "\\tweak"):
                i += 1
            elif t in ("\\markup", "\\lyricmode"):
                if i < len(toks) and toks[i] == "{":
                    depth = 0
                    while i < len(toks):
                        depth += {"{": 1, "}": -1}.get(toks[i], 0)
                        i += 1
                        if depth == 0:
                            break
                else:
                    i += 1
            elif t.startswith("\\") or t.startswith("#") or t.startswith('"'):
                continue
            else:
                parse_note(t, scale, grace)

    def parse_note(t, scale, grace):
        m = LY_NOTE.match(t)
        if m:
            st = rel_step(m.group(1), m.group(3))
            state["step"] = st
            beats = ly_duration(m.group(4), m.group(5), m.group(6), m.group(7), state["last"])
            if m.group(4):
                state["last"] = ly_duration(m.group(4), m.group(5), None, None, state["last"])
            note_event(st, LY_ALTER[m.group(2)], beats * scale, grace)
            return
        m = LY_REST.match(t)
        if m and not grace:
            beats = ly_duration(m.group(2), m.group(3), m.group(4), m.group(5), state["last"])
            if m.group(2):
                state["last"] = ly_duration(m.group(2), m.group(3), None, None, state["last"])
            ev.append(("r", beats * scale))
            state["tie"] = False

    parse_seq(Fraction(1), False, until=None)
    return ev, tempo


def openbook_songs(base: Path):
    """(title, composer, style, voice body) for each OpenBook standard with a melody."""
    order = ["VoiceReal", "VoiceFake", "VoiceNewreal", "VoiceAebersold", "VoiceWikifonia", "VoiceMy"]
    for f in sorted((base / "src" / "openbook").glob("*.ly.tera")):
        src = f.read_text(encoding="utf-8")
        attrs = dict(re.findall(r'^(\w+) = "(.*)"$', src, re.M))
        parts = dict(re.findall(r'\{% if part == "(Voice\w+)" %\}(.*?)\{% endif %\}', src, re.S))
        name = next((n for n in order if n in parts), next(iter(parts), None))
        if not name or "title" not in attrs:
            continue
        yield attrs["title"], attrs.get("composer", ""), attrs.get("style", "Jazz"), parts[name]


# Composers whose tunes go in the Bebop Heads songbook.
BEBOP = re.compile(r"Parker|Dizzy'? Gillespie|Monk|Bud Powell|Dameron|Navarro|Benny Harris|Sonny Stitt|J\.?\s?J\.? Johnson|Kenny Clarke|Denzil Best|Jimmy Heath|Benny Golson|Horace Silver|Sonny Rollins|Clifford Brown|Kenny Dorham|Hank Mobley", re.I)


def clamp_bpm(t, default=132):
    return int(round(min(200, max(60, t)))) if t else default


def jazzheads(lib: Library):
    sections = []
    # OpenBook
    base = fetch("openbook")
    items = []
    for title, composer, style, body in openbook_songs(base):
        title = title_case(title.strip()) if title.isupper() or title.islower() else title.strip()
        if lib.is_dup(title):
            continue
        try:
            ev, tempo = parse_lilypond_voice(body)
        except (ValueError, IndexError, ZeroDivisionError):
            continue
        by = clean_person(composer) or "Unknown"
        notes = place_phrase(ev, 16 if BEBOP.search(by) else 12)
        if not notes:
            continue
        for wrong, right in (("Thelonius", "Thelonious"), ("Errol Garner", "Erroll Garner")):
            by = by.replace(wrong, right)
        items.append({"id": lib.add(title), "title": title, "by": by, "cat": "bebop" if BEBOP.search(by) else "jazz",
                      "bpm": clamp_bpm(tempo, 132), "notes": notes})
    sections.append(("Jazz standards from OpenBook (opening phrase of the Real Book melody);"
                     " bebop and hard-bop composers' tunes are in the Bebop Heads songbook", items))
    # Charlie Parker's Omnibook
    dest = CACHE / "omnibook"
    xml_dir = dest / "Omnibook xml"
    if not xml_dir.exists():
        dest.mkdir(parents=True, exist_ok=True)
        zpath = dest / "omnibook_xml.zip"
        zpath.write_bytes(urllib.request.urlopen(OMNIBOOK_URL).read())
        with zipfile.ZipFile(zpath) as z:
            z.extractall(dest)
    bop = []
    seen = set()
    for f in sorted(xml_dir.glob("*.xml")):
        root = ET.parse(f).getroot()
        raw = (root.findtext("work/work-title") or f.stem.replace("_", " ")).strip()
        title = re.sub(r"\s*\(?\b(?:take\s*)?\d\)?$", "", raw).strip()  # "Kim 2", "Mohawk 1": one of each
        title = {"Billies's Bounce": "Billie's Bounce", "Au Private": "Au Privave"}.get(title, title)
        if title.lower() in seen or lib.is_dup(title):
            continue
        ev, tempo, _, _ = parse_musicxml(root)
        notes = place_phrase(ev or [], 16)  # bebop lines run long: the app's limit
        if not notes:
            continue
        seen.add(title.lower())
        bop.append({"id": lib.add(title, "bop"), "title": title, "by": "Charlie Parker", "cat": "bebop",
                    "bpm": clamp_bpm(tempo, 160), "notes": notes})
    sections.append(("Bebop heads from Charlie Parker's Omnibook (the head's opening line)", bop))
    count = sum(len(x) for _, x in sections)
    header = [
        "Jazz standards and bebop heads: the opening phrase of each melody, ended where a",
        "musician hears it end (see the Phrases section of extract_melodies.py), at most",
        "12 notes (16 for the long lines of bebop heads); a tune with no complete phrase",
        "that short is left out rather than cut.",
        "Shifted by whole octaves only.",
        "",
        "GENERATED by eartrainer/design/source/extract_melodies.py; do not edit by hand.",
        f"Sources: {SOURCES['openbook']} (Mark Veltzer's OpenBook, melodies",
        "  transcribed from the Real Book; MIT licence), and Charlie Parker's Omnibook",
        f"  MusicXML by Ken Deguernel, Emmanuel Vincent and Gerard Assayag ({OMNIBOOK_URL};",
        "  CC BY-NC-SA 2.0; cite their SMC 2016 paper). The Omnibook-derived entries in",
        "  this file are shared under the same CC BY-NC-SA 2.0 terms. The compositions",
        "  themselves remain under their owners' copyright (Atlantic Music Corp. for the",
        "  Parker tunes); only short opening phrases are used, for ear training.",
    ]
    return header, sections, count

# --------------------------------------------------------------------------
# Whole songs, phrase by phrase (the Full Songs mode). Only songs free to use
# whole: public-domain lead sheets and the traditional dance tunes. The phrase
# finder runs again from the end of each phrase to the end of the song. A song
# is kept only if every phrase ends cleanly and fits the keyboard; it is
# shifted by one whole number of octaves for all its phrases.

SONG_MAX_PHRASES = 24


def split_song(ev, max_notes: int, midword=frozenset()):
    """A whole tune as phrases: a list of event lists (bar markers kept), or None."""
    total = sum(1 for e in ev if e[0] == "n")
    out, at, last_i = [], 0, -1
    while at < total:
        left = total - at
        if left < PHRASE_MIN:
            if not out:
                return None
            out[-1] = out[-1] + ev[last_i + 1:]  # a short tail joins the phrase before it
            break
        cands = [(k, i, sc) for k, i, sc in phrase_scores(ev, midword, at) if PHRASE_MIN <= k + 1 <= max_notes]
        # Don't leave a tail too short to be a phrase of its own.
        cands = [c for c in cands if left - (c[0] + 1) == 0 or left - (c[0] + 1) >= PHRASE_MIN]
        pick = next((c for c in cands if c[2] >= PHRASE_SCORE), None)
        if pick is None:
            fair = sorted((c for c in cands if c[2] >= PHRASE_FAIR), key=lambda c: (-c[2], c[0]))
            pick = fair[0] if fair else None
        if pick is None:
            return None
        k, i, _ = pick
        out.append(ev[last_i + 1:i + 1])
        at += k + 1
        last_i = i
    return out


def place_song(phrases):
    """Notes strings for a song's phrases, all shifted by the same octaves, or None."""
    cleaned = [merge_rests([e for e in ph if e[0] != "|"]) for ph in phrases]
    if not (2 <= len(cleaned) <= SONG_MAX_PHRASES):
        return None
    ms_all = []
    for ph in cleaned:
        ms = [midi(e) for e in ph if e[0] == "n"]
        if not (PHRASE_MIN <= len(ms) <= 16) or max(ms) - min(ms) > 16 or len(set(ms)) < 2:
            return None
        ms_all += ms
    lo, hi = min(ms_all), max(ms_all)
    k = min(range(-4, 5), key=lambda k: (max(0, 57 - (lo + 12 * k)) + max(0, (hi + 12 * k) - 86), abs(k)))
    if lo + 12 * k < 36 or hi + 12 * k > 96:
        return None
    out = []
    for ph in cleaned:
        toks = []
        for e in ph:
            if e[0] == "r":
                toks.append(f"r:{fmt_beats(e[1])}")
                continue
            _, letter, alter, octave, beats = e
            if alter not in ACC or float(fmt_beats(beats)) <= 0:
                return None
            b = fmt_beats(beats)
            name = f"{letter}{ACC[alter]}{octave + k}"
            toks.append(name if b == "1" else f"{name}:{b}")
        out.append(" ".join(toks))
    return out


def songs():
    """Full songs from OpenEWLD (public-domain lead sheets) and Nottingham."""
    ids: set = set()

    def sid(title):
        base = "song-" + "-".join(re.sub(r"[^a-z0-9]+", "-", fold(title).lower()).strip("-").split("-")[:7])
        mid, n = base, 2
        while mid in ids:
            mid, n = f"{base}-{n}", n + 1
        ids.add(mid)
        return mid

    seen: set = set()
    lead = {c: [] for c in ("traditional", "holiday", "classical", "jazz", "popular")}
    base = fetch("openewld")
    db = sqlite3.connect(base / "OpenEWLD.db")
    deaths = {n: d for n, d in db.execute("select common_name, death from authors")}
    rows = db.execute(
        "select w.id, w.title, w.first_performance_date, w.path_leadsheet, "
        "(select group_concat(author, '|') from work_author a where a.id = w.id), "
        "(select group_concat(genre, '|') from work_genres g where g.id = w.id), "
        "(select group_concat(style, '|') from work_style s where s.id = w.id) "
        "from works w").fetchall()
    rows.sort(key=lambda r: (r[1] or "").lower())
    for wid, title, date, path, authors, genres, styles in rows:
        title = clean_ewld_title(title or "")
        if not title or title in SKIP_TITLES or norm(title) in seen:
            continue
        mxl = base / path
        if not mxl.exists():
            continue
        try:
            root = xml_root(mxl)
        except (zipfile.BadZipFile, ET.ParseError, KeyError):
            continue
        composers = [clean_person(c.text or "") for c in root.findall(".//creator[@type='composer']")]
        composers = [c for c in composers if c and "," not in c]
        if composers and all(c == "Traditional" for c in composers):
            composers = []
        authors_l = [clean_person(a) for a in (authors or "").split("|") if a]
        people = [p for p in (composers or authors_l) if p and p != "Traditional"] or ["Traditional"]
        who = BY_FIX.get(title) or " & ".join(dict.fromkeys(people))
        year = int(date[:4]) if date and date[:4].isdigit() else None
        died = [deaths.get(a) for a in authors_l]
        died_years = [int(str(d)[:4]) for d in died if d and str(d)[:4].isdigit()]
        # Whole songs only where the song is clearly out of copyright everywhere:
        # traditional, published by 1930, or undated with every author dead by 1930.
        public = (who.startswith("Traditional") or (year is not None and year <= 1930)
                  or (year is None and authors_l and len(died_years) == len(authors_l)
                      and max(died_years) < 1930))
        if not public:
            continue
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
        ev, tempo, _, midword = parse_musicxml(root, skip_first_endings=True)
        if not ev:
            continue
        phrases = split_song(ev, 12, midword)
        got = place_song(phrases) if phrases else None
        if not got:
            continue
        seen.add(norm(title))
        bpm = int(round(tempo)) if tempo and 40 <= tempo <= 260 else (
            110 if cat in ("traditional", "holiday") else 120)
        lead[cat].append({"id": sid(title), "title": title, "by": who, "cat": cat, "bpm": bpm, "phrases": got})
    sections = [(f"Lead sheets from OpenEWLD: {c}", lead[c]) for c in lead]
    # Nottingham: every tune of the chosen files that splits cleanly.
    nbase = fetch("nottingham") / "ABC_cleaned"
    for fname, label, _want, cat in NOTT_FILES:
        tunes = parse_abc_tunes((nbase / fname).read_text(encoding="latin-1"))
        tunes.sort(key=lambda t: stable_key(fname + t["head"].get("T", "")))
        got_l = []
        for t in tunes:
            h = t["head"]
            if re.search(r"\b(19|20)\d\d\b", h.get("S", "")):
                continue
            title = nott_title(h.get("T", ""))
            if not title or title in NOTT_SKIP or norm(title) in seen:
                continue
            unit = Fraction(h.get("L", "1/8"))
            body = re.sub(r"^[A-Za-z]:.*$", "", "\n".join(t["body"]), flags=re.M)
            meter = {"C": "4/4", "C|": "2/2"}.get(h.get("M", "4/4").strip(), h.get("M", "4/4").strip())
            try:
                bar_len = Fraction(meter) * 4
            except (ValueError, ZeroDivisionError):
                bar_len = Fraction(4)
            ev = abc_events(body, unit, key_alters(h.get("K", "C")), 10 ** 6, bar_len, skip_first_endings=True)
            phrases = split_song([e for e, _ in ev], 14)
            got = place_song(phrases) if phrases else None
            if not got:
                continue
            seen.add(norm(title))
            bpm = 110
            q = re.search(r"(?:\d+/\d+=)?(\d+)", h.get("Q", ""))
            if q and 40 <= int(q.group(1)) <= 260:
                bpm = int(q.group(1))
            c, by = cat, label
            if cat == "holiday" and not re.search(r"christmas|ding dong|noel|carol|boar", title, re.I):
                c, by = "traditional", "Traditional"
            got_l.append({"id": sid(title), "title": title, "by": by, "cat": c, "bpm": bpm, "phrases": got})
        sections.append((f"Nottingham Music Database: {fname[:-4]}", got_l))
    return sections


def write_songs(path: Path, sections):
    lines = [
        "// Full songs, phrase by phrase, for the Full Songs mode: whole public-domain lead",
        "// sheets from OpenEWLD and traditional dance tunes from the Nottingham Music",
        "// Database, read once straight through (first-time endings left out). Each",
        "// phrase ends where a musician hears it end (see the Phrases section of",
        "// extract_melodies.py); a song is kept only if every phrase does. One octave",
        "// shift for the whole song.",
        "//",
        "// GENERATED by eartrainer/design/source/extract_melodies.py; do not edit by hand.",
        f"// Sources: {SOURCES['openewld']} (MIT; public-domain scores)",
        f"//   and {SOURCES['nottingham']} (GPL v3).",
        "export default [",
    ]
    n = 0
    for name, items in sections:
        if not items:
            continue
        lines.append(f"  // {name}")
        for m in items:
            ph = ", ".join(js_str(x) for x in m["phrases"])
            lines.append(f"  {{ id: {js_str(m['id'])}, title: {js_str(m['title'])}, by: {js_str(m['by'])}, "
                         f"cat: {js_str(m['cat'])}, bpm: {m['bpm']}, phrases: [{ph}] }},")
            n += 1
    lines.append("];")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return n


# --------------------------------------------------------------------------


def main():
    lib = Library()
    counts = {}
    # Jazz heads first: their Real Book and Omnibook versions win over the same
    # titles in the Wikifonia lead sheets, which often open with a verse.
    sources = [("jazzheads.js", jazzheads), ("leadsheets.js", leadsheets), ("nottingham.js", nottingham)]
    if "--essen" in sys.argv:
        sources.append(("essen.js", essen))
    for name, fn in sources:
        header, sections, n = fn(lib)
        write_js(OUT / name, header, sections)
        counts[name] = n
    for k, v in counts.items():
        print(f"{k}: {v} melodies")
    n = write_songs(OUT.parent / "songs" / "dataset.js", songs())
    print(f"songs/dataset.js: {n} full songs")


if __name__ == "__main__":
    main()
