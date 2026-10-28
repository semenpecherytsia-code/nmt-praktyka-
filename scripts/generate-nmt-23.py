"""Набір «Симуляція НМТ №23»: 22 завдання з PDF власника сайту («Симуляція НМТ 04.10.2026»), рисунки перемальовано у SVG."""
import json, os, shutil

SID = "nmt-23"
OUT = f"public/content/sets/{SID}/"
P = "nmt23"
os.makedirs(OUT + "assets", exist_ok=True)
# reference/ (сторінки довідника й PDF) лежать у наборі як готові файли.

INK = "#172033"
FONT = 'font-family="Times New Roman, Georgia, serif"'


def svg(name, w, h, body):
    open(OUT + "assets/" + name, "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" {FONT}>'
        f'<rect width="{w}" height="{h}" fill="#ffffff"/>{body}</svg>\n')
    return {"src": "assets/" + name, "width": w, "height": h}


def txt(x, y, s, size=20, anchor="middle", italic=False, extra=""):
    st = ' font-style="italic"' if italic else ""
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{INK}"{st} {extra}>{s}</text>'


def sub(letter, idx="", size=20):
    """Буква з нижнім індексом (A₁)."""
    return letter if not idx else f'{letter}<tspan font-size="{int(size*0.65)}" dy="5">{idx}</tspan>'


# ---------- рисунки ----------
def bar_chart():
    months = ["Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень"]
    vals = [450, 500, 550, 500, 650, 600]
    x0, y0, w, h = 90, 30, 600, 300  # область графіка
    b = []
    for v in range(0, 701, 50):
        y = y0 + h - v / 700 * h
        b.append(f'<line x1="{x0}" y1="{y}" x2="{x0+w}" y2="{y}" stroke="#9AA5B5" stroke-width="1"/>')
        b.append(txt(x0 - 8, y + 6, v, 16, "end"))
    step = w / 6
    for i, (m, v) in enumerate(zip(months, vals)):
        cx = x0 + step * (i + 0.5)
        bh = v / 700 * h
        b.append(f'<rect x="{cx-17}" y="{y0+h-bh}" width="34" height="{bh}" fill="#00AEEF"/>')
        b.append(txt(cx, y0 + h + 26, m, 16))
    b.append(f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0+h}" stroke="{INK}" stroke-width="1.5"/>')
    b.append(f'<line x1="{x0}" y1="{y0+h}" x2="{x0+w}" y2="{y0+h}" stroke="{INK}" stroke-width="1.5"/>')
    b.append(txt(x0 + w / 2, y0 + h + 56, "Місяць", 18))
    b.append(txt(24, y0 + h / 2, "Вартість квитка, грн", 18, extra=f'transform="rotate(-90 24 {y0 + h / 2})"'))
    return svg("q02-chart.svg", 720, 400, "".join(b))


def flowerbed():
    import math, random
    rnd = random.Random(7)
    cx, cy, R = 190, 190, 150
    def rose(x, y, r):
        g = f'<ellipse cx="{x-r*0.9:.1f}" cy="{y+r*0.6:.1f}" rx="{r*0.6:.1f}" ry="{r*0.32:.1f}" fill="#3F8F2F" transform="rotate(-30 {x-r*0.9:.1f} {y+r*0.6:.1f})"/>'
        g += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#D8202A"/>'
        g += f'<circle cx="{x}" cy="{y}" r="{r*0.68:.1f}" fill="none" stroke="#A3121B" stroke-width="1.6"/>'
        g += f'<path d="M{x-r*0.35:.1f},{y} a{r*0.35:.1f},{r*0.35:.1f} 0 1 1 {r*0.35:.1f},{r*0.35:.1f}" fill="none" stroke="#A3121B" stroke-width="1.6"/>'
        g += f'<circle cx="{x-r*0.3:.1f}" cy="{y-r*0.35:.1f}" r="{r*0.22:.1f}" fill="#F0525A" opacity=".7"/>'
        return g
    def hydrangea(x, y, r):
        g = f'<circle cx="{x}" cy="{y}" r="{r}" fill="#4F86E8"/>'
        for k in range(9):
            a = k * 40 + rnd.randint(0, 20)
            d = r * (0.25 + 0.45 * (k % 3) / 2)
            g += f'<circle cx="{x+d*math.cos(math.radians(a)):.1f}" cy="{y+d*math.sin(math.radians(a)):.1f}" r="{r*0.28:.1f}" fill="#9CC1FA" stroke="#3E6FCB" stroke-width=".8"/>'
        return g
    def peony(x, y, r):
        g = f'<circle cx="{x}" cy="{y}" r="{r}" fill="#EE7FA8"/>'
        for k in range(8):
            a = math.radians(k * 45)
            g += f'<circle cx="{x+r*0.55*math.cos(a):.1f}" cy="{y+r*0.55*math.sin(a):.1f}" r="{r*0.42:.1f}" fill="#F6A9C6"/>'
        g += f'<circle cx="{x}" cy="{y}" r="{r*0.42:.1f}" fill="#FBD0E0"/><circle cx="{x}" cy="{y}" r="{r*0.18:.1f}" fill="#F7C948"/>'
        return g
    def field(clip, xs, ys, fn, r):
        out = f'<g clip-path="url(#{clip})">'
        for yy in ys:
            for xx in xs:
                out += fn(xx + rnd.randint(-5, 5) + (14 if (yy // 36) % 2 else 0), yy + rnd.randint(-5, 5), r + rnd.randint(-2, 2))
        return out + '</g>'
    b = ['<defs>',
         f'<clipPath id="cl"><path d="M{cx},{cy-R+10} A{R-10},{R-10} 0 0 0 {cx},{cy+R-10} Z"/></clipPath>',
         f'<clipPath id="ch"><path d="M{cx},{cy} L{cx},{cy-R+10} A{R-10},{R-10} 0 0 1 {cx+R-10},{cy} Z"/></clipPath>',
         f'<clipPath id="cp"><path d="M{cx},{cy} L{cx+R-10},{cy} A{R-10},{R-10} 0 0 1 {cx},{cy+R-10} Z"/></clipPath>',
         '</defs>']
    for k in range(22):  # кущики навколо клумби
        a = math.radians(k * 360 / 22 + rnd.randint(-6, 6))
        rr = R + 10 + rnd.randint(0, 10)
        b.append(f'<circle cx="{cx+rr*math.cos(a):.1f}" cy="{cy+rr*math.sin(a):.1f}" r="{rnd.randint(14, 22)}" fill="{rnd.choice(["#7CC36A", "#5FAE4E", "#9BD383"])}"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#3D6B2A"/>')
    b.append(field("cl", range(cx - 128, cx, 38), range(cy - 130, cy + 140, 36), rose, 16))
    b.append(field("ch", range(cx + 24, cx + 140, 42), range(cy - 118, cy, 40), hydrangea, 18))
    b.append(field("cp", range(cx + 24, cx + 140, 42), range(cy + 26, cy + 140, 40), peony, 18))
    # бордюр із каменю
    b.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#EDE6D8" stroke-width="16"/>')
    for k in range(32):
        a = math.radians(k * 360 / 32)
        b.append(f'<line x1="{cx+(R-8)*math.cos(a):.1f}" y1="{cy+(R-8)*math.sin(a):.1f}" x2="{cx+(R+8)*math.cos(a):.1f}" y2="{cy+(R+8)*math.sin(a):.1f}" stroke="#C9BFAE" stroke-width="1.5"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="{R+8}" fill="none" stroke="#C9BFAE" stroke-width="1.5"/><circle cx="{cx}" cy="{cy}" r="{R-8}" fill="none" stroke="#C9BFAE" stroke-width="1.5"/>')
    b.append(f'<line x1="{cx}" y1="{cy-R+8}" x2="{cx}" y2="{cy+R-8}" stroke="#EDE6D8" stroke-width="9"/>')
    b.append(f'<line x1="{cx}" y1="{cy}" x2="{cx+R-8}" y2="{cy}" stroke="#EDE6D8" stroke-width="9"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="16" fill="#EDE6D8" stroke="#C9BFAE" stroke-width="1.5"/>')
    # легенда
    items = [("#FDECEC", rose, "Троянди"), ("#E6F0FD", hydrangea, "Гортензії"), ("#FDECF3", peony, "Півонії")]
    b.append('<rect x="378" y="96" width="160" height="196" rx="14" fill="#ffffff" stroke="#E3E7EE" stroke-width="1.5"/>')
    for k, (bg, fn, name) in enumerate(items):
        y = 108 + k * 60
        b.append(f'<rect x="388" y="{y}" width="140" height="50" rx="10" fill="{bg}"/>')
        b.append(fn(414, y + 25, 13))
        b.append(f'<text x="440" y="{y+31}" font-size="17" font-weight="700" fill="#1F2A44" font-family="Inter, Arial, sans-serif">{name}</text>')
    return svg("q03-flowerbed.svg", 550, 380, "".join(b))


def prism():
    s, dx, dy = 2.2, -630, -95
    pt = lambda x, y: (round((x + dx) * s), round((y + dy) * s))
    top = {"C1": (690, 115), "D1": (755, 115), "E1": (785, 140), "F1": (745, 165), "A1": (680, 165), "B1": (650, 140)}
    bot = {k[0]: (x, y + 150) for k, (x, y) in top.items()}
    P_ = {**{k: pt(*v) for k, v in top.items()}, **{k: pt(*v) for k, v in bot.items()}}
    line = lambda a, c, dash=False: (f'<line x1="{P_[a][0]}" y1="{P_[a][1]}" x2="{P_[c][0]}" y2="{P_[c][1]}" stroke="{INK}" '
                                     f'stroke-width="2"{" stroke-dasharray=\"7 6\"" if dash else ""}/>')
    b = []
    for a, c in [("A1", "B1"), ("B1", "C1"), ("C1", "D1"), ("D1", "E1"), ("E1", "F1"), ("F1", "A1"),
                 ("A", "A1"), ("B", "B1"), ("E", "E1"), ("F", "F1"), ("E", "F"), ("F", "A"), ("A", "B")]:
        b.append(line(a, c))
    for a, c in [("B", "C"), ("C", "D"), ("D", "E"), ("C", "C1"), ("D", "D1")]:
        b.append(line(a, c, True))
    lab = {"C1": (-6, -12), "D1": (6, -12), "E1": (22, 2), "F1": (-14, 26), "A1": (-16, 26), "B1": (-24, 2),
           "C": (10, -10), "D": (18, -6), "E": (20, 4), "F": (8, 28), "A": (-8, 28), "B": (-22, 4)}
    for k, (ox, oy) in lab.items():
        x, y = P_[k]
        b.append(txt(x + ox, y + oy, sub(k[0], k[1:], 22), 22, italic=True))
    return svg("q05-prism.svg", 400, 520, "".join(b))


def hermite_path(pts, slopes, X, Y):
    d = f"M{X(pts[0][0])},{Y(pts[0][1])}"
    for (x0, y0), (x1, y1), m0, m1 in zip(pts, pts[1:], slopes, slopes[1:]):
        h = (x1 - x0) / 3
        d += (f" C{X(x0+h):.1f},{Y(y0+m0*h):.1f} {X(x1-h):.1f},{Y(y1-m1*h):.1f} {X(x1):.1f},{Y(y1):.1f}")
    return d


def graph(name, xmin, xmax, ymin, ymax, pts, slopes, label_at):
    u = 34
    pad = 30
    W, H = (xmax - xmin + 2) * u + pad * 2, (ymax - ymin + 2) * u + pad
    X = lambda x: pad + (x - xmin + 1) * u
    Y = lambda y: pad / 2 + (ymax + 1 - y) * u
    b = []
    for gx in range(xmin - 1, xmax + 2):
        b.append(f'<line x1="{X(gx)}" y1="{Y(ymax+1)}" x2="{X(gx)}" y2="{Y(ymin-1)}" stroke="#D5DAE3" stroke-width="1"/>')
    for gy in range(ymin - 1, ymax + 2):
        b.append(f'<line x1="{X(xmin-1)}" y1="{Y(gy)}" x2="{X(xmax+1)}" y2="{Y(gy)}" stroke="#D5DAE3" stroke-width="1"/>')
    b.append(f'<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,1 L10,5 L0,9 Z" fill="{INK}"/></marker></defs>')
    b.append(f'<line x1="{X(xmin-1)}" y1="{Y(0)}" x2="{X(xmax+1)+8}" y2="{Y(0)}" stroke="{INK}" stroke-width="2" marker-end="url(#ar)"/>')
    b.append(f'<line x1="{X(0)}" y1="{Y(ymin-1)}" x2="{X(0)}" y2="{Y(ymax+1)-8}" stroke="{INK}" stroke-width="2" marker-end="url(#ar)"/>')
    b.append(f'<line x1="{X(1)}" y1="{Y(0)-6}" x2="{X(1)}" y2="{Y(0)+6}" stroke="{INK}" stroke-width="2"/>')
    b.append(f'<line x1="{X(0)-6}" y1="{Y(1)}" x2="{X(0)+6}" y2="{Y(1)}" stroke="{INK}" stroke-width="2"/>')
    b.append(txt(X(1), Y(0) + 24, "1", 18))
    b.append(txt(X(0) + 16, Y(1) + 6, "1", 18))
    b.append(txt(X(0) - 12, Y(0) + 22, "0", 18))
    b.append(txt(X(xmax + 1) - 4, Y(0) + 24, "x", 20, italic=True))
    b.append(txt(X(0) - 14, Y(ymax + 1) + 10, "y", 20, italic=True))
    b.append(f'<path d="{hermite_path(pts, slopes, X, Y)}" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
    for x, y in (pts[0], pts[-1]):
        b.append(f'<circle cx="{X(x)}" cy="{Y(y)}" r="5" fill="{INK}"/>')
    lx, ly = label_at
    b.append(f'<text x="{X(lx)}" y="{Y(ly)}" font-size="20" fill="{INK}" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="6"><tspan font-style="italic">y</tspan> = <tspan font-style="italic">f</tspan>(<tspan font-style="italic">x</tspan>)</text>')
    return svg(name, round(W), round(H), "".join(b))


def parallelogram():
    A, B, C, D = (40, 220), (125, 50), (430, 50), (345, 220)
    O = ((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)
    K = (O[0], A[1])
    b = [f'<polygon points="{A[0]},{A[1]} {B[0]},{B[1]} {C[0]},{C[1]} {D[0]},{D[1]}" fill="none" stroke="{INK}" stroke-width="3"/>',
         f'<line x1="{A[0]}" y1="{A[1]}" x2="{C[0]}" y2="{C[1]}" stroke="{INK}" stroke-width="2.5"/>',
         f'<line x1="{O[0]}" y1="{O[1]}" x2="{K[0]}" y2="{K[1]}" stroke="{INK}" stroke-width="2.5"/>',
         f'<polyline points="{K[0]-14},{K[1]} {K[0]-14},{K[1]-14} {K[0]},{K[1]-14}" fill="none" stroke="{INK}" stroke-width="1.8"/>',
         f'<circle cx="{O[0]}" cy="{O[1]}" r="5" fill="{INK}"/>',
         f'<path d="M{C[0]-42},{C[1]} A42,42 0 0 0 {C[0]-36.4:.1f},{C[1]+21:.1f}" fill="none" stroke="{INK}" stroke-width="1.8"/>',
         txt(C[0] - 62, C[1] + 22, "30°", 18),
         txt(320, 105, "16", 19),
         txt(A[0] - 14, A[1] + 8, "A", 22, italic=True), txt(B[0] - 10, B[1] - 8, "B", 22, italic=True),
         txt(C[0] + 14, C[1] - 4, "C", 22, italic=True), txt(D[0] + 14, D[1] + 10, "D", 22, italic=True),
         txt(O[0] - 4, O[1] - 14, "O", 22, italic=True), txt(K[0] + 2, K[1] + 26, "K", 22, italic=True)]
    return svg("q14-parallelogram.svg", 470, 260, "".join(b))


def hexagon():
    import math
    cx, cy, r = 200, 150, 110
    names = ["D", "C", "B", "A", "F", "E"]
    pts = {n: (cx + r * math.cos(math.radians(60 * i)), cy - r * math.sin(math.radians(60 * i))) for i, n in enumerate(names)}
    order = ["A", "B", "C", "D", "E", "F"]
    poly = " ".join(f"{pts[n][0]:.1f},{pts[n][1]:.1f}" for n in order)
    b = [f'<polygon points="{poly}" fill="none" stroke="{INK}" stroke-width="3"/>']
    for a, c in [("A", "D"), ("B", "E"), ("C", "F")]:
        b.append(f'<line x1="{pts[a][0]:.1f}" y1="{pts[a][1]:.1f}" x2="{pts[c][0]:.1f}" y2="{pts[c][1]:.1f}" stroke="{INK}" stroke-width="1.8"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="5" fill="{INK}"/>')
    off = {"A": (-18, 7), "B": (-8, -12), "C": (10, -12), "D": (18, 7), "E": (10, 28), "F": (-8, 28)}
    for n, (ox, oy) in off.items():
        b.append(txt(pts[n][0] + ox, pts[n][1] + oy, n, 22, italic=True))
    b.append(txt(cx - 14, cy + 26, "O", 22, italic=True))
    return svg("q18-hexagon.svg", 400, 300, "".join(b))


def cone_cylinder():
    st = f'stroke="{INK}" stroke-width="2.2" fill="none"'
    da = 'stroke-dasharray="7 6"'
    # циліндр
    cx, top, bot, rx, ry = 100, 50, 270, 55, 15
    b = [f'<ellipse cx="{cx}" cy="{top}" rx="{rx}" ry="{ry}" {st}/>',
         f'<line x1="{cx-rx}" y1="{top}" x2="{cx-rx}" y2="{bot}" {st}/>',
         f'<line x1="{cx+rx}" y1="{top}" x2="{cx+rx}" y2="{bot}" {st}/>',
         f'<path d="M{cx-rx},{bot} A{rx},{ry} 0 0 0 {cx+rx},{bot}" {st}/>',
         f'<path d="M{cx-rx},{bot} A{rx},{ry} 0 0 1 {cx+rx},{bot}" {st} {da}/>',
         f'<line x1="{cx}" y1="{top}" x2="{cx}" y2="{bot}" {st} {da}/>',
         f'<line x1="{cx}" y1="{bot}" x2="{cx-30}" y2="{bot+11}" {st} {da}/>',
         f'<circle cx="{cx}" cy="{top}" r="3.5" fill="{INK}"/>']
    # конус
    kx, apex, kb, krx, kry = 300, 40, 270, 80, 18
    b += [f'<line x1="{kx}" y1="{apex}" x2="{kx-krx}" y2="{kb}" {st}/>',
          f'<line x1="{kx}" y1="{apex}" x2="{kx+krx}" y2="{kb}" {st}/>',
          f'<path d="M{kx-krx},{kb} A{krx},{kry} 0 0 0 {kx+krx},{kb}" {st}/>',
          f'<path d="M{kx-krx},{kb} A{krx},{kry} 0 0 1 {kx+krx},{kb}" {st} {da}/>',
          f'<line x1="{kx}" y1="{apex}" x2="{kx}" y2="{kb}" {st} {da}/>',
          f'<circle cx="{kx}" cy="{kb}" r="4" fill="{INK}"/>']
    return svg("q21-cone-cylinder.svg", 400, 310, "".join(b))


def fig(n, meta, alt):
    return [{"id": f"{P}-q{n:02d}-fig", "kind": "image", "alt": alt, **meta}]


F2 = fig(2, bar_chart(), "Стовпчикова діаграма вартості квитка, грн: травень 450, червень 500, липень 550, серпень 500, вересень 650, жовтень 600")
F3 = fig(3, flowerbed(), "Круглу клумбу поділено: ліва половина — троянди, верхня права чверть — гортензії, нижня права чверть — півонії")
F5 = fig(5, prism(), "Правильна шестикутна призма ABCDEFA1B1C1D1E1F1, невидимі ребра позначено штрихом")
F8 = fig(8, graph("q08-graph.svg", -7, 8, -2, 4,
                  [(-7, 3), (-5, 0), (-3, -1.2), (-1, 0), (0, 1), (2, 3), (5, 1.6), (7, 0), (8, -1)],
                  [-2.2, -1.2, 0, 0.9, 1.1, 0, -0.6, -1, -1], (-4.2, 2.6)),
         "Графік функції y = f(x) на проміжку [−7; 8]; перетинає вісь x у точках −5, −1 і 7, вісь y — у точці 1")
F14 = fig(14, parallelogram(), "Паралелограм ABCD з діагоналлю AC = 16, O — середина AC, OK ⟂ AD, кут ACB = 30°")
F17 = fig(17, graph("q17-graph.svg", -5, 4, -2, 5,
                    [(-5, -2), (-4, 0), (-2, 3), (0, 2), (2, 3), (4, 5)],
                    [2.2, 2.5, 0, 0, 0.9, 1.1], (-3.6, 4.2)),
          "Графік функції y = f(x) на проміжку [−5; 4]: проходить через точки (−5; −2), (−4; 0), (−2; 3), (0; 2), (2; 3), (4; 5)")
F18 = fig(18, hexagon(), "Правильний шестикутник ABCDEF з центром O і відрізками AD, BE, CF")
F21 = fig(21, cone_cylinder(), "Циліндр і конус")


# ---------- завдання ----------
def sc(n, statement, opts, correct, expl, assets=None):
    q = {"id": f"{P}-q{n:02d}", "type": "single_choice", "statement": statement,
         "options": [{"id": f"{P}-q{n:02d}-o{i+1}", "content": o} for i, o in enumerate(opts)],
         "answerKey": {"optionId": f"{P}-q{n:02d}-o{'АБВГД'.index(correct)+1}"}, "maxPoints": 1, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


def mt(n, statement, rows, opts, key, expl, assets=None):
    qid = f"{P}-q{n:02d}"
    q = {"id": qid, "type": "matching", "statement": statement,
         "matchingRows": [{"id": f"{qid}-r{i+1}", "content": r} for i, r in enumerate(rows)],
         "matchingOptions": [{"id": f"{qid}-m{i+1}", "content": o} for i, o in enumerate(opts)],
         "allowOptionReuse": False,
         "answerKey": {"pairs": {f"{qid}-r{i+1}": f"{qid}-m{'АБВГД'.index(k)+1}" for i, k in enumerate(key)}},
         "maxPoints": 3, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


def nm(n, statement, value, expl, assets=None):
    q = {"id": f"{P}-q{n:02d}", "type": "numeric", "statement": statement, "numericRule": {"mode": "exact"},
         "answerKey": {"value": value}, "maxPoints": 2, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


Q = [
 sc(1, r"Укажіть найбільший цілий розв’язок нерівності $0{,}75^{x}>\left(\dfrac{4}{3}\right)^{5x+9}$.",
    ["$-8$", "$-5$", "$-2$", "$-1$", "$2$"], "В",
    "$\\left(\\dfrac{4}{3}\\right)^{5x+9}=0{,}75^{-(5x+9)}$. Основа $0{,}75<1$, тому знак нерівності змінюється:\n$x<-5x-9$, $6x<-9$, $x<-1{,}5$.\n\nНайбільший цілий розв’язок: $-2$."),
 sc(2, "На діаграмі відображено вартість квитка на автобус у різні місяці 2026 року (див. рисунок). У 2027 році вартість квитка в кожному місяці буде в 1,2 раза більшою, ніж у відповідному місяці 2026 року. На скільки гривень сумарна вартість квитків за травень–жовтень 2027 року буде більшою, ніж за той самий період 2026 року (якщо купувати по одному квитку щомісяця)?",
    ["600 грн", "650 грн", "780 грн", "3250 грн", "3900 грн"], "Б",
    "Сума за 2026 рік: $450+500+550+500+650+600=3250$ грн.\n\nУ 2027 році сума буде $1{,}2\\cdot 3250$, тобто більшою на $0{,}2\\cdot 3250=650$ грн.", F2),
 sc(3, "На клумбі, що має форму круга з радіусом 5 м, посадили троянди, півонії та гортензії таким чином, що троянди займають половину клумби, а півонії та гортензії — по одній четвертій частині кожна (див. рисунок). Визначте площу клумби, яку займають півонії.",
    [r"$2{,}5\pi$ м²", r"$4\pi$ м²", r"$6{,}25\pi$ м²", r"$8\pi$ м²", r"$18\pi$ м²"], "В",
    "Площа клумби $S=\\pi r^{2}=25\\pi$ м². Півонії займають чверть: $\\dfrac{25\\pi}{4}=6{,}25\\pi$ м².", F3),
 sc(4, "Для приготування коктейлю «Сонячне світло» потрібно взяти 150 мл апельсинового соку та 30 мл медового сиропу. Скільки витратили літрів апельсинового соку для приготування певної кількості таких коктейлів, якщо для них було використано на 3120 мл медового сиропу менше, ніж апельсинового соку?",
    ["$3900$", "$3{,}27$", "$3{,}6$", "$3{,}9$", "$3890$"], "Г",
    "На один коктейль соку більше, ніж сиропу, на $150-30=120$ мл. Коктейлів: $3120:120=26$.\n\nСоку: $26\\cdot 150=3900$ мл $=3{,}9$ л."),
 sc(5, r"На рисунку зображено правильну шестикутну призму $ABCDEFA_1B_1C_1D_1E_1F_1$. Скільки площин, паралельних до грані $DD_1E_1E$, можна провести через вершину $F_1$?",
    ["жодної", "лише одну", "лише дві", "лише три", "більше трьох"], "Б",
    "Точка $F_1$ не лежить у площині грані $DD_1E_1E$. Через точку поза площиною можна провести рівно одну площину, паралельну даній.", F5),
 sc(6, r"Якщо $\dfrac{7x+28y}{x^{2}+8xy+16y^{2}}=\dfrac{7}{5}$, тоді $x+4y=$",
    ["$0{,}71$", "$1{,}4$", "$4$", "$5$", "$28$"], "Г",
    "$\\dfrac{7(x+4y)}{(x+4y)^{2}}=\\dfrac{7}{x+4y}=\\dfrac{7}{5}$, отже $x+4y=5$."),
 sc(7, r"Укажіть суму коренів рівняння $\sqrt{\dfrac{2x^{2}-5x-1}{6}}=\dfrac{\sqrt{3}}{3}$.",
    ["$-3{,}5$", "$-0{,}5$", "$0$", "$2{,}5$", "$3$"], "Г",
    "Піднесемо до квадрата: $\\dfrac{2x^{2}-5x-1}{6}=\\dfrac{1}{3}$, $2x^{2}-5x-3=0$.\n\nКорені $x=3$ і $x=-0{,}5$ (обидва підходять). Сума: $2{,}5$."),
 sc(8, r"На рисунку зображено графік функції $y=f(x)$, визначеної на проміжку $[-7;\,8]$. Знайдіть нулі функції та вкажіть їхню суму.",
    ["$-3$", "$1$", "$2$", "$4$", "$6$"], "Б",
    "Графік перетинає вісь $x$ у точках $-5$, $-1$ і $7$. Сума: $-5-1+7=1$.", F8),
 sc(9, "Які з наведених тверджень правильні?\n\nI. Висоти правильного трикутника поділяють його на шість рівновеликих трикутників.\nII. Центр кола, вписаного в будь-який трикутник, рівновіддалений від його вершин.\nIII. Існує правильний трикутник, сторона якого дорівнює радіусу кола, описаного навколо нього.",
    ["лише I", "лише I та II", "лише II", "лише I та III", "I, II та III"], "А",
    "I — правильно: шість трикутників мають рівні площі.\n\nII — неправильно: центр вписаного кола рівновіддалений від сторін, а не від вершин.\n\nIII — неправильно: $R=\\dfrac{a}{\\sqrt{3}}\\neq a$."),
 sc(10, r"У геометричній прогресії $(b_n)$ справджується рівність $\dfrac{b_7}{b_4}=-27$. Тоді $\dfrac{b_6}{b_2}=$",
    ["$-243$", "$-81$", "$-9$", "$9$", "$81$"], "Д",
    "$\\dfrac{b_7}{b_4}=q^{3}=-27$, отже $q=-3$.\n\n$\\dfrac{b_6}{b_2}=q^{4}=81$."),
 sc(11, "Після складання НМТ Маргарита та Вікторія завітали до «Макдональдза». Меню закладу налічує 15 видів бургерів, серед яких є «Біг Мак» і «Дабл Чізбургер». Маргарита навмання обирає з меню один вид бургера та замовляє дві його порції (для себе та для Вікторії). Знайдіть імовірність того, що обраним видом бургера виявиться «Дабл Чізбургер» або «Біг Мак».",
    [r"$\dfrac{1}{30}$", r"$\dfrac{1}{15}$", r"$\dfrac{1}{10}$", r"$\dfrac{2}{15}$", r"$\dfrac{4}{15}$"], "Г",
    "Обирають один вид із 15, сприятливих видів 2. $P=\\dfrac{2}{15}$."),
 sc(12, r"Визначте точку, симетричну точці $A(-6;\,4;\,-9)$ відносно координатної площини $xz$.",
    [r"$(-6;\,-4;\,-9)$", r"$(6;\,4;\,9)$", r"$(6;\,4;\,-9)$", r"$(-6;\,4;\,9)$", r"$(6;\,-4;\,9)$"], "А",
    "При симетрії відносно площини $xz$ змінює знак лише координата $y$: $(-6;\\,-4;\\,-9)$."),
 sc(13, r"$\left|10^{-2}-0{,}4\right|=$",
    ["$0{,}39$", "$0{,}6$", "$6$", "$9{,}6$", "$96$"], "А",
    "$10^{-2}=0{,}01$. $|0{,}01-0{,}4|=|-0{,}39|=0{,}39$."),
 sc(14, r"У паралелограмі $ABCD$ проведено діагональ $AC$, яка точкою $O$ ділиться навпіл (див. рисунок). $OK$ — перпендикуляр до сторони $AD$. Визначте площу паралелограма $ABCD$, якщо $AC=16$ см, $AK:KD=4:1$, $\angle ACB=30^{\circ}$.",
    [r"$20\sqrt{3}$ см²", r"$24\sqrt{3}$ см²", r"$40\sqrt{3}$ см²", r"$70\sqrt{3}$ см²", r"$160\sqrt{3}$ см²"], "В",
    "$\\angle CAD=\\angle ACB=30^{\\circ}$, $AO=8$. У трикутнику $AOK$: $OK=4$, $AK=4\\sqrt{3}$.\n\n$AD=\\dfrac{5}{4}AK=5\\sqrt{3}$, висота паралелограма $2\\cdot OK=8$.\n\n$S=5\\sqrt{3}\\cdot 8=40\\sqrt{3}$ см².", F14),
 sc(15, "Розв’яжіть систему рівнянь\n$$\\begin{cases} xy+2x-y=6,\\\\ 2xy+4x+3y=12. \\end{cases}$$\nЯкщо $(x_0;\\,y_0)$ — розв’язок системи, то $x_0=$",
    ["$-6$", "$0$", "$3$", "$5$", "$9$"], "В",
    "Позначимо $u=xy+2x$: $u-y=6$, $2u+3y=12$. Звідси $y=0$, $u=6$.\n\nТоді $2x=6$, $x_0=3$."),
 mt(16, "Узгодьте вираз (1–3) із проміжком (А–Д), якому належить значення цього виразу.",
    [r"$4\sqrt{7}-\sqrt{112}$", r"$2^{\log_{0{,}5}10}$", r"$\sin(-810^{\circ})$"],
    [r"$(-\infty;\,-3]$", r"$(-3;\,-1]$", r"$(-1;\,0]$", r"$(0;\,0{,}5]$", r"$(0{,}5;\,+\infty)$"], "ВГБ",
    "1. $\\sqrt{112}=4\\sqrt{7}$, значення $0$ — В.\n\n2. $2^{\\log_{0{,}5}10}=2^{-\\log_{2}10}=\\dfrac{1}{10}=0{,}1$ — Г.\n\n3. $\\sin(-810^{\\circ})=\\sin(-90^{\\circ})=-1$ — Б."),
 mt(17, r"На рисунку зображено графік функції $y=f(x)$, визначеної на проміжку $[-5;\,4]$. До кожного початку речення (1–3) доберіть його закінчення (А–Д) так, щоб утворилося правильне твердження.",
    [r"Найменшого значення функція $y=f(x)$ на проміжку $[0;\,4]$ набуває при $x=$",
     r"Функція $y=f(x)$ набуває недодатного значення на проміжку $[-4{,}5;\,0]$, якщо $x=$",
     r"Графік функції $y=f(x)$ на проміжку $[-5;\,4]$ перетинає пряму $y=1{,}5x$ при $x=$"],
    ["$-5$", "$-4$", "$0$", "$2$", "$3$"], "ВБГ",
    "1. На $[0;\\,4]$ функція зростає, найменше значення $f(0)=2$ — В.\n\n2. Серед варіантів лише $f(-4)=0\\le 0$ — Б.\n\n3. $f(2)=3=1{,}5\\cdot 2$ — Г.", F17),
 mt(18, r"На рисунку зображено правильний шестикутник, радіус вписаного кола в який дорівнює $5\sqrt{3}$ см. Увідповідніть невідоме (1–3) з його значенням (А–Д).",
    ["$FE$", "Середня лінія трапеції $ABCD$", "Більша діагональ паралелограма $OCDE$"],
    [r"$5\sqrt{3}$ см", "$10$ см", "$15$ см", r"$10\sqrt{3}$ см", "$20$ см"], "БВГ",
    "Сторона $a=\\dfrac{2r}{\\sqrt{3}}=10$ см, тож $FE=10$ см — Б.\n\n$BC=10$, $AD=20$, середня лінія $\\dfrac{10+20}{2}=15$ см — В.\n\n$OCDE$ — ромб зі стороною 10 і кутом $120^{\\circ}$ при $O$; більша діагональ $CE=10\\sqrt{3}$ см — Г.", F18),
 nm(19, r"Обчисліть $\displaystyle\int_0^3\left(1+\sqrt{2x}\right)\left(\sqrt{2x}-1\right)dx$.", "6",
    "$(1+\\sqrt{2x})(\\sqrt{2x}-1)=2x-1$.\n\n$\\displaystyle\\int_0^3(2x-1)\\,dx=\\left(x^{2}-x\\right)\\Big|_0^3=9-3=6$."),
 nm(20, "Карина вирішила придбати курси для підготовки до НМТ з математики та біології. Щомісячна вартість навчання на курсі з математики становить 1090 грн, а з біології — 1290 грн. Навчальний рік триває 9 місяців (з вересня по травень). При купівлі курсу з біології на весь навчальний рік діє знижка 14 %, а з математики — 10 %. Визначте загальну суму (у грн), яку заплатить дівчина за обидва курси на весь навчальний рік. Отриманий результат округліть до цілих.",
    "18814",
    "Математика: $1090\\cdot 9\\cdot 0{,}9=8829$ грн. Біологія: $1290\\cdot 9\\cdot 0{,}86=9984{,}6$ грн.\n\nРазом $18813{,}6\\approx 18814$ грн."),
 nm(21, r"Задано конус та циліндр (див. рисунок). Висота циліндра дорівнює висоті конуса, а довжина кола основи циліндра у 2 рази менша за довжину кола основи конуса. Вершина конуса віддалена від його основи на 15 см. Твірна конуса на 9 см більша за радіус його основи. Визначте об’єм $V$ циліндра. У відповідь запишіть $\dfrac{V}{\pi}$.",
    "240",
    "$h=15$, $l=r+9$: $r^{2}+15^{2}=(r+9)^{2}$, звідси $r=8$.\n\nРадіус циліндра $4$, $V=\\pi\\cdot 4^{2}\\cdot 15=240\\pi$, отже $\\dfrac{V}{\\pi}=240$.", F21),
 nm(22, r"Визначте найбільше ціле значення параметра $a$, при якому рівняння $\dfrac{5\sin x+a-1}{6x-\pi}=0$ має хоча б один корінь на проміжку $[0;\,\pi]$.",
    "1",
    "Потрібно $5\\sin x=1-a$, $x\\neq\\dfrac{\\pi}{6}$. На $[0;\\,\\pi]$ $\\sin x\\in[0;\\,1]$, тому $0\\le 1-a\\le 5$, тобто $-4\\le a\\le 1$.\n\nПри $a=1$: $\\sin x=0$, корені $0$ і $\\pi$ підходять. Найбільше $a=1$."),
]

SCORING = [{"id": "nmt-math-22", "questionCount": 22, "maxTotal": 32, "layout": [{"from": 1, "to": 15, "type": "single_choice", "maxPoints": 1, "optionCount": 5}, {"from": 16, "to": 18, "type": "matching", "maxPoints": 3, "rowCount": 3, "optionCount": 5}, {"from": 19, "to": 22, "type": "numeric", "maxPoints": 2}]}]
REFERENCE = [{"id": "nmt-reference", "title": "Довідкові матеріали", "kind": "images", "pages": [{"src": "reference/page-1.png", "alt": "Довідкові матеріали, сторінка 1: таблиця квадратів, алгебра і початки аналізу"}, {"src": "reference/page-2.png", "alt": "Довідкові матеріали, сторінка 2: похідна, первісна, тригонометрія"}, {"src": "reference/page-3.png", "alt": "Довідкові матеріали, сторінка 3: геометрія, координати та вектори"}], "downloadSrc": "reference/dovidkovi-materialy.pdf"}]
CONVERSION = [{"id": "nmt-math-2025", "year": 2025, "source": "Таблиця переведення тестових балів НМТ з математики у шкалу 100–200, вступ 2025 (додаток до Порядку прийому). Поріг «склав / не склав» — 5 тестових балів.", "maxPrimary": 32, "map": {"0": None, "1": None, "2": None, "3": None, "4": None, "5": 100, "6": 108, "7": 115, "8": 123, "9": 131, "10": 134, "11": 137, "12": 140, "13": 143, "14": 145, "15": 147, "16": 148, "17": 149, "18": 150, "19": 151, "20": 152, "21": 155, "22": 159, "23": 163, "24": 167, "25": 170, "26": 173, "27": 176, "28": 180, "29": 184, "30": 189, "31": 194, "32": 200}}]

sim = {"id": SID, "title": "Симуляція НМТ №23", "subject": "Математика", "version": "3.0.0",
       "durationSeconds": 5400, "orderedQuestionIds": [q["id"] for q in Q], "referenceMaterialId": "nmt-reference",
       "scoringProfileId": "nmt-math-22", "conversionTableId": "nmt-math-2025", "readiness": "complete", "isDemo": False,
       "source": {"kind": "imported", "note": "Завдання перенесено з PDF, наданого власником сайту. Рисунки перемальовано."}}
pkg = {"schemaVersion": 1, "simulation": sim, "questions": Q,
       "scoringProfiles": SCORING, "referenceMaterials": REFERENCE, "conversionTables": CONVERSION}
json.dump(pkg, open(OUT + "package.json", "w"), ensure_ascii=False, indent=2)
print(len(Q), "питань")

cat = {"schemaVersion": 1, "defaultSimulationId": SID, "demoSimulationId": None, "entries": [
    {"id": SID, "title": sim["title"], "package": f"sets/{SID}/package.json", "videoMap": None}]}
json.dump(cat, open("public/content/catalog.json", "w"), ensure_ascii=False, indent=2)
